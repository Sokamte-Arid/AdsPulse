import React from 'react';
import Layout from '../components/shared/Layout';
import PlatformPerformanceChart from '../components/analytics/PlatformPerformanceChart';

export default function PerformancePage() {
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Performance</h1>
          <p className="page-subtitle">
            See which platforms deliver the best results for your active campaigns
          </p>
        </div>
      </div>
      <PlatformPerformanceChart />
    </Layout>
  );
}
