
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Database, GitBranch, Search, AlertTriangle, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { scannerService } from '@/services/scannerService';

const RepositoriesPage = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch repositories data
  const { data: repositories, isLoading, error, refetch } = useQuery({
    queryKey: ['repositories'],
    queryFn: scannerService.getRepositories
  });

  // Handle form submission for scanning
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) {
      toast({
        variant: "destructive",
        title: "Repository URL required",
        description: "Please enter a repository URL to scan",
      });
      return;
    }

    setIsScanning(true);
    try {
      const scanId = await scannerService.scanRepository(repoUrl, branch);
      toast({
        title: "Scan initiated",
        description: "Your repository scan has been started",
      });
      
      // Navigate to results page with the scan ID
      navigate('/results', { state: { scanId } });
    } catch (error) {
      console.error('Scan error:', error);
      toast({
        variant: "destructive",
        title: "Scan failed",
        description: error instanceof Error ? error.message : "Failed to start repository scan",
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Repositories</h1>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-shield-primary" />
            <span className="text-sm text-muted-foreground">Connected Repositories</span>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Scan New Repository</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="repoUrl">Repository URL</Label>
                  <Input 
                    id="repoUrl"
                    placeholder="https://github.com/username/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Input 
                    id="branch"
                    placeholder="main"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" disabled={isScanning} className="bg-shield-primary hover:bg-shield-primary/90">
                {isScanning ? "Scanning..." : "Scan Repository"}
                <Search className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-shield-primary" />
              Monitored Repositories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 text-shield-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <p>Error loading repositories: {error instanceof Error ? error.message : "Unknown error"}</p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Repository</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Last Scan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repositories && repositories.length > 0 ? (
                    repositories.map((repo) => (
                      <TableRow key={repo.id}>
                        <TableCell className="font-medium">{repo.name}</TableCell>
                        <TableCell>{repo.branch}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {repo.lastScan}
                        </TableCell>
                        <TableCell>
                          {repo.status === 'vulnerable' ? (
                            <div className="flex items-center gap-1 text-shield-high">
                              <AlertTriangle className="h-4 w-4" />
                              <span>{repo.vulnerabilities} {repo.vulnerabilities === 1 ? 'issue' : 'issues'}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-shield-low">
                              <CheckCircle className="h-4 w-4" />
                              <span>Secure</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/results?repo=${repo.id}`)}>
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={5}>
                        No repositories connected yet. Add a repository to start monitoring.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
          {repositories && repositories.length > 0 && (
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {repositories.length} repositories
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/repositories')}>
                View All
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </MainLayout>
  );
};

export default RepositoriesPage;
