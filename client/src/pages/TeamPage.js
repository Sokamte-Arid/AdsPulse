import React, { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { Building, CheckCircle, Mail, Users, XCircle } from '../components/shared/Icons.js';

export default function TeamPage() {
  const { t } = useLanguage();
  const [org,     setOrg]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole,  setInviteRole]  = useState('manager');
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState({ msg:'', type:'info' });

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg:'', type:'info' }), 4000); };

  useEffect(() => {
    api.get('/organization').then(r => setOrg(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    setSaving(true);
    try { const r = await api.post('/organization', { name: orgName }); setOrg(r.data); showToast(`${t('team.create_org')} created!`); }
    catch (err) { showToast('' + (err.response?.data?.message || err.message), 'error'); }
    finally { setSaving(false); }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSaving(true);
    try {
      await api.post('/organization/invite', { email: inviteEmail, role: inviteRole });
      showToast(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      const r = await api.get('/organization'); setOrg(r.data);
    } catch (err) { showToast('' + (err.response?.data?.message || err.message), 'error'); }
    finally { setSaving(false); }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm(t('team.remove_member') + '?')) return;
    try { await api.delete(`/organization/members/${userId}`); const r = await api.get('/organization'); setOrg(r.data); showToast('Member removed'); }
    catch (err) { showToast('' + err.message, 'error'); }
  };

  const handleChangeRole = async (userId, role) => {
    try { await api.patch(`/organization/members/${userId}`, { role }); const r = await api.get('/organization'); setOrg(r.data); showToast('Role updated'); }
    catch (err) { showToast('' + err.message, 'error'); }
  };

  const roleLabel = (role) => ({ owner:t('team.owner'), admin:t('team.admin'), manager:t('team.manager'), viewer:t('team.viewer') })[role] || role;
  const roleColor = { owner:'#7c3aed', admin:'#3b82f6', manager:'#16a34a', viewer:'#6b7280' };
  const toastBg   = { success:'rgba(22,163,74,0.15)', error:'rgba(239,68,68,0.15)', info:'rgba(37,99,235,0.12)' };

  if (loading) return <Layout><div className="page-header"><h1 className="page-title">{t('team.title')}</h1></div><div style={{ display:'flex',flexDirection:'column',gap:12 }}>{[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:80,borderRadius:12 }}/>)}</div></Layout>;

  return (
    <Layout>
      {toast.msg && (
        <div style={{ position:'fixed',top:20,right:20,zIndex:9999,maxWidth:400,padding:'13px 18px',borderRadius:12,background:toastBg[toast.type]||toastBg.info,fontSize:13,color:'var(--text-primary)',boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">{t('team.title')}</h1>
          <p className="page-subtitle">{t('team.subtitle')}</p>
        </div>
      </div>

      {!org ? (
        <div className="glass-card" style={{ padding:36, maxWidth:500 }}>
          <div style={{ marginBottom:16,textAlign:'center' }}><Building size={40}/></div>
          <h3 style={{ fontSize:18,fontWeight:700,color:'var(--text-primary)',margin:'0 0 8px',textAlign:'center' }}>{t('team.no_org')}</h3>
          <p style={{ fontSize:13,color:'var(--text-muted)',marginBottom:24,textAlign:'center' }}>{t('team.create_org_desc')}</p>
          <label className="form-label">{t('team.org_name')}</label>
          <input className="form-input" value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="e.g. Acme Marketing Agency" style={{ marginBottom:16 }}/>
          <button className="btn-primary" onClick={handleCreateOrg} disabled={saving||!orgName.trim()} style={{ width:'100%',justifyContent:'center' }}>
            {saving ? t('common.saving') : t('team.create_org')}
          </button>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:24,maxWidth:720 }}>
          {/* Org header */}
          <div className="glass-card" style={{ padding:24 }}>
            <div style={{ fontSize:22,fontWeight:800,color:'var(--text-primary)',marginBottom:4 }}><Building size={14}/> {org.name}</div>
            <div style={{ fontSize:12,color:'var(--text-faint)' }}>{org.members?.length || 0} {t('team.members').toLowerCase()}</div>
          </div>

          {/* Invite */}
          <div className="glass-card" style={{ padding:24 }}>
            <h3 style={{ fontSize:15,fontWeight:700,color:'var(--text-primary)',margin:'0 0 18px' }}><Mail size={14}/> {t('team.invite_member')}</h3>
            <div style={{ display:'grid',gridTemplateColumns:'1fr auto auto',gap:10,alignItems:'end' }}>
              <div>
                <label className="form-label">{t('team.invite_email')}</label>
                <input className="form-input" type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="colleague@company.com" style={{ fontSize:13 }}/>
              </div>
              <div>
                <label className="form-label">{t('team.invite_role')}</label>
                <select className="form-input" value={inviteRole} onChange={e=>setInviteRole(e.target.value)} style={{ fontSize:13 }}>
                  <option value="admin">{t('team.admin')}</option>
                  <option value="manager">{t('team.manager')}</option>
                  <option value="viewer">{t('team.viewer')}</option>
                </select>
              </div>
              <button className="btn-primary" onClick={handleInvite} disabled={saving||!inviteEmail.trim()} style={{ fontSize:13,padding:'10px 18px' }}>
                {saving ? '...' : t('team.send_invite')}
              </button>
            </div>
          </div>

          {/* Members */}
          <div className="glass-card" style={{ padding:24 }}>
            <h3 style={{ fontSize:15,fontWeight:700,color:'var(--text-primary)',margin:'0 0 18px' }}><Users size={14}/> {t('team.members')}</h3>
            {(org.members||[]).length === 0 ? (
              <div style={{ textAlign:'center',padding:'24px',color:'var(--text-faint)',fontSize:13 }}>{t('team.no_members')}</div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:2 }}>
                {org.members.map((member,idx) => (
                  <div key={member._id||idx} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border-subtle)' }}>
                    <div style={{ width:36,height:36,borderRadius:'50%',background:`linear-gradient(135deg,${roleColor[member.role]||'#6b7280'},${roleColor[member.role]||'#6b7280'}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'white',flexShrink:0 }}>
                      {member.name?.[0]?.toUpperCase()||'?'}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:14,fontWeight:600,color:'var(--text-primary)' }}>{member.name || member.email}</div>
                      <div style={{ fontSize:12,color:'var(--text-faint)' }}>{member.email}</div>
                    </div>
                    <select value={member.role} onChange={e=>handleChangeRole(member._id,e.target.value)}
                      style={{ padding:'4px 10px',borderRadius:8,border:`1px solid ${roleColor[member.role]}40`,background:`${roleColor[member.role]}10`,color:roleColor[member.role],fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans,sans-serif' }}>
                      {['owner','admin','manager','viewer'].map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                    </select>
                    {member.role !== 'owner' && (
                      <button onClick={() => handleRemove(member._id)} style={{ padding:'5px 10px',borderRadius:8,border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',color:'#ef4444',cursor:'pointer',fontSize:11,fontWeight:600 }}>
                        {t('team.remove_member')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pending invites */}
            {(org.pendingInvites||[]).length > 0 && (
              <div style={{ marginTop:20 }}>
                <div style={{ fontSize:13,fontWeight:700,color:'var(--text-muted)',marginBottom:10 }}>{t('team.pending_invite')}</div>
                {org.pendingInvites.map((inv,i) => (
                  <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border-subtle)',fontSize:13,color:'var(--text-faint)' }}>
                    <span><Mail size={14}/>️ {inv.email}</span>
                    <span style={{ padding:'2px 8px',borderRadius:8,background:'rgba(245,158,11,0.1)',color:'#d97706',fontSize:11,fontWeight:600 }}>{roleLabel(inv.role)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
