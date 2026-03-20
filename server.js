/**
 * Liberty Heart & Vascular Surgery Hospital
 * Full CMS Backend — Node.js + Express
 *
 * Blog posts saved PERMANENTLY to data/site.json
 * Visible across ALL devices (same server)
 * Image upload supported for blog posts and doctor/hospital photos
 *
 * START:  cd backend && npm install && node server.js
 * ADMIN:  http://localhost:3001/admin
 * API:    http://localhost:3001/api/site
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DATA = path.join(DATA_DIR, 'site.json');
const UPL = path.join(__dirname, 'uploads');

// ── ENSURE REQUIRED FILES/FOLDERS EXIST ─────────────────────────────
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPL)) {
  fs.mkdirSync(UPL, { recursive: true });
}
if (!fs.existsSync(DATA)) {
  fs.writeFileSync(
    DATA,
    JSON.stringify(
      {
        hospital: {},
        doctor: {},
        services: [],
        reviews: [],
        blogs: [],
        admin_password: 'liberty2025'
      },
      null,
      2
    ),
    'utf8'
  );
}

// ── MIDDLEWARE ──────────────────────────────────────────────────────
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/uploads', express.static(UPL));

// CORS — allow all for local dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve frontend
app.use('/', express.static(path.join(__dirname, '../frontend')));

// ── FILE UPLOAD ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPL),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    cb(null, `${Date.now()}_${safe}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (JPG, PNG, WebP, GIF) are allowed'));
  }
});

// ── DATA HELPERS ────────────────────────────────────────────────────
function read() {
  try {
    return JSON.parse(fs.readFileSync(DATA, 'utf8'));
  } catch {
    return {
      hospital: {},
      doctor: {},
      services: [],
      reviews: [],
      blogs: [],
      admin_password: 'liberty2025'
    };
  }
}

function write(data) {
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2), 'utf8');
}

function nextId(arr) {
  return arr.length ? Math.max(...arr.map(x => x.id || 0)) + 1 : 1;
}

// ── AUTH ────────────────────────────────────────────────────────────
function auth(req, res, next) {
  const data = read();
  const key = req.headers['x-admin-key'] || req.query.key || req.body?.admin_key;
  if (key !== data.admin_password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ══════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════
app.get('/api/site', (req, res) => res.json(read()));
app.get('/api/hospital', (req, res) => res.json(read().hospital || {}));
app.get('/api/doctor', (req, res) => res.json(read().doctor || {}));
app.get('/api/services', (req, res) => res.json((read().services || []).filter(s => s.visible !== false)));
app.get('/api/reviews', (req, res) => res.json(read().reviews || []));
app.get('/api/blogs', (req, res) => res.json(read().blogs || []));

app.get('/api/blogs/:id', (req, res) => {
  const b = (read().blogs || []).find(x => x.id === parseInt(req.params.id, 10));
  b ? res.json(b) : res.status(404).json({ error: 'Not found' });
});

// ══════════════════════════════════════════════════════════════════
// ADMIN API
// ══════════════════════════════════════════════════════════════════

// ── Hospital ──
app.get('/api/admin/hospital', auth, (req, res) => {
  res.json(read().hospital || {});
});

app.put('/api/admin/hospital', auth, (req, res) => {
  const d = read();
  d.hospital = { ...(d.hospital || {}), ...req.body };
  write(d);
  res.json({ ok: true, hospital: d.hospital });
});

// ── Doctor ──
app.get('/api/admin/doctor', auth, (req, res) => {
  res.json(read().doctor || {});
});

app.put('/api/admin/doctor', auth, (req, res) => {
  const d = read();
  d.doctor = { ...(d.doctor || {}), ...req.body };
  write(d);
  res.json({ ok: true, doctor: d.doctor });
});

// ── Services ──
app.get('/api/admin/services', auth, (req, res) => {
  res.json(read().services || []);
});

app.post('/api/admin/services', auth, (req, res) => {
  const d = read();
  d.services = d.services || [];
  const svc = { ...req.body, id: nextId(d.services), visible: true };
  d.services.push(svc);
  write(d);
  res.json({ ok: true, service: svc });
});

app.put('/api/admin/services/:id', auth, (req, res) => {
  const d = read();
  d.services = d.services || [];
  const i = d.services.findIndex(s => s.id === parseInt(req.params.id, 10));
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  d.services[i] = { ...d.services[i], ...req.body };
  write(d);
  res.json({ ok: true, service: d.services[i] });
});

app.delete('/api/admin/services/:id', auth, (req, res) => {
  const d = read();
  d.services = (d.services || []).filter(s => s.id !== parseInt(req.params.id, 10));
  write(d);
  res.json({ ok: true });
});

// ── Blogs ──
app.post('/api/admin/blogs', auth, (req, res) => {
  const d = read();
  d.blogs = d.blogs || [];
  const blog = {
    ...req.body,
    id: nextId(d.blogs),
    date:
      req.body.date ||
      new Date().toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric'
      }),
    emoji: req.body.emoji || '📝',
    image: req.body.image || ''
  };
  d.blogs.unshift(blog);
  write(d);
  res.json({ ok: true, blog });
});

app.put('/api/admin/blogs/:id', auth, (req, res) => {
  const d = read();
  d.blogs = d.blogs || [];
  const i = d.blogs.findIndex(b => b.id === parseInt(req.params.id, 10));
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  d.blogs[i] = { ...d.blogs[i], ...req.body };
  write(d);
  res.json({ ok: true, blog: d.blogs[i] });
});

app.delete('/api/admin/blogs/:id', auth, (req, res) => {
  const d = read();
  d.blogs = (d.blogs || []).filter(b => b.id !== parseInt(req.params.id, 10));
  write(d);
  res.json({ ok: true });
});

// ── Reviews ──
app.post('/api/admin/reviews', auth, (req, res) => {
  const d = read();
  d.reviews = d.reviews || [];
  const rev = {
    ...req.body,
    id: nextId(d.reviews),
    stars: req.body.stars || 5,
    verified: true
  };
  d.reviews.unshift(rev);
  write(d);
  res.json({ ok: true, review: rev });
});

app.put('/api/admin/reviews/:id', auth, (req, res) => {
  const d = read();
  d.reviews = d.reviews || [];
  const i = d.reviews.findIndex(r => r.id === parseInt(req.params.id, 10));
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  d.reviews[i] = { ...d.reviews[i], ...req.body };
  write(d);
  res.json({ ok: true, review: d.reviews[i] });
});

app.delete('/api/admin/reviews/:id', auth, (req, res) => {
  const d = read();
  d.reviews = (d.reviews || []).filter(r => r.id !== parseInt(req.params.id, 10));
  write(d);
  res.json({ ok: true });
});

// ── Uploads ──
app.post('/api/admin/upload', auth, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ ok: true, url, filename: req.file.filename, size: req.file.size });
});

app.get('/api/admin/uploads', auth, (req, res) => {
  try {
    const files = fs
      .readdirSync(UPL)
      .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .map(f => ({
        filename: f,
        url: `/uploads/${f}`,
        size: fs.statSync(path.join(UPL, f)).size
      }));
    res.json(files);
  } catch {
    res.json([]);
  }
});

app.delete('/api/admin/uploads/:fn', auth, (req, res) => {
  const fp = path.join(UPL, path.basename(req.params.fn));
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ ok: true });
});

// ── Password / Backup ──
app.put('/api/admin/password', auth, (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Min 6 chars' });
  }
  const d = read();
  d.admin_password = new_password;
  write(d);
  res.json({ ok: true });
});

app.get('/api/admin/backup', auth, (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="liberty-backup-${Date.now()}.json"`);
  res.json(read());
});

app.post('/api/admin/restore', auth, (req, res) => {
  const b = req.body;
  if (!b.hospital || !b.doctor) return res.status(400).json({ error: 'Invalid backup' });
  write(b);
  res.json({ ok: true });
});

// ── ADMIN PANEL ─────────────────────────────────────────────────────
app.get('/admin', (req, res) => res.send(ADMIN_HTML));
app.get('/admin/*', (req, res) => res.redirect('/admin'));

// ── ERROR HANDLER ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Server error' });
  }
  next();
});

// ── START ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Liberty Heart & Vascular Surgery Hospital  ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Website :  http://localhost:${PORT}`);
  console.log(`║  Admin   :  http://localhost:${PORT}/admin`);
  console.log(`║  API     :  http://localhost:${PORT}/api/site`);
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log('Password from data/site.json');
});

// ══════════════════════════════════════════════════════════════════
// ADMIN PANEL HTML
// ══════════════════════════════════════════════════════════════════
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Liberty Hospital — Admin CMS</title>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--blue:#1a237e;--blue2:#283593;--red:#b71c1c;--green:#1b5e20;--gold:#c8a400;--gray:#4e5f6e;--brd:#e4eaf3;--bg:#f4f6fa;--white:#fff;--fh:'Lora',Georgia,serif;--fb:'DM Sans',sans-serif}
body{font-family:var(--fb);background:var(--bg);color:#1c2b3a;font-size:14px;min-height:100vh}
a{color:var(--blue);text-decoration:none}code{background:#f0f4fe;padding:2px 7px;border-radius:5px;font-size:.82em;font-family:monospace;color:var(--blue2)}
.top{background:var(--blue);color:#fff;padding:0 28px;height:54px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(26,35,126,.3)}
.top-title{display:flex;align-items:center;gap:11px;font-family:var(--fh);font-weight:600;font-size:.95rem}
.top-r{display:flex;gap:14px;align-items:center}
.top-r a{color:rgba(255,255,255,.72);font-size:.8rem;transition:color .2s}.top-r a:hover{color:#fff}
.layout{display:flex;min-height:calc(100vh - 54px)}
.sidebar{width:228px;background:var(--white);border-right:1px solid var(--brd);flex-shrink:0;padding:16px 0;overflow-y:auto}
.sb-sec{font-size:.62rem;font-weight:700;color:var(--gray);letter-spacing:.11em;text-transform:uppercase;padding:16px 20px 6px;margin-top:4px}
.sb-sec:first-child{margin-top:0}
.nv{display:flex;align-items:center;gap:10px;padding:10px 20px;color:#1c2b3a;font-size:.84rem;font-weight:500;cursor:pointer;border-left:3px solid transparent;transition:all .18s}
.nv:hover{background:rgba(26,35,126,.05);color:var(--blue)}
.nv.active{background:rgba(26,35,126,.08);color:var(--blue);border-left-color:var(--blue);font-weight:600}
.nv .ic{width:20px;text-align:center;font-size:1rem;flex-shrink:0}
.main{flex:1;padding:28px;overflow-y:auto}
.panel{display:none}.panel.active{display:block;animation:fi .22s ease}
@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.card{background:var(--white);border:1px solid var(--brd);border-radius:12px;padding:24px;margin-bottom:20px}
.ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid var(--brd)}
.ct{font-family:var(--fh);font-size:1rem;font-weight:700;color:var(--blue)}
.cs{font-size:.78rem;color:var(--gray);margin-top:3px}
.fg{margin-bottom:14px}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fgrid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.fg label{display:block;font-size:.67rem;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
.fg input,.fg select,.fg textarea{width:100%;padding:9px 12px;border:1.5px solid var(--brd);border-radius:8px;font-family:var(--fb);font-size:.84rem;color:#1c2b3a;outline:none;transition:all .2s;background:var(--white)}
.fg input:focus,.fg select:focus,.fg textarea:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(26,35,126,.1)}
.fg textarea{resize:vertical;min-height:80px}
.fg .hint{font-size:.67rem;color:var(--gray);margin-top:4px}
.btn{padding:9px 18px;border-radius:8px;font-family:var(--fb);font-size:.84rem;font-weight:600;cursor:pointer;border:none;transition:all .22s;display:inline-flex;align-items:center;gap:7px}
.btn-p{background:var(--blue);color:#fff}.btn-p:hover{background:var(--blue2);transform:translateY(-1px);box-shadow:0 4px 14px rgba(26,35,126,.25)}
.btn-rd{background:var(--red);color:#fff}.btn-rd:hover{background:#9b1b1b;box-shadow:0 4px 14px rgba(183,28,28,.25)}
.btn-gn{background:var(--green);color:#fff}.btn-gn:hover{background:#2e7d32;box-shadow:0 4px 14px rgba(27,94,32,.25)}
.btn-sm{padding:6px 12px;font-size:.77rem}
.btn-ol{background:transparent;color:var(--blue);border:1.5px solid var(--blue)}.btn-ol:hover{background:var(--blue);color:#fff}
.btn-bar{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
.alert{padding:12px 16px;border-radius:8px;font-size:.84rem;margin-bottom:16px;display:flex;align-items:center;gap:8px;animation:fi .3s}
.a-ok{background:#e8f5e9;color:var(--green);border:1px solid #a5d6a7}
.a-err{background:#ffebee;color:var(--red);border:1px solid #ffcdd2}
.a-info{background:#e3f2fd;color:var(--blue);border:1px solid #90caf9}
.tw{overflow-x:auto;border-radius:10px;border:1px solid var(--brd)}
table{width:100%;border-collapse:collapse;min-width:500px}
th{background:var(--bg);padding:10px 14px;text-align:left;font-size:.69rem;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--brd)}
td{padding:11px 14px;border-bottom:1px solid var(--brd);font-size:.83rem;vertical-align:middle}
tr:last-child td{border:none}tr:hover td{background:rgba(26,35,126,.02)}
.tag{display:inline-block;padding:3px 9px;border-radius:10px;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.tg-c{background:#ffebee;color:var(--red)}.tg-v{background:#e8eaf6;color:var(--blue)}.tg-g{background:#e8f5e9;color:var(--green)}
.star-row{display:flex;gap:4px;margin-top:6px}
.star-row span{font-size:1.2rem;cursor:pointer;color:#ddd;transition:color .15s}
.star-row span.on{color:#f9a825}
.upl-preview{display:flex;flex-wrap:wrap;gap:12px;margin-top:14px}
.upl-thumb{position:relative;width:96px;height:96px}
.upl-thumb img{width:100%;height:100%;object-fit:cover;border-radius:8px;border:1px solid var(--brd)}
.upl-del{position:absolute;top:-6px;right:-6px;width:22px;height:22px;background:var(--red);color:#fff;border-radius:50%;border:none;cursor:pointer;font-size:.7rem;display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.2)}
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg)}
.login-box{background:var(--white);border:1px solid var(--brd);border-radius:16px;padding:42px 38px;width:370px;text-align:center;box-shadow:0 8px 40px rgba(26,35,126,.12)}
.login-title{font-family:var(--fh);font-size:1.2rem;font-weight:700;color:var(--blue);margin:12px 0 4px}
.login-sub{font-size:.84rem;color:var(--gray);margin-bottom:24px}
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
.sc{background:var(--white);border:1px solid var(--brd);border-radius:10px;padding:16px 18px}
.sc .num{font-family:var(--fh);font-size:1.75rem;font-weight:700;color:#1a237e;line-height:1}
.sc .lbl{font-size:.7rem;color:var(--gray);margin-top:4px}
.img-preview-wrap{margin-top:10px;display:none}
.img-preview-wrap img{max-width:200px;max-height:140px;border-radius:8px;border:1px solid var(--brd)}
@media (max-width: 900px){
  .layout{flex-direction:column}
  .sidebar{width:100%;border-right:none;border-bottom:1px solid var(--brd)}
  .stats-row,.fgrid,.fgrid3{grid-template-columns:1fr}
}
</style>
</head>
<body>

<div id="login-screen" class="login-wrap">
  <div class="login-box">
    <div style="font-size:3rem">🏥</div>
    <div class="login-title">Liberty Hospital</div>
    <div style="font-size:.74rem;margin-bottom:4px"><span style="color:#1a237e;font-weight:700">Liberty</span> <span style="color:#c8a400">&amp;</span> <span style="color:#b71c1c;font-weight:700">Heart Vascular</span></div>
    <div class="login-sub">Admin CMS — Enter your password</div>
    <div class="fg" style="text-align:left"><label>Admin Password</label><input type="password" id="login-key" placeholder="Enter password" onkeydown="if(event.key==='Enter')doLogin()"/></div>
    <button class="btn btn-p" style="width:100%;justify-content:center" onclick="doLogin()">🔐 Login</button>
    <div id="login-err" style="display:none;color:#b71c1c;margin-top:12px;font-size:.82rem"></div>
  </div>
</div>

<div id="admin-app" style="display:none">
<div class="top">
  <div class="top-title"><span>🏥</span><span>Liberty Hospital — Admin CMS</span></div>
  <div class="top-r">
    <a href="/" target="_blank">🌐 View Site</a>
    <a href="#" onclick="downloadBackup()">💾 Backup</a>
    <a href="#" onclick="doLogout()">🔓 Logout</a>
  </div>
</div>
<div class="layout">
  <div class="sidebar">
    <div class="sb-sec">Dashboard</div>
    <div class="nv active" onclick="show('dash', event)"><span class="ic">📊</span>Overview</div>
    <div class="sb-sec">Content</div>
    <div class="nv" onclick="show('hospital', event)"><span class="ic">🏥</span>Hospital Info</div>
    <div class="nv" onclick="show('doctor', event)"><span class="ic">👨‍⚕️</span>Doctor Profile</div>
    <div class="nv" onclick="show('services', event)"><span class="ic">⚕️</span>Services</div>
    <div class="nv" onclick="show('blogs', event)"><span class="ic">📝</span>Blog Posts</div>
    <div class="nv" onclick="show('reviews', event)"><span class="ic">⭐</span>Reviews</div>
    <div class="sb-sec">Media</div>
    <div class="nv" onclick="show('photos', event)"><span class="ic">🖼️</span>Photos &amp; Images</div>
    <div class="sb-sec">System</div>
    <div class="nv" onclick="show('settings', event)"><span class="ic">⚙️</span>Settings</div>
    <div class="nv" onclick="show('api', event)"><span class="ic">🔗</span>API Docs</div>
  </div>
  <div class="main">
    <div id="flash-area"></div>

    <div class="panel active" id="panel-dash">
      <div class="ch" style="border:none;padding:0;margin-bottom:20px"><div><div class="ct" style="font-size:1.35rem">Welcome back 👋</div><div class="cs">Liberty Hospital Admin CMS — all changes saved permanently</div></div></div>
      <div class="stats-row" id="dash-stats">Loading...</div>
      <div class="card"><div class="ch"><div class="ct">Recent Blog Posts</div><button class="btn btn-sm btn-ol" onclick="showP('blogs')">View All</button></div><div id="dash-blogs">Loading...</div></div>
    </div>

    <div class="panel" id="panel-hospital">
      <div class="card">
        <div class="ch"><div><div class="ct">🏥 Hospital Information</div><div class="cs">Saved permanently — changes reflect on the website</div></div></div>
        <div class="fgrid"><div class="fg"><label>Hospital Name</label><input id="h-name"/></div><div class="fg"><label>Website</label><input id="h-web"/></div></div>
        <div class="fg"><label>Full Address</label><input id="h-addr"/></div>
        <div class="fgrid"><div class="fg"><label>Phone 1</label><input id="h-p1"/></div><div class="fg"><label>Phone 2</label><input id="h-p2"/></div></div>
        <div class="fgrid"><div class="fg"><label>Email</label><input id="h-email" type="email"/></div><div class="fg"><label>OPD Hours (Weekdays)</label><input id="h-hours"/></div></div>
        <div class="fgrid"><div class="fg"><label>WhatsApp</label><input id="h-wa"/></div><div class="fg"><label>Facebook</label><input id="h-fb"/></div></div>
        <div class="fg"><label>Twitter/X</label><input id="h-tw"/></div>
        <div class="btn-bar"><button class="btn btn-p" onclick="saveHospital()">💾 Save Hospital Info</button></div>
      </div>
    </div>

    <div class="panel" id="panel-doctor">
      <div class="card">
        <div class="ch"><div class="ct">👨‍⚕️ Doctor Profile</div></div>
        <div class="fgrid"><div class="fg"><label>Full Name</label><input id="d-name"/></div><div class="fg"><label>Role</label><input id="d-role"/></div></div>
        <div class="fgrid">
          <div class="fg"><label style="color:#1565c0">Qualifications Line 1 — Blue</label><input id="d-q1"/></div>
          <div class="fg"><label style="color:#1565c0">Qualifications Line 2 — Blue</label><input id="d-q2"/></div>
        </div>
        <div class="fgrid">
          <div class="fg"><label style="color:#b71c1c">M.Ch Qualification — Red</label><input id="d-qred"/></div>
          <div class="fg"><label>Former Post — Gray</label><input id="d-former"/></div>
        </div>
        <div class="fg"><label style="color:#1565c0">Institutions — Blue</label><input id="d-inst"/></div>
        <div class="fg"><label>Biography Para 1</label><textarea id="d-b1"></textarea></div>
        <div class="fg"><label>Biography Para 2</label><textarea id="d-b2"></textarea></div>
        <div class="fg"><label>Biography Para 3</label><textarea id="d-b3"></textarea></div>
        <div class="fgrid3">
          <div class="fg"><label>Surgeries Stat</label><input id="d-s1"/></div>
          <div class="fg"><label>Experience</label><input id="d-s2"/></div>
          <div class="fg"><label>Specialties</label><input id="d-s3"/></div>
        </div>
        <div class="btn-bar"><button class="btn btn-p" onclick="saveDoctor()">💾 Save Doctor Profile</button></div>
      </div>
    </div>

    <div class="panel" id="panel-services">
      <div class="card">
        <div class="ch"><div><div class="ct">⚕️ Services</div><div class="cs">Show/hide or edit service cards</div></div><button class="btn btn-gn btn-sm" onclick="openSvcModal()">+ Add Service</button></div>
        <div class="tw"><div id="svc-tbl">Loading...</div></div>
      </div>
    </div>

    <div class="panel" id="panel-blogs">
      <div class="card">
        <div class="ch"><div><div class="ct">📝 Add New Blog Post</div><div class="cs">Posts saved permanently — visible on all devices</div></div></div>
        <div class="fg"><label>Title *</label><input id="nb-title"/></div>
        <div class="fgrid">
          <div class="fg"><label>Category</label><select id="nb-cat"><option>Cardiac Surgery</option><option>Vascular Care</option><option>Patient Stories</option><option>Health Tips</option><option>Hospital Updates</option><option>Dialysis Access</option></select></div>
          <div class="fg"><label>Author</label><input id="nb-auth" value="Dr. Hemachandra Tokala"/></div>
        </div>
        <div class="fgrid">
          <div class="fg"><label>Emoji</label><input id="nb-emoji" style="font-size:1.2rem"/></div>
          <div class="fg"><label>Date (blank = today)</label><input id="nb-date" placeholder="March 2025"/></div>
        </div>
        <div class="fg"><label>Excerpt / Summary</label><textarea id="nb-exc" style="height:70px"></textarea></div>
        <div class="fg"><label>Full Article Content</label><textarea id="nb-content" style="height:130px"></textarea></div>
        <div class="fg">
          <label>Blog Post Image (optional)</label>
          <input type="file" id="nb-img-file" accept="image/*" onchange="previewBlogImg(this)"/>
          <div class="img-preview-wrap" id="nb-img-preview-wrap">
            <img id="nb-img-preview" src="" alt="Preview"/>
          </div>
        </div>
        <div class="btn-bar">
          <button class="btn btn-gn" onclick="uploadBlogImgThenAdd()">✅ Upload Image &amp; Publish</button>
          <button class="btn btn-p" onclick="addBlogNoImg()">📝 Publish (no image)</button>
          <button class="btn btn-ol" onclick="clearBlogForm()">Clear</button>
        </div>
      </div>
      <div class="card">
        <div class="ch"><div class="ct">All Blog Posts</div></div>
        <div class="tw"><div id="blog-tbl">Loading...</div></div>
      </div>
    </div>

    <div class="panel" id="panel-reviews">
      <div class="card">
        <div class="ch"><div class="ct">⭐ Add Patient Review</div></div>
        <div class="fgrid"><div class="fg"><label>Patient Name *</label><input id="nr-name"/></div><div class="fg"><label>Location</label><input id="nr-loc"/></div></div>
        <div class="fg"><label>Stars</label><div class="star-row" id="star-row"><span onclick="setStar(1)">★</span><span onclick="setStar(2)">★</span><span onclick="setStar(3)">★</span><span onclick="setStar(4)">★</span><span onclick="setStar(5)">★</span></div></div>
        <div class="fg"><label>Review Text *</label><textarea id="nr-txt" style="height:80px"></textarea></div>
        <div class="btn-bar"><button class="btn btn-gn" onclick="addReview()">✅ Add Review</button></div>
      </div>
      <div class="card">
        <div class="ch"><div class="ct">All Reviews</div></div>
        <div class="tw"><div id="rev-tbl">Loading...</div></div>
      </div>
    </div>

    <div class="panel" id="panel-photos">
      <div class="card">
        <div class="ch"><div><div class="ct">🖼️ Upload Photos</div><div class="cs">Doctor photo, hospital images, blog images — max 15MB</div></div></div>
        <div class="fg"><label>Select Image</label><input type="file" id="ph-file" accept="image/*" onchange="previewPh(this)"/></div>
        <div class="img-preview-wrap" id="ph-preview-wrap"><img id="ph-preview" src="" alt="Preview"/></div>
        <div class="btn-bar"><button class="btn btn-p" onclick="uploadPhoto()">🚀 Upload</button></div>
        <div id="ph-result" style="margin-top:14px"></div>
      </div>
      <div class="card">
        <div class="ch"><div class="ct">Uploaded Files</div><button class="btn btn-sm btn-ol" onclick="loadPhotos()">🔄 Refresh</button></div>
        <div class="upl-preview" id="ph-lib">Loading...</div>
      </div>
    </div>

    <div class="panel" id="panel-settings">
      <div class="card">
        <div class="ch"><div class="ct">⚙️ Change Admin Password</div></div>
        <div class="fg"><label>Current Password</label><input type="password" id="pw-curr"/></div>
        <div class="fg"><label>New Password (min 6 chars)</label><input type="password" id="pw-new"/></div>
        <div class="fg"><label>Confirm New Password</label><input type="password" id="pw-conf"/></div>
        <div class="btn-bar"><button class="btn btn-p" onclick="changePw()">🔐 Change Password</button></div>
      </div>
      <div class="card">
        <div class="ch"><div class="ct">💾 Backup &amp; Restore</div></div>
        <div class="btn-bar"><button class="btn btn-ol" onclick="downloadBackup()">📥 Download Backup</button></div>
        <div class="fg" style="margin-top:18px"><label>Restore from Backup JSON</label><input type="file" id="restore-file" accept=".json"/></div>
        <div class="btn-bar"><button class="btn btn-rd" onclick="restoreBackup()">⚠️ Restore</button></div>
      </div>
    </div>

    <div class="panel" id="panel-api">
      <div class="card">
        <div class="ch"><div class="ct">🔗 API Reference</div></div>
        <div class="alert a-info">All admin endpoints require header: <code>x-admin-key: [your password]</code></div>
        <table>
          <tr><th>Method</th><th>Endpoint</th><th>Auth</th><th>Description</th></tr>
          <tr><td>GET</td><td><code>/api/site</code></td><td>No</td><td>Get all site data</td></tr>
          <tr><td>GET</td><td><code>/api/admin/hospital</code></td><td>Yes</td><td>Auth check and fetch hospital</td></tr>
          <tr><td>PUT</td><td><code>/api/admin/hospital</code></td><td>Yes</td><td>Update hospital info</td></tr>
          <tr><td>GET</td><td><code>/api/admin/doctor</code></td><td>Yes</td><td>Fetch doctor info</td></tr>
          <tr><td>PUT</td><td><code>/api/admin/doctor</code></td><td>Yes</td><td>Update doctor info</td></tr>
        </table>
      </div>
    </div>
  </div>
</div>
</div>

<script>
let KEY = '';
const var_blue = '#1a237e';

function H() {
  return { 'Content-Type': 'application/json', 'x-admin-key': KEY };
}
function g(id) {
  const e = document.getElementById(id);
  return e ? e.value.trim() : '';
}
function s(id, v) {
  const e = document.getElementById(id);
  if (e) e.value = v || '';
}
async function safeJson(res) {
  try { return await res.json(); } catch { return { error: 'Invalid server response' }; }
}

async function doLogin() {
  const k = document.getElementById('login-key').value.trim();
  if (!k) return;
  const res = await fetch('/api/admin/hospital', { headers: { 'x-admin-key': k } });
  if (res.ok) {
    KEY = k;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').style.display = 'block';
    await loadAll();
  } else {
    const el = document.getElementById('login-err');
    el.style.display = 'block';
    el.textContent = '❌ Wrong password. Please try again.';
  }
}
function doLogout() {
  KEY = '';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-app').style.display = 'none';
  document.getElementById('login-key').value = '';
}
function flash(msg, type = 'ok') {
  const el = document.getElementById('flash-area');
  el.innerHTML = '<div class="alert a-' + type + '">' + ({ ok: '✅', err: '❌', info: 'ℹ️' }[type] || '') + ' ' + msg + '</div>';
  setTimeout(() => { el.innerHTML = ''; }, 5000);
}
function show(id, ev) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nv').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  if (ev && ev.currentTarget) ev.currentTarget.classList.add('active');
  if (id === 'blogs') loadBlogs();
  if (id === 'reviews') loadReviews();
  if (id === 'photos') loadPhotos();
  if (id === 'services') loadSvcs();
  if (id === 'hospital' || id === 'doctor') loadSiteData();
}
function showP(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nv').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  document.querySelectorAll('.nv').forEach(n => {
    if (n.textContent.toLowerCase().includes(id)) n.classList.add('active');
  });
  if (id === 'blogs') loadBlogs();
}
async function loadAll() {
  await loadSiteData();
  await loadDash();
  await loadSvcs();
}
async function loadSiteData() {
  const d = await fetch('/api/site').then(r => r.json());
  const h = d.hospital || {};
  s('h-name', h.name);
  s('h-addr', h.address);
  s('h-p1', h.phone1);
  s('h-p2', h.phone2);
  s('h-email', h.email);
  s('h-hours', h.hours_weekday);
  s('h-web', h.website);
  s('h-wa', h.whatsapp);
  s('h-fb', h.facebook);
  s('h-tw', h.twitter);

  const doc = d.doctor || {};
  s('d-name', doc.name);
  s('d-role', doc.role);
  s('d-q1', doc.qual_blue_1);
  s('d-q2', doc.qual_blue_2);
  s('d-qred', doc.qual_red);
  s('d-former', doc.former);
  s('d-inst', doc.institutions);
  s('d-b1', doc.bio1);
  s('d-b2', doc.bio2);
  s('d-b3', doc.bio3);
  s('d-s1', doc.stats_surgeries);
  s('d-s2', doc.stats_experience);
  s('d-s3', doc.stats_specialties);
}
async function loadDash() {
  const d = await fetch('/api/site').then(r => r.json());
  const services = d.services || [];
  const blogs = d.blogs || [];
  const reviews = d.reviews || [];
  document.getElementById('dash-stats').innerHTML = [
    { n: blogs.length, l: 'Blog Posts' },
    { n: reviews.length, l: 'Reviews' },
    { n: services.length, l: 'Services' },
    { n: services.filter(s => s.visible !== false).length, l: 'Visible' }
  ].map(x => '<div class="sc"><div class="num">' + x.n + '</div><div class="lbl">' + x.l + '</div></div>').join('');
  document.getElementById('dash-blogs').innerHTML =
    blogs.slice(0, 3).map(b => '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #e4eaf3"><span style="font-size:1.6rem">' + (b.emoji || '📝') + '</span><div style="flex:1"><div style="font-weight:600;color:#1a237e">' + b.title + '</div><div style="font-size:.74rem;color:#7a8d9e">' + (b.category || '') + ' · ' + (b.date || '') + '</div></div></div>').join('') || '<p style="color:#7a8d9e;padding:10px 0">No posts yet.</p>';
}

async function saveHospital() {
  const body = {
    name: g('h-name'),
    address: g('h-addr'),
    phone1: g('h-p1'),
    phone2: g('h-p2'),
    email: g('h-email'),
    hours_weekday: g('h-hours'),
    website: g('h-web'),
    whatsapp: g('h-wa'),
    facebook: g('h-fb'),
    twitter: g('h-tw')
  };
  const res = await fetch('/api/admin/hospital', { method: 'PUT', headers: H(), body: JSON.stringify(body) });
  const r = await safeJson(res);
  r.ok ? flash('Hospital info saved!') : flash(r.error || 'Save failed', 'err');
}
async function saveDoctor() {
  const body = {
    name: g('d-name'),
    role: g('d-role'),
    qual_blue_1: g('d-q1'),
    qual_blue_2: g('d-q2'),
    qual_red: g('d-qred'),
    former: g('d-former'),
    institutions: g('d-inst'),
    bio1: g('d-b1'),
    bio2: g('d-b2'),
    bio3: g('d-b3'),
    stats_surgeries: g('d-s1'),
    stats_experience: g('d-s2'),
    stats_specialties: g('d-s3')
  };
  const res = await fetch('/api/admin/doctor', { method: 'PUT', headers: H(), body: JSON.stringify(body) });
  const r = await safeJson(res);
  r.ok ? flash('Doctor profile saved!') : flash(r.error || 'Save failed', 'err');
}

async function loadSvcs() {
  const res = await fetch('/api/admin/services', { headers: H() });
  const svcs = await safeJson(res);
  if (!Array.isArray(svcs)) {
    document.getElementById('svc-tbl').innerHTML = '<p style="padding:14px;color:#b71c1c">Unable to load services.</p>';
    return;
  }
  document.getElementById('svc-tbl').innerHTML = svcs.length
    ? '<table><tr><th>#</th><th>Name</th><th>Category</th><th>Status</th><th>Actions</th></tr>' +
      svcs.map(s => '<tr><td>' + s.id + '</td><td style="font-weight:600;color:#1a237e">' + s.name + '</td><td><span class="tag tg-v">' + s.category + '</span></td><td><span style="color:' + (s.visible ? '#1b5e20' : '#b71c1c') + '">●</span> ' + (s.visible ? 'Visible' : 'Hidden') + '</td><td style="display:flex;gap:6px"><button class="btn btn-sm btn-ol" onclick="editSvc(' + s.id + ')">✏️</button><button class="btn btn-sm" style="background:' + (s.visible ? '#fff3e0' : '#e8f5e9') + ';color:' + (s.visible ? '#e65100' : '#1b5e20') + ';border:1.5px solid ' + (s.visible ? '#ffcc02' : '#a5d6a7') + '" onclick="toggleSvc(' + s.id + ',' + (s.visible ? 'false' : 'true') + ')">' + (s.visible ? 'Hide' : 'Show') + '</button><button class="btn btn-sm btn-rd" onclick="deleteSvc(' + s.id + ')">🗑️</button></td></tr>').join('') +
      '</table>'
    : '<p style="padding:14px;color:#7a8d9e">No services found.</p>';
}
function openSvcModal(sv) {
  const title = sv ? 'Edit Service' : 'Add New Service';
  const id = sv ? sv.id : '';
  const name = sv ? sv.name : '';
  const cat = sv ? sv.category : 'Cardiac';
  const desc = sv ? sv.desc : '';
  const key = sv ? (sv.key || '') : '';
  const html = '<div style="position:fixed;inset:0;background:rgba(26,35,126,.7);z-index:999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)" id="svc-ov"><div style="background:#fff;border-radius:14px;padding:28px;max-width:500px;width:92%;border:2px solid #1a237e"><h3 style="color:#1a237e;margin-bottom:18px">' + title + '</h3><input type="hidden" id="svc-edit-id" value="' + id + '"/><div class="fg"><label>Service Name *</label><input id="svc-name" value="' + name + '"/></div><div class="fgrid"><div class="fg"><label>Category</label><select id="svc-cat"><option>Cardiac</option><option>Thoracic</option><option>Vascular</option><option>Emergency</option><option>Trauma</option><option>Diagnostics</option><option>Pharmacy</option></select></div><div class="fg"><label>Icon Key</label><input id="svc-key" value="' + key + '"/></div></div><div class="fg"><label>Description</label><textarea id="svc-desc">' + desc + '</textarea></div><div class="btn-bar"><button class="btn btn-p" onclick="saveSvc()">💾 Save</button><button class="btn btn-ol" onclick="document.getElementById(\\'svc-ov\\').remove()">Cancel</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('svc-cat').value = cat;
}
async function editSvc(id) {
  const res = await fetch('/api/admin/services', { headers: H() });
  const svcs = await safeJson(res);
  const sv = Array.isArray(svcs) ? svcs.find(x => x.id === id) : null;
  if (sv) openSvcModal(sv);
}
async function saveSvc() {
  const id = g('svc-edit-id');
  const body = { name: g('svc-name'), category: g('svc-cat'), key: g('svc-key'), desc: g('svc-desc') };
  if (!body.name) return flash('Name required', 'err');
  const res = id
    ? await fetch('/api/admin/services/' + id, { method: 'PUT', headers: H(), body: JSON.stringify(body) })
    : await fetch('/api/admin/services', { method: 'POST', headers: H(), body: JSON.stringify(body) });
  const r = await safeJson(res);
  if (r.ok) {
    flash('Service saved!');
    document.getElementById('svc-ov').remove();
    loadSvcs();
    loadDash();
  } else {
    flash(r.error || 'Save failed', 'err');
  }
}
async function toggleSvc(id, v) {
  const res = await fetch('/api/admin/services/' + id, {
    method: 'PUT',
    headers: H(),
    body: JSON.stringify({ visible: v === 'true' || v === true })
  });
  const r = await safeJson(res);
  r.ok ? (loadSvcs(), loadDash()) : flash(r.error || 'Update failed', 'err');
}
async function deleteSvc(id) {
  if (!confirm('Delete this service?')) return;
  const res = await fetch('/api/admin/services/' + id, { method: 'DELETE', headers: H() });
  const r = await safeJson(res);
  r.ok ? (flash('Deleted!'), loadSvcs(), loadDash()) : flash(r.error || 'Delete failed', 'err');
}

async function loadBlogs() {
  const blogs = await fetch('/api/blogs').then(r => r.json());
  document.getElementById('blog-tbl').innerHTML = blogs.length
    ? '<table><tr><th>ID</th><th>Title</th><th>Category</th><th>Image</th><th>Date</th><th>Action</th></tr>' +
      blogs.map(b => '<tr><td>' + b.id + '</td><td style="max-width:200px;font-weight:600;color:#1a237e">' + b.title + '</td><td><span class="tag tg-v" style="font-size:.62rem">' + (b.category || '') + '</span></td><td>' + (b.image ? '<img src="' + b.image + '" style="width:40px;height:40px;object-fit:cover;border-radius:5px;border:1px solid #e4eaf3">' : '—') + '</td><td>' + (b.date || '') + '</td><td><button class="btn btn-sm btn-rd" onclick="deleteBlog(' + b.id + ')">🗑️ Delete</button></td></tr>').join('') +
      '</table>'
    : '<p style="padding:14px;color:#7a8d9e">No posts yet.</p>';
}
function previewBlogImg(inp) {
  const f = inp.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = e => {
    document.getElementById('nb-img-preview').src = e.target.result;
    document.getElementById('nb-img-preview-wrap').style.display = 'block';
  };
  r.readAsDataURL(f);
}
async function uploadBlogImgThenAdd() {
  const t = g('nb-title');
  if (!t) return flash('Title is required', 'err');
  const file = document.getElementById('nb-img-file').files[0];
  let imgUrl = '';
  if (file) {
    const fd = new FormData();
    fd.append('photo', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-key': KEY }, body: fd });
    const ur = await safeJson(res);
    if (!ur.ok) return flash('Image upload failed: ' + (ur.error || 'Unknown error'), 'err');
    imgUrl = ur.url;
  }
  await publishBlogWithImage(t, imgUrl);
}
async function addBlogNoImg() {
  const t = g('nb-title');
  if (!t) return flash('Title is required', 'err');
  await publishBlogWithImage(t, '');
}
async function publishBlogWithImage(title, imgUrl) {
  const body = {
    title,
    category: g('nb-cat'),
    author: g('nb-auth'),
    emoji: g('nb-emoji') || '📝',
    date: g('nb-date'),
    excerpt: g('nb-exc'),
    content: g('nb-content'),
    image: imgUrl
  };
  const res = await fetch('/api/admin/blogs', { method: 'POST', headers: H(), body: JSON.stringify(body) });
  const r = await safeJson(res);
  if (r.ok) {
    flash('Blog post published!');
    clearBlogForm();
    loadBlogs();
    loadDash();
  } else {
    flash(r.error || 'Publish failed', 'err');
  }
}
async function deleteBlog(id) {
  if (!confirm('Delete this blog post?')) return;
  const res = await fetch('/api/admin/blogs/' + id, { method: 'DELETE', headers: H() });
  const r = await safeJson(res);
  r.ok ? (flash('Deleted!'), loadBlogs(), loadDash()) : flash(r.error || 'Delete failed', 'err');
}
function clearBlogForm() {
  ['nb-title', 'nb-exc', 'nb-content', 'nb-emoji', 'nb-date'].forEach(id => s(id, ''));
  document.getElementById('nb-img-file').value = '';
  document.getElementById('nb-img-preview-wrap').style.display = 'none';
}

let selStars = 5;
function setStar(n) {
  selStars = n;
  document.querySelectorAll('#star-row span').forEach((sp, i) => sp.classList.toggle('on', i < n));
}
async function loadReviews() {
  const revs = await fetch('/api/reviews').then(r => r.json());
  document.getElementById('rev-tbl').innerHTML = revs.length
    ? '<table><tr><th>Name</th><th>Location</th><th>Stars</th><th>Review</th><th>Action</th></tr>' +
      revs.map(r => '<tr><td style="white-space:nowrap;font-weight:600">' + r.name + '</td><td>' + (r.location || '') + '</td><td style="color:#f9a825">' + '★'.repeat(r.stars || 5) + '</td><td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + r.text + '</td><td><button class="btn btn-sm btn-rd" onclick="deleteReview(' + r.id + ')">🗑️</button></td></tr>').join('') +
      '</table>'
    : '<p style="padding:14px;color:#7a8d9e">No reviews yet.</p>';
}
async function addReview() {
  const n = g('nr-name');
  const t = g('nr-txt');
  if (!n || !t) return flash('Name and text required', 'err');
  const res = await fetch('/api/admin/reviews', {
    method: 'POST',
    headers: H(),
    body: JSON.stringify({ name: n, location: g('nr-loc'), stars: selStars, text: t })
  });
  const r = await safeJson(res);
  if (r.ok) {
    flash('Review added!');
    s('nr-name', '');
    s('nr-txt', '');
    s('nr-loc', '');
    setStar(5);
    loadReviews();
    loadDash();
  } else {
    flash(r.error || 'Add failed', 'err');
  }
}
async function deleteReview(id) {
  if (!confirm('Delete this review?')) return;
  const res = await fetch('/api/admin/reviews/' + id, { method: 'DELETE', headers: H() });
  const r = await safeJson(res);
  r.ok ? (flash('Deleted!'), loadReviews(), loadDash()) : flash(r.error || 'Delete failed', 'err');
}

function previewPh(inp) {
  const f = inp.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = e => {
    document.getElementById('ph-preview').src = e.target.result;
    document.getElementById('ph-preview-wrap').style.display = 'block';
  };
  r.readAsDataURL(f);
}
async function uploadPhoto() {
  const f = document.getElementById('ph-file').files[0];
  if (!f) return flash('Select a file', 'err');
  const fd = new FormData();
  fd.append('photo', f);
  const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-key': KEY }, body: fd });
  const r = await safeJson(res);
  if (r.ok) {
    document.getElementById('ph-result').innerHTML = '<div class="alert a-ok">✅ Uploaded! URL: <code>' + r.url + '</code> <a href="' + r.url + '" target="_blank">View</a></div>';
    loadPhotos();
  } else {
    flash(r.error || 'Upload failed', 'err');
  }
}
async function loadPhotos() {
  const res = await fetch('/api/admin/uploads', { headers: H() });
  const files = await safeJson(res);
  const el = document.getElementById('ph-lib');
  if (!Array.isArray(files) || !files.length) {
    el.innerHTML = '<p style="color:#7a8d9e">No photos yet.</p>';
    return;
  }
  el.innerHTML = files.map(f => '<div class="upl-thumb"><img src="' + f.url + '" title="' + f.filename + '"/><button class="upl-del" onclick="delPhoto(\\'' + f.filename + '\\')">×</button></div>').join('');
}
async function delPhoto(fn) {
  if (!confirm('Delete?')) return;
  await fetch('/api/admin/uploads/' + encodeURIComponent(fn), { method: 'DELETE', headers: H() });
  flash('Deleted!');
  loadPhotos();
}

async function changePw() {
  const curr = g('pw-curr');
  const nw = g('pw-new');
  const conf = g('pw-conf');
  if (curr !== KEY) return flash('Current password incorrect', 'err');
  if (nw !== conf) return flash('Passwords do not match', 'err');
  if (nw.length < 6) return flash('Min 6 characters', 'err');
  const res = await fetch('/api/admin/password', {
    method: 'PUT',
    headers: H(),
    body: JSON.stringify({ new_password: nw })
  });
  const r = await safeJson(res);
  if (r.ok) {
    KEY = nw;
    flash('Password changed!');
    s('pw-curr', '');
    s('pw-new', '');
    s('pw-conf', '');
  } else {
    flash(r.error || 'Password change failed', 'err');
  }
}
function downloadBackup() {
  window.open('/api/admin/backup?key=' + encodeURIComponent(KEY), '_blank');
}
async function restoreBackup() {
  const f = document.getElementById('restore-file').files[0];
  if (!f) return flash('Select a JSON file', 'err');
  if (!confirm('This overwrites all current data. Continue?')) return;
  const text = await f.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return flash('Invalid JSON file', 'err');
  }
  const res = await fetch('/api/admin/restore', {
    method: 'POST',
    headers: H(),
    body: JSON.stringify(data)
  });
  const r = await safeJson(res);
  r.ok ? (flash('Data restored from backup!'), loadAll()) : flash(r.error || 'Restore failed', 'err');
}

setStar(5);
</script>
</body>
</html>`;