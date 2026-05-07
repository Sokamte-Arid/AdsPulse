import React from 'react';
import Layout from '../components/shared/Layout';
import CompareAnalytics from '../components/analytics/CompareAnalytics';

export default function ComparePage() {
  return (
    <Layout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: '#e8e0f5', margin: '0 0 6px' }}>
          Period Comparison
        </h1>
        <p style={{ color: '#8b7baa', margin: 0, fontSize: 14 }}>
          Compare KPIs across two date ranges to track progress and identify trends
        </p>
      </div>
      <CompareAnalytics />
    </Layout>
  );
}
