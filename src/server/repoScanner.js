
const crypto = require('crypto');
const mongoose = require('mongoose');

// Define MongoDB schemas for scan-related data
const scanSchema = new mongoose.Schema({
  scanId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  repositoryUrl: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    default: 'main',
  },
  status: {
    type: String,
    enum: ['initiated', 'processing', 'completed', 'failed'],
    default: 'initiated',
  },
  progress: {
    type: Number,
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  commit: String,
  summary: {
    totalVulnerabilities: Number,
    criticalCount: Number,
    highCount: Number,
    mediumCount: Number,
    lowCount: Number,
  },
  duration: String,
  filesScanned: Number,
});

const vulnerabilitySchema = new mongoose.Schema({
  vulnerabilityId: {
    type: String,
    required: true,
    unique: true,
  },
  scanId: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
  },
  location: {
    file: String,
    line: Number,
    column: Number,
  },
  description: String,
  code: String,
  suggestedFix: String,
  status: {
    type: String,
    enum: ['open', 'fixed', 'ignored'],
    default: 'open',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  repo: String,
});

// Create models if they don't exist
const Scan = mongoose.models.Scan || mongoose.model('Scan', scanSchema);
const Vulnerability = mongoose.models.Vulnerability || mongoose.model('Vulnerability', vulnerabilitySchema);

/**
 * Repository Scanner utility 
 * This connects to the MongoDB database to store and retrieve scan data
 */
const repoScanner = {
  /**
   * Initiate a scan of a Git repository
   * @param {string} repositoryUrl - The URL of the repository to scan
   * @param {string} userId - The ID of the user initiating the scan
   * @param {string} branch - The branch to scan (default: 'main')
   * @returns {Object} Initial scan information with scan ID
   */
  initiateRepositoryScan: async (repositoryUrl, userId, branch = 'main') => {
    if (!repositoryUrl) {
      throw new Error('Repository URL is required');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Generate a unique scan ID
    const scanId = crypto.randomBytes(16).toString('hex');
    
    // Create a new scan record in the database
    const newScan = new Scan({
      scanId,
      userId,
      repositoryUrl,
      branch,
      status: 'initiated',
      progress: 0,
      timestamp: new Date(),
    });
    
    await newScan.save();
    
    // Start the scanning process in the background
    // In a real implementation, this would be done with a queue/worker system
    // For now, we'll update the progress asynchronously
    setTimeout(() => updateScanProgress(scanId, userId), 2000);
    
    return {
      scanId,
      repositoryUrl,
      branch,
      status: 'initiated',
      progress: 0,
      timestamp: new Date().toISOString(),
    };
  },
  
  /**
   * Get the status of an ongoing repository scan
   * @param {string} scanId - The ID of the scan to check
   * @param {string} userId - The ID of the user who initiated the scan
   * @returns {Object} Status information for the scan
   */
  getScanStatus: async (scanId, userId) => {
    if (!scanId) {
      throw new Error('Scan ID is required');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Retrieve the scan from the database
    const scan = await Scan.findOne({ scanId, userId });
    
    if (!scan) {
      throw new Error('Scan not found');
    }
    
    return { 
      scanId, 
      status: scan.status, 
      progress: scan.progress 
    };
  },
  
  /**
   * Get the results of a completed repository scan
   * @param {string} scanId - The ID of the scan to get results for
   * @param {string} userId - The ID of the user who initiated the scan
   * @returns {Object} Detailed scan results with vulnerabilities
   */
  getScanResults: async (scanId, userId) => {
    if (!scanId) {
      throw new Error('Scan ID is required');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Retrieve the scan from the database
    const scan = await Scan.findOne({ scanId, userId });
    
    if (!scan) {
      throw new Error('Scan not found');
    }
    
    // Retrieve the vulnerabilities for this scan
    const vulnerabilities = await Vulnerability.find({ scanId, userId });
    
    return {
      id: scan.scanId,
      repositoryUrl: scan.repositoryUrl,
      branch: scan.branch,
      commit: scan.commit,
      timestamp: scan.timestamp.toISOString(),
      status: scan.status,
      vulnerabilities: vulnerabilities.map(vuln => ({
        id: vuln.vulnerabilityId,
        type: vuln.type,
        severity: vuln.severity,
        location: vuln.location,
        description: vuln.description,
        code: vuln.code,
        status: vuln.status,
        createdAt: vuln.createdAt.toISOString(),
        repo: vuln.repo,
      })),
      summary: scan.summary,
    };
  },
  
  /**
   * Get all scan history for a user
   * @param {string} userId - The ID of the user
   * @returns {Array} Array of scan information
   */
  getUserScanHistory: async (userId) => {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Retrieve all scans for this user from the database
    const scans = await Scan.find({ userId }).sort({ timestamp: -1 });
    
    return scans.map(scan => ({
      id: scan.scanId,
      repositoryUrl: scan.repositoryUrl,
      branch: scan.branch,
      timestamp: scan.timestamp.toISOString(),
      status: scan.status,
      summary: scan.summary,
    }));
  },
  
  /**
   * Get user dashboard data
   * @param {string} userId - The ID of the user
   * @returns {Object} Dashboard statistics for the user
   */
  getUserDashboardData: async (userId) => {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Get active repositories (unique repos from scans)
    const scans = await Scan.find({ userId });
    const repositories = [...new Set(scans.map(scan => scan.repositoryUrl))];
    
    // Get vulnerabilities count
    const openVulnerabilities = await Vulnerability.countDocuments({ userId, status: 'open' });
    
    // Get recent scans
    const recentScans = await Scan.find({ userId })
      .sort({ timestamp: -1 })
      .limit(3);
    
    // Get fixed issues count
    const fixedIssues = await Vulnerability.countDocuments({ userId, status: 'fixed' });
    
    // Get top vulnerabilities
    const topVulnerabilities = await Vulnerability.find({
      userId,
      status: 'open',
      $or: [{ severity: 'critical' }, { severity: 'high' }]
    })
    .sort({ severity: -1 })
    .limit(3);
    
    // Format the data for frontend consumption
    return {
      activeRepositories: repositories.length,
      openVulnerabilities,
      recentScansCount: await Scan.countDocuments({ 
        userId, 
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      }),
      fixedIssues,
      recentScans: recentScans.map((scan, index) => {
        const repoName = scan.repositoryUrl.split('/').pop();
        return {
          id: index + 1,
          repo: repoName,
          date: getRelativeTimeString(scan.timestamp),
          issues: scan.summary?.totalVulnerabilities || 0
        };
      }),
      topVulnerabilities: topVulnerabilities.map(vuln => ({
        id: vuln.vulnerabilityId,
        type: vuln.type,
        severity: vuln.severity,
        location: vuln.repo
      }))
    };
  }
};

/**
 * Helper function to update scan progress asynchronously
 * @param {string} scanId - The ID of the scan to update
 * @param {string} userId - The ID of the user who initiated the scan
 */
async function updateScanProgress(scanId, userId) {
  // This simulates the scanning process with progress updates
  try {
    let progress = 0;
    const updateInterval = setInterval(async () => {
      progress += Math.floor(Math.random() * 15) + 5; // Increment by 5-19%
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(updateInterval);
        await finalizeScan(scanId, userId);
      }
      
      // Update the scan status in the database
      await Scan.findOneAndUpdate(
        { scanId, userId },
        { 
          status: progress < 100 ? 'processing' : 'completed',
          progress 
        }
      );
    }, 3000); // Update every 3 seconds
  } catch (error) {
    console.error('Error updating scan progress:', error);
    // Mark the scan as failed
    await Scan.findOneAndUpdate(
      { scanId, userId },
      { status: 'failed' }
    );
  }
}

/**
 * Helper function to finalize a scan by generating results
 * @param {string} scanId - The ID of the scan to finalize
 * @param {string} userId - The ID of the user who initiated the scan
 */
async function finalizeScan(scanId, userId) {
  try {
    // Get the scan
    const scan = await Scan.findOne({ scanId, userId });
    if (!scan) return;
    
    // Use the scan ID to seed the random number generator for consistent results
    const seedNumber = parseInt(scanId.substring(0, 8), 16);
    const randomSeed = seedNumber % 1000;
    
    // Generate random vulnerabilities
    const vulnerabilityCount = (randomSeed % 20) + 1; // 1-20 vulnerabilities
    
    // Build the repository name
    const repoName = scan.repositoryUrl.split('/').pop();
    
    // Generate and save vulnerabilities
    for (let i = 0; i < vulnerabilityCount; i++) {
      const severityOptions = ['low', 'medium', 'high', 'critical'];
      const severityIndex = (randomSeed + i) % 4;
      const severity = severityOptions[severityIndex];
      
      const typeOptions = [
        'SQL Injection', 
        'Cross-site Scripting (XSS)', 
        'Hardcoded Secret', 
        'Insecure Cookie',
        'Path Traversal',
        'Outdated Dependency',
        'Unsafe Deserialization',
        'Command Injection',
        'Insecure Direct Object Reference',
        'Sensitive Data Exposure'
      ];
      const typeIndex = (randomSeed + i) % typeOptions.length;
      
      const vulnerabilityId = `vuln-${scanId.substring(0, 4)}-${i}`;
      
      const newVulnerability = new Vulnerability({
        vulnerabilityId,
        scanId,
        userId,
        type: typeOptions[typeIndex],
        severity,
        location: {
          file: `src/${['services', 'controllers', 'utils', 'middlewares', 'models'][i % 5]}/${['auth', 'user', 'data', 'config', 'api'][i % 5]}.js`,
          line: (randomSeed + i * 11) % 200 + 1,
        },
        description: `Potential ${typeOptions[typeIndex]} vulnerability detected that could lead to security issues.`,
        code: [
          'const query = `SELECT * FROM users WHERE id = ${userId}`;',
          'res.send(`<div>${userInput}</div>`);',
          'const API_KEY = "sk_live_abcdef123456";',
          'res.cookie("session", token, { httpOnly: true });',
          'fs.readFile(path + "../../../" + filename);',
          'npm install some-package@1.0.0',
          'const obj = JSON.parse(serializedData);',
          'exec("rm -rf " + userInput);',
          'const userData = db.getUserById(req.params.id);',
          'console.log("User data:", userData);'
        ][i % 10],
        status: i % 5 === 0 ? 'fixed' : 'open',
        createdAt: new Date(Date.now() - (i * 86400000)),
        repo: repoName,
      });
      
      await newVulnerability.save();
    }
    
    // Calculate summary counts
    const vulnerabilities = await Vulnerability.find({ scanId, userId });
    const summary = {
      totalVulnerabilities: vulnerabilities.length,
      criticalCount: vulnerabilities.filter(v => v.severity === 'critical').length,
      highCount: vulnerabilities.filter(v => v.severity === 'high').length,
      mediumCount: vulnerabilities.filter(v => v.severity === 'medium').length,
      lowCount: vulnerabilities.filter(v => v.severity === 'low').length,
    };
    
    // Update the scan with final data
    await Scan.findOneAndUpdate(
      { scanId, userId },
      {
        status: 'completed',
        progress: 100,
        commit: scanId.substring(0, 7),
        summary,
        filesScanned: (randomSeed % 50) + 20, // 20-69 files
        duration: `${(randomSeed % 5) + 1}m ${(randomSeed % 50) + 10}s`, // 1-5m 10-59s
      }
    );
  } catch (error) {
    console.error('Error finalizing scan:', error);
    // Mark the scan as failed
    await Scan.findOneAndUpdate(
      { scanId, userId },
      { status: 'failed' }
    );
  }
}

/**
 * Helper function to get a relative time string
 * @param {Date} date - The date to convert
 * @returns {string} Relative time string (e.g., "2 hours ago")
 */
function getRelativeTimeString(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDays = Math.round(diffHr / 24);
  
  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHr < 24) {
    return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }
}

module.exports = repoScanner;
