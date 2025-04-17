
import axios from 'axios';
import JSZip from 'jszip';

const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface VulnerabilityType {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: {
    file: string;
    line: number;
    column?: number;
  };
  description: string;
  code: string;
  suggestedFix?: string;
  status: 'open' | 'fixed' | 'ignored';
  createdAt: string;
  repo?: string;
}

export interface ScanResultType {
  id: string;
  repositoryUrl: string;
  branch: string;
  commit?: string;
  timestamp: string;
  status: 'completed' | 'failed' | 'in_progress';
  vulnerabilities: VulnerabilityType[];
  summary: {
    totalVulnerabilities: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
}

export interface DashboardDataType {
  activeRepositories: number;
  openVulnerabilities: number;
  recentScansCount: number;
  fixedIssues: number;
  recentScans: {
    id: number;
    repo: string;
    date: string;
    issues: number;
  }[];
  topVulnerabilities: {
    id: string;
    type: string;
    severity: string;
    location: string;
  }[];
}

export interface RepositoryType {
  id: string;
  name: string;
  branch: string;
  lastScan: string;
  status: 'secure' | 'vulnerable';
  vulnerabilities: number;
}

export interface RepositoryFileType {
  name: string;
  path: string;
  type: string;
  size?: number;
}

export interface FixedFileResult {
  fileName: string;
  originalCode: string;
  fixedCode: string;
}

// Progress tracking for active scans
export interface ScanProgress {
  scanId: string;
  progress: number;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  timestamp: number;
}

// In-memory store for active scans
const activeScans: Record<string, ScanProgress> = {};

export const scannerService = {
  // Get dashboard data for the logged in user
  async getDashboardData(): Promise<DashboardDataType> {
    try {
      const response = await api.get('/dashboard');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to fetch dashboard data');
      }
      throw new Error('Network error while fetching dashboard data');
    }
  },

  // Get repositories for the logged in user
  async getRepositories(): Promise<RepositoryType[]> {
    try {
      const response = await api.get('/repositories');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to fetch repositories');
      }
      throw new Error('Network error while fetching repositories');
    }
  },

  // Get files from a repository
  async getRepositoryFiles(repositoryUrl: string, branch: string = 'main'): Promise<RepositoryFileType[]> {
    try {
      const response = await api.get('/repository/files', {
        params: { repositoryUrl, branch }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to fetch repository files');
      }
      throw new Error('Network error while fetching repository files');
    }
  },

  // Get vulnerabilities for the logged in user
  async getVulnerabilities(): Promise<VulnerabilityType[]> {
    try {
      const response = await api.get('/vulnerabilities');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to fetch vulnerabilities');
      }
      throw new Error('Network error while fetching vulnerabilities');
    }
  },

  // Scan code for security issues
  async scanCode(code: string, language: string = 'javascript'): Promise<ScanResultType> {
    try {
      const response = await api.post('/scan/code', { code, language });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to scan code');
      }
      throw new Error('Network error during code scanning');
    }
  },

  // Scan selected files from a repository
  async scanRepositoryFiles(repositoryUrl: string, filePaths: string[], branch: string = 'main'): Promise<string> {
    try {
      const response = await api.post('/scan/repository/files', { 
        repositoryUrl, 
        filePaths,
        branch
      });
      const scanId = response.data.scanId;
      
      // Initialize scan progress tracking
      activeScans[scanId] = {
        scanId,
        progress: 0,
        status: 'initiated',
        timestamp: Date.now(),
      };
      
      return scanId;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to start scan');
      }
      throw new Error('Network error during scan initialization');
    }
  },

  // This is kept for backward compatibility
  async scanRepository(repositoryUrl: string, branch: string = 'main'): Promise<string> {
    try {
      // First, get the files
      const files = await this.getRepositoryFiles(repositoryUrl, branch);
      
      // Filter for code files
      const codeFiles = files
        .filter(file => /\.(js|jsx|ts|tsx|py|java|go|rb|php|c|cpp|cs)$/i.test(file.path));
      
      // Then call the scanRepositoryFiles method
      return this.scanRepositoryFiles(repositoryUrl, codeFiles.map(f => f.path), branch);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to start scan');
      }
      throw new Error('Network error during scan initialization');
    }
  },

  // Get scan status with progress tracking
  async getScanStatus(scanId: string): Promise<{ status: 'initiated' | 'processing' | 'completed' | 'failed', progress: number }> {
    try {
      // Check if we have a recently cached status (less than 2 seconds old)
      const cachedScan = activeScans[scanId];
      const now = Date.now();
      
      if (cachedScan && now - cachedScan.timestamp < 2000) {
        return {
          status: cachedScan.status,
          progress: cachedScan.progress
        };
      }
      
      // Fetch current status from API
      const response = await api.get(`/scan/repository/${scanId}/status`);
      
      // Update our cache
      activeScans[scanId] = {
        scanId,
        progress: response.data.progress,
        status: response.data.status,
        timestamp: now
      };
      
      // If completed or failed, remove from active scans after a delay
      if (response.data.status === 'completed' || response.data.status === 'failed') {
        setTimeout(() => {
          delete activeScans[scanId];
        }, 60000); // Remove after 1 minute
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to get scan status');
      }
      throw new Error('Network error while checking scan status');
    }
  },

  // Get scan results
  async getScanResults(scanId: string): Promise<ScanResultType> {
    try {
      const response = await api.get(`/scan/repository/${scanId}/results`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to get scan results');
      }
      throw new Error('Network error while fetching scan results');
    }
  },

  // Get all scan history for a user
  async getScanHistory(): Promise<ScanResultType[]> {
    try {
      const response = await api.get('/scan-history');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to get scan history');
      }
      throw new Error('Network error while fetching scan history');
    }
  },

  // Get suggested fix using AI
  async getSuggestedFix(vulnerabilityId: string, code: string, type: string): Promise<string> {
    try {
      const response = await api.post(`/vulnerabilities/${vulnerabilityId}/fix`, { code, type });
      return response.data.suggestedFix;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to get fix suggestion');
      }
      throw new Error('Network error while fetching fix suggestion');
    }
  },
  
  // Poll scan status at regular intervals until completion
  pollScanStatus(scanId: string, callback: (status: { status: string, progress: number }) => void, 
                 interval: number = 3000): () => void {
    // Start polling
    const intervalId = setInterval(async () => {
      try {
        const statusInfo = await this.getScanStatus(scanId);
        callback(statusInfo);
        
        // Stop polling once complete or failed
        if (statusInfo.status === 'completed' || statusInfo.status === 'failed') {
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error('Error polling scan status:', error);
        clearInterval(intervalId);
      }
    }, interval);
    
    // Return a function to cancel polling
    return () => clearInterval(intervalId);
  },

  // Upload and scan a file directly
  async uploadAndScanFile(file: File): Promise<ScanResultType> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      const mappedLanguage = this.mapFileExtensionToLanguage(fileExtension);
      formData.append('language', mappedLanguage);
      
      const response = await api.post('/scan/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to scan file');
      }
      throw new Error('Network error during file scanning');
    }
  },
  
  // Apply fixes to a file
  async applyFixesToFile(
    scanId: string, 
    fileName: string, 
    vulnerabilities: Array<{ lineNumber: number; code: string; fix: string }>
  ): Promise<FixedFileResult> {
    try {
      const response = await api.post(`/scan/${scanId}/apply-fixes`, {
        fileName,
        vulnerabilities
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to apply fixes');
      }
      throw new Error('Network error while applying fixes');
    }
  },
  
  // Create a zip archive of fixed files
  async createFixedFilesArchive(fixedFiles: FixedFileResult[]): Promise<Blob> {
    const zip = new JSZip();
    
    fixedFiles.forEach(file => {
      // Extract just the filename from the path
      const fileName = file.fileName.split('/').pop() || file.fileName;
      zip.file(fileName, file.fixedCode);
    });
    
    return await zip.generateAsync({ type: 'blob' });
  },
  
  // Map file extension to language for the API
  mapFileExtensionToLanguage(extension: string): string {
    const mapping: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rb': 'ruby',
      'php': 'php',
      'cs': 'csharp',
      'c': 'c',
      'cpp': 'cpp',
    };
    
    return mapping[extension] || 'javascript';
  }
};
