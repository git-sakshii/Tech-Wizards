
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/dashboard/StatCard';
import ScanForm from '@/components/scanning/ScanForm';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { scannerService, DashboardDataType } from '@/services/scannerService';
import { 
  AlertTriangle, 
  ArrowRight, 
  GitBranch, 
  History, 
  SearchCode, 
  Shield, 
  Terminal,
  Loader2
} from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Fetch dashboard data
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: scannerService.getDashboardData,
  });

  // Handle errors in data fetching
  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading dashboard",
        description: error instanceof Error ? error.message : "Failed to load dashboard data",
      });
    }
  }, [error, toast]);

  // Fallback data in case of loading or error
  const displayData: Partial<DashboardDataType> = dashboardData || {
    activeRepositories: 0,
    openVulnerabilities: 0,
    recentScansCount: 0,
    fixedIssues: 0,
    recentScans: [],
    topVulnerabilities: []
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-8">
        <section>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <Button 
              variant="default" 
              className="bg-shield-primary hover:bg-shield-primary/90"
              onClick={() => navigate('/scan')}
            >
              <SearchCode className="mr-2 h-4 w-4" />
              New Scan
            </Button>
          </div>
        
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 text-shield-primary animate-spin" />
              <span className="ml-2 text-lg">Loading dashboard data...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Active Repositories" 
                value={displayData.activeRepositories?.toString() || "0"} 
                icon={GitBranch}
                description="Total repositories being monitored"
              />
              <StatCard 
                title="Open Vulnerabilities" 
                value={displayData.openVulnerabilities?.toString() || "0"} 
                icon={AlertTriangle}
                variant="danger"
                trend={{ value: 12, isPositive: false }}
                description="Across all repositories"
              />
              <StatCard 
                title="Recent Scans" 
                value={displayData.recentScansCount?.toString() || "0"} 
                icon={History}
                description="In the last 7 days"
              />
              <StatCard 
                title="Fixed Issues" 
                value={displayData.fixedIssues?.toString() || "0"} 
                icon={Shield}
                variant="success"
                trend={{ value: 23, isPositive: true }}
                description="Issues resolved this month"
              />
            </div>
          )}
        </section>
        
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-shield-primary" />
                  Recent Scans
                </CardTitle>
                <CardDescription>
                  Results from your most recent code security scans
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 text-shield-primary animate-spin" />
                  </div>
                ) : dashboardData?.recentScans && dashboardData.recentScans.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.recentScans.map((scan) => (
                      <div 
                        key={scan.id} 
                        className="flex items-center justify-between p-3 bg-card rounded-md border border-border/40"
                      >
                        <div>
                          <h3 className="font-medium flex items-center gap-1.5">
                            <GitBranch className="h-4 w-4 text-shield-primary" />
                            {scan.repo}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">Scanned {scan.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            scan.issues > 0 
                              ? 'bg-shield-high/10 text-shield-high' 
                              : 'bg-shield-low/10 text-shield-low'
                          }`}>
                            {scan.issues} {scan.issues === 1 ? 'issue' : 'issues'}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(`/results?repo=${scan.id}`)}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">No recent scans found</p>
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => navigate('/scan')}
                    >
                      Start your first scan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-shield-primary" />
                  Top Vulnerabilities
                </CardTitle>
                <CardDescription>
                  Critical issues needing attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 text-shield-primary animate-spin" />
                  </div>
                ) : dashboardData?.topVulnerabilities && dashboardData.topVulnerabilities.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.topVulnerabilities.map((vuln) => (
                      <div 
                        key={vuln.id} 
                        className={`p-3 rounded-md ${
                          vuln.severity === 'critical' ? 'vulnerability-high' : 
                          vuln.severity === 'high' ? 'vulnerability-high' : 
                          vuln.severity === 'medium' ? 'vulnerability-medium' : 
                          'vulnerability-low'
                        }`}
                      >
                        <h3 className="font-medium text-sm">{vuln.type}</h3>
                        <p className="text-xs text-muted-foreground mt-1">in {vuln.location}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6">
                    <p className="text-muted-foreground text-center">No vulnerabilities detected</p>
                  </div>
                )}
                <div className="mt-4">
                  <Link to="/vulnerabilities">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="sm"
                    >
                      View All Issues
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-bold mb-4">Start a New Scan</h2>
          <ScanForm />
        </section>
      </div>
    </MainLayout>
  );
};

export default Index;
