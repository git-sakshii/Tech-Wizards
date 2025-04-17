
import React from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Code, Server } from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-shield-dark text-foreground">
      {/* Hero Section */}
      <header className="w-full py-6 px-6 md:px-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-shield-primary" />
          <span className="text-xl font-bold">
            CodeShield<span className="text-shield-primary">AI</span>
          </span>
        </div>
        <div className="flex gap-4">
          <Link to="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link to="/signup">
            <Button>Sign Up</Button>
          </Link>
        </div>
      </header>

      <main>
        {/* Hero Banner */}
        <section className="py-16 px-6 md:px-10 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-shield-primary to-shield-secondary">
              Secure Your Code with AI-Powered Analysis
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              CodeShield AI scans your code for security vulnerabilities and suggests fixes, keeping your applications safe from cyber threats.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started
                </Button>
              </Link>
              <Link to="/docs">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-muted/20">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-card p-6 rounded-lg border border-border">
                <Lock className="h-10 w-10 text-shield-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Security Vulnerability Detection</h3>
                <p className="text-muted-foreground">Identify common security issues like SQL Injection, hardcoded secrets, and unsafe function usage.</p>
              </div>
              <div className="bg-card p-6 rounded-lg border border-border">
                <Code className="h-10 w-10 text-shield-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">AI-Powered Fix Suggestions</h3>
                <p className="text-muted-foreground">Get intelligent code fixes and improvements based on industry best practices.</p>
              </div>
              <div className="bg-card p-6 rounded-lg border border-border">
                <Server className="h-10 w-10 text-shield-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Repository Scanning</h3>
                <p className="text-muted-foreground">Scan entire Git repositories to detect vulnerabilities across multiple files and directories.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="py-10 px-6 md:px-10 border-t border-border text-center text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto">
          <p>© {new Date().getFullYear()} CodeShield AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
