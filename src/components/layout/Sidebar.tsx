
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Database, 
  FileCode, 
  GitBranch, 
  Settings, 
  BarChart2, 
  Shield, 
  AlertTriangle,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Search, label: 'New Scan', path: '/scan' },
  { icon: AlertTriangle, label: 'Vulnerabilities', path: '/vulnerabilities' },
  { icon: Database, label: 'Repositories', path: '/repositories' },
  { icon: History, label: 'Scan History', path: '/history' },
  { icon: BarChart2, label: 'Reports', path: '/reports' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar = () => {
  const location = useLocation();
  
  return (
    <aside className="w-64 bg-sidebar h-screen flex flex-col border-r border-border/40">
      <div className="flex items-center gap-2 px-6 py-6">
        <Shield className="h-6 w-6 text-shield-primary" />
        <span className="text-xl font-bold text-foreground">
          CodeShield<span className="text-shield-primary">AI</span>
        </span>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 mt-6">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive 
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="px-6 py-4 mt-auto">
        <div className="bg-muted/30 rounded-lg p-4 text-sm">
          <div className="flex items-center">
            <FileCode className="h-4 w-4 text-shield-primary mr-2" />
            <span className="font-medium">Scanner Status</span>
          </div>
          <div className="flex items-center mt-2">
            <div className="h-2 w-2 rounded-full bg-shield-low mr-2 animate-pulse-shield"></div>
            <span className="text-xs text-muted-foreground">Online & Ready</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
