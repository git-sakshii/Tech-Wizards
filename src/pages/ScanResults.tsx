
import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  Download, 
  FileJson, 
  Share2, 
  ShieldCheck,
  Loader2
} from 'lucide-react';
import ScanResultsSummary from '@/components/results/ScanResultsSummary';
import VulnerabilityCard, { Vulnerability } from '@/components/results/VulnerabilityCard';
import { scannerService, ScanResultType } from '@/services/scannerService';

const ScanResults = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { toast } = useToast();
  
  const scanId = searchParams.get('scanId');
  const codeResult = location.state?.codeResult; // For direct code scans
  
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanResults, setScanResults] = useState<ScanResultType | null>(null);
  const [selectedTab, setSelectedTab] = useState('all');
  
  // Load results or start scanning progress tracking
  useEffect(() => {
    const initResults = async () => {
      // Already have direct results (from file upload)
      if (codeResult) {
        processScanResults(codeResult);
        return;
      }
      
      // No scan ID provided
      if (!scanId) {
        toast({
          variant: "destructive",
          title: "No scan specified",
          description: "No scan ID was provided to display results for."
        });
        return;
      }
      
      try {
        setLoading(true);
        
        // Check scan status first
        const statusInfo = await scannerService.getScanStatus(scanId);
        
        if (statusInfo.status === 'completed') {
          // Scan is already complete, load results
          const results = await scannerService.getScanResults(scanId);
          processScanResults(results);
        } else if (statusInfo.status === 'failed') {
          // Scan failed
          toast({
            variant: "destructive",
            title: "Scan failed",
            description: "The scan could not be completed."
          });
        } else {
          // Scan is still in progress, start tracking
          setScanning(true);
          setProgress(statusInfo.progress);
          
          const stopPolling = scannerService.pollScanStatus(
            scanId,
            (status) => {
              setProgress(status.progress);
              
              if (status.status === 'completed') {
                setScanning(false);
                // Fetch the results
                scannerService.getScanResults(scanId)
                  .then(results => {
                    processScanResults(results);
                  })
                  .catch(error => {
                    console.error('Error fetching results:', error);
                    toast({
                      variant: "destructive",
                      title: "Failed to load results",
                      description: error instanceof Error ? error.message : "Could not retrieve scan results"
                    });
                  });
              } else if (status.status === 'failed') {
                setScanning(false);
                toast({
                  variant: "destructive",
                  title: "Scan failed",
                  description: "The scan could not be completed."
                });
              }
            }
          );
          
          // Clean up poller when component unmounts
          return () => stopPolling();
        }
      } catch (error) {
        console.error('Error initializing results:', error);
        toast({
          variant: "destructive",
          title: "Error loading results",
          description: error instanceof Error ? error.message : "Failed to load scan results."
        });
      } finally {
        setLoading(false);
      }
    };
    
    initResults();
  }, [scanId, codeResult, toast]);
  
  // Process scan results to display
  const processScanResults = (results: ScanResultType) => {
    setScanResults(results);
  };
  
  // Map API vulnerability data to component format
  const mapVulnerabilities = (): Vulnerability[] => {
    if (!scanResults) return [];
    
    return scanResults.vulnerabilities.map(vuln => ({
      id: vuln.id,
      title: vuln.type,
      description: vuln.description,
      severity: vuln.severity,
      lineNumber: vuln.location.line,
      fileName: vuln.location.file,
      code: vuln.code,
      fix: vuln.suggestedFix ? {
        description: 'AI Suggested Fix',
        code: vuln.suggestedFix
      } : undefined,
      cweId: getRandomCweId(vuln.type),
      references: getReferencesForType(vuln.type)
    }));
  };
  
  // Helper to get CWE ID based on vulnerability type
  const getRandomCweId = (type: string): string => {
    const cweMap: Record<string, string> = {
      'SQL Injection': '89',
      'Cross-site Scripting (XSS)': '79',
      'Hardcoded Secret': '798',
      'Insecure Cookie': '614',
      'Path Traversal': '22',
      'Outdated Dependency': '1104',
      'Unsafe Deserialization': '502',
      'Command Injection': '77',
      'Insecure Direct Object Reference': '639',
      'Sensitive Data Exposure': '200'
    };
    
    return cweMap[type] || '1000';
  };
  
  // Helper to get references based on vulnerability type
  const getReferencesForType = (type: string): string[] => {
    const referenceMap: Record<string, string[]> = {
      'SQL Injection': ['https://owasp.org/www-community/attacks/SQL_Injection', 'https://cwe.mitre.org/data/definitions/89.html'],
      'Cross-site Scripting (XSS)': ['https://owasp.org/www-community/attacks/xss/', 'https://cwe.mitre.org/data/definitions/79.html'],
      'Hardcoded Secret': ['https://cwe.mitre.org/data/definitions/798.html'],
      'Insecure Cookie': ['https://owasp.org/www-community/controls/SecureCookieAttribute', 'https://cwe.mitre.org/data/definitions/614.html'],
      'Path Traversal': ['https://owasp.org/www-community/attacks/Path_Traversal', 'https://cwe.mitre.org/data/definitions/22.html'],
      'Command Injection': ['https://owasp.org/www-community/attacks/Command_Injection', 'https://cwe.mitre.org/data/definitions/77.html']
    };
    
    return referenceMap[type] || ['https://owasp.org/www-project-top-ten/'];
  };
  
  // Filter vulnerabilities by severity
  const filteredVulnerabilities = () => {
    const all = mapVulnerabilities();
    
    if (selectedTab === 'all') {
      return all;
    }
    
    return all.filter(v => v.severity === selectedTab);
  };

  // Apply all fixes and download the fixed code
  const applyAllFixes = async () => {
    if (!scanResults) return;
    
    try {
      setApplying(true);
      
      const filesToFix = scanResults.vulnerabilities.reduce((acc, vuln) => {
        if (!vuln.suggestedFix) return acc;
        
        // Group vulnerabilities by filename
        const fileName = vuln.location.file;
        if (!acc[fileName]) {
          acc[fileName] = {
            fileName,
            vulnerabilities: []
          };
        }
        
        acc[fileName].vulnerabilities.push({
          lineNumber: vuln.location.line,
          code: vuln.code,
          fix: vuln.suggestedFix
        });
        
        return acc;
      }, {} as Record<string, { fileName: string; vulnerabilities: Array<{ lineNumber: number; code: string; fix: string }> }>);
      
      // Apply fixes file by file
      const fixResults = await Promise.all(
        Object.values(filesToFix).map(file => 
          scannerService.applyFixesToFile(scanId, file.fileName, file.vulnerabilities)
        )
      );
      
      // Create a zip file with all the fixed files
      const fixedFilesBlob = await scannerService.createFixedFilesArchive(fixResults);
      
      // Create download link
      const url = URL.createObjectURL(fixedFilesBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fixed-code.zip';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Fixes applied successfully",
        description: "Fixed code has been downloaded as a ZIP file",
      });
    } catch (error) {
      console.error('Error applying fixes:', error);
      toast({
        variant: "destructive",
        title: "Failed to apply fixes",
        description: error instanceof Error ? error.message : "Could not apply fixes to code"
      });
    } finally {
      setApplying(false);
    }
  };

  // Export scan results as JSON
  const exportResults = () => {
    if (!scanResults) return;
    
    const dataStr = JSON.stringify(scanResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `scan-results-${scanResults.id}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Scan Results</h1>
          <div className="flex gap-2">
            {!loading && !scanning && scanResults && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1.5"
                  onClick={exportResults}
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button 
                  size="sm" 
                  className="bg-shield-primary hover:bg-shield-primary/90 flex items-center gap-1.5"
                  onClick={applyAllFixes}
                  disabled={applying || !scanResults?.vulnerabilities.some(v => !!v.suggestedFix)}
                >
                  {applying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShieldCheck className="h-4 w-4" />}
                  {applying ? "Applying Fixes..." : "Fix All Issues"}
                </Button>
              </>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 text-shield-primary animate-spin" />
            <span className="ml-3 text-lg">Loading scan results...</span>
          </div>
        ) : scanning ? (
          <ScanResultsSummary 
            totalIssues={0}
            highSeverity={0}
            mediumSeverity={0}
            lowSeverity={0}
            scanDuration="In progress"
            filesScanned={0}
            repositoryName={scanResults?.repositoryUrl?.split('/').pop()}
            status="in-progress"
            progress={progress}
          />
        ) : scanResults ? (
          <>
            <ScanResultsSummary 
              totalIssues={scanResults.summary.totalVulnerabilities}
              highSeverity={scanResults.summary.criticalCount + scanResults.summary.highCount}
              mediumSeverity={scanResults.summary.mediumCount}
              lowSeverity={scanResults.summary.lowCount}
              scanDuration={scanResults.timestamp}
              filesScanned={scanResults.vulnerabilities.length}
              repositoryName={scanResults.repositoryUrl.split('/').pop()}
              status="completed"
            />
            
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList>
                <TabsTrigger value="all" className="flex items-center gap-1.5">
                  All Issues ({scanResults.summary.totalVulnerabilities})
                </TabsTrigger>
                <TabsTrigger value="high" className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-shield-high" />
                  High ({scanResults.summary.criticalCount + scanResults.summary.highCount})
                </TabsTrigger>
                <TabsTrigger value="medium" className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-shield-medium" />
                  Medium ({scanResults.summary.mediumCount})
                </TabsTrigger>
                <TabsTrigger value="low" className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-shield-low" />
                  Low ({scanResults.summary.lowCount})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value={selectedTab} className="mt-6">
                <div className="space-y-4">
                  {filteredVulnerabilities().length > 0 ? (
                    filteredVulnerabilities().map(vulnerability => (
                      <VulnerabilityCard key={vulnerability.id} vulnerability={vulnerability} />
                    ))
                  ) : (
                    <div className="text-center py-8 bg-muted/20 rounded-lg border border-border/40">
                      <p className="text-muted-foreground">No vulnerabilities found for this severity level</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-20 bg-muted/20 rounded-lg border border-border/40">
            <FileJson className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg">No scan results available</p>
            <p className="text-muted-foreground mt-2">Please initiate a new scan to view results</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ScanResults;
