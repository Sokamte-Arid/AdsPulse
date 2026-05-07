const express = require('express');
const router = express.Router();

const PLATFORM_OBJECTIVES = {
  meta: [
    { id: 'awareness', label: 'Brand Awareness', icon: '🎯', description: 'Reach people likely to remember your ad' },
    { id: 'reach', label: 'Reach', icon: '📡', description: 'Show your ad to the maximum number of people' },
    { id: 'traffic', label: 'Traffic', icon: '🚗', description: 'Send people to a destination' },
    { id: 'engagement', label: 'Engagement', icon: '💬', description: 'Get more likes, comments, shares' },
    { id: 'app_installs', label: 'App Installs', icon: '📱', description: 'Drive app downloads' },
    { id: 'video_views', label: 'Video Views', icon: '▶️', description: 'Get more people to view your video' },
    { id: 'lead_generation', label: 'Lead Generation', icon: '📋', description: 'Collect leads for your business' },
    { id: 'messages', label: 'Messages', icon: '✉️', description: 'Get people to send you messages' },
    { id: 'conversions', label: 'Conversions', icon: '🎁', description: 'Drive valuable actions on your website' },
    { id: 'catalog_sales', label: 'Catalog Sales', icon: '🛍️', description: 'Show products from your catalog' },
    { id: 'store_traffic', label: 'Store Traffic', icon: '🏪', description: 'Bring people to your physical store' }
  ],
  google: [
    { id: 'awareness', label: 'Brand Awareness & Reach', icon: '🎯', description: 'Increase brand visibility' },
    { id: 'traffic', label: 'Website Traffic', icon: '🚗', description: 'Drive clicks to your website' },
    { id: 'lead_generation', label: 'Leads', icon: '📋', description: 'Get leads for your business' },
    { id: 'conversions', label: 'Sales', icon: '🛒', description: 'Drive sales online, in-app or in-store' },
    { id: 'app_installs', label: 'App Promotion', icon: '📱', description: 'Get more app installs & engagement' },
    { id: 'video_views', label: 'Video Views', icon: '▶️', description: 'Get views on your video content' },
    { id: 'store_traffic', label: 'Local Store Visits', icon: '🏪', description: 'Increase visits to your stores' }
  ],
  tiktok: [
    { id: 'awareness', label: 'Reach', icon: '📡', description: 'Maximize your ad delivery' },
    { id: 'video_views', label: 'Video Views', icon: '▶️', description: 'Maximize video views' },
    { id: 'engagement', label: 'Community Interaction', icon: '💬', description: 'Grow your TikTok community' },
    { id: 'traffic', label: 'Traffic', icon: '🚗', description: 'Send people to your website or app' },
    { id: 'app_installs', label: 'App Promotion', icon: '📱', description: 'Drive app installs and re-engagement' },
    { id: 'lead_generation', label: 'Lead Generation', icon: '📋', description: 'Collect leads with TikTok instant forms' },
    { id: 'conversions', label: 'Web Conversions', icon: '🎁', description: 'Drive conversions on your website' },
    { id: 'catalog_sales', label: 'Product Sales', icon: '🛍️', description: 'Promote products from your catalog' }
  ],
  twitter: [
    { id: 'awareness', label: 'Awareness', icon: '🎯', description: 'Maximize brand awareness' },
    { id: 'reach', label: 'Reach', icon: '📡', description: 'Reach a large audience' },
    { id: 'video_views', label: 'Video Views', icon: '▶️', description: 'Get views on your videos' },
    { id: 'traffic', label: 'Website Traffic', icon: '🚗', description: 'Drive traffic to your site' },
    { id: 'engagement', label: 'Tweet Engagements', icon: '💬', description: 'Promote engagement with tweets' },
    { id: 'app_installs', label: 'App Installs', icon: '📱', description: 'Drive app downloads' },
    { id: 'lead_generation', label: 'Lead Generation', icon: '📋', description: 'Collect leads on Twitter' },
    { id: 'conversions', label: 'Conversions', icon: '🎁', description: 'Drive conversions' }
  ],
  linkedin: [
    { id: 'awareness', label: 'Brand Awareness', icon: '🎯', description: 'Increase awareness of your brand' },
    { id: 'traffic', label: 'Website Visits', icon: '🚗', description: 'Drive traffic to your website' },
    { id: 'engagement', label: 'Engagement', icon: '💬', description: 'Build relationships with your audience' },
    { id: 'video_views', label: 'Video Views', icon: '▶️', description: 'Maximize video views' },
    { id: 'lead_generation', label: 'Lead Generation', icon: '📋', description: 'Generate leads with LinkedIn forms' },
    { id: 'conversions', label: 'Website Conversions', icon: '🎁', description: 'Drive valuable actions on your site' },
    { id: 'app_installs', label: 'Job Applicants', icon: '💼', description: 'Drive qualified applicants to your jobs' }
  ],
  snapchat: [
    { id: 'awareness', label: 'Brand Awareness', icon: '🎯', description: 'Drive brand awareness with your audience' },
    { id: 'reach', label: 'Promote Places', icon: '📍', description: 'Drive in-store foot traffic' },
    { id: 'traffic', label: 'Drive Traffic to Website', icon: '🚗', description: 'Drive people to your website' },
    { id: 'app_installs', label: 'App Installs', icon: '📱', description: 'Drive installs of your app' },
    { id: 'engagement', label: 'Engagement', icon: '💬', description: 'Drive engagement with your content' },
    { id: 'video_views', label: 'Video Views', icon: '▶️', description: 'Get Snapchatters to watch your video' },
    { id: 'lead_generation', label: 'Lead Generation', icon: '📋', description: 'Collect leads' },
    { id: 'conversions', label: 'Sales', icon: '🛍️', description: 'Drive purchases on your website' }
  ],
  youtube: [
    { id: 'awareness', label: 'Brand Awareness & Reach', icon: '🎯', description: 'Build brand awareness at scale' },
    { id: 'video_views', label: 'Product & Brand Consideration', icon: '▶️', description: 'Drive consideration for your brand' },
    { id: 'traffic', label: 'Website Traffic', icon: '🚗', description: 'Drive traffic to your site' },
    { id: 'lead_generation', label: 'Leads', icon: '📋', description: 'Get leads for your business' },
    { id: 'conversions', label: 'Sales', icon: '🛒', description: 'Drive sales and conversions' },
    { id: 'app_installs', label: 'App Promotion', icon: '📱', description: 'Promote your app' }
  ]
};

router.get('/objectives', (req, res) => {
  res.json(PLATFORM_OBJECTIVES);
});

router.get('/objectives/:platform', (req, res) => {
  const objectives = PLATFORM_OBJECTIVES[req.params.platform];
  if (!objectives) return res.status(404).json({ message: 'Platform not found' });
  res.json(objectives);
});

router.get('/', (req, res) => {
  res.json([
    { id: 'meta', name: 'Meta', description: 'Facebook & Instagram' },
    { id: 'google', name: 'Google Ads', description: 'Search, Display, YouTube' },
    { id: 'tiktok', name: 'TikTok', description: 'TikTok For Business' },
    { id: 'twitter', name: 'X (Twitter)', description: 'Twitter Ads' },
    { id: 'linkedin', name: 'LinkedIn', description: 'LinkedIn Ads' },
    { id: 'snapchat', name: 'Snapchat', description: 'Snapchat Ads' },
    { id: 'youtube', name: 'YouTube', description: 'YouTube Ads' }
  ]);
});

module.exports = router;
