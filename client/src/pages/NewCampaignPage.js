import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import ObjectiveStep from '../components/campaigns/ObjectiveStep';
import PlatformBudgetStep from '../components/campaigns/PlatformBudgetStep';
import CreativeStep from '../components/campaigns/CreativeStep';
import CampaignDetailsStep from '../components/campaigns/CampaignDetailsStep';
import { campaignAPI } from '../utils/api';
import { PlatformIcons, PLATFORMS, CAMPAIGN_OBJECTIVES } from '../utils/platforms';

const STEPS = [
  { id: 'objective', label: 'Objective', icon: '🎯' },
  { id: 'platforms', label: 'Platforms & Budget', icon: '💰' },
  { id: 'details', label: 'Details & Targeting', icon: '🎯' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'review', label: 'Review', icon: '✅' }
];

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [campaignData, setCampaignData] = useState({
    name: '',
    objective: '',
    status: 'draft',
    platforms: [],
    startDate: '',
    endDate: '',
    currency: 'USD',
    tags: [],
    notes: '',
    platformTargeting: { ageMin: 18, ageMax: 65, genders: [], locations: [], interests: [] },
    creative: {
      type: 'single_image',
      headline: '',
      description: '',
      callToAction: 'Learn More',
      destinationType: 'website',
      destinationUrl: '',
      items: [{ mediaType: 'image', mediaUrl: '', headline: '', description: '', link: '' }]
    }
  });

  const updateField = (field, value) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!campaignData.objective;
      case 1: return campaignData.platforms?.length > 0;
      case 2: return !!campaignData.name;
      case 3: return true;
      default: return true;
    }
  };

  const handleSubmit = async (status = 'draft') => {
    setSaving(true);
    setError('');
    try {
      const platforms = (campaignData.platforms || []).map(p => ({
        ...p,
        objective: campaignData.objective,
        targeting: campaignData.platformTargeting || p.targeting,
        creative: campaignData.creative,
        status
      }));
      const payload = {
        name: campaignData.name,
        objective: campaignData.objective,
        status,
        startDate: campaignData.startDate || undefined,
        endDate: campaignData.endDate || undefined,
        currency: campaignData.currency,
        tags: campaignData.tags,
        notes: campaignData.notes,
        platforms,
        totalBudget: platforms.reduce((s, p) => s + Number(p.budget || 0), 0)
      };
      await campaignAPI.create(payload);
      navigate('/campaigns');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  const stepProps = { data: campaignData, onChange: updateField };

  return (
    <Layout>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: '#e8e0f5', margin: '0 0 6px' }}>
              Create Campaign
            </h1>
            <p style={{ color: '#8b7baa', margin: 0, fontSize: 14 }}>
              Step {currentStep + 1} of {STEPS.length} — {STEPS[currentStep].label}
            </p>
          </div>
          <button
            onClick={() => navigate('/campaigns')}
            style={{ background: 'none', border: '1px solid rgba(139,92,246,0.2)', color: '#8b7baa', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}
          >
            ← Back to Campaigns
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 40, position: 'relative' }}>
          {STEPS.map((step, idx) => {
            const done = idx < currentStep;
            const active = idx === currentStep;
            return (
              <React.Fragment key={step.id}>
                <div
                  onClick={() => idx < currentStep && setCurrentStep(idx)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    flex: 1, cursor: idx < currentStep ? 'pointer' : 'default'
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', zIndex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    background: done ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : active ? 'rgba(124,58,237,0.2)' : 'rgba(26,16,51,0.8)',
                    border: `2px solid ${done || active ? '#7c3aed' : 'rgba(139,92,246,0.2)'}`,
                    color: done ? 'white' : active ? '#c084fc' : '#6b7280',
                    fontWeight: 700, transition: 'all 0.3s',
                    boxShadow: active ? '0 0 20px rgba(124,58,237,0.4)' : 'none'
                  }}>
                    {done ? '✓' : step.icon}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: active ? '#c084fc' : done ? '#a855f7' : '#6b7280', textAlign: 'center' }}>
                    {step.label}
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div style={{
                    height: 2, flex: 1, marginTop: 17, background: idx < currentStep ? 'linear-gradient(90deg, #7c3aed, #a855f7)' : 'rgba(139,92,246,0.15)'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
          {currentStep === 0 && <ObjectiveStep {...stepProps} />}
          {currentStep === 1 && <PlatformBudgetStep {...stepProps} />}
          {currentStep === 2 && <CampaignDetailsStep {...stepProps} />}
          {currentStep === 3 && <CreativeStep {...stepProps} />}
          {currentStep === 4 && <ReviewStep data={campaignData} />}
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={currentStep === 0}
            className="btn-secondary"
            style={{ opacity: currentStep === 0 ? 0.4 : 1 }}
          >
            ← Previous
          </button>

          <div style={{ display: 'flex', gap: 12 }}>
            {currentStep === STEPS.length - 1 ? (
              <>
                <button className="btn-secondary" onClick={() => handleSubmit('draft')} disabled={saving}>
                  Save as Draft
                </button>
                <button className="btn-primary" onClick={() => handleSubmit('active')} disabled={saving}>
                  {saving ? 'Launching...' : '🚀 Launch Campaign'}
                </button>
              </>
            ) : (
              <button
                className="btn-primary"
                onClick={() => setCurrentStep(s => s + 1)}
                disabled={!canProceed()}
                style={{ opacity: canProceed() ? 1 : 0.5 }}
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ReviewStep({ data }) {
  const obj = CAMPAIGN_OBJECTIVES.find(o => o.id === data.objective);

  return (
    <div>
      <h2 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: '#e8e0f5', margin: '0 0 24px' }}>
        Review your campaign
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SummaryBlock label="Campaign Name" value={data.name || 'Untitled'} />
        <SummaryBlock label="Objective" value={obj ? `${obj.icon} ${obj.label}` : '—'} />
        <SummaryBlock label="Start Date" value={data.startDate || 'Not set'} />
        <SummaryBlock label="End Date" value={data.endDate || 'Not set'} />
        <SummaryBlock label="Currency" value={data.currency} />
        <SummaryBlock label="Ad Format" value={data.creative?.type?.replace(/_/g, ' ')} />
        <SummaryBlock label="Total Budget" value={`$${(data.platforms || []).reduce((s, p) => s + Number(p.budget || 0), 0).toFixed(2)}`} />
        <SummaryBlock label="Platforms" value={(data.platforms || []).length + ' selected'} />
      </div>

      {(data.platforms || []).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#8b7baa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            PLATFORM BREAKDOWN
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data.platforms || []).map(p => {
              const pl = PLATFORMS.find(x => x.id === p.platform);
              const Icon = PlatformIcons[p.platform];
              return (
                <div key={p.platform} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, background: 'rgba(26,16,51,0.6)', border: `1px solid ${pl?.color}22` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {Icon && <Icon size={20} />}
                    <span style={{ fontWeight: 600, color: '#e8e0f5', fontSize: 14 }}>{pl?.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#c084fc' }}>${Number(p.budget || 0).toFixed(2)} {p.budgetType === 'daily' ? '/day' : 'total'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryBlock({ label, value }) {
  return (
    <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(26,16,51,0.6)', border: '1px solid rgba(139,92,246,0.15)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#e8e0f5', textTransform: 'capitalize' }}>{value || '—'}</div>
    </div>
  );
}
