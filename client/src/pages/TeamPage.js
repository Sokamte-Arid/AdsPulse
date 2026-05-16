import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const ROLE_COLORS = {
  owner:   { bg:'rgba(124,58,237,0.12)', color:'#a855f7', border:'rgba(124,58,237,0.3)' },
  admin:   { bg:'rgba(37,99,235,0.12)',  color:'#3b82f6', border:'rgba(37,99,235,0.3)'  },
  manager: { bg:'rgba(22,163,74,0.12)',  color:'#16a34a', border:'rgba(22,163,74,0.3)'  },
  viewer:  { bg:'rgba(107,114,128,0.12)',color:'#6b7280', border:'rgba(107,114,128,0.3)'},
};

const ROLE_DESCRIPTIONS = {
  owner:   'Full access — manage team, billing, all campaigns and settings.',
  admin:   'Manage campaigns and team members, view billing.',
  manager: 'Create and edit campaigns, view analytics.',
  viewer:  'Read-only access to campaigns and analytics.',
};

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.viewer;
  return (
    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
      background:c.bg, color:c.color, border:`1px solid ${c.border}`,
      textTransform:'capitalize', whiteSpace:'nowrap' }}>
      {role}
    </span>
  );
}

function timeAgo(date) {
  if (!date) return 'Never';
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)       return 'Just now';
  if (diff < 3600)     return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)    return `${Math.floor(diff/3600)}h ago`;
  if (diff < 86400*30) return `${Math.floor(diff/86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function TeamPage() {
  const { user } = useAuth();
  const [org,            setOrg]            = useState(null);
  const [members,        setMembers]        = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [orgName,        setOrgName]        = useState('');
  const [creating,       setCreating]       = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail,    setInviteEmail]    = useState('');
  const [inviteRole,     setInviteRole]     = useState('viewer');
  const [inviting,       setInviting]       = useState(false);
  const [resending,      setResending]      = useState(null);
  const [devLinks,       setDevLinks]       = useState([]);
  const [toast,          setToast]          = useState({ msg:'', type:'info' });

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'info' }), 5000);
  };

  const fetchOrg = useCallback(async () => {
    try {
      const orgRes = await api.get('/organization/my');
      if (orgRes.data) {
        setOrg(orgRes.data);
        const membersRes = await api.get('/organization/my/members');
        setMembers(membersRes.data.members || []);
        setPendingInvites(membersRes.data.pendingInvites || []);
      }
    } catch (err) {
      console.error('[TeamPage] fetchOrg error:', err.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrg(); }, [fetchOrg]);

  // ── Determine current user's role in the org ────────────────────────────────
  const myMember = members.find(m => m.userId?._id === user?.id);
  const myRole   = myMember?.role || (org?.ownerId === user?.id ? 'owner' : null);
  const isOwner  = myRole === 'owner';
  const canManageTeam = isOwner || myRole === 'admin';
  const canChangeRoles = isOwner; // only owner changes roles

  // ── Create org ──────────────────────────────────────────────────────────────
  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/organization', { name: orgName.trim() });
      setOrg(res.data);
      setMembers([{ userId:{ _id:user.id, name:user.name, email:user.email }, role:'owner', joinedAt:new Date() }]);
      setPendingInvites([]);
      showToast('✅ Organization created!', 'success');
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message), 'error');
    } finally { setCreating(false); }
  };

  // ── Send invite ─────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    if (!inviteEmail.trim()) { showToast('❌ Please enter an email address', 'error'); return; }
    setInviting(true);
    try {
      const res = await api.post('/organization/my/invite', {
        email: inviteEmail.trim(), role: inviteRole
      });
      if (res.data.acceptUrl) {
        setDevLinks(dl => [
          ...dl.filter(l => l.email !== inviteEmail.trim()),
          { email: inviteEmail.trim(), role: inviteRole, url: res.data.acceptUrl }
        ]);
      }
      showToast(res.data.message, res.data.emailSent ? 'success' : 'info');
      setInviteEmail(''); // clear email, keep form open for next invite
      // Refresh to show new pending invite
      const membersRes = await api.get('/organization/my/members');
      setPendingInvites(membersRes.data.pendingInvites || []);
      setMembers(membersRes.data.members || []);
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message), 'error');
    } finally { setInviting(false); }
  };

  // ── Resend invite ───────────────────────────────────────────────────────────
  const handleResend = async (email) => {
    setResending(email);
    try {
      const res = await api.post('/organization/my/invite/resend', { email });
      if (res.data.acceptUrl) {
        setDevLinks(dl => [...dl.filter(l => l.email !== email), { email, url: res.data.acceptUrl }]);
      }
      showToast(res.data.message, 'info');
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message), 'error');
    } finally { setResending(null); }
  };

  // ── Cancel invite ───────────────────────────────────────────────────────────
  const handleCancelInvite = async (email) => {
    try {
      await api.delete(`/organization/my/invite/${encodeURIComponent(email)}`);
      setPendingInvites(pi => pi.filter(i => i.email !== email));
      setDevLinks(dl => dl.filter(l => l.email !== email));
      showToast('Invitation cancelled');
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
  };

  // ── Change role ─────────────────────────────────────────────────────────────
  const handleRoleChange = async (memberId, newRole, memberName) => {
    try {
      console.log(`[TeamPage] Changing role of ${memberName} (${memberId}) to ${newRole}`);
      await api.patch(`/organization/my/members/${memberId}`, { role: newRole });
      // Update local state immediately
      setMembers(ms => ms.map(m =>
        m.userId?._id === memberId ? { ...m, role: newRole } : m
      ));
      showToast(`✅ ${memberName}'s role changed to ${newRole}`, 'success');
    } catch (err) {
      console.error('[Role Change]', err.response?.data || err.message);
      showToast('❌ ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  // ── Remove member ───────────────────────────────────────────────────────────
  const handleRemove = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from the team?`)) return;
    try {
      await api.delete(`/organization/my/members/${memberId}`);
      setMembers(ms => ms.filter(m => m.userId?._id !== memberId));
      showToast(`Removed ${memberName}`);
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const toastStyles = {
    success: { bg:'rgba(22,163,74,0.12)',  border:'rgba(22,163,74,0.3)'  },
    error:   { bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.3)'  },
    info:    { bg:'rgba(37,99,235,0.1)',   border:'rgba(37,99,235,0.25)' },
  };

  return (
    <Layout>
      {/* Toast */}
      {toast.msg && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, maxWidth:420, padding:'14px 18px', borderRadius:12,
          background:toastStyles[toast.type]?.bg, border:`1px solid ${toastStyles[toast.type]?.border}`,
          boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)',
          animation:'slideIn 0.3s ease-out', display:'flex', gap:10, alignItems:'flex-start' }}>
          <span style={{ flex:1, lineHeight:1.5 }}>{toast.msg}</span>
          <button onClick={() => setToast({msg:'',type:'info'})}
            style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', fontSize:16, padding:0 }}>✕</button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Manage your organization and collaborate with your team</p>
        </div>
        {/* Always show Invite button if user can manage team and org exists */}
        {org && canManageTeam && (
          <button className="btn-primary" onClick={() => setShowInviteForm(!showInviteForm)}>
            {showInviteForm ? '✕ Close' : '+ Invite Members'}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:72, borderRadius:12 }}/>)}
        </div>

      ) : !org ? (
        /* ── Create Organization ── */
        <div style={{ maxWidth:540, margin:'0 auto' }}>
          <div className="glass-card" style={{ padding:40, textAlign:'center' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🏢</div>
            <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 8px' }}>
              Create Your Organization
            </h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 28px', lineHeight:1.7 }}>
              Set up an organization to invite unlimited team members with different access levels.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <input className="form-input" placeholder="e.g. KM-Com Marketing"
                value={orgName} onChange={e => setOrgName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateOrg()}
                style={{ maxWidth:300 }}/>
              <button className="btn-primary" onClick={handleCreateOrg}
                disabled={creating || !orgName.trim()} style={{ flexShrink:0 }}>
                {creating ? '⏳...' : 'Create'}
              </button>
            </div>
          </div>

          {/* Role descriptions */}
          <div style={{ marginTop:20, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
            {Object.entries(ROLE_DESCRIPTIONS).filter(([r]) => r !== 'owner').map(([role, desc]) => {
              const c = ROLE_COLORS[role];
              return (
                <div key={role} style={{ padding:'14px 16px', borderRadius:12, background:'var(--bg-card)', border:`1px solid ${c.border}` }}>
                  <div style={{ fontSize:12, fontWeight:700, color:c.color, textTransform:'capitalize', marginBottom:6 }}>{role}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{desc}</div>
                </div>
              );
            })}
          </div>
        </div>

      ) : (
        <>
          {/* ── Org info ── */}
          <div className="glass-card" style={{ padding:22, marginBottom:20, display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ width:52, height:52, borderRadius:14, flexShrink:0, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🏢</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', marginBottom:2 }}>{org.name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                {members.length} member{members.length !== 1 ? 's' : ''}
                {pendingInvites.length > 0 && ` · ${pendingInvites.length} pending invite${pendingInvites.length !== 1 ? 's' : ''}`}
                {' · '}
                <span style={{ color:'var(--purple-light)', fontWeight:600, textTransform:'capitalize' }}>
                  Your role: {myRole || 'member'}
                </span>
              </div>
            </div>
            <div style={{ display:'flex', gap:20 }}>
              {[
                { label:'Members', value:members.length },
                { label:'Pending', value:pendingInvites.length },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)' }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'var(--text-faint)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Invite Form — stays open, clear after each send ── */}
          {showInviteForm && canManageTeam && (
            <div className="glass-card" style={{ padding:24, marginBottom:20 }}>
              <div style={{ marginBottom:14 }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 4px' }}>
                  Invite a Team Member
                </h3>
                <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>
                  The form stays open after each invite — add as many members as you want
                </p>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:10, alignItems:'end', marginBottom:14 }}>
                <div>
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="colleague@company.com"
                    value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInvite()}/>
                </div>
                <div>
                  <label className="form-label">Access Level</label>
                  <select className="form-input" value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    style={{ width:'auto', minWidth:130 }}>
                    <option value="viewer">Viewer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button className="btn-primary" onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()} style={{ height:42, whiteSpace:'nowrap' }}>
                  {inviting ? '⏳...' : '✉️ Send Invite'}
                </button>
              </div>

              {/* Role description */}
              <div style={{ padding:'10px 14px', borderRadius:8, background:'var(--bg-elevated)', fontSize:12, color:'var(--text-muted)', borderLeft:`3px solid ${ROLE_COLORS[inviteRole]?.color}` }}>
                <strong style={{ color:ROLE_COLORS[inviteRole]?.color, textTransform:'capitalize' }}>{inviteRole}:</strong>{' '}
                {ROLE_DESCRIPTIONS[inviteRole]}
              </div>
            </div>
          )}

          {/* ── Dev invite links ── */}
          {devLinks.length > 0 && (
            <div className="glass-card" style={{ padding:22, marginBottom:20, border:'1px solid rgba(37,99,235,0.25)', background:'rgba(37,99,235,0.05)' }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#3b82f6', marginBottom:14 }}>
                📧 SMTP not configured — share these invite links manually:
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {devLinks.map(link => (
                  <div key={link.email} style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', minWidth:200 }}>
                      {link.email}
                      {link.role && <span style={{ marginLeft:6, color:ROLE_COLORS[link.role]?.color, textTransform:'capitalize' }}>({link.role})</span>}
                    </div>
                    <input readOnly value={link.url}
                      style={{ flex:1, padding:'6px 10px', borderRadius:8, background:'var(--bg-input)', border:'1px solid var(--border-subtle)', color:'var(--text-primary)', fontSize:11, fontFamily:'DM Mono,monospace', minWidth:0 }}
                      onClick={e => e.target.select()}/>
                    <button className="btn-secondary" style={{ fontSize:11, padding:'6px 10px', flexShrink:0 }}
                      onClick={() => { navigator.clipboard.writeText(link.url); showToast(`✅ Link copied for ${link.email}`, 'success'); }}>
                      📋 Copy
                    </button>
                    <button onClick={() => setDevLinks(dl => dl.filter(l => l.email !== link.email))}
                      style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', fontSize:16, padding:0 }}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:10 }}>
                Configure SMTP_USER and SMTP_PASS in server/.env to send real emails automatically.
              </div>
            </div>
          )}

          {/* ── Members List ── */}
          <div className="glass-card" style={{ padding:24, marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', margin:'0 0 6px' }}>
              Team Members ({members.length})
            </h3>
            <p style={{ fontSize:12, color:'var(--text-muted)', margin:'0 0 20px' }}>
              {canChangeRoles ? 'Use the dropdown to change a member\'s access level, or remove them from the team.' : 'Contact the owner to change access levels.'}
            </p>

            <div style={{ display:'flex', flexDirection:'column' }}>
              {members.map((m, idx) => {
                const memberUser = m.userId || {};
                const isMe    = memberUser._id === user?.id;
                const isOwnerMember = m.role === 'owner';
                const canEdit = canChangeRoles && !isMe && !isOwnerMember;

                return (
                  <div key={`${memberUser._id}-${idx}`} style={{
                    display:'flex', alignItems:'center', gap:14, padding:'16px 0',
                    borderBottom: idx < members.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    flexWrap:'wrap'
                  }}>
                    {/* Avatar */}
                    <div style={{ width:42, height:42, borderRadius:'50%', flexShrink:0,
                      background:`linear-gradient(135deg,${ROLE_COLORS[m.role]?.color||'#7c3aed'},${ROLE_COLORS[m.role]?.color||'#a855f7'}88)`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:16, fontWeight:700, color:'white' }}>
                      {memberUser.name?.[0]?.toUpperCase() || '?'}
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>
                          {memberUser.name || 'Unknown'}
                        </span>
                        {isMe && (
                          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10,
                            background:'rgba(124,58,237,0.15)', color:'var(--purple-light)', fontWeight:700 }}>
                            You
                          </span>
                        )}
                        <RoleBadge role={m.role}/>
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-faint)' }}>
                        {memberUser.email}
                        {m.joinedAt && ` · Joined ${timeAgo(m.joinedAt)}`}
                        {memberUser.lastLogin && ` · Active ${timeAgo(memberUser.lastLogin)}`}
                      </div>
                    </div>

                    {/* Actions — only show if current user can manage */}
                    {canEdit && (
                      <div style={{ display:'flex', gap:8, flexShrink:0, alignItems:'center' }}>
                        <div>
                          <label style={{ fontSize:10, color:'var(--text-faint)', display:'block', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                            Access Level
                          </label>
                          <select
                            value={m.role}
                            onChange={e => handleRoleChange(memberUser._id, e.target.value, memberUser.name)}
                            style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border-subtle)',
                              background:'var(--bg-input)', color:'var(--text-primary)', fontSize:12, cursor:'pointer',
                              fontFamily:'DM Sans,sans-serif' }}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div style={{ paddingTop:18 }}>
                          <button onClick={() => handleRemove(memberUser._id, memberUser.name)}
                            style={{ padding:'6px 12px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)',
                              background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer',
                              fontSize:12, fontWeight:600 }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Pending Invitations ── */}
          {pendingInvites.length > 0 && (
            <div className="glass-card" style={{ padding:24 }}>
              <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', margin:'0 0 20px' }}>
                Pending Invitations ({pendingInvites.length})
              </h3>
              <div style={{ display:'flex', flexDirection:'column' }}>
                {pendingInvites.map((inv, idx) => {
                  const expired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
                  return (
                    <div key={`${inv.email}-${idx}`} style={{
                      display:'flex', alignItems:'center', gap:14, padding:'14px 0',
                      borderBottom: idx < pendingInvites.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      flexWrap:'wrap', opacity: expired ? 0.6 : 1
                    }}>
                      <div style={{ width:40, height:40, borderRadius:'50%', flexShrink:0,
                        background:'var(--bg-elevated)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                        ✉️
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>
                          {inv.email}
                        </div>
                        <div style={{ fontSize:12, color:'var(--text-faint)' }}>
                          Invited as{' '}
                          <strong style={{ color:ROLE_COLORS[inv.role]?.color, textTransform:'capitalize' }}>{inv.role}</strong>
                          {' · '}
                          {expired
                            ? <span style={{ color:'#ef4444' }}>Expired</span>
                            : inv.expiresAt ? `Expires ${timeAgo(inv.expiresAt)}` : 'Pending'}
                        </div>
                      </div>
                      {canManageTeam && (
                        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                          <button onClick={() => handleResend(inv.email)} disabled={resending === inv.email}
                            style={{ padding:'5px 12px', borderRadius:8, border:'1px solid var(--border-subtle)',
                              background:'var(--bg-elevated)', color:'var(--text-muted)', cursor:'pointer',
                              fontSize:12, fontWeight:600 }}>
                            {resending === inv.email ? '⏳...' : '🔄 Resend'}
                          </button>
                          <button onClick={() => handleCancelInvite(inv.email)}
                            style={{ padding:'5px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)',
                              background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer',
                              fontSize:12, fontWeight:600 }}>
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
