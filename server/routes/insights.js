const express  = require('express');
const router   = express.Router();
const axios    = require('axios');
const auth     = require('../middleware/auth');
const Campaign = require('../models/Campaign');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL     = 'https://api.anthropic.com/v1/messages';

// ── Industry benchmarks ───────────────────────────────────────────────────────
const BENCHMARKS = {
  meta:     { cpm: 14.9,  cpc: 0.94, ctr: 0.9,  cpa: 18.68 },
  google:   { cpm: 38.4,  cpc: 2.69, ctr: 6.1,  cpa: 48.96 },
  tiktok:   { cpm: 10.0,  cpc: 1.00, ctr: 0.5,  cpa: 22.00 },
  linkedin: { cpm: 33.8,  cpc: 5.26, ctr: 0.44, cpa: 75.00 },
  twitter:  { cpm: 6.46,  cpc: 0.38, ctr: 0.86, cpa: 12.00 },
  snapchat: { cpm: 3.0,   cpc: 0.50, ctr: 0.6,  cpa: 15.00 },
  youtube:  { cpm: 9.68,  cpc: 3.21, ctr: 0.65, cpa: 30.00 },
};

// ── Helper: call Claude API ───────────────────────────────────────────────────
async function callClaude(systemPrompt, userMessage) {
  const res = await axios.post(ANTHROPIC_URL, {
    model:      'claude-sonnet-4-6',
    max_tokens: 1500,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userMessage }],
  }, {
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    timeout: 30000,
  });
  return res.data.content[0].text;
}

// ── Helper: build campaign summary for AI ────────────────────────────────────
function buildCampaignSummary(campaigns) {
  const platformStats = {};

  campaigns.forEach(c => {
    c.platforms.forEach(p => {
      if (!platformStats[p.platform]) {
        platformStats[p.platform] = {
          platform:    p.platform,
          campaigns:   0,
          totalSpend:  0,
          impressions: 0,
          clicks:      0,
          conversions: 0,
          reach:       0,
          budget:      0,
          names:       [],
        };
      }
      const s = platformStats[p.platform];
      s.campaigns++;
      s.totalSpend  += p.metrics.amountSpent  || 0;
      s.impressions += p.metrics.impressions  || 0;
      s.clicks      += p.metrics.totalClicks  || 0;
      s.conversions += p.metrics.conversions  || 0;
      s.reach       += p.metrics.totalReach   || 0;
      s.budget      += p.budget               || 0;
      s.names.push(c.name);
    });
  });

  // Compute derived metrics
  return Object.values(platformStats).map(s => ({
    ...s,
    cpm: s.impressions > 0 ? ((s.totalSpend / s.impressions) * 1000).toFixed(2) : 0,
    cpc: s.clicks      > 0 ? (s.totalSpend / s.clicks).toFixed(2)               : 0,
    ctr: s.impressions > 0 ? ((s.clicks / s.impressions) * 100).toFixed(2)       : 0,
    cpa: s.conversions > 0 ? (s.totalSpend / s.conversions).toFixed(2)           : 0,
    benchmark: BENCHMARKS[s.platform] || null,
  }));
}

// ── POST /api/insights/performance ───────────────────────────────────────────
router.post('/performance', auth, async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ message: 'AI insights not configured. Please add ANTHROPIC_API_KEY to your server .env file.' });
    }

    const campaigns = await Campaign.find({
      userId: req.user._id,
      status: { $in: ['active', 'paused', 'completed'] },
    }).lean();

    if (campaigns.length === 0) {
      return res.status(400).json({ message: 'No campaign data found. Run at least one campaign to get AI insights.' });
    }

    const stats = buildCampaignSummary(campaigns);
    const totalSpend = stats.reduce((s, p) => s + p.totalSpend, 0);

    const systemPrompt = `You are an expert digital advertising analyst for AdsPulse, a cross-platform ad management tool. 
You analyze campaign performance data and provide clear, specific, actionable recommendations.
Be direct and specific — mention actual numbers, percentages, and platform names.
Format your response as JSON with this exact structure:
{
  "summary": "2-3 sentence overall assessment",
  "insights": [
    {
      "type": "warning|success|tip|critical",
      "platform": "meta|google|tiktok|etc or 'general'",
      "title": "Short title (max 8 words)",
      "detail": "Specific finding with numbers",
      "action": "Specific recommended action"
    }
  ],
  "topPriority": "The single most important thing to do right now"
}
Provide 4-6 insights. Use "critical" for serious issues, "warning" for underperformance, "success" for good results, "tip" for optimization opportunities.`;

    const statsText = stats.map(s => {
      const b = s.benchmark;
      const cpmDiff  = b ? (((s.cpm  - b.cpm)  / b.cpm)  * 100).toFixed(0) : null;
      const cpcDiff  = b ? (((s.cpc  - b.cpc)  / b.cpc)  * 100).toFixed(0) : null;
      const ctrDiff  = b ? (((s.ctr  - b.ctr)  / b.ctr)  * 100).toFixed(0) : null;
      return `
Platform: ${s.platform.toUpperCase()}
- Campaigns: ${s.campaigns} (${s.names.join(', ')})
- Total Spend: $${s.totalSpend.toFixed(2)} / Budget: $${s.budget.toFixed(2)}
- Impressions: ${s.impressions.toLocaleString()} | Reach: ${s.reach.toLocaleString()}
- Clicks: ${s.clicks} | Conversions: ${s.conversions}
- CPM: $${s.cpm} ${b ? `(benchmark: $${b.cpm}, ${cpmDiff > 0 ? '+' : ''}${cpmDiff}%)` : ''}
- CPC: $${s.cpc} ${b ? `(benchmark: $${b.cpc}, ${cpcDiff > 0 ? '+' : ''}${cpcDiff}%)` : ''}
- CTR: ${s.ctr}% ${b ? `(benchmark: ${b.ctr}%, ${ctrDiff > 0 ? '+' : ''}${ctrDiff}%)` : ''}
- CPA: $${s.cpa} ${b ? `(benchmark: $${b.cpa})` : ''}`;
    }).join('\n');

    const userMessage = `Analyze this campaign performance data for a total ad spend of $${totalSpend.toFixed(2)} across ${stats.length} platform(s):\n${statsText}`;

    const aiResponse = await callClaude(systemPrompt, userMessage);

    // Parse JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response format');
    const parsed = JSON.parse(jsonMatch[0]);

    res.json({ ...parsed, generatedAt: new Date(), platformStats: stats });

  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[AI Insights] Error:', JSON.stringify(detail, null, 2));
    const userMsg = err.response?.data?.error?.message
      ? `AI error: ${err.response.data.error.message}`
      : 'An unexpected error occurred. Please try again.';
    res.status(500).json({ message: userMsg });
  }
});

// ── POST /api/insights/budget-optimizer ──────────────────────────────────────
router.post('/budget-optimizer', auth, async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ message: 'AI insights not configured. Please add ANTHROPIC_API_KEY to your server .env file.' });
    }

    const campaigns = await Campaign.find({
      userId: req.user._id,
      status: { $in: ['active', 'paused', 'completed'] },
    }).lean();

    if (campaigns.length === 0) {
      return res.status(400).json({ message: 'No campaign data found.' });
    }

    const stats      = buildCampaignSummary(campaigns);
    const totalSpend = stats.reduce((s, p) => s + p.totalSpend, 0);
    const totalBudget = stats.reduce((s, p) => s + p.budget, 0);

    if (stats.length < 2) {
      return res.status(400).json({ message: 'Budget optimization requires data from at least 2 platforms.' });
    }

    const systemPrompt = `You are an expert media buyer and budget optimization specialist.
Analyze cross-platform ad spend data and recommend how to redistribute budget for maximum ROI.
Be specific with percentages and dollar amounts. Explain the reasoning clearly.
Format your response as JSON with this exact structure:
{
  "summary": "2-3 sentence overall budget assessment",
  "currentAllocation": [
    { "platform": "meta", "currentPercent": 60, "currentSpend": 450.00 }
  ],
  "recommendedAllocation": [
    { "platform": "meta", "recommendedPercent": 70, "change": "+10%", "reasoning": "Why" }
  ],
  "projectedImpact": "What improvement to expect if recommendations are followed",
  "quickWins": ["Specific action 1", "Specific action 2", "Specific action 3"],
  "warning": "Any important caveat or risk to consider"
}`;

    const statsText = stats.map(s => {
      const pctOfSpend = totalSpend > 0 ? ((s.totalSpend / totalSpend) * 100).toFixed(1) : 0;
      const roi = s.conversions > 0 && s.totalSpend > 0 ? (s.conversions / s.totalSpend * 100).toFixed(2) : 0;
      return `${s.platform.toUpperCase()}: $${s.totalSpend.toFixed(2)} spend (${pctOfSpend}% of total) | CPM $${s.cpm} | CPC $${s.cpc} | CTR ${s.ctr}% | ${s.conversions} conversions | ROI score: ${roi}`;
    }).join('\n');

    const userMessage = `Total budget: $${totalBudget.toFixed(2)} | Total spend: $${totalSpend.toFixed(2)}\n\nPlatform breakdown:\n${statsText}\n\nRecommend how to redistribute this budget across platforms for maximum performance.`;

    const aiResponse  = await callClaude(systemPrompt, userMessage);
    const jsonMatch   = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response format');
    const parsed = JSON.parse(jsonMatch[0]);

    res.json({ ...parsed, generatedAt: new Date(), totalBudget, totalSpend });

  } catch (err) {
    console.error('[AI Budget Optimizer] Error:', err.message);
    res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});


// -- POST /api/insights/campaign-creator --------------------------------------
router.post('/campaign-creator', auth, async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) return res.status(503).json({ message: 'AI not configured.' });
    const { description } = req.body;
    if (!description?.trim()) return res.status(400).json({ message: 'Please describe your campaign.' });
    const systemPrompt = `You are an expert advertising strategist. Convert the description into a campaign. Respond ONLY with valid JSON: {"name":"","objective":"conversions","currency":"USD","platforms":[{"platform":"meta","budget":0,"budgetType":"daily","reasoning":""}],"targeting":{"ageMin":18,"ageMax":65,"gender":"all","locations":[],"interests":[]},"creative":{"headline":"","description":"","callToAction":"Learn More"},"startDate":"","endDate":"","tags":[],"explanation":"","suggestions":[]}`;
    const today = new Date().toISOString().split('T')[0];
    const aiResponse = await callClaude(systemPrompt, `Today: \n\nDescription: ""`);
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response');
    const campaign = JSON.parse(jsonMatch[0]);
    res.json({ campaign, generatedAt: new Date() });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── POST /api/insights/ad-copy ────────────────────────────────────────────────
router.post('/ad-copy', auth, async (req, res) => {
  try {
    const { product, audience, tone, platform, objective, language = 'English', variants = 3 } = req.body;
    if (!product || !audience) return res.status(400).json({ message: 'Product and audience are required.' });

    const systemPrompt = `You are an expert ad copywriter specialising in digital advertising across Meta, Google, TikTok, LinkedIn, and other platforms.
Generate compelling, platform-optimised ad copy that drives results.
Always respond with valid JSON only — no markdown, no explanation outside the JSON.`;

    const userMessage = `Generate ${variants} ad copy variants for:
- Product/Service: ${product}
- Target Audience: ${audience}
- Platform: ${platform || 'General'}
- Objective: ${objective || 'Conversions'}
- Tone: ${tone || 'Professional'}
- Language: ${language}

Return JSON in this exact format:
{
  "variants": [
    {
      "headline": "...",
      "primaryText": "...",
      "callToAction": "...",
      "hashtags": ["...", "..."],
      "notes": "Why this variant works"
    }
  ],
  "tips": ["tip1", "tip2", "tip3"]
}`;

    const raw = await callClaude(systemPrompt, userMessage);
    const clean = raw.replace(/\`\`\`json|\`\`\`/g, '').trim();
    const data = JSON.parse(clean);
    res.json(data);
  } catch (err) {
    console.error('[Route Error]', err.message);
    res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

module.exports = router;
// ── POST /api/insights/caption ────────────────────────────────────────────────
// Generate AI caption for a post/reel/story
router.post('/caption', auth, async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) return res.status(503).json({ message: 'AI not configured.' });
    const { description, platforms, postType, tone } = req.body;
    if (!description?.trim()) return res.status(400).json({ message: 'Please describe your post.' });

    const platformSpecs = {
      meta:      { name:'Facebook', limit:63206, hashtagLimit:30, supportsHashtags:true },
      instagram: { name:'Instagram', limit:2200, hashtagLimit:30, supportsHashtags:true },
      tiktok:    { name:'TikTok', limit:2200, hashtagLimit:20, supportsHashtags:true },
      linkedin:  { name:'LinkedIn', limit:3000, hashtagLimit:5, supportsHashtags:true },
      twitter:   { name:'X (Twitter)', limit:280, hashtagLimit:2, supportsHashtags:true },
      youtube:   { name:'YouTube', limit:5000, hashtagLimit:15, supportsHashtags:true },
      snapchat:  { name:'Snapchat', limit:250, hashtagLimit:0, supportsHashtags:false },
    };

    const postTypeLabels = {
      post:'regular post', reel:'Reel/short video', story:'Story',
      short:'YouTube Short', video:'video'
    };

    const selectedPlatforms = (platforms||['instagram']).filter(p => platformSpecs[p]);
    const specsText = selectedPlatforms.map(p => {
      const s = platformSpecs[p];
      return `${s.name}: max ${s.limit} chars${s.supportsHashtags ? `, ${s.hashtagLimit} hashtags` : ', no hashtags'}`;
    }).join('\n');

    const systemPrompt = `You are a social media expert. Generate engaging captions for a ${postTypeLabels[postType]||'post'}.
Write captions optimized for each platform. Respect character limits. Be ${tone||'engaging'} in tone.
Respond ONLY with valid JSON:
{
  "captions": {
    "meta": {"text": "caption text", "hashtags": []},
    "instagram": {"text": "caption text", "hashtags": []},
    "tiktok": {"text": "caption text", "hashtags": []},
    "linkedin": {"text": "caption text", "hashtags": []},
    "twitter": {"text": "tweet text max 280 chars", "hashtags": []},
    "youtube": {"text": "description", "hashtags": []},
    "snapchat": {"text": "short caption", "hashtags": []}
  },
  "suggestions": ["Tip 1", "Tip 2"]
}
Only include platforms from the requested list.`;

    const aiResponse = await callClaude(systemPrompt,
      `Post description: "${description}"\nPost type: ${postTypeLabels[postType]||'post'}\nPlatforms:\n${specsText}`
    );
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response');
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});
