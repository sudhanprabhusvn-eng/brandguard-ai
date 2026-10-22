# BrandGuard AI — Deployment Guide & Operational Runbook

This document details deployment strategies, free-tier hosting configurations, routing setups, and rollback procedures for BrandGuard AI.

---

## 1. Architecture & Deployment Profile

BrandGuard AI is structured as a static client-side Single Page Application (SPA).
- **Runtime Environment**: Standard web browser (Chrome, Firefox, Safari, Edge).
- **Backend Server**: None required.
- **Database Server**: None required (client-side `localStorage` persistence).
- **External Dependencies**: Optional Google Gemini API for contextual AI review.

Because the production output consists solely of static assets (`HTML`, `CSS`, `JS`, `SVG`), it can be hosted on 100% free static hosting tiers indefinitely without server maintenance or recurring hosting fees.

---

## 2. Recommended Free-Tier Hosting Platforms

### Option A: Vercel (Recommended)
1. **Repository Setup**: Push repository to GitHub or GitLab.
2. **Project Import**: Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
3. **Configuration Settings**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **SPA Rewrites**: Handled automatically via [vercel.json](file:///d:/MAIN%20PROJECT/CODE%20AXIS/vercel.json) (included in repository root).
5. **Environment Variables**: Do not configure a VITE-prefixed shared API key. For the browser-only demo, each tester may enter their own key in AI Settings. For production, add a server-side AI proxy first.

### Option B: Netlify
1. **Import Project**: Log in to [Netlify](https://netlify.com/) and connect your repository.
2. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
3. **SPA Rewrites**: Handled automatically via [public/_redirects](file:///d:/MAIN%20PROJECT/CODE%20AXIS/public/_redirects) (`/* /index.html 200`), which Vite copies into `dist/`.

### Option C: Cloudflare Pages
1. **Connect Cloudflare**: Log in to Cloudflare Dashboard > **Workers & Pages** > **Create application** > **Pages**.
2. **Build Settings**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Free Tier Highlights**: Unlimited requests and bandwidth.

### Option D: GitHub Pages
1. Go to repository **Settings** > **Pages**.
2. Under **Build and deployment**, choose **GitHub Actions**.
3. Use the standard static HTML deployment action pointing to `dist/`.

---

## 3. Environment Variable Configuration

BrandGuard AI requires only one optional environment variable:

| Variable Name | Required? | Purpose | Default Behavior |
| :--- | :---: | :--- | :--- |
| `VITE_GEMINI_API_KEY` | Optional | API Key for Google Gemini Flash (e.g. gemini-2.5-flash) contextual review. | When omitted, BrandGuard AI runs in 100% deterministic governance mode with zero errors. |

### Security Warning
- In Vite, any variable prefixed with `VITE_` is baked into client-side JavaScript bundle during build time.
- The browser sends a user-supplied key to Google for the API request. Session storage reduces persistence but does not make the key secret from the browser user or browser extensions. Do not embed a shared key in a public build. For public multi-user use, route requests through a server-side function and store credentials in server-side secrets.

---

## 4. Local Build & Preview Verification

Before triggering a remote deployment, verify the production build locally:

```bash
# 1. Compile and bundle
npm run build

# 2. Preview the production build locally
npm run preview
```
Visit `http://localhost:4173/` and verify that the page renders and navigation works.

---

## 5. Rollback & Recovery Procedures

If a deployment fails or introduces regressions:

### Vercel / Netlify / Cloudflare Instant Rollback
1. Navigate to the hosting platform's **Deployments** tab.
2. Select the previous successful deployment.
3. Click **Promote to Production** or **Instant Rollback**.
4. Traffic is restored to the previous build artifact immediately.

### Client Data Recovery
- BrandGuard AI stores user submissions and audit history in browser `localStorage`.
- Clearing browser storage resets the application to the initial **NovaPulse AI** baseline.
- Users can export compliance records via the **Audit & Reports** screen before clearing browser data.
