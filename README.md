# ⚡ AdsPulse — Cross-Platform Ads Management System

A full-stack, production-ready advertising management platform built with **React**, **Tailwind CSS**, **Node.js**, and **MongoDB**. Manage campaigns across Meta, Google, TikTok, Twitter/X, LinkedIn, Snapchat and YouTube from one sleek dashboard.

---

## ✨ Features

### Campaign Management
- **Create campaigns** with a 5-step wizard (Objective → Platforms & Budget → Details → Creative → Review)
- **Platform-native objectives** — each platform shows its actual campaign objectives (11 for Meta, matching Google, TikTok, etc.)
- **Multi-platform budget allocation** — set daily or lifetime budgets per platform
- **Audience targeting** — age, gender, locations, and interests
- **Pause / Resume** individual platforms without touching the whole campaign
- **Inline budget editing** on the campaign detail page

### Ad Creatives
- **Single Image** ads
- **Single Video** ads
- **Carousel** ads (2–10 scrollable cards)
- **Link destination picker**: Website, Messenger, WhatsApp, Instagram DM, Telegram
- Custom CTA buttons (Learn More, Shop Now, Sign Up, etc.)

### Analytics & KPIs
9 core KPIs across all campaigns:
| KPI | Description |
|-----|-------------|
| Amount Spent | Total ad spend |
| Impressions | Times ads were shown |
| CPM | Cost per 1,000 impressions |
| Total Clicks | Link clicks |
| CTR | Click-through rate |
| CPC | Cost per click |
| Conversions | Total conversion actions |
| Total Reach | Unique users reached |
| Add to Cart | Cart addition events |

- **Click-to-switch KPI chart** — click any KPI card to instantly update the time-series chart
- **By Platform toggle** — split any KPI chart by platform on one graph
- **7-day / 30-day / 90-day** period selector
- **Platform performance ranking** with live metric bars

### Period Comparison
- Compare any two custom date ranges side by side
- Change indicators with % up/down for each KPI
- Visual bar chart comparison

### Platform Icons
Real 2D SVG icons for all 7 platforms — Meta, Google, TikTok, X (Twitter), LinkedIn, Snapchat, YouTube.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment

Create `server/.env`:
```env
MONGO_URI=mongodb://localhost:27017/ads_manager
JWT_SECRET=your_super_secret_key_change_this_in_production
CLIENT_URL=http://localhost:3000
PORT=5000
```

### 3. Seed Demo Data

```bash
cd server
node seed.js
```

This creates:
- 1 demo user: `demo@adspulse.com` / `demo123`
- 7 campaigns across 5 statuses (active, paused, draft)
- 60 days of historical metrics per platform
- Realistic KPI data for all dashboards

### 4. Start the App

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm start
```

Open: **http://localhost:3000**

---

## 🐳 Docker (Full Stack)

```bash
# From project root
docker-compose up --build
```

Services:
- MongoDB on port `27017`
- API server on port `5000`
- React client on port `3000`

---

## 📁 Project Structure

```
ads-manager/
├── server/
│   ├── index.js              # Express entry point
│   ├── seed.js               # Demo data seeder
│   ├── models/
│   │   ├── Campaign.js       # Campaign + platform + creative schema
│   │   └── User.js           # User + connected platforms schema
│   ├── routes/
│   │   ├── auth.js           # Register, login, JWT
│   │   ├── campaigns.js      # CRUD + budget/status controls
│   │   ├── analytics.js      # KPI overview, timeseries, compare, ranking
│   │   └── platforms.js      # Platform list + objectives per platform
│   └── middleware/
│       └── auth.js           # JWT verification middleware
│
├── client/src/
│   ├── App.js                # Routes
│   ├── context/
│   │   └── AuthContext.js    # Auth state
│   ├── utils/
│   │   ├── api.js            # Axios service layer
│   │   └── platforms.js      # Icons, KPI defs, constants, formatters
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Sidebar.js    # Collapsible nav with all links
│   │   │   └── Layout.js     # Page wrapper
│   │   ├── dashboard/
│   │   │   ├── KPICards.js   # Click-to-select KPI grid
│   │   │   └── KPIChart.js   # Dynamic time-series area chart
│   │   ├── analytics/
│   │   │   ├── PlatformPerformanceChart.js  # Platform ranking
│   │   │   └── CompareAnalytics.js          # Period comparison
│   │   └── campaigns/
│   │       ├── ObjectiveStep.js       # Step 1: objective picker
│   │       ├── PlatformBudgetStep.js  # Step 2: platforms + budgets
│   │       ├── CampaignDetailsStep.js # Step 3: name, dates, targeting
│   │       └── CreativeStep.js        # Step 4: single/carousel builder
│   └── pages/
│       ├── LoginPage.js
│       ├── DashboardPage.js
│       ├── CampaignsPage.js
│       ├── CampaignDetailPage.js
│       ├── NewCampaignPage.js
│       ├── AnalyticsPage.js
│       ├── PerformancePage.js
│       └── ComparePage.js
│
└── docker-compose.yml
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List campaigns (filter by status, platform) |
| GET | `/api/campaigns/:id` | Get campaign details |
| POST | `/api/campaigns` | Create campaign |
| PUT | `/api/campaigns/:id` | Update campaign |
| DELETE | `/api/campaigns/:id` | Delete campaign |
| PATCH | `/api/campaigns/:id/platforms/:platform/budget` | Update platform budget |
| PATCH | `/api/campaigns/:id/platforms/:platform/status` | Toggle platform status |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Aggregated KPIs + platform breakdown |
| GET | `/api/analytics/timeseries` | KPI over time (kpi, period, platform params) |
| GET | `/api/analytics/compare` | Period-over-period comparison |
| GET | `/api/analytics/platform-performance` | Platform ranking for active campaigns |

### Platforms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platforms` | All supported platforms |
| GET | `/api/platforms/objectives` | All objectives per platform |
| GET | `/api/platforms/objectives/:platform` | Objectives for one platform |

---

## 🎨 Design System

- **Primary color**: Purple `#7c3aed`
- **Background**: Dark `#0f0a1e`
- **Cards**: `rgba(26, 16, 51, 0.8)` with glass effect
- **Fonts**: Syne (headings) + Plus Jakarta Sans (body)
- **Charts**: Recharts with custom purple tooltips

---

## 🔮 Extending the System

### Connect Real Platform APIs
In `server/routes/campaigns.js`, after creating/updating a campaign, add calls to:
- **Meta**: Meta Marketing API (`graph.facebook.com/v18.0/`)
- **Google**: Google Ads API
- **TikTok**: TikTok Business API
- **LinkedIn**: LinkedIn Campaign Manager API

### Add Real Metrics Sync
Create a cron job (`node-cron`) that:
1. Fetches real metrics from each platform's API
2. Updates `campaign.platforms[].metrics`
3. Appends to `campaign.metricsHistory` for time-series

---

## 📄 License
MIT — build and extend freely.
