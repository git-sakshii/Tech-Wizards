
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Terminal, Shield, Code } from 'lucide-react';

const Documentation = () => {
  const sections = [
    {
      title: 'Getting Started',
      icon: BookOpen,
      content: 'Learn how to set up CodeShield and start scanning your first repository.'
    },
    {
      title: 'Security Rules',
      icon: Shield,
      content: 'Understand the security rules and vulnerability detection patterns used by CodeShield.'
    },
    {
      title: 'API Reference',
      icon: Code,
      content: 'Integrate CodeShield into your CI/CD pipeline using our REST API.'
    },
    {
      title: 'CLI Usage',
      icon: Terminal,
      content: 'Use CodeShield from your terminal for automated security scanning.'
    }
  ];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="h-6 w-6 text-shield-primary" />
          <h1 className="text-2xl font-bold">Documentation</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title} className="hover:border-shield-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-shield-primary" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{section.content}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Documentation;
