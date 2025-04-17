
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchCode, GitBranch, Upload, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { scannerService } from '@/services/scannerService';

interface RepoFile {
  name: string;
  path: string;
  type: string;
  selected: boolean;
}

const ScanForm = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [scanType, setScanType] = useState('quick');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [language, setLanguage] = useState('all');
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [showFileList, setShowFileList] = useState(false);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchRepoFiles = async () => {
    if (!repoUrl) {
      toast({
        title: "Repository URL required",
        description: "Please enter a valid Git repository URL",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoadingFiles(true);
    setShowFileList(false);
    
    try {
      const files = await scannerService.getRepositoryFiles(repoUrl, branch);
      
      // Filter for code files and format them
      const codeFiles = files
        .filter(file => /\.(js|jsx|ts|tsx|py|java|go|rb|php|c|cpp|cs)$/i.test(file.path))
        .map(file => ({
          ...file,
          selected: false
        }));
      
      setRepoFiles(codeFiles);
      setShowFileList(true);
      
      toast({
        title: "Repository files loaded",
        description: `Found ${codeFiles.length} code files in the repository`,
      });
    } catch (error) {
      console.error('Error fetching repository files:', error);
      toast({
        variant: "destructive",
        title: "Failed to fetch repository files",
        description: error instanceof Error ? error.message : "Could not access repository files",
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const toggleFileSelection = (index: number) => {
    const updatedFiles = [...repoFiles];
    updatedFiles[index].selected = !updatedFiles[index].selected;
    setRepoFiles(updatedFiles);
  };

  const toggleSelectAll = (select: boolean) => {
    const updatedFiles = repoFiles.map(file => ({
      ...file,
      selected: select
    }));
    setRepoFiles(updatedFiles);
  };

  const handleRepoScan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedFiles = repoFiles.filter(file => file.selected);
    
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to scan",
        variant: "destructive"
      });
      return;
    }
    
    setIsScanning(true);
    setScanProgress(0);
    
    try {
      // Start the scan with selected files
      const scanId = await scannerService.scanRepositoryFiles(repoUrl, selectedFiles.map(f => f.path), branch);
      
      toast({
        title: "Scan initiated",
        description: `Started scanning ${selectedFiles.length} files from repository`,
      });
      
      // Set up progress polling
      scannerService.pollScanStatus(
        scanId,
        (statusInfo) => {
          setScanProgress(statusInfo.progress);
          
          // When scan is complete, navigate to results page
          if (statusInfo.status === 'completed') {
            toast({
              title: "Scan completed",
              description: "Your repository scan has finished successfully."
            });
            setIsScanning(false);
            navigate(`/results?scanId=${scanId}`);
          } else if (statusInfo.status === 'failed') {
            toast({
              title: "Scan failed",
              description: "There was an error during the scan process.",
              variant: "destructive"
            });
            setIsScanning(false);
          }
        }
      );
    } catch (error) {
      console.error('Scan error:', error);
      toast({
        variant: "destructive",
        title: "Scan failed",
        description: error instanceof Error ? error.message : "Failed to start repository scan",
      });
      setIsScanning(false);
    }
  };

  const handleFileScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one file to scan",
        variant: "destructive"
      });
      return;
    }
    
    setIsScanning(true);
    setScanProgress(0);
    
    try {
      // Use the progress interval to show scanning progress
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.floor(Math.random() * 10) + 1;
        });
      }, 500);
      
      // Use the uploadAndScanFile method
      const result = await scannerService.uploadAndScanFile(uploadedFiles[0]);
      
      // Set to 100% when done
      clearInterval(progressInterval);
      setScanProgress(100);
      
      if (result.vulnerabilities && result.vulnerabilities.length > 0) {
        toast({
          title: "Scan completed",
          description: `Found ${result.vulnerabilities.length} issues in your code`,
        });
      } else {
        toast({
          title: "Scan completed",
          description: "No issues were found in your code",
        });
      }
      
      setIsScanning(false);
      
      // Navigate to results page with the scan ID
      navigate(`/results?scanId=${result.id}`);
    } catch (error) {
      console.error('File scan error:', error);
      toast({
        variant: "destructive",
        title: "Scan failed",
        description: error instanceof Error ? error.message : "Failed to scan file",
      });
      setIsScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <SearchCode className="h-5 w-5 text-shield-primary" />
          New Security Scan
        </CardTitle>
        <CardDescription>
          Scan your code for security vulnerabilities and receive AI-powered fix suggestions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="repository" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="repository" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Git Repository
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Files
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="repository" className="mt-4">
            <form onSubmit={handleRepoScan}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="repoUrl" className="text-sm font-medium mb-1.5 block">
                    Repository URL
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="repoUrl"
                      placeholder="https://github.com/username/repository"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      disabled={isScanning || isLoadingFiles}
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      onClick={fetchRepoFiles}
                      disabled={isScanning || isLoadingFiles || !repoUrl}
                    >
                      {isLoadingFiles ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      List Files
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="branch" className="text-sm font-medium mb-1.5 block">
                      Branch
                    </label>
                    <Input
                      id="branch"
                      placeholder="main"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      disabled={isScanning || isLoadingFiles}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="scanType" className="text-sm font-medium mb-1.5 block">
                      Scan Type
                    </label>
                    <Select value={scanType} onValueChange={setScanType} disabled={isScanning}>
                      <SelectTrigger id="scanType">
                        <SelectValue placeholder="Select scan type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quick">Quick Scan</SelectItem>
                        <SelectItem value="deep">Deep Scan</SelectItem>
                        <SelectItem value="custom">Custom Scan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {showFileList && repoFiles.length > 0 && (
                  <div className="mt-4 border rounded-md p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-md font-medium">Repository Files</h3>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSelectAll(true)}
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSelectAll(false)}
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto border rounded-md">
                      <table className="min-w-full">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="w-16 px-3 py-2 text-left text-xs font-medium text-muted-foreground"></th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">File</th>
                            <th className="w-24 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {repoFiles.map((file, index) => (
                            <tr key={file.path} className="hover:bg-muted/30">
                              <td className="px-3 py-2">
                                <Checkbox
                                  checked={file.selected}
                                  onCheckedChange={() => toggleFileSelection(index)}
                                />
                              </td>
                              <td className="px-3 py-2 text-sm truncate max-w-xs" title={file.path}>
                                {file.path}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                {file.path.split('.').pop()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-2 text-sm text-muted-foreground">
                      {repoFiles.filter(f => f.selected).length} of {repoFiles.length} files selected
                    </div>
                  </div>
                )}
                
                {isScanning && (
                  <div className="mt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Scanning repository...</span>
                      <span className="text-sm">{scanProgress}%</span>
                    </div>
                    <Progress value={scanProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      This may take a few minutes depending on repository size
                    </p>
                  </div>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="mt-6 w-full bg-shield-primary hover:bg-shield-primary/90"
                disabled={isScanning || !showFileList || repoFiles.filter(f => f.selected).length === 0}
              >
                {isScanning ? "Scanning..." : "Start Repository Scan"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="files" className="mt-4">
            <form onSubmit={handleFileScan}>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".js,.ts,.jsx,.tsx,.py,.java,.go,.rb,.php,.cs,.c,.cpp"
                    disabled={isScanning}
                  />
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <h3 className="text-lg font-medium">Drag files here or click to upload</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Support for .py, .js, .ts, .java, .go, .rb files
                  </p>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={triggerFileInput}
                    disabled={isScanning}
                  >
                    Select Files
                  </Button>
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="bg-muted/30 rounded-md p-3">
                    <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
                      <Upload className="h-4 w-4" />
                      {uploadedFiles.length} file(s) selected
                    </p>
                    <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                      {uploadedFiles.map((file, index) => (
                        <li key={index} className="text-muted-foreground">
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {isScanning && (
                  <div className="mt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Analyzing code...</span>
                      <span className="text-sm">{scanProgress}%</span>
                    </div>
                    <Progress value={scanProgress} className="h-2" />
                  </div>
                )}
                
                <div>
                  <label htmlFor="fileScanType" className="text-sm font-medium mb-1.5 block">
                    Scan Type
                  </label>
                  <Select value={scanType} onValueChange={setScanType} disabled={isScanning}>
                    <SelectTrigger id="fileScanType">
                      <SelectValue placeholder="Select scan type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick">Quick Scan</SelectItem>
                      <SelectItem value="deep">Deep Scan</SelectItem>
                      <SelectItem value="custom">Custom Scan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="mt-6 w-full bg-shield-primary hover:bg-shield-primary/90"
                disabled={isScanning || uploadedFiles.length === 0}
              >
                {isScanning ? "Scanning..." : "Start File Scan"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-border/30 px-6 py-4 mt-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mr-1.5" />
          All scans are performed securely and your code is not stored
        </div>
      </CardFooter>
    </Card>
  );
};

export default ScanForm;
