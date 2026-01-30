# Video AI - Distribution Guide

## Package for Friends

### Windows
Double-click: `build.bat`

### Mac/Linux
```bash
chmod +x build.sh
./build.sh
```

Output: `video-ai-v1.0.0.zip` (3-4 MB)

---

## How Friends Use It

### Windows Users
1. Extract `video-ai-v1.0.0.zip`
2. Open the extracted folder
3. Double-click `start.bat`
4. Wait for server to start
5. Browser opens http://localhost:3000 automatically
6. Click "Set API Key" button
7. Enter your API key from allapi.store
8. Start generating videos!

### Mac/Linux Users
1. Extract `video-ai-v1.0.0.zip`
2. Open terminal in the extracted folder
3. Run: `chmod +x start.sh && ./start.sh`
4. Open browser: http://localhost:3000
5. Click "Set API Key" button
6. Enter your API key from allapi.store
7. Start generating videos!

---

## Important Notes

### ⚠️ Cannot open index.html directly
- Browser security blocks ES6 modules via `file://` protocol
- Must use HTTP server (start.bat or start.sh)
- This is the recommended and only working method

### 🔑 About API Key Security

Your code is safe:
```typescript
// API key stored in user's browser localStorage
// Each user must enter their own key
const apiKey = localStorage.getItem('videoai_api_key');
```

This means:
- ✅ Your code contains NO API keys
- ✅ Each friend needs their own allapi.store account
- ✅ Each API key is stored separately in each browser
- ✅ Completely secure, no key leakage

---

## Comparison: Static Build vs Electron

| Aspect | Static Build (Recommended) | Electron |
|--------|---------------------------|----------|
| File size | 3-4 MB ✅ | 100+ MB ❌ |
| Build time | 3 seconds ✅ | 30+ seconds ❌ |
| Installation | Extract & run ✅ | Install required ❌ |
| API Key Security | localStorage ✅ | localStorage ✅ |
| Cross-platform | All ✅ | Separate builds ❌ |
| Maintenance | Simple ✅ | Complex ❌ |

---

## Why NOT Electron?

Electron disadvantages:
- ❌ Huge file size (adds 100-200 MB)
- ❌ Complex packaging (Windows/Mac/Linux separate)
- ❌ Updates require new installer
- ❌ Development cost (learning Electron API)
- ❌ No actual benefit for this project

Electron advantages (useless here):
- Native window control → Web can do fullscreen
- System tray → Not needed
- File system access → Not needed (online tool only)
- Local database → Already using localStorage

---

## Deployment Options (Optional)

### Free Platforms
| Platform | Link | Features |
|----------|------|----------|
| Vercel | vercel.com | Global CDN, auto HTTPS |
| Netlify | netlify.com | Drag & drop deploy |
| Cloudflare Pages | pages.dev | Fast CDN, free SSL |
| GitHub Pages | pages.github.com | Free, basic |

### Deploy to Vercel (5 minutes)
```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Release v1.0.0"
git branch -M main
git remote add origin https://github.com/yourname/video-ai.git
git push -u origin main

# 2. Connect Vercel
# - Go to vercel.com
# - Import GitHub repo
# - Done!
```

---

## Summary

Your requirements:
- ✅ Share with friends → Static build is perfect
- ✅ Don't share API key → Already implemented (localStorage)
- ✅ Originally wanted desktop → Desktop has no advantage

**Recommendation: Use static build**

Advantages:
1. Small file (3-4 MB)
2. Fast build (one click)
3. Zero cost (no servers needed)
4. API secure (independent keys)
5. Cross-platform (works everywhere)

---

## Technical Info

### Current Architecture
```
Pure frontend app
├─ React + TypeScript (UI)
├─ Vite (build tool)
├─ Tailwind CSS (styling)
└─ localStorage (persistence)

API calls:
├─ Direct to allapi.store from browser
└─ No backend server needed
```

This is:
✅ Static SPA (Single Page App)
✅ Client-side Rendering
✅ No server-side logic

### Why no Electron?
- No desktop API features needed
- All API calls work in browser
- Electron only adds complexity and size
