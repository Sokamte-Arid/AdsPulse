import React, { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const ROLE_COLORS = {
  owner:   { bg:'rgba(124,58,237,0.15)', color:'#a855f7', border:'rgba(124,58,237,0.3)' },
  admin:   { bg:'rgba(37,99,235,0.12)',  color:'#3b82f6', border:'rgba(37,99,235,0.3)'  },
  manager: { bg:'rgba(22,163,74,0.12)',  color:'#16a34a', border:'rgba(22,163,74,0.3)'  },
  viewer:  { bg:'rgba(107,114,128,0.12)',color:'#6b7280', border:'rgba(107,114,128,0.3)'},
};

const ROLE_PERMS = {
  owner:   ['Full access', 'Manage team', 'Billing', 'All campaigns'],
  admin:   ['All campaigns', 'Manage team', 'View billing'],
  manager: ['Create & edit campaigns', 'View analytics'],
  viewer:  ['View campaigns & analytics only'],
};

export default function TeamPage() {
  const { user } = useAuth();
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [toast, setToast] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  useEffect(() => {
    fetchOrg();
  }, []);

  const fetchOrg = async () => {
    try {
      const res = await api.get('/organization/my');
      if (res.data) {
        setOrg(res.data);
        const membersRes = await api.get('/organization/my/members');
        setMembers(membersRes.data || []);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/organization', { name: orgName, currency: 'USD' });
      setOrg(res.data);
      setMembers([{ userId: { _id: user.id, name: user.name, email: user.email }, role: 'owner' }]);
      showToast('✅ Organization created!');
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message));
    } finally { setCreating(false); }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.post('/organization/my/invite', { email: inviteEmail, role: inviteRole });
      showToast(`✅ Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message));
    } finally { setInviting(false); }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.patch(`/organization/my/members/${memberId}`, { role: newRole });
      setMembers(ms => ms.map(m => m.userId?._id === memberId ? { ...m, role: newRole } : m));
      showToast('✅ Role updated');
    } catch (err) { showToast('❌ ' + err.message); }
  };

  const handleRemove = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from the team?`)) return;
    try {
      await api.delete(`/organization/my/members/${memberId}`);
      setMembers(ms => ms.filter(m => m.userId?._id !== memberId));
      showToast(`Removed ${memberName}`);
    } catch (err) { showToast('❌ ' + err.message); }
  };

  return (
    <Layout>
      {toast && (
        <div style={{ position:'fixed',top:20,right:20,zIndex:9999,padding:'13px 18px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border-subtle)',boxShadow:'0 8px 32px rgba(0,0,0,0.2)',fontSize:13,color:'var(--text-primary)',animation:'slideIn 0.3s ease-out',maxWidth:360 }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Manage your organization and invite team members</p>
        </div>
        {org && (
          <button className="btn-primary" onClick={() => setShowInviteForm(!showInviteForm)}>
            + Invite Member
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:70,borderRadius:12 }}/>)}
        </div>
      ) : !org ? (
        /* No org yet — create one */
        <div className="glass-card" style={{ padding:40,textAlign:'center',maxWidth:500,margin:'0 auto' }}>
          <div style={{ fontSize:56,marginBottom:16 }}>🏢</div>
          <h2 style={{ fontSize:20,fontWeight:800,color:'var(--text-primary)',margin:'0 0 8px' }}>Create Your Organization</h2>
          <p style={{ fontSize:13,color:'var(--text-muted)',margin:'0 0 28px',lineHeight:1.7 }}>
            Set up an organization to invite team members, share campaigns, and collaborate on ads management.
          </p>
          <div style={{ display:'flex',gap:10,maxWidth:360,margin:'0 auto' }}>
            <input className="form-input" placeholder="Organization name" value={orgName} onChange={e=>setOrgName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleCreateOrg()}/>
            <button className="btn-primary" onClick={handleCreateOrg} disabled={creating||!orgName.trim()} style={{ flexShrink:0 }}>
              {creating?'Creating...':'Create'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Org info */}
          <div className="glass-card" style={{ padding:22,marginBottom:24,display:'flex',gap:20,alignItems:'center',flexWrap:'wrap' }}>
            <div style={{ width:48,height:48,borderRadius:12,background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>
              🏢
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:18,fontWeight:800,color:'var(--text-primary)',marginBottom:2 }}>{org.name}</div>
              <div style={{ fontSize:12,color:'var(--text-muted)' }}>
                {members.length} member{members.length!==1?'s':''} · Plan: <strong style={{ color:'var(--purple-light)',textTransform:'capitalize' }}>{org.plan}</strong>
              </div>
            </div>
            <div style={{ display:'flex',gap:16 }}>
              {[{label:'Members',value:members.length},{label:'Plan',value:org.plan?.toUpperCase()}].map(s=>(
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:18,fontWeight:800,color:'var(--text-primary)' }}>{s.value}</div>
                  <div style={{ fontSize:11,color:'var(--text-faint)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Invite form */}
          {showInviteForm && (
            <div className="glass-card" style={{ padding:22,marginBottom:24 }}>
              <h3 style={{ fontSize:15,fontWeight:700,color:'var(--text-primary)',margin:'0 0 16px' }}>Invite a Team Member</h3>
              <div style={{ display:'grid',gridTemplateColumns:'1fr auto auto',gap:10,alignItems:'end' }}>
                <div>
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/>
                </div>
                <div>
                  <label className="form-label">Role</label>
                  <select className="form-input" value={inviteRole} onChange={e=>setInviteRole(e.target.value)} style={{ width:'auto',minWidth:130 }}>
                    <option value="viewer">Viewer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button className="btn-primary" onClick={handleInvite} disabled={inviting||!inviteEmail} style={{ height:42 }}>
                  {inviting?'Sending...':'Send Invite'}
                </button>
              </div>
              {/* Role descriptions */}
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10,marginTop:16 }}>
                {Object.entries(ROLE_PERMS).filter(([r])=>r!=='owner').map(([role,perms])=>{
                  const c = ROLE_COLORS[role];
                  return (
                    <div key={role} style={{ padding:'10px 12px',borderRadius:10,background:c.bg,border:`1px solid ${c.border}` }}>
                      <div style={{ fontSize:12,fontWeight:700,color:c.color,textTransform:'capitalize',marginBottom:6 }}>{role}</div>
                      {perms.map(p=><div key={p} style={{ fontSize:11,color:'var(--text-muted)',marginBottom:2 }}>· {p}</div>)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Members list */}
          <div className="glass-card" style={{ padding:24 }}>
            <h3 style={{ fontSize:16,fontWeight:700,color:'var(--text-primary)',margin:'0 0 20px' }}>
              Team Members ({members.length})
            </h3>
            <div style={{ display:'flex',flexDirection:'column',gap:0 }}>
              {members.map((m, idx) => {
                const memberUser = m.userId || {};
                const isMe = memberUser._id === user?.id;
                const isOwner = m.role === 'owner';
                const rc = ROLE_COLORS[m.role] || ROLE_COLORS.viewer;
                return (
                  <div key={idx} style={{ display:'flex',alignItems:'center',gap:14,padding:'14px 0',borderBottom:idx<members.length-1?'1px solid var(--border-subtle)':'none',flexWrap:'wrap' }}>
                    <div style={{ width:38,height:38,borderRadius:'50%',background:`linear-gradient(135deg,${rc.color},${rc.color}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:'white',flexShrink:0 }}>
                      {memberUser.name?.[0]?.toUpperCase()||'?'}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:14,fontWeight:700,color:'var(--text-primary)',display:'flex',alignItems:'center',gap:8 }}>
                        {memberUser.name || 'Unknown'}
                        {isMe && <span style={{ fontSize:10,padding:'2px 7px',borderRadius:10,background:'rgba(124,58,237,0.15)',color:'var(--purple-light)',fontWeight:700 }}>You</span>}
                      </div>
                      <div style={{ fontSize:12,color:'var(--text-faint)' }}>{memberUser.email}</div>
                    </div>
                    <div>
                      <span style={{ padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:rc.bg,color:rc.color,border:`1px solid ${rc.border}`,textTransform:'capitalize' }}>
                        {m.role}
                      </span>
                    </div>
                    {!isMe && !isOwner && (
                      <div style={{ display:'flex',gap:8 }}>
                        <select
                          value={m.role}
                          onChange={e=>handleRoleChange(memberUser._id,e.target.value)}
                          style={{ padding:'5px 10px',borderRadius:8,border:'1px solid var(--border-subtle)',background:'var(--bg-input)',color:'var(--text-primary)',fontSize:12,cursor:'pointer' }}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button onClick={()=>handleRemove(memberUser._id,memberUser.name)} style={{ padding:'5px 10px',borderRadius:8,border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',color:'#ef4444',cursor:'pointer',fontSize:12,fontWeight:600 }}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pending invites section if any */}
            {org.pendingInvites?.length > 0 && (
              <div style={{ marginTop:24,paddingTop:20,borderTop:'1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize:13,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 14px' }}>
                  Pending Invitations ({org.pendingInvites.length})
                </h4>
                {org.pendingInvites.map((inv,i) => (
                  <div key={i} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--border-subtle)' }}>
                    <div style={{ width:36,height:36,borderRadius:'50%',background:'var(--bg-elevated)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>✉️</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13,fontWeight:600,color:'var(--text-primary)' }}>{inv.email}</div>
                      <div style={{ fontSize:11,color:'var(--text-faint)' }}>Invited as {inv.role} · Expires {new Date(inv.expiresAt).toLocaleDateString()}</div>
                    </div>
                    <span style={{ fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(217,119,6,0.12)',color:'#d97706',border:'1px solid rgba(217,119,6,0.3)',fontWeight:700 }}>PENDING</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
