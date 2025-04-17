
import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSearch, BarChart2, Calendar, ArrowRight, FilePieChart, Shield, AlertTriangle, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ReportsPage = () => {
  const [timeRange, setTimeRange] = useState('30');

  // Mock data for charts
  const vulnerabilityTrends = [
    { name: 'Jan', critical: 5, high: 8, medium: 12, low: 10 },
    { name: 'Feb', critical: 3, high: 10, medium: 8, low: 12 },
    { name: 'Mar', critical: 6, high: 7, medium: 10, low: 14 },
    { name: 'Apr', critical: 2, high: 5, medium: 15, low: 8 },
    { name: 'May', critical: 1, high: 4, medium: 7, low: 10 },
    { name: 'Jun', critical: 0, high: 3, medium: 5, low: 7 },
  ];

  // Mock reports
  const reports = [
    {
      id: '1',
      title: 'Monthly Security Review',
      date: 'June 1, 2025',
      type: 'summary',
      description: 'Overview of all security scans and fixes for the past month',
    },
    {
      id: '2',
      title: 'API Server Vulnerability Assessment',
      date: 'May 15, 2025',
      type: 'assessment',
      description: 'Detailed analysis of vulnerabilities in the API server codebase',
    },
    {
      id: '3',
      title: 'Web Application Penetration Test',
      date: 'April 28, 2025',
      type: 'pentest',
      description: 'Results from penetration testing of the web application',
    },
  ];

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'summary':
        return <FilePieChart className="h-4 w-4 text-shield-primary" />;
      case 'assessment':
        return <Layers className="h-4 w-4 text-amber-500" />;
      case 'pentest':
        return <Shield className="h-4 w-4 text-purple-500" />;
      default:
        return <FileSearch className="h-4 w-4 text-shield-primary" />;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Security Reports</h1>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-shield-primary" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">
                Vulnerability Trends
              </CardTitle>
              <BarChart2 className="h-4 w-4 text-shield-primary" />
            </CardHeader>
            <CardContent>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={vulnerabilityTrends}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    stackOffset="sign"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" />
                    <Bar dataKey="high" stackId="a" fill="#f97316" name="High" />
                    <Bar dataKey="medium" stackId="a" fill="#f59e0b" name="Medium" />
                    <Bar dataKey="low" stackId="a" fill="#10b981" name="Low" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">Critical</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-xs text-muted-foreground">High</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs text-muted-foreground">Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">Low</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">
                Security Metrics
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-shield-primary" />
            </CardHeader>
            <CardContent>
              <div className="mt-4 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-sm text-muted-foreground">Open Vulnerabilities</div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold">8</div>
                    <div className="text-sm text-muted-foreground">Fixed This Month</div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold">85%</div>
                    <div className="text-sm text-muted-foreground">Code Coverage</div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold">24h</div>
                    <div className="text-sm text-muted-foreground">Avg. Fix Time</div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-shield-low/10 border border-shield-low/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-shield-low" />
                    <div className="font-medium">Security Score: A</div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your overall security posture is good. Recent improvements in
                    vulnerability remediation have strengthened your security score.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-shield-primary" />
              Latest Reports
            </CardTitle>
            <CardDescription>
              View and download security assessment reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div 
                    key={report.id} 
                    className="flex items-center justify-between p-4 bg-card rounded-md border border-border/40 hover:border-shield-primary/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getReportIcon(report.type)}
                      </div>
                      <div>
                        <h3 className="font-medium">{report.title}</h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">{report.date}</span>
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                            {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {report.description}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">
                  No reports available yet. Complete scans to generate reports.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {reports.length} reports
            </div>
            <Button variant="outline">
              View All Reports
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
