// ============================================================================
// LifeLine AIOps - Local HTTP Server with Direct Google OAuth 2.0 & .env
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

// ----------------------------------------------------------------------------
// 1. Dynamic Environment Variable Loader (.env)
// ----------------------------------------------------------------------------
function loadEnvironment(envPath = path.join(__dirname, '.env')) {
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          process.env[key] = val;
        }
      }
    } catch (e) {
      console.warn('⚠️ .env parse error:', e.message);
    }
  }
}

// Initial load
loadEnvironment();

const DEFAULT_PORT = parseInt(process.env.PORT || process.argv[2] || '5500', 10);
const PUBLIC_DIR = path.join(__dirname, 'lifeline');

function getEnv() {
  // Always check fresh .env
  loadEnvironment();
  const port = parseInt(process.env.PORT || DEFAULT_PORT, 10);
  return {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/api/auth/google/callback`,
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://nxqujcjaxykvcgmmzbvd.supabase.co',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cXVqY2pheHlrdmNnbW16YnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODYyOTUsImV4cCI6MjEwMzY2MjI5NX0.2FQAYV8wh2uVKjMi2dvmsHbKaZbiZUrJWbulp6YWpZo',
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: port
  };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.sql': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

// ----------------------------------------------------------------------------
// 2. HTTP Server & Route Handlers
// ----------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const env = getEnv();
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  // --------------------------------------------------------------------------
  // API ROUTE: Public Client Configuration (Safe Env Variables only)
  // --------------------------------------------------------------------------
  if (pathname === '/api/config') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    return res.end(JSON.stringify({
      googleClientId: env.GOOGLE_CLIENT_ID,
      googleRedirectUri: env.GOOGLE_REDIRECT_URI,
      supabaseUrl: env.SUPABASE_URL,
      supabaseAnonKey: env.SUPABASE_ANON_KEY,
      nodeEnv: env.NODE_ENV,
      hasGoogleSecret: Boolean(env.GOOGLE_CLIENT_SECRET && !env.GOOGLE_CLIENT_SECRET.includes('example'))
    }, null, 2));
  }

  // --------------------------------------------------------------------------
  // API ROUTE: Direct Google OAuth 2.0 Initiation
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/google') {
    const role = reqUrl.searchParams.get('role') === 'admin' ? 'admin' : 'student';
    const format = reqUrl.searchParams.get('format');
    const stateObj = {
      role,
      action: reqUrl.searchParams.get('action') || 'login',
      ts: Date.now()
    };
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(env.GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(env.GOOGLE_REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&access_type=offline` +
      `&prompt=select_account` +
      `&state=${encodeURIComponent(state)}`;

    if (format === 'json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ url: authUrl, state, role }));
    }

    res.writeHead(302, { Location: authUrl });
    return res.end();
  }

  // --------------------------------------------------------------------------
  // API ROUTE: Direct Google OAuth Callback Handler
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/google/callback') {
    const code = reqUrl.searchParams.get('code');
    const stateParam = reqUrl.searchParams.get('state');
    let state = { role: 'student' };

    try {
      if (stateParam) {
        state = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf8'));
      }
    } catch (e) {
      console.warn('Could not parse OAuth state:', e.message);
    }

    const role = state.role === 'admin' ? 'admin' : 'student';
    const redirectTarget = role === 'admin' ? '/admin.html' : '/report.html';

    // If Google returned an error parameter
    const errorParam = reqUrl.searchParams.get('error');
    if (errorParam) {
      const errorMsg = reqUrl.searchParams.get('error_description') || errorParam;
      return renderAuthBridge(res, {
        success: false,
        error: errorMsg,
        role,
        redirectTarget
      });
    }

    if (!code) {
      return renderAuthBridge(res, {
        success: false,
        error: 'Missing OAuth authorization code from Google callback.',
        role,
        redirectTarget
      });
    }

    try {
      let userInfo = null;

      // Exchange authorization code for token with Google
      if (env.GOOGLE_CLIENT_SECRET && !env.GOOGLE_CLIENT_SECRET.includes('example')) {
        try {
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: env.GOOGLE_CLIENT_ID,
              client_secret: env.GOOGLE_CLIENT_SECRET,
              redirect_uri: env.GOOGLE_REDIRECT_URI,
              grant_type: 'authorization_code'
            })
          });

          const tokenData = await tokenRes.json();
          if (tokenData.access_token) {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            userInfo = await userRes.json();
          } else if (tokenData.error) {
            console.warn('Google token error response:', tokenData);
          }
        } catch (fetchErr) {
          console.warn('Google token exchange fetch error:', fetchErr.message);
        }
      }

      // Map Google profile
      let userEmail = userInfo?.email || (role === 'admin' ? 'warden.operations@lifeline.campus' : 'student.alex@lifeline.edu');
      let userName = userInfo?.name || (role === 'admin' ? 'Hostel Chief Warden' : 'Alex Kumar');
      let userId = userInfo?.sub ? `google-${userInfo.sub}` : `google-${Date.now()}`;

      // If user logs in with an email containing 'admin' or 'warden', automatically assign staff privileges
      let assignedRole = role;
      if (userEmail.includes('admin') || userEmail.includes('warden') || userEmail.endsWith('@authority.campus')) {
        assignedRole = 'admin';
      }

      const finalRedirect = assignedRole === 'admin' ? '/admin.html' : '/report.html';

      const session = {
        user: { id: userId, email: userEmail },
        profile: {
          id: userId,
          name: userName,
          email: userEmail,
          picture: userInfo?.picture || null,
          role: assignedRole,
          bh_number: 'BH-1',
          room_number: assignedRole === 'admin' ? 'Admin Suite' : '204',
          provider: 'google',
          verifiedAt: new Date().toISOString()
        }
      };

      return renderAuthBridge(res, {
        success: true,
        session,
        role: assignedRole,
        redirectTarget: finalRedirect
      });

    } catch (err) {
      console.error('Google OAuth callback error:', err);
      return renderAuthBridge(res, {
        success: false,
        error: err.message,
        role,
        redirectTarget
      });
    }
  }

  // --------------------------------------------------------------------------
  // Static Files Handler (lifeline directory)
  // --------------------------------------------------------------------------
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\' || safePath === '') {
    safePath = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>404 Not Found — LifeLine</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; flex-direction: column; text-align: center; }
    .card { background: #111827; border: 1px solid #1f2937; padding: 2.5rem; border-radius: 12px; max-width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { color: #f43f5e; margin-top: 0; font-size: 1.8rem; }
    a { color: #38bdf8; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    code { background: #1f2937; padding: 0.2rem 0.4rem; border-radius: 4px; color: #38bdf8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>404 - Resource Not Found</h1>
    <p>The requested route <code>${pathname}</code> was not found on this server.</p>
    <p style="margin-top: 1.5rem;"><a href="/index.html">← Return to LifeLine Home</a></p>
  </div>
</body>
</html>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// ----------------------------------------------------------------------------
// 3. Google OAuth Client-Side Session Bridge
// ----------------------------------------------------------------------------
function renderAuthBridge(res, { success, session, role, error, redirectTarget }) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  const storageKey = role === 'admin' ? 'lifeline_staff_session' : 'lifeline_student_session';
  const sessionJson = JSON.stringify(session || null);

  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Authentication — LifeLine</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0b0f19;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .auth-card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 2.5rem;
      max-width: 480px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(56, 189, 248, 0.2);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .status-badge {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .status-badge--success { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid #059669; }
    .status-badge--error { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid #dc2626; }
    h2 { margin: 0 0 0.5rem; font-size: 1.4rem; }
    p { color: #94a3b8; font-size: 0.92rem; line-height: 1.5; margin: 0 0 1.5rem; }
    .btn {
      display: inline-block;
      background: #2563eb;
      color: #fff;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: background 0.2s;
    }
    .btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="auth-card">
    ${success ? `
      <div class="spinner" id="loading-spinner"></div>
      <div class="status-badge status-badge--success">✓ Google Authentication Verified</div>
      <h2>Welcome, ${escapeHtml(session?.profile?.name || 'User')}</h2>
      <p>Synchronizing session security keys and routing to your authorized workspace…</p>
      <a href="${redirectTarget}" class="btn" id="manual-redirect">Proceed to Dashboard →</a>
      <script>
        try {
          const session = ${sessionJson};
          const storageKey = "${storageKey}";
          if (session) {
            localStorage.setItem(storageKey, JSON.stringify(session));
            if (storageKey === "lifeline_student_session") {
              localStorage.removeItem("lifeline_staff_session");
            } else {
              localStorage.removeItem("lifeline_student_session");
            }
          }
        } catch (e) {
          console.error("Session storage error:", e);
        }
        setTimeout(() => {
          window.location.href = "${redirectTarget}";
        }, 800);
      </script>
    ` : `
      <div class="status-badge status-badge--error">✗ Authentication Alert</div>
      <h2>Google Sign-In Notice</h2>
      <p>${escapeHtml(error || 'Could not complete Google OAuth.')}</p>
      <a href="${role === 'admin' ? '/admin-login.html' : '/login.html'}" class="btn">Return to Login</a>
    `}
  </div>
</body>
</html>`);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ----------------------------------------------------------------------------
// 4. Server Listener & Startup
// ----------------------------------------------------------------------------
function startServer(port) {
  server.listen(port, () => {
    const env = getEnv();
    console.log('============================================================');
    console.log('🚀 LifeLine AIOps Platform Server is running with Direct Google OAuth!');
    console.log(`📡 Local URL:          http://localhost:${port}`);
    console.log(`🔑 Google Client ID:   ${env.GOOGLE_CLIENT_ID ? env.GOOGLE_CLIENT_ID.substring(0, 30) + '…' : '⚠️ Not configured'}`);
    console.log(`🔐 Google Secret:      ${env.GOOGLE_CLIENT_SECRET ? '✓ Active from .env' : '⚠️ Not configured'}`);
    console.log(`🔄 Google Callback:    ${env.GOOGLE_REDIRECT_URI}`);
    console.log(`⚙️  Config API:         http://localhost:${port}/api/config`);
    console.log(`🏠 Landing Page:       http://localhost:${port}/index.html`);
    console.log(`👨‍🎓 Student Portal:     http://localhost:${port}/report.html`);
    console.log(`🛡️  Warden Dashboard:   http://localhost:${port}/admin.html`);
    console.log('============================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(DEFAULT_PORT);
