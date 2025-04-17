
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ScanForm from '@/components/scanning/ScanForm';

const ScanPage = () => {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">New Security Scan</h1>
        <ScanForm />
      </div>
    </MainLayout>
  );
};

export default ScanPage;
