
import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, FileCode, Search, Lightbulb, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { scannerService, VulnerabilityType } from '@/services/scannerService';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const VulnerabilitiesPage = () => {
  const [selectedVulnerability, setSelectedVulnerability] = useState<VulnerabilityType | null>(null);
  const [isLoadingFix, setIsLoadingFix] = useState(false);
  const [suggestedFix, setSuggestedFix] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch vulnerabilities data
  const { data: vulnerabilities, isLoading, error, refetch } = useQuery({
    queryKey: ['vulnerabilities'],
    queryFn: scannerService.getVulnerabilities
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500';
      case 'high':
        return 'bg-shield-high/10 text-shield-high';
      case 'medium':
        return 'bg-amber-500/10 text-amber-500';
      case 'low':
        return 'bg-shield-low/10 text-shield-low';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-shield-high/10 text-shield-high';
      case 'fixed':
        return 'bg-shield-low/10 text-shield-low';
      case 'ignored':
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const handleGetFix = async (vulnerabilityId: string, code: string, type: string) => {
    setIsLoadingFix(true);
    setSuggestedFix(null);
    
    try {
      const fix = await scannerService.getSuggestedFix(vulnerabilityId, code, type);
      setSuggestedFix(fix);
    } catch (error) {
      console.error('Get fix error:', error);
      toast({
        variant: "destructive",
        title: "Failed to get fix suggestion",
        description: error instanceof Error ? error.message : "Could not generate fix suggestion",
      });
    } finally {
      setIsLoadingFix(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Vulnerabilities</h1>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-shield-primary" />
            <span className="text-sm text-muted-foreground">Security Status: Monitoring</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-shield-primary" />
              Detected Vulnerabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 text-shield-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <p>Error loading vulnerabilities: {error instanceof Error ? error.message : "Unknown error"}</p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vulnerabilities && vulnerabilities.length > 0 ? (
                    vulnerabilities.map((vuln) => (
                      <TableRow key={vuln.id}>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(vuln.severity)}`}>
                            {vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{vuln.type}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{vuln.location.file}:{vuln.location.line}</span>
                            <span className="text-xs text-muted-foreground">{vuln.repo || 'Unknown repository'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vuln.status)}`}>
                            {vuln.status.charAt(0).toUpperCase() + vuln.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedVulnerability(vuln);
                                  setSuggestedFix(null); // Reset suggestion when opening a new vulnerability
                                }}
                              >
                                View Details
                              </Button>
                            </DialogTrigger>
                            {selectedVulnerability && (
                              <DialogContent className="sm:max-w-[625px]">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-shield-primary" />
                                    {selectedVulnerability.type}
                                  </DialogTitle>
                                  <DialogDescription>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(selectedVulnerability.severity)}`}>
                                      {selectedVulnerability.severity.charAt(0).toUpperCase() + selectedVulnerability.severity.slice(1)}
                                    </span>
                                    {' '}in{' '}
                                    <span className="font-mono text-xs">{selectedVulnerability.location.file}:{selectedVulnerability.location.line}</span>
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <Tabs defaultValue="details">
                                  <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                    <TabsTrigger value="code">Code</TabsTrigger>
                                    <TabsTrigger value="fix">Fix</TabsTrigger>
                                  </TabsList>
                                  
                                  <TabsContent value="details" className="space-y-4">
                                    <div>
                                      <h4 className="text-sm font-medium mb-1">Description</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedVulnerability.description}
                                      </p>
                                    </div>
                                    
                                    <div>
                                      <h4 className="text-sm font-medium mb-1">Affected Repository</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedVulnerability.repo || 'Unknown repository'}
                                      </p>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="code">
                                    <div className="bg-muted p-4 rounded-md">
                                      <pre className="text-sm font-mono overflow-x-auto">
                                        <code>
                                          {selectedVulnerability.code}
                                        </code>
                                      </pre>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="fix" className="space-y-4">
                                    {suggestedFix ? (
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <Lightbulb className="h-4 w-4 text-amber-500" />
                                          <h4 className="text-sm font-medium">Suggested Fix</h4>
                                        </div>
                                        <div className="bg-muted p-4 rounded-md">
                                          <p className="text-sm whitespace-pre-wrap">
                                            {suggestedFix}
                                          </p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center py-6">
                                        <Button 
                                          onClick={() => handleGetFix(
                                            selectedVulnerability.id, 
                                            selectedVulnerability.code, 
                                            selectedVulnerability.type
                                          )}
                                          disabled={isLoadingFix}
                                        >
                                          {isLoadingFix ? "Generating..." : "Generate Fix Suggestion"}
                                          <Lightbulb className="ml-2 h-4 w-4" />
                                        </Button>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          Using Gemini AI to analyze and suggest fixes
                                        </p>
                                      </div>
                                    )}
                                  </TabsContent>
                                </Tabs>
                              </DialogContent>
                            )}
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={5}>
                        No vulnerabilities detected yet. Run a security scan to check for potential issues.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {vulnerabilities?.length || 0} vulnerabilities
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/scan')}>
              <Search className="mr-2 h-4 w-4" />
              Run New Scan
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default VulnerabilitiesPage;
