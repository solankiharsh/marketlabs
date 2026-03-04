# Transitioning to Investing.com-Style Layout

## Current Issue: Blank Screen
**Root Cause:** No scan data in database yet. The scanner runs every 5 minutes, but hasn't completed a successful scan.

**Quick Fix:**
1. Click "Trigger Market Scan" button on homepage
2. Wait ~30 seconds for scan to complete
3. Data will appear automatically

## Investing.com-Style Features to Implement

### 1. Enhanced Asset Detail Page (Like XAG/USD)
**Created Components:**
- ✅ `PriceChart.tsx` - Basic price line chart
- ✅ `TechnicalSummary.tsx` - Technical indicators panel
- ✅ Enhanced `app/market/[symbol]/page.tsx` - Investing.com-style layout

**Layout Structure:**
```
┌─────────────────────────────────────────────────┐
│  Asset Name & Back Button                       │
├──────────────────┬──────────────────────────────┤
│                  │  Technical Summary            │
│  Price Chart     │  - Signal (Bullish/Bearish)  │
│  (Large)         │  - Score                      │
│                  │  - RSI, MACD, SMA, EMA        │
│  Timeframe:      │  - Momentum                  │
│  [1h][4h][1d][1w]│                               │
│                  ├──────────────────────────────┤
│  Technical       │  Quick Stats                  │
│  Analysis Card   │  - Current Price              │
│                  │  - 24h Change                 │
│                  │  - Score                      │
│                  │  - Setup Type                 │
│                  ├──────────────────────────────┤
│  Historical      │  Bollinger Bands              │
│  Scans           │  - Upper/Lower/Current       │
└──────────────────┴──────────────────────────────┘
```

### 2. Required Dependencies

**For Professional Charts:**
```bash
cd web
npm install lightweight-charts
```

**For Date Formatting:**
```bash
npm install date-fns
```

### 3. Chart Library Options

**Option A: TradingView Lightweight Charts (Recommended)**
- Professional candlestick charts
- Fast and lightweight
- Perfect for trading platforms
- Install: `npm install lightweight-charts`

**Option B: Recharts (Already Installed)**
- Good for basic charts
- Less trading-focused
- Already available

**Option C: TradingView Widget (Embed)**
- Full TradingView features
- Requires account
- Less customization

### 4. Backend API Enhancements Needed

**Add these routes:**
```typescript
// Get OHLCV data for charts
GET /api/market/ohlcv/:symbol?timeframe=1h&count=100

// Get historical price data
GET /api/market/history/:symbol?from=2024-01-01&to=2024-01-31

// Get news for asset
GET /api/market/news/:symbol?limit=10
```

### 5. UI/UX Design Principles (Keep Intact)

**Current Design System:**
- ✅ Dark theme (bg-bg-primary: #000000)
- ✅ Accent color: #E8B45E (gold)
- ✅ Compact tables (not verbose)
- ✅ Bite-size vs Full toggle
- ✅ Clean, minimal interface

**Investing.com Elements to Add:**
- Large price chart (candlestick)
- Technical indicators overlay
- Multi-timeframe selector
- Price info panel (current, high, low, change)
- News feed sidebar
- Quick stats panel

**Design Adaptation:**
- Keep dark theme
- Use existing accent colors
- Maintain compact design
- Add charts but keep them clean
- Use existing card/border styles

### 6. Implementation Steps

**Step 1: Fix Blank Screen (Done)**
- ✅ Added manual scan trigger
- ✅ Improved error handling
- ✅ Added loading states

**Step 2: Install Chart Library**
```bash
cd web
npm install lightweight-charts
```

**Step 3: Create Candlestick Chart Component**
- Replace basic SVG chart with lightweight-charts
- Add candlestick series
- Add technical indicator overlays (RSI, MACD lines)
- Add timeframe selector

**Step 4: Enhance Asset Detail Page**
- Add OHLCV data fetching
- Integrate candlestick chart
- Add news feed (if available)
- Add price alerts UI

**Step 5: Add Backend OHLCV Endpoint**
```typescript
// backend/src/routes/market.routes.ts
market.get('/ohlcv/:symbol', async (c) => {
  const symbol = c.req.param('symbol');
  const timeframe = c.req.query('timeframe') || '1h';
  const count = parseInt(c.req.query('count') || '100');
  
  const derivService = getDerivDataService();
  const ohlcv = await derivService.getOHLCV(symbol, count, parseTimeframe(timeframe));
  
  return c.json({ success: true, data: ohlcv });
});
```

### 7. Key Files to Create/Update

**New Components:**
- `web/components/market/CandlestickChart.tsx` - Professional chart
- `web/components/market/IndicatorOverlay.tsx` - RSI/MACD on chart
- `web/components/market/NewsFeed.tsx` - News sidebar
- `web/components/market/PriceInfoPanel.tsx` - Price stats

**Update Existing:**
- `web/app/market/[symbol]/page.tsx` - Add chart integration
- `web/components/market/PriceChart.tsx` - Upgrade to candlestick
- `backend/src/routes/market.routes.ts` - Add OHLCV endpoint

### 8. Quick Start Guide

**To see data immediately:**
1. Go to homepage
2. Click "Trigger Market Scan"
3. Wait for scan to complete
4. Data will appear in table

**To add professional charts:**
1. Install: `cd web && npm install lightweight-charts`
2. Update `PriceChart.tsx` to use lightweight-charts
3. Add OHLCV endpoint to backend
4. Fetch and display candlestick data

### 9. Design Mockup Structure

**Homepage:**
- Market overview cards (Total Assets, Bullish/Bearish)
- Ranked opportunities table (compact)
- Partner signals panel

**Asset Detail Page (Investing.com Style):**
- Large chart (60% width)
- Technical summary (40% width)
- News feed below chart
- Historical analysis section

**Keep:**
- Dark theme
- Compact design
- Bite-size/Full toggle
- Existing color scheme

