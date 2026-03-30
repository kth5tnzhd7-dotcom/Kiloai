# Active Context: Link Cloaker Application

## Current State

**Status**: Production-ready link cloaking with custom domains, bot blocking, Nicegram ads, and full analytics

The application is a comprehensive link cloaking platform with custom domain management, smart bot detection & blocking, Nicegram ad URL generation, traffic filtering (allow/block lists), and full analytics tracking.

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript, Tailwind CSS 4, ESLint configuration
- [x] Link cloaking page (`/cloak`) with form UI
- [x] Links CRUD API (`/api/links`)
- [x] White page redirect (`/s/[slug]`)
- [x] In-memory link store (`src/lib/store.ts`)
- [x] Full analytics (device, browser, OS, referrer, screen, timezone, language)
- [x] Link management: enable/disable, edit, delete
- [x] Advanced options: cloak type, redirect delay, max clicks, password, expiry
- [x] **Bot detection system** (`src/lib/bot-detect.ts`) — detects 17+ known bots, crawlers, headless browsers, malicious scanners
- [x] **Traffic filtering** — bot mode (block/redirect/allow), allow/block lists for referrers and user agents
- [x] **Custom domain management** — add domains, verify via DNS TXT record, assign to links
- [x] **Nicegram ad URLs** — auto-generated Telegram ad URLs per link
- [x] **Traffic check API** (`/api/check`) — server-side bot detection
- [x] **Click tracking API** (`/api/track`) — now includes bot verdict, bot type, traffic filter enforcement
- [x] **Analytics panel** — 4 tabs: Overview, Devices, Bots, Click Log (with bot/verdict columns)
- [x] **White page** — blocks bots, shows "Access Denied" for blocked traffic, handles redirect mode

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Home page | Ready |
| `src/app/cloak/page.tsx` | Dashboard: links, domains, analytics, traffic filters | Ready |
| `src/app/api/links/route.ts` | Links CRUD API | Ready |
| `src/app/api/track/route.ts` | Click tracking with bot detection | Ready |
| `src/app/api/domains/route.ts` | Custom domain management API | Ready |
| `src/app/api/check/route.ts` | Bot detection check API | Ready |
| `src/app/s/[slug]/page.tsx` | White page with bot blocking | Ready |
| `src/lib/store.ts` | Store: links, domains, analytics, traffic filters | Ready |
| `src/lib/detect.ts` | Client-side device/browser/OS detection | Ready |
| `src/lib/bot-detect.ts` | Server-side bot detection engine | Ready |

## How It Works

### Link Creation
1. Create cloaked link at `/cloak` with destination URL, slug, white page settings
2. Configure traffic filtering: bot mode (block/redirect/allow), allow/block lists
3. Auto-generated Nicegram ad URL for Telegram ads

### Bot Detection (src/lib/bot-detect.ts)
- Detects 17+ known bots (Google, Bing, Facebook, Telegram, etc.)
- Detects crawlers, headless browsers, scrapers, malicious scanners
- Scores traffic based on headers (Accept, Accept-Language, sec-ch-ua, etc.)
- Verdicts: allow (<30 score), suspicious (30-59), block (60+)

### Traffic Filtering
- **Block mode**: Bots see "Access Denied" page
- **Redirect mode**: Bots get redirected to safe URL
- **Allow mode**: No filtering, all traffic passes
- **Block lists**: Specific referrers and user agents blocked
- **Allow lists**: Only listed referrers/user agents pass

### Custom Domains
1. Add domain in dashboard → "Custom Domains" tab
2. Get DNS TXT verification code
3. Add TXT record to your domain's DNS
4. Click "Verify" to activate
5. Assign domain to a cloaked link

### Nicegram Ads
- Each link gets auto-generated Nicegram ad URL
- Format: `https://t.me/nicegram_bot?start=ad_{slug}`
- Copy URL → paste in Nicegram ad campaign
- Real users see white page, bots are blocked

### Analytics Per Click
- Device type, browser+version, OS+version
- Referrer, screen resolution, language, timezone, IP
- **Bot detection result** (isBot, botType, verdict)
- Real vs bot click counts, blocked traffic counts

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created |
| Today | Built link cloaking with white pages and short URLs |
| Today | Added analytics tracking, device detection, link management |
| Today | Added bot detection, custom domains, Nicegram ads, traffic filtering |
| Today | Fixed domain verification: code stored server-side, proper DNS setup instructions, step-by-step guide for Cloudflare/GoDaddy/Namecheap, copy-to-clipboard for TXT record |
| Today | Domain: linkedSlug optional, DNS instructions always visible for pending. ZIP upload: auto-inject scripts at </head>, <body>, </body>. Dashboard: 3 tabs (Links, Domains, Uploads). |
| Today | Website Cloner (like saveweb2zip.com): paste URL, fetches HTML/CSS/JS/images/fonts, rewrites local paths, downloads as ZIP with index.html. Dashboard: 4 tabs (Links, Domains, Uploads, Site Cloner). |
