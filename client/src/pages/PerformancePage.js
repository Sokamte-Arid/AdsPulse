import React from 'react';
import Layout from '../components/shared/Layout';
import PlatformPerformanceChart from '../components/analytics/PlatformPerformanceChart';

export default function PerformancePage() {
  return (
    <Layout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: '#e8e0f5', margin: '0 0 6px' }}>
          Platform Performance
        </h1>
        <p style={{ color: '#8b7baa', margin: 0, fontSize: 14 }}>
          See which platforms are delivering the best results for your active campaigns
        </p>
      </div>
      <PlatformPerformanceChart />
    </Layout>
  );
}
