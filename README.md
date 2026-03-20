# Liberty Heart & Vascular Surgery Hospital
## Website + CMS — v9 (Final)

---

## 📁 Folder Structure
```
liberty/
├── frontend/
│   └── index.html          ← Complete standalone website
├── backend/
│   ├── server.js           ← Node.js CMS backend
│   ├── package.json
│   ├── data/
│   │   └── site.json       ← ALL content saved here permanently
│   └── uploads/            ← Uploaded images stored here
└── README.md
```

---

## 🚀 Option 1: Run Locally (Recommended for development)

### Requirements
- Node.js v18 or higher — download from https://nodejs.org

### Steps
```bash
# 1. Enter backend folder
cd liberty/backend

# 2. Install packages (one time)
npm install

# 3. Start server
node server.js
```

### Access
- Website:  http://localhost:3001
- Admin CMS: http://localhost:3001/admin
- Default password: liberty2025

---

## ☁️ Option 2: Deploy on Render (FREE, permanent, all devices)

**Render is the BEST option for permanent blog posts across all devices.**

### Steps:
1. Create free account at https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo (or upload zip)
4. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** `Node`
5. Deploy! Render gives you a URL like: `https://liberty-hospital.onrender.com`

### Persistent Storage (IMPORTANT on Render):
- Add a **Disk** in Render dashboard → mount at `/opt/render/project/src/data`
- OR use Render's environment variable `DATA_DIR=/opt/render/project/src/data`
- This keeps site.json safe across deployments

---

## ☁️ Option 3: Deploy on Railway (FREE tier, very simple)

1. Create account at https://railway.app
2. New Project → Deploy from GitHub
3. Set root to `backend/`
4. Railway auto-detects Node.js
5. Add Volume: mount path `/app/data` for permanent storage
6. Deploy! URL auto-generated.

---

## ☁️ Option 4: Vercel (Frontend only — blogs NOT permanent across deploys)

> ⚠️ Vercel is serverless — it does NOT support persistent file storage.
> Blog posts saved to site.json WILL be lost on each new deployment.
> **Use Render or Railway instead** for permanent blogs.

If you still want Vercel (for the static site only):
1. Deploy `frontend/index.html` only
2. Connect backend separately on Render
3. Update frontend fetch URLs to your Render backend URL

---

## 🔑 Admin CMS Features
- Add blog posts with images → saved PERMANENTLY to site.json
- Visible on ALL devices via /api/blogs
- Upload doctor/hospital photos
- Edit hospital info, doctor profile
- Manage all 12 services
- Add patient reviews
- Change admin password
- Download/restore full backup

---

## 🎨 Design Notes
- Font: Lora (headings) + DM Sans (body) — consistent throughout
- Backgrounds: white + very light complementary tints
- Text colours: Blue (#1a237e), Red (#b71c1c), Green (#1b5e20), Gold (#c8a400)
- M.Ch (CTS-NIMS) always shown in RED (#b71c1c)
- All communications (phone/email/WhatsApp) always in GREEN
- Footer: white background, real Google Maps embed, clean 4-column layout

---

## 📞 Hospital Contact
- Phone: +91 70320 77766 / +91 94913 11506
- Email: hemachandra.t@gmail.com
- Address: 5-5-345/A, Sarojini Devi Layout, S.D. Road, Tirupati, AP
