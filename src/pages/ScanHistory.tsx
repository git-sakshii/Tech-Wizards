
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, Download, GitBranch, AlertTriangle, Loader2, FileJson } from 'lucide-react';
import { Link } from 'react-router-dom';
import { scannerService, ScanResultType } from '@/services/scannerService';
import { useToast } from '@/hooks/use-toast';

const ScanHistory = () => {
  const [scanHistory, setScanHistory] = useState<ScanResultType[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchScanHistory = async () => {
      try {
        setLoading(true);
        const history = await scannerService.getScanHistory();
        setScanHistory(history);
      } catch (error) {
        console.error('Error fetching scan history:', error);
        toast({
          variant: "destructive",
          title: "Failed to load scan history",
          description: error instanceof Error ? error.message : "Could not retrieve scan history"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchScanHistory();
  }, [toast]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Export scan history as JSON
  const exportHistory = () => {
    if (scanHistory.length === 0) return;
    
    const dataStr = JSON.stringify(scanHistory, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'scan-history.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-shield-primary" />
            <h1 className="text-2xl font-bold">Scan History</h1>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportHistory}
            disabled={scanHistory.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export History
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 text-shield-primary animate-spin" />
            <span className="ml-3 text-lg">Loading scan history...</span>
          </div>
        ) : scanHistory.length > 0 ? (
          <div className="grid gap-4">
            {scanHistory.map((scan) => (
              <Card key={scan.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-shield-primary" />
                      <span className="font-medium">{scan.repositoryUrl.split('/').pop()}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(scan.timestamp)} - Branch: {scan.branch || 'main'}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-shield-high" />
                        <span className="text-sm">{scan.summary.criticalCount + scan.summary.highCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-shield-medium" />
                        <span className="text-sm">{scan.summary.mediumCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-shield-low" />
                        <span className="text-sm">{scan.summary.lowCount}</span>
                      </div>
                    </div>
                    <Button asChild size="sm">
                      <Link to={`/results?scanId=${scan.id}`}>View Results</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/20 rounded-lg border border-border/40">
            <FileJson className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg mb-2">No scan history found</p>
            <p className="text-muted-foreground mb-6">Run your first security scan to see results here</p>
            <Button asChild>
              <Link to="/scan">Start New Scan</Link>
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ScanHistory;
