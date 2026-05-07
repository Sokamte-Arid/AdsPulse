require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ads_manager';

const userSchema = new mongoose.Schema({ name:String, email:String, password:String, role:String, connectedPlatforms:Array, preferences:Object },{ timestamps:true });
userSchema.pre('save', async function(next){ if(!this.isModified('password')) return next(); this.password=await bcrypt.hash(this.password,10); next(); });
const User = mongoose.model('User', userSchema);
const campaignSchema = new mongoose.Schema({ userId:mongoose.Schema.Types.ObjectId, name:String, objective:String, status:String, startDate:Date, endDate:Date, totalBudget:Number, currency:String, platforms:Array, tags:Array, notes:String, metricsHistory:Array },{ timestamps:true });
const Campaign = mongoose.model('Campaign', campaignSchema);

const BENCHMARKS = {
  meta:     { cpc:0.44, cpm:14.5, ctr:3.17, convRate:0.089 },
  google:   { cpc:1.20, cpm:20.0, ctr:6.30, convRate:0.045 },
  tiktok:   { cpc:0.22, cpm: 6.8, ctr:2.80, convRate:0.032 },
  linkedin: { cpc:5.26, cpm:33.8, ctr:0.65, convRate:0.077 },
  twitter:  { cpc:0.38, cpm:12.1, ctr:1.64, convRate:0.021 },
  snapchat: { cpc:0.19, cpm: 5.1, ctr:2.17, convRate:0.028 },
  youtube:  { cpc:0.49, cpm:11.2, ctr:0.72, convRate:0.052 }
};

function tv(base, day, totalDays, noise=0.12, trend=0.3) {
  const prog = day/totalDays;
  const trendF = 1 + trend*prog;
  const dayW = day%7;
  const seasonF = 1 + 0.15*Math.sin((dayW/7)*2*Math.PI);
  const noiseF = 1 + (Math.random()-0.5)*2*noise;
  return Math.max(0, base*trendF*seasonF*noiseF);
}

function genHistory(platform, dailyBudget, days, spendTrend=0.2, ctrTrend=0.2) {
  const b = BENCHMARKS[platform];
  const h = [];
  for(let i=0;i<days;i++){
    const date = new Date(); date.setDate(date.getDate()-(days-i)); date.setHours(0,0,0,0);
    const spend = parseFloat(tv(dailyBudget*0.9, i, days, 0.08, spendTrend).toFixed(2));
    const cpm   = parseFloat(tv(b.cpm, i, days, 0.1, -0.05).toFixed(2));
    const impressions = Math.floor((spend/cpm)*1000);
    const ctr   = parseFloat(tv(b.ctr, i, days, 0.12, ctrTrend).toFixed(3));
    const clicks = Math.floor(impressions*(ctr/100));
    const cpc   = clicks>0 ? parseFloat((spend/clicks).toFixed(2)) : b.cpc;
    const convRate = tv(b.convRate, i, days, 0.2, 0.2);
    const conversions = Math.floor(clicks*convRate);
    const reach = Math.floor(impressions*(0.6+Math.random()*0.2));
    const addToCart = Math.floor(conversions*(2.5+Math.random()*2));
    h.push({ date, platform, amountSpent:spend, impressions, cpm, totalClicks:clicks, ctr, cpc, conversions, totalReach:reach, addToCart });
  }
  return h;
}

function sumH(history, platform) {
  const e = history.filter(h=>h.platform===platform);
  const t = e.reduce((a,h)=>({ amountSpent:a.amountSpent+h.amountSpent, impressions:a.impressions+h.impressions, totalClicks:a.totalClicks+h.totalClicks, conversions:a.conversions+h.conversions, totalReach:a.totalReach+h.totalReach, addToCart:a.addToCart+h.addToCart }),
    { amountSpent:0,impressions:0,totalClicks:0,conversions:0,totalReach:0,addToCart:0 });
  t.cpm = t.impressions>0 ? parseFloat(((t.amountSpent/t.impressions)*1000).toFixed(2)) : 0;
  t.ctr = t.impressions>0 ? parseFloat(((t.totalClicks/t.impressions)*100).toFixed(3)) : 0;
  t.cpc = t.totalClicks>0 ? parseFloat((t.amountSpent/t.totalClicks).toFixed(2)) : 0;
  t.amountSpent = parseFloat(t.amountSpent.toFixed(2));
  return t;
}

async function seed(){
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');
  await User.deleteMany({}); await Campaign.deleteMany({});
  console.log('🗑️  Cleared data\n');

  const user = new User({ name:'Sokamte Arid', email:'demo@adspulse.com', password:'demo123', role:'admin',
    connectedPlatforms:[
      {platform:'meta',accountId:'act_1234567890',accountName:'AdsPulse Meta Business',connectedAt:new Date()},
      {platform:'google',accountId:'9876543210',accountName:'AdsPulse Google Ads',connectedAt:new Date()},
      {platform:'tiktok',accountId:'tt_56781234',accountName:'AdsPulse TikTok For Biz',connectedAt:new Date()},
      {platform:'linkedin',accountId:'li_90123456',accountName:'AdsPulse LinkedIn Ads',connectedAt:new Date()},
    ],
    preferences:{ currency:'USD', timezone:'Europe/Paris', defaultPlatforms:['meta','google','tiktok'] }
  });
  await user.save();
  console.log('👤 Created: demo@adspulse.com / demo123\n');

  const campaigns = [];

  // 1. Brand Awareness 90d
  { const days=90;
    const plats=[{id:'meta',db:133,st:0.25,ct:0.3},{id:'google',db:117,st:0.2,ct:0.25},{id:'tiktok',db:83,st:0.4,ct:0.5},{id:'youtube',db:67,st:0.15,ct:0.2}];
    let h=[];
    const pd=plats.map(p=>{ const ph=genHistory(p.id,p.db,days,p.st,p.ct); h=h.concat(ph); return { platform:p.id, budget:p.db*days, budgetType:'lifetime', status:'active', objective:'awareness', targeting:{ageMin:18,ageMax:55,genders:[],locations:['France','Cameroon','Belgium'],interests:['Technology','Business']}, metrics:sumH(ph,p.id) }; });
    campaigns.push({ userId:user._id, name:'Q4 Brand Awareness Drive', objective:'awareness', status:'active', startDate:new Date(Date.now()-90*86400000), endDate:new Date(Date.now()+10*86400000), totalBudget:plats.reduce((s,p)=>s+p.db*days,0), currency:'USD', tags:['q4','brand'], notes:'TikTok outperforming at 40% lower CPM.', platforms:pd, metricsHistory:h });
    console.log('📣 1. Q4 Brand Awareness (90d, 4 platforms)'); }

  // 2. Summer Sale Conversions 60d
  { const days=60;
    const plats=[{id:'meta',db:117,st:0.3,ct:0.35},{id:'google',db:97,st:0.25,ct:0.3},{id:'linkedin',db:50,st:0.1,ct:0.1},{id:'snapchat',db:33,st:0.35,ct:0.4}];
    let h=[];
    const pd=plats.map(p=>{ const ph=genHistory(p.id,p.db,days,p.st,p.ct); h=h.concat(ph); return { platform:p.id, budget:p.db*days, budgetType:'lifetime', status:'active', objective:'conversions', targeting:{ageMin:22,ageMax:50,genders:[],locations:['France','Belgium','Switzerland'],interests:['Fashion','Beauty','Shopping']}, metrics:sumH(ph,p.id) }; });
    campaigns.push({ userId:user._id, name:'Summer Sale – Conversion Push', objective:'conversions', status:'active', startDate:new Date(Date.now()-60*86400000), endDate:new Date(Date.now()+20*86400000), totalBudget:plats.reduce((s,p)=>s+p.db*days,0), currency:'USD', tags:['sale','conversions'], notes:'Google Shopping ROAS at 4.2x. Best performer.', platforms:pd, metricsHistory:h });
    console.log('📣 2. Summer Sale Conversions (60d, 4 platforms)'); }

  // 3. App Install Africa 45d
  { const days=45;
    const plats=[{id:'meta',db:67,st:0.2,ct:0.3},{id:'tiktok',db:56,st:0.5,ct:0.6},{id:'snapchat',db:33,st:0.25,ct:0.35},{id:'twitter',db:22,st:0.1,ct:0.15}];
    let h=[];
    const pd=plats.map(p=>{ const ph=genHistory(p.id,p.db,days,p.st,p.ct); h=h.concat(ph); return { platform:p.id, budget:p.db*days, budgetType:'daily', status:'active', objective:'app_installs', targeting:{ageMin:16,ageMax:35,genders:[],locations:['Nigeria','Cameroon','Ghana','Kenya'],interests:['Gaming','Technology']}, metrics:sumH(ph,p.id) }; });
    campaigns.push({ userId:user._id, name:'App Install – Mobile Growth (Africa)', objective:'app_installs', status:'active', startDate:new Date(Date.now()-45*86400000), endDate:new Date(Date.now()+50*86400000), totalBudget:plats.reduce((s,p)=>s+p.db*days,0), currency:'USD', tags:['app','mobile','africa'], notes:'TikTok CPI at $0.62 vs Meta $1.15. Scaling TikTok budget.', platforms:pd, metricsHistory:h });
    console.log('📣 3. App Installs Africa (45d, 4 platforms)'); }

  // 4. B2B Lead Gen 30d
  { const days=30;
    const plats=[{id:'linkedin',db:133,st:0.15,ct:0.2},{id:'google',db:67,st:0.1,ct:0.15}];
    let h=[];
    const pd=plats.map(p=>{ const ph=genHistory(p.id,p.db,days,p.st,p.ct); h=h.concat(ph); return { platform:p.id, budget:p.db*days, budgetType:'daily', status:'active', objective:'lead_generation', targeting:{ageMin:28,ageMax:55,genders:[],locations:['France','UK','Germany'],interests:['Business','Finance','SaaS']}, metrics:sumH(ph,p.id) }; });
    campaigns.push({ userId:user._id, name:'B2B Lead Generation — SaaS Demo', objective:'lead_generation', status:'active', startDate:new Date(Date.now()-30*86400000), endDate:new Date(Date.now()+40*86400000), totalBudget:plats.reduce((s,p)=>s+p.db*days,0), currency:'USD', tags:['b2b','leads','saas'], notes:'CPL averaging $42. LinkedIn quality leads convert at 12%.', platforms:pd, metricsHistory:h });
    console.log('📣 4. B2B Lead Gen (30d, 2 platforms)'); }

  // 5. Video Views paused 30d
  { const days=30;
    const plats=[{id:'tiktok',db:100,st:0.1,ct:0.2},{id:'youtube',db:67,st:0.1,ct:0.1}];
    let h=[];
    const pd=plats.map(p=>{ const ph=genHistory(p.id,p.db,days,p.st,p.ct); h=h.concat(ph); return { platform:p.id, budget:p.db*days, budgetType:'lifetime', status:'paused', objective:'video_views', targeting:{ageMin:16,ageMax:35,genders:[],locations:['Cameroon','France','Ivory Coast'],interests:['Entertainment','Music']}, metrics:sumH(ph,p.id) }; });
    campaigns.push({ userId:user._id, name:'TikTok Viral Video Views', objective:'video_views', status:'paused', startDate:new Date(Date.now()-35*86400000), endDate:new Date(Date.now()+5*86400000), totalBudget:plats.reduce((s,p)=>s+p.db*days,0), currency:'USD', tags:['video','viral'], notes:'Paused to refresh creative — 2.8M views achieved.', platforms:pd, metricsHistory:h });
    console.log('📣 5. TikTok Video Views (paused, 30d)'); }

  // 6. Engagement 20d
  { const days=20;
    const plats=[{id:'meta',db:67,st:0.2,ct:0.25},{id:'twitter',db:33,st:0.1,ct:0.2},{id:'snapchat',db:17,st:0.15,ct:0.3}];
    let h=[];
    const pd=plats.map(p=>{ const ph=genHistory(p.id,p.db,days,p.st,p.ct); h=h.concat(ph); return { platform:p.id, budget:p.db*60, budgetType:'daily', status:'active', objective:'engagement', targeting:{ageMin:18,ageMax:45,genders:[],locations:['Cameroon','France','Senegal'],interests:['Sports','Entertainment']}, metrics:sumH(ph,p.id) }; });
    campaigns.push({ userId:user._id, name:'Engagement – Community Building', objective:'engagement', status:'active', startDate:new Date(Date.now()-20*86400000), endDate:new Date(Date.now()+60*86400000), totalBudget:plats.reduce((s,p)=>s+p.db*60,0), currency:'USD', tags:['engagement','community'], notes:'Growing social communities organically + paid.', platforms:pd, metricsHistory:h });
    console.log('📣 6. Engagement Community (20d, 3 platforms)'); }

  // 7. Holiday Catalog DRAFT
  { const zero = {amountSpent:0,impressions:0,cpm:0,totalClicks:0,ctr:0,cpc:0,conversions:0,totalReach:0,addToCart:0};
    campaigns.push({ userId:user._id, name:'Holiday Catalog Sales 2025', objective:'catalog_sales', status:'draft', startDate:new Date(Date.now()+30*86400000), endDate:new Date(Date.now()+75*86400000), totalBudget:15000, currency:'USD', tags:['holiday','catalog'], notes:'Launching Dec 1. Creatives in production.',
      platforms:[{platform:'meta',budget:7000,budgetType:'lifetime',status:'draft',objective:'catalog_sales',metrics:zero},{platform:'google',budget:5000,budgetType:'lifetime',status:'draft',objective:'catalog_sales',metrics:zero},{platform:'tiktok',budget:3000,budgetType:'lifetime',status:'draft',objective:'catalog_sales',metrics:zero}], metricsHistory:[] });
    console.log('📣 7. Holiday Catalog (draft, future)'); }

  await Campaign.insertMany(campaigns);

  const totalSpend = campaigns.reduce((s,c)=>s+c.platforms.reduce((ps,p)=>ps+(p.metrics.amountSpent||0),0),0);
  const totalImpressions = campaigns.reduce((s,c)=>s+c.platforms.reduce((ps,p)=>ps+(p.metrics.impressions||0),0),0);
  const totalConversions = campaigns.reduce((s,c)=>s+c.platforms.reduce((ps,p)=>ps+(p.metrics.conversions||0),0),0);

  console.log('\n' + '='.repeat(52));
  console.log('✨ Rich demo data seeded!\n');
  console.log(`   Login:       demo@adspulse.com / demo123`);
  console.log(`   Campaigns:   ${campaigns.length} (4 active, 1 paused, 1 draft)`);
  console.log(`   Total Spend: $${totalSpend.toFixed(2)}`);
  console.log(`   Impressions: ${(totalImpressions/1000000).toFixed(2)}M`);
  console.log(`   Conversions: ${totalConversions.toLocaleString()}`);
  console.log(`   History:     up to 90 days of daily data`);
  console.log('='.repeat(52) + '\n');
  await mongoose.disconnect();
}

seed().catch(err=>{ console.error('❌ Seed failed:', err.message); process.exit(1); });
