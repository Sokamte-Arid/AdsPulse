const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const Revenue  = require('../models/Revenue');

// ── Helper: convert data to CSV ───────────────────────────────────────────────
function toCSV(headers, rows) {
  const escape = val => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(','))
  ];
  return lines.join('\n');
}

// ── Helper: build simple XLSX manually (XML-based) ────────────────────────────
function toXLSX(sheets) {
  // We'll use a simple XML-based XLSX approach without dependencies
  // Returns base64 encoded XLSX content
  const xmlRows = (headers, rows) => {
    const headerRow = `<Row>${headers.map((h,i) => `<Cell ss:StyleID="header"><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>`;
    const dataRows  = rows.map(row =>
      `<Row>${headers.map(h => {
        const val = row[h] !== null && row[h] !== undefined ? row[h] : '';
        const type = typeof val === 'number' ? 'Number' : 'String';
        return `<Cell><Data ss:Type="${type}">${String(val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Data></Cell>`;
      }).join('')}</Row>`
    ).join('');
    return headerRow + dataRows;
  };

  const worksheets = sheets.map(s =>
    `<Worksheet ss:Name="${s.name}"><Table>${xmlRows(s.headers, s.rows)}</Table></Worksheet>`
  ).join('');

  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:x="urn:schemas-microsoft-com:office:excel">
<Styles>
  <Style ss:ID="header">
    <Font ss:Bold="1"/>
    <Interior ss:Color="#7C3AED" ss:Pattern="Solid"/>
    <Font ss:Color="#FFFFFF" ss:Bold="1"/>
  </Style>
</Styles>
${worksheets}
</Workbook>`;
}

// ── GET /api/export/campaigns ─────────────────────────────────────────────────
router.get('/campaigns', auth, async (req, res) => {
  try {
    const { format = 'csv', status } = req.query;
    const filter = { userId: req.user._id };
    if (status && status !== 'all') filter.status = status;

    const campaigns = await Campaign.find(filter).sort({ createdAt: -1 }).lean();

    // Flatten campaigns × platforms
    const rows = [];
    campaigns.forEach(c => {
      if (!c.platforms?.length) {
        rows.push({
          'Campaign Name':  c.name,
          'Status':         c.status,
          'Objective':      c.objective,
          'Platform':       '—',
          'Total Budget':   c.totalBudget || 0,
          'Amount Spent':   0,
          'Impressions':    0,
          'Clicks':         0,
          'CTR (%)':        0,
          'CPM ($)':        0,
          'CPC ($)':        0,
          'Conversions':    0,
          'Reach':          0,
          'Currency':       c.currency || 'USD',
          'Start Date':     c.startDate ? new Date(c.startDate).toLocaleDateString() : '—',
          'End Date':       c.endDate   ? new Date(c.endDate).toLocaleDateString()   : '—',
          'Created':        new Date(c.createdAt).toLocaleDateString(),
          'Tags':           (c.tags || []).join(', '),
        });
      } else {
        c.platforms.forEach(p => {
          const m = p.metrics || {};
          rows.push({
            'Campaign Name':  c.name,
            'Status':         c.status,
            'Objective':      c.objective,
            'Platform':       p.platform,
            'Total Budget':   p.budget || c.totalBudget || 0,
            'Amount Spent':   m.amountSpent   || 0,
            'Impressions':    m.impressions   || 0,
            'Clicks':         m.totalClicks   || 0,
            'CTR (%)':        m.ctr           || 0,
            'CPM ($)':        m.cpm           || 0,
            'CPC ($)':        m.cpc           || 0,
            'Conversions':    m.conversions   || 0,
            'Reach':          m.totalReach    || 0,
            'Currency':       c.currency || 'USD',
            'Start Date':     c.startDate ? new Date(c.startDate).toLocaleDateString() : '—',
            'End Date':       c.endDate   ? new Date(c.endDate).toLocaleDateString()   : '—',
            'Created':        new Date(c.createdAt).toLocaleDateString(),
            'Tags':           (c.tags || []).join(', '),
          });
        });
      }
    });

    const headers = ['Campaign Name','Status','Objective','Platform','Total Budget','Amount Spent','Impressions','Clicks','CTR (%)','CPM ($)','CPC ($)','Conversions','Reach','Currency','Start Date','End Date','Created','Tags'];

    if (format === 'xlsx') {
      const xlsx = toXLSX([{ name: 'Campaigns', headers, rows }]);
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename="campaigns_${Date.now()}.xls"`);
      return res.send(xlsx);
    }

    const csv = toCSV(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="campaigns_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── GET /api/export/analytics ─────────────────────────────────────────────────
router.get('/analytics', auth, async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    const campaigns = await Campaign.find({
      userId: req.user._id,
      status: { $in: ['active','paused','completed','draft'] },
    }).lean();

    // Platform summary
    const byPlatform = {};
    campaigns.forEach(c => {
      (c.platforms || []).forEach(p => {
        const m = p.metrics || {};
        if (!byPlatform[p.platform]) {
          byPlatform[p.platform] = { platform: p.platform, campaigns: 0, spent: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 };
        }
        const b = byPlatform[p.platform];
        b.campaigns++;
        b.spent       += m.amountSpent || 0;
        b.impressions += m.impressions || 0;
        b.clicks      += m.totalClicks || 0;
        b.conversions += m.conversions || 0;
        b.reach       += m.totalReach  || 0;
      });
    });

    const rows = Object.values(byPlatform).map(b => ({
      'Platform':     b.platform,
      'Campaigns':    b.campaigns,
      'Amount Spent': b.spent.toFixed(2),
      'Impressions':  b.impressions,
      'Clicks':       b.clicks,
      'CTR (%)':      b.impressions > 0 ? ((b.clicks / b.impressions) * 100).toFixed(2) : 0,
      'CPM ($)':      b.impressions > 0 ? ((b.spent  / b.impressions) * 1000).toFixed(2) : 0,
      'CPC ($)':      b.clicks      > 0 ? (b.spent   / b.clicks).toFixed(2)              : 0,
      'Conversions':  b.conversions,
      'Reach':        b.reach,
      'Generated':    new Date().toLocaleDateString(),
    }));

    const headers = ['Platform','Campaigns','Amount Spent','Impressions','Clicks','CTR (%)','CPM ($)','CPC ($)','Conversions','Reach','Generated'];

    if (format === 'xlsx') {
      const xlsx = toXLSX([{ name: 'Analytics', headers, rows }]);
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${Date.now()}.xls"`);
      return res.send(xlsx);
    }

    const csv = toCSV(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analytics_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── GET /api/export/roi ───────────────────────────────────────────────────────
router.get('/roi', auth, async (req, res) => {
  try {
    const { format = 'csv', period = '30d' } = req.query;
    const periodDays = { '7d':7,'30d':30,'90d':90,'1y':365 };
    const since = periodDays[period] ? new Date(Date.now() - periodDays[period]*86400000) : new Date(0);

    const entries = await Revenue.find({ userId: req.user._id, createdAt: { $gte: since } }).sort({ createdAt: -1 }).lean();

    const rows = entries.map(e => {
      const roi  = e.adSpend > 0 ? ((e.amount - e.adSpend) / e.adSpend * 100).toFixed(1) : '—';
      const roas = e.adSpend > 0 ? (e.amount / e.adSpend).toFixed(2)                      : '—';
      return {
        'Date':         new Date(e.createdAt).toLocaleDateString(),
        'Campaign':     e.campaignName || '—',
        'Platform':     e.platform,
        'Source':       e.source,
        'Revenue':      e.amount,
        'Currency':     e.currency,
        'Ad Spend':     e.adSpend || 0,
        'Profit':       e.adSpend ? (e.amount - e.adSpend).toFixed(2) : '—',
        'ROI (%)':      roi,
        'ROAS':         roas,
        'Conversions':  e.conversions || 0,
        'Notes':        e.description || '',
        'Period Start': e.period?.start ? new Date(e.period.start).toLocaleDateString() : '—',
        'Period End':   e.period?.end   ? new Date(e.period.end).toLocaleDateString()   : '—',
      };
    });

    // Summary row
    const totalRevenue = entries.reduce((s,e) => s + e.amount, 0);
    const totalSpend   = entries.reduce((s,e) => s + (e.adSpend||0), 0);
    rows.push({
      'Date': 'TOTAL', 'Campaign':'', 'Platform':'ALL', 'Source':'',
      'Revenue': totalRevenue.toFixed(2), 'Currency':'',
      'Ad Spend': totalSpend.toFixed(2),
      'Profit': (totalRevenue - totalSpend).toFixed(2),
      'ROI (%)': totalSpend > 0 ? ((totalRevenue - totalSpend)/totalSpend*100).toFixed(1) : '—',
      'ROAS': totalSpend > 0 ? (totalRevenue/totalSpend).toFixed(2) : '—',
      'Conversions': entries.reduce((s,e) => s + (e.conversions||0), 0),
      'Notes':'', 'Period Start':'', 'Period End':'',
    });

    const headers = ['Date','Campaign','Platform','Source','Revenue','Currency','Ad Spend','Profit','ROI (%)','ROAS','Conversions','Notes','Period Start','Period End'];

    if (format === 'xlsx') {
      const xlsx = toXLSX([{ name: 'ROI & Revenue', headers, rows }]);
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename="roi_${Date.now()}.xls"`);
      return res.send(xlsx);
    }

    const csv = toCSV(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="roi_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── GET /api/export/full ──────────────────────────────────────────────────────
// Export everything in one multi-sheet Excel file
router.get('/full', auth, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ userId: req.user._id }).sort({ createdAt:-1 }).lean();
    const revenues  = await Revenue.find({ userId: req.user._id }).sort({ createdAt:-1 }).lean();

    // Sheet 1: Campaigns
    const campHeaders = ['Campaign Name','Status','Objective','Platform','Budget','Spent','Impressions','Clicks','CTR (%)','Conversions','Created'];
    const campRows = [];
    campaigns.forEach(c => {
      (c.platforms?.length ? c.platforms : [{}]).forEach(p => {
        const m = p.metrics || {};
        campRows.push({
          'Campaign Name': c.name, 'Status': c.status, 'Objective': c.objective,
          'Platform':  p.platform || '—', 'Budget': p.budget || c.totalBudget || 0,
          'Spent':     m.amountSpent || 0, 'Impressions': m.impressions || 0,
          'Clicks':    m.totalClicks || 0, 'CTR (%)': m.ctr || 0,
          'Conversions': m.conversions || 0, 'Created': new Date(c.createdAt).toLocaleDateString(),
        });
      });
    });

    // Sheet 2: Platform Summary
    const byPlatform = {};
    campaigns.forEach(c => {
      (c.platforms||[]).forEach(p => {
        const m = p.metrics||{};
        if (!byPlatform[p.platform]) byPlatform[p.platform] = { platform:p.platform, campaigns:0, spent:0, impressions:0, clicks:0, conversions:0 };
        const b = byPlatform[p.platform];
        b.campaigns++; b.spent+=m.amountSpent||0; b.impressions+=m.impressions||0;
        b.clicks+=m.totalClicks||0; b.conversions+=m.conversions||0;
      });
    });
    const platHeaders = ['Platform','Campaigns','Spent','Impressions','Clicks','CTR (%)','Conversions'];
    const platRows = Object.values(byPlatform).map(b => ({
      'Platform':b.platform,'Campaigns':b.campaigns,'Spent':b.spent.toFixed(2),
      'Impressions':b.impressions,'Clicks':b.clicks,
      'CTR (%)': b.impressions>0?((b.clicks/b.impressions)*100).toFixed(2):0,
      'Conversions':b.conversions,
    }));

    // Sheet 3: ROI
    const roiHeaders = ['Date','Campaign','Platform','Revenue','Ad Spend','Profit','ROI (%)','ROAS'];
    const roiRows = revenues.map(e => ({
      'Date': new Date(e.createdAt).toLocaleDateString(), 'Campaign': e.campaignName||'—',
      'Platform': e.platform, 'Revenue': e.amount, 'Ad Spend': e.adSpend||0,
      'Profit': e.adSpend?(e.amount-e.adSpend).toFixed(2):'—',
      'ROI (%)': e.adSpend>0?((e.amount-e.adSpend)/e.adSpend*100).toFixed(1):'—',
      'ROAS': e.adSpend>0?(e.amount/e.adSpend).toFixed(2):'—',
    }));

    const xlsx = toXLSX([
      { name:'Campaigns',        headers:campHeaders, rows:campRows  },
      { name:'Platform Summary', headers:platHeaders, rows:platRows  },
      { name:'ROI & Revenue',    headers:roiHeaders,  rows:roiRows   },
    ]);

    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="adspulse_report_${Date.now()}.xls"`);
    res.send(xlsx);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

module.exports = router;