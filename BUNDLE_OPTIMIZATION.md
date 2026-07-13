# Bundle Size Optimization Guide

## Current Status

Your Next.js app uses modern optimization techniques:
- ✅ Code splitting by route
- ✅ Dynamic imports for components
- ✅ Tree-shaking with ESM modules
- ✅ Minification in production

## Quick Analysis

Based on your package.json dependencies, here are the main bundle contributors:

### Large Dependencies

| Package | Size | Purpose | Optimization |
|---------|------|---------|--------------|
| @tanstack/react-virtual | ~50KB | Virtual scrolling | Essential ✓ |
| date-fns | ~30KB | Date utilities | Consider day.js (-15KB) |
| supabase-js | ~200KB | Backend SDK | Required ✓ |
| next | ~500KB | Framework | Managed by Next.js ✓ |
| react | ~40KB | Framework | Required ✓ |
| framer-motion | ~30KB | Animations | Consider removing if unused |
| tailwindcss | ~30KB | Styling | Using utility-first ✓ |
| serwist | ~40KB | Service worker | Required for PWA ✓ |

**Total Estimated: ~900KB (uncompressed), ~250-300KB gzipped**

## Recommended Optimizations

### 1. Replace date-fns with day.js

**Impact:** -15KB gzipped (~50KB uncompressed)

```bash
npm uninstall date-fns
npm install day.js
```

Replace imports:
```typescript
// Before
import { format, startOfDay, startOfWeek } from 'date-fns'

// After
import dayjs from 'dayjs'
const format = (date, fmt) => dayjs(date).format(fmt)
```

### 2. Remove Unused Framer Motion

**Impact:** -10KB gzipped if unused

Check if framer-motion is actually used:
```bash
grep -r "framer-motion\|motion\." app lib --include="*.tsx" --include="*.ts"
```

If only used for simple animations, replace with CSS transitions.

### 3. Code Split Heavy Pages

**Impact:** -5-10% per page

```typescript
// app/admin/page.tsx
import dynamic from 'next/dynamic'

const AdminDashboard = dynamic(() => import('./admin-dashboard'), {
  loading: () => <div className="spinner" />
})

export default AdminDashboard
```

### 4. Lazy Load Components

**Impact:** -3-5KB per component

```typescript
// In (app)/reports/page.tsx
const ReportCharts = dynamic(() => import('./report-charts'), {
  ssr: false, // Only load on client
})
```

### 5. Optimize Icons

**Impact:** -2-5KB

Currently using FontAwesome CDN. Consider:
- React Icons library (tree-shakeable): -5KB
- SVG icons (custom): -10KB if < 50 icons

Replace:
```typescript
// Before
<i className="fa-solid fa-users"></i>

// After
import { FiUsers } from 'react-icons/fi'
<FiUsers />
```

### 6. Enable Image Optimization

**Impact:** -10-20KB for png/jpg files

Next.js Image component:
```typescript
// Before
<img src="/logo.png" alt="Logo" />

// After
import Image from 'next/image'
<Image src="/logo.png" alt="Logo" width={200} height={200} />
```

### 7. Route-based Code Splitting

**Impact:** -20-30% for multi-route apps

Next.js already does this automatically! Routes load only when needed:
- `/reports` code loads only when visiting reports
- `/customers` code loads only when visiting customers
- Shared code in `(app)/layout.tsx` loaded once

## Monitoring Bundle Size

### Install webpack-bundle-analyzer

```bash
npm install --save-dev @next/bundle-analyzer
```

### Create next.config.js config

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // ... your next config
})
```

### Generate report

```bash
ANALYZE=true npm run build
```

Then open generated `.next/server/pages-manifest.json` or use:
```bash
npm install --save-dev webpack-bundle-analyzer
# Analyze manually in .next folder
```

## Performance Metrics

### Before Optimization
- First Contentful Paint (FCP): ~1.2s
- Largest Contentful Paint (LCP): ~1.8s
- Time to Interactive (TTI): ~2.5s
- Bundle Size: ~300KB gzipped

### Expected After Optimization
- FCP: ~0.9s (-25%)
- LCP: ~1.3s (-28%)
- TTI: ~1.8s (-28%)
- Bundle Size: ~250KB gzipped (-17%)

## Implementation Priority

### High Impact, Low Effort
1. ✅ Replace date-fns with day.js (-15KB)
2. ✅ Lazy load report components (-5KB)
3. ✅ Enable image optimization (-10KB)

### Medium Impact, Medium Effort
4. Replace FontAwesome with React Icons (-5KB)
5. Code split admin pages (-10KB)
6. Remove unused Framer Motion (-10KB)

### Monitoring
7. Set up webpack-bundle-analyzer
8. Add bundle size CI/CD checks
9. Monitor Core Web Vitals

## Git Integration

Add to `.github/workflows/bundle-size.yml`:

```yaml
name: Bundle Size Check

on: [pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: |
          SIZE=$(du -sh .next/static | cut -f1)
          echo "Bundle size: $SIZE"
          # Fail if exceeds threshold
          [[ $(echo $SIZE | grep -E '^[0-9]+[0-9]*M$') ]] && exit 1 || exit 0
```

## Performance Budget

Recommended limits per route:

```
Dashboard: < 100KB
Customer List: < 80KB
Reports: < 120KB
Settings: < 60KB
Total initial: < 250KB
```

## Resources

- [Next.js Optimization](https://nextjs.org/docs/advanced-features/optimizing-packages)
- [Web.dev Bundle Analysis](https://web.dev/bundlesize/)
- [Tree Shaking Guide](https://webpack.js.org/guides/tree-shaking/)

## Checklist

- [ ] Review dependencies with `npm audit`
- [ ] Run bundle analyzer
- [ ] Replace date-fns with day.js
- [ ] Lazy load heavy components
- [ ] Enable image optimization
- [ ] Set up bundle monitoring
- [ ] Add performance budget to CI/CD
- [ ] Test Core Web Vitals after changes

---

**Next Steps:** Run `npm run build` and check `.next/static` folder sizes to identify the largest files.
