import React, { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { billingAPI } from '../utils/billing';

const PLAN_COLORS = { starter: '#3b82f6', pro: '#7c3aed', agency: '#ec4899' };

function PlanCard({ plan, currentPlan, onSelect, loading }) {
  const isCurrentPlan = currentPlan === plan.id;
  const color = PLAN_COLORS[plan.id] || '#7c3aed';

  return (
    <div style={{
      padding: 28, borderRadius: 16, position: 'relative', transition: 'all 0.2s',
      border: `2px solid ${isCurrentPlan ? color : 'var(--border-subtle)'}`,
      background: isCurrentPlan ? `${color}0d` : 'var(--bg-card)',
      boxShadow: isCurrentPlan ? `0 0 0 1px ${color}33, 0 8px 32px ${color}22` : 'var(--shadow-card)',
      transform: plan.popular && !isCurrentPlan ? 'scale(1.02)' : undefined,
    }}>
      {plan.popular && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff',
          padding: '4px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          whiteSpace: 'nowrap', letterSpacing: '0.05em'
        }}>MOST POPULAR</div>
      )}
      {isCurrentPlan && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          background: `${color}22`, color, border: `1px solid ${color}44`,
          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700
        }}>Current Plan</div>
      )}

      <div style={{ marginBottom: 6 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, marginBottom: 14,
          background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20
        }}>
          {plan.id === 'starter' ? '🌱' : plan.id === 'pro' ? '⚡' : '🏢'}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{plan.name}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
          <span style={{ fontSize: 36, fontWeight: 800, color }}>
            ${plan.price}
          </span>
          <span style={{ fontSize: 14, color: 'var(--text-faint)', fontWeight: 500 }}>/month</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {plan.features.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSelect(plan.id)}
        disabled={isCurrentPlan || loading}
        style={{
          width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
          fontSize: 14, fontWeight: 700, cursor: isCurrentPlan ? 'default' : 'pointer',
          background: isCurrentPlan ? `${color}22` : `linear-gradient(135deg, ${color}, ${color}cc)`,
          color: isCurrentPlan ? color : '#fff',
          transition: 'all 0.2s', opacity: loading ? 0.7 : 1,
        }}
      >
        {isCurrentPlan ? '✓ Active' : `Upgrade to ${plan.name}`}
      </button>
    </div>
  );
}

export default function BillingPage() {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    Promise.all([billingAPI.getPlans(), billingAPI.getStatus()])
      .then(([plansRes, statusRes]) => {
        setPlans(plansRes.data);
        setStatus(statusRes.data);
      })
      .catch(() => {
        setPlans(MOCK_PLANS);
        setStatus(MOCK_STATUS);
      })
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 5000); };

  const handleSelectPlan = async (planId) => {
    setActionLoading(true);
    try {
      const res = await billingAPI.createCheckout(planId);
      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        showToast(res.data.message || 'Stripe checkout ready — add your API key to go live.');
      }
    } catch (err) {
      showToast('Could not start checkout: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePortal = async () => {
    setActionLoading(true);
    try {
      const res = await billingAPI.openPortal();
      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        showToast(res.data.message || 'Add STRIPE_SECRET_KEY to server/.env for billing portal.');
      }
    } catch (err) {
      showToast('Could not open portal: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Layout>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999, maxWidth: 440,
          padding: '14px 20px', borderRadius: 12,
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', color: 'var(--text-primary)',
          fontSize: 13, fontWeight: 500, display: 'flex', gap: 12, alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: 18 }}>ℹ️</span>
          <span>{toast}</span>
          <button onClick={() => setToast('')} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', marginLeft: 'auto', fontSize: 16, padding: 0 }}>✕</button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>Billing & Plans</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>Manage your subscription and payment methods</p>
      </div>

      {/* Current subscription card */}
      {status && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Current Subscription</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {status.plan} Plan
                </span>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)'
                }}>
                  {status.status.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Renews on {new Date(status.currentPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                {status.cancelAtPeriodEnd && <span style={{ color: '#ef4444', marginLeft: 8 }}>· Cancels at period end</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={handlePortal} disabled={actionLoading} style={{ fontSize: 13 }}>
                Manage Subscription
              </button>
            </div>
          </div>

          {/* Payment method */}
          {status.paymentMethod && (
            <div style={{
              marginTop: 20, padding: '14px 18px', borderRadius: 10,
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', gap: 14
            }}>
              <div style={{
                width: 42, height: 28, borderRadius: 6, background: 'linear-gradient(135deg,#1a1464,#2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', fontWeight: 700
              }}>
                {status.paymentMethod.brand.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  •••• •••• •••• {status.paymentMethod.last4}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  Expires {status.paymentMethod.expMonth}/{status.paymentMethod.expYear}
                </div>
              </div>
              <button onClick={handlePortal} style={{
                marginLeft: 'auto', background: 'none', border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)', borderRadius: 8, padding: '5px 12px',
                cursor: 'pointer', fontSize: 12, fontWeight: 600
              }}>
                Update
              </button>
            </div>
          )}
        </div>
      )}

      {/* Plans */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>Choose a Plan</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' }}>
          All plans include a 14-day free trial. No credit card required to start.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 400, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, marginBottom: 40 }}>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlan={status?.plan}
              onSelect={handleSelectPlan}
              loading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Invoices */}
      {status?.invoices?.length > 0 && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
            🧾 Billing History
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {status.invoices.map((inv, idx) => (
              <div key={inv.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0',
                borderBottom: idx < status.invoices.length - 1 ? '1px solid var(--border-subtle)' : 'none'
              }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: 'rgba(124,58,237,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
                  }}>🧾</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      Invoice #{inv.id}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                      {new Date(inv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>${inv.amount}</span>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)'
                  }}>PAID</span>
                  <button style={{
                    background: 'none', border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)', borderRadius: 8, padding: '5px 12px',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600
                  }}>
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stripe integration note */}
      <div style={{
        marginTop: 24, padding: '16px 20px', borderRadius: 12,
        background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)',
        display: 'flex', gap: 14, alignItems: 'flex-start'
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>💳</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Enable Real Payments
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Add your Stripe keys to <code style={{ background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 4 }}>server/.env</code> to activate live billing:
            <br />
            <code style={{ background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: 4, display: 'inline-block', marginTop: 6, fontSize: 11 }}>
              STRIPE_SECRET_KEY=sk_live_...<br/>
              STRIPE_WEBHOOK_SECRET=whsec_...
            </code>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const MOCK_PLANS = [
  { id:'starter', name:'Starter', price:49, interval:'month', color:'#3b82f6', features:['Up to 5 campaigns','3 platforms','Basic analytics','Email support'] },
  { id:'pro',     name:'Pro',     price:149,interval:'month', color:'#7c3aed', popular:true, features:['Unlimited campaigns','All 7 platforms','Advanced analytics','Priority support','Comparative reports','Team members (3)'] },
  { id:'agency',  name:'Agency',  price:399,interval:'month', color:'#ec4899', features:['Unlimited campaigns','All 7 platforms','White-label reports','Dedicated support','API access','Unlimited team members','Custom integrations'] }
];
const MOCK_STATUS = {
  plan:'pro', status:'active',
  currentPeriodEnd: new Date(Date.now()+18*86400000).toISOString(),
  cancelAtPeriodEnd:false,
  paymentMethod:{ brand:'visa', last4:'4242', expMonth:12, expYear:2027 },
  invoices:[
    { id:'inv_001', amount:149, status:'paid', date:new Date(Date.now()-30*86400000).toISOString() },
    { id:'inv_002', amount:149, status:'paid', date:new Date(Date.now()-60*86400000).toISOString() },
    { id:'inv_003', amount:149, status:'paid', date:new Date(Date.now()-90*86400000).toISOString() },
  ]
};
