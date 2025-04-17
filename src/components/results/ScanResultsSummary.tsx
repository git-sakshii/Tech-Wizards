
import React from 'react';
import { AlertTriangle, Clock, FileCode, Shield } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ScanResultsSummaryProps {
  totalIssues: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  scanDuration: string;
  filesScanned: number;
  repositoryName?: string;
  status: 'completed' | 'in-progress';
  progress?: number;
}

const ScanResultsSummary: React.FC<ScanResultsSummaryProps> = ({
  totalIssues,
  highSeverity,
  mediumSeverity,
  lowSeverity,
  scanDuration,
  filesScanned,
  repositoryName,
  status,
  progress = 100
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-shield-primary" />
            Scan Results {repositoryName && `for ${repositoryName}`}
          </CardTitle>
          <Badge
            variant="outline"
            className={
              status === 'completed'
                ? 'bg-shield-low/10 text-shield-low border-shield-low/30'
                : 'bg-shield-warning/10 text-shield-warning border-shield-warning/30'
            }
          >
            {status === 'completed' ? 'Scan Complete' : 'Scan in Progress'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {status === 'in-progress' && (
          <div className="mb-6">
            <div className="flex justify-between mb-2 text-sm">
              <span>Scanning repository...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-md p-3 border border-border/40">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-shield-warning" />
              <span className="text-sm font-medium">Total Issues</span>
            </div>
            <p className="text-2xl font-bold mt-2">{totalIssues}</p>
          </div>
          
          <div className="bg-card rounded-md p-3 border border-border/40">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-shield-high" />
              <span className="text-sm font-medium">High Risk</span>
            </div>
            <p className="text-2xl font-bold mt-2">{highSeverity}</p>
          </div>
          
          <div className="bg-card rounded-md p-3 border border-border/40">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-shield-medium" />
              <span className="text-sm font-medium">Medium Risk</span>
            </div>
            <p className="text-2xl font-bold mt-2">{mediumSeverity}</p>
          </div>
          
          <div className="bg-card rounded-md p-3 border border-border/40">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-shield-low" />
              <span className="text-sm font-medium">Low Risk</span>
            </div>
            <p className="text-2xl font-bold mt-2">{lowSeverity}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1.5 text-muted-foreground" />
            <span className="text-muted-foreground">Scan duration:</span>
            <span className="ml-1.5 font-medium">{scanDuration}</span>
          </div>
          
          <div className="flex items-center">
            <FileCode className="h-4 w-4 mr-1.5 text-muted-foreground" />
            <span className="text-muted-foreground">Files scanned:</span>
            <span className="ml-1.5 font-medium">{filesScanned}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScanResultsSummary;
