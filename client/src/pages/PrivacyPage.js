import React from 'react';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight:'100vh', background:'#0f0a1e', color:'#e2e8f0', fontFamily:'DM Sans, sans-serif', padding:'40px 20px' }}>
      <div style={{ maxWidth:800, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:16 }}>⚡</div>
          <h1 style={{ fontSize:32, fontWeight:800, color:'white', margin:'0 0 8px' }}>Privacy Policy</h1>
          <p style={{ fontSize:14, color:'#9ca3af' }}>Last updated: {new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</p>
        </div>

        <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:16, padding:40, border:'1px solid rgba(255,255,255,0.1)', lineHeight:1.8 }}>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>1. Introduction</h2>
            <p style={{ color:'#9ca3af', fontSize:14 }}>
              AdsPulse ("we", "our", or "us") operates the AdsPulse platform accessible at kmcom2026.com. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. Please read this policy carefully.
            </p>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>2. Information We Collect</h2>
            <p style={{ color:'#9ca3af', fontSize:14, marginBottom:8 }}>We collect the following types of information:</p>
            <ul style={{ color:'#9ca3af', fontSize:14, paddingLeft:20 }}>
              <li style={{ marginBottom:8 }}><strong style={{ color:'#e2e8f0' }}>Account Information:</strong> Name, email address, and password when you register.</li>
              <li style={{ marginBottom:8 }}><strong style={{ color:'#e2e8f0' }}>Platform Credentials:</strong> API tokens and access keys for connected advertising platforms (Meta, Google, TikTok, etc.).</li>
              <li style={{ marginBottom:8 }}><strong style={{ color:'#e2e8f0' }}>Campaign Data:</strong> Advertising campaign information, metrics, and performance data from connected platforms.</li>
              <li style={{ marginBottom:8 }}><strong style={{ color:'#e2e8f0' }}>Usage Data:</strong> How you interact with our platform, including features used and actions taken.</li>
              <li style={{ marginBottom:8 }}><strong style={{ color:'#e2e8f0' }}>Communications:</strong> Messages and comments from social media platforms when using our Unified Inbox feature.</li>
            </ul>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>3. How We Use Your Information</h2>
            <ul style={{ color:'#9ca3af', fontSize:14, paddingLeft:20 }}>
              <li style={{ marginBottom:8 }}>To provide and maintain our advertising management services</li>
              <li style={{ marginBottom:8 }}>To sync and display your campaign data from connected platforms</li>
              <li style={{ marginBottom:8 }}>To generate AI-powered insights and recommendations</li>
              <li style={{ marginBottom:8 }}>To send important notifications about your account and campaigns</li>
              <li style={{ marginBottom:8 }}>To improve our platform and develop new features</li>
              <li style={{ marginBottom:8 }}>To comply with legal obligations</li>
            </ul>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>4. Meta Platform Data</h2>
            <p style={{ color:'#9ca3af', fontSize:14, marginBottom:8 }}>
              When you connect your Meta (Facebook/Instagram) account, we access the following data through Meta's API:
            </p>
            <ul style={{ color:'#9ca3af', fontSize:14, paddingLeft:20 }}>
              <li style={{ marginBottom:8 }}>Ad account information and campaign data</li>
              <li style={{ marginBottom:8 }}>Page insights and performance metrics</li>
              <li style={{ marginBottom:8 }}>Instagram business account data</li>
              <li style={{ marginBottom:8 }}>Comments and messages (for Unified Inbox feature)</li>
            </ul>
            <p style={{ color:'#9ca3af', fontSize:14, marginTop:8 }}>
              We do not sell your Meta data to third parties. Data accessed through Meta's API is used solely to provide our services. You can revoke access at any time through your Meta account settings.
            </p>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>5. Data Storage and Security</h2>
            <p style={{ color:'#9ca3af', fontSize:14 }}>
              Your data is stored on secure servers. We implement industry-standard security measures including encryption, secure HTTPS connections, and access controls. API tokens are encrypted before storage. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>6. Data Sharing</h2>
            <p style={{ color:'#9ca3af', fontSize:14, marginBottom:8 }}>We do not sell your personal information. We may share data with:</p>
            <ul style={{ color:'#9ca3af', fontSize:14, paddingLeft:20 }}>
              <li style={{ marginBottom:8 }}><strong style={{ color:'#e2e8f0' }}>Service Providers:</strong> Cloudinary (media storage), MongoDB Atlas (database), Anthropic (AI features)</li>
              <li style={{ marginBottom:8 }}><strong style={{ color:'#e2e8f0' }}>Advertising Platforms:</strong> Only to execute actions you request (creating campaigns, posting content)</li>
              <li style={{ marginBottom:8 }}><strong style={{ color:'#e2e8f0' }}>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>7. Your Rights</h2>
            <p style={{ color:'#9ca3af', fontSize:14, marginBottom:8 }}>You have the right to:</p>
            <ul style={{ color:'#9ca3af', fontSize:14, paddingLeft:20 }}>
              <li style={{ marginBottom:8 }}>Access and download your personal data</li>
              <li style={{ marginBottom:8 }}>Correct inaccurate information</li>
              <li style={{ marginBottom:8 }}>Delete your account and associated data</li>
              <li style={{ marginBottom:8 }}>Disconnect any connected platform at any time</li>
              <li style={{ marginBottom:8 }}>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>8. Data Deletion</h2>
            <p style={{ color:'#9ca3af', fontSize:14 }}>
              To request deletion of your data, email us at <a href="mailto:sokamtearid@gmail.com" style={{ color:'#7c3aed' }}>sokamtearid@gmail.com</a> or visit <a href="https://kmcom2026.com/data-deletion" style={{ color:'#7c3aed' }}>kmcom2026.com/data-deletion</a>. We will process your request within 30 days.
            </p>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>9. Cookies</h2>
            <p style={{ color:'#9ca3af', fontSize:14 }}>
              We use essential cookies to maintain your session and preferences. We do not use tracking cookies or share cookie data with advertisers.
            </p>
          </section>

          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:12 }}>10. Contact Us</h2>
            <p style={{ color:'#9ca3af', fontSize:14 }}>
              If you have questions about this Privacy Policy, contact us at:<br/><br/>
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