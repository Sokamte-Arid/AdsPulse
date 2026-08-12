import React from 'react';

export default function TermsPage() {
  return (
    <div style={{ minHeight:'100vh', background:'#0f0a1e', color:'#e2e8f0', fontFamily:'DM Sans, sans-serif', padding:'40px 20px' }}>
      <div style={{ maxWidth:800, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:16 }}>⚡</div>
          <h1 style={{ fontSize:32, fontWeight:800, color:'white', margin:'0 0 8px' }}>Terms of Service</h1>
          <p style={{ fontSize:14, color:'#9ca3af' }}>Last updated: {new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</p>
        </div>

        <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:16, padding:40, border:'1px solid rgba(255,255,255,0.1)', lineHeight:1.8 }}>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>1. Acceptance of Terms</h2>
            <p style={{ color:'#9ca3af', fontSize:14 }}>By accessing or using AdsPulse at kmcom2026.com, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.</p>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>2. Description of Service</h2>
            <p style={{ color:'#9ca3af', fontSize:14 }}>AdsPulse is a cross-platform advertising management system that allows users to manage, analyze, and optimize their digital advertising campaigns across multiple platforms including Meta, Google, TikTok, LinkedIn, and others.</p>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>3. User Responsibilities</h2>
            <ul style={{ color:'#9ca3af', fontSize:14, paddingLeft:20 }}>
              <li style={{ marginBottom:8 }}>You must provide accurate account information</li>
              <li style={{ marginBottom:8 }}>You are responsible for maintaining the security of your account credentials</li>
              <li style={{ marginBottom:8 }}>You must comply with all applicable advertising platform policies (Meta, Google, etc.)</li>
              <li style={{ marginBottom:8 }}>You must not use the platform for illegal advertising or spam</li>
              <li style={{ marginBottom:8 }}>You are responsible for all content published through our platform</li>
            </ul>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>4. Third-Party Platforms</h2>
            <p style={{ color:'#9ca3af', fontSize:14 }}>Our service integrates with third-party platforms. Your use of those platforms is subject to their respective terms of service. We are not responsible for actions taken by third-party platforms including account restrictions or policy enforcement.</p>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>5. Limitation of Liability</h2>
            <p style={{ color:'#9ca3af', fontSize:14 }}>AdsPulse is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform, including losses from advertising campaigns or platform restrictions.</p>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>6. Termination</h2>
            <p style={{ color:'#9ca3af', fontSize:14 }}>We reserve the right to terminate or suspend access to our platform at our discretion, without notice, for conduct that violates these Terms or is harmful to other users, us, or third parties.</p>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>7. Changes to Terms</h2>
            <p style={{ color:'#9ca3af', fontSize:14 }}>We may update these Terms at any time. Continued use of the platform after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>8. Contact</h2>
            <p style={{ color:'#9ca3af', fontSize:14 }}>
              For questions about these Terms, contact us at:<br/><br/>
              <strong style={{ color:'#e2e8f0' }}>AdsPulse</strong><br/>
              Email: <a href="mailto:sokamtearid@gmail.com" style={{ color:'#7c3aed' }}>sokamtearid@gmail.com</a><br/>
              Website: <a href="https://kmcom2026.com" style={{ color:'#7c3aed' }}>kmcom2026.com</a>
            </p>
          </section>

        </div>

        <p style={{ textAlign:'center', color:'#4b5563', fontSize:12, marginTop:24 }}>
          © {new Date().getFullYear()} AdsPulse · kmcom2026.com
        </p>
      </div>
    </div>
  );
}