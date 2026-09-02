// ============================================================================
// Vercel Serverless Function: Initiate Google OAuth 2.0 Flow
// Endpoint: GET /api/auth/google
// ============================================================================

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'ml-mu-nine.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');

  // Parse query parameters
  const query = req.query || {};
  let urlObj;
  try {
    urlObj = new URL(req.url, `${proto}://${host}`);
  } catch (e) {
    urlObj = { searchParams: new Map() };
  }

  const role = (query.role || urlObj.searchParams?.get?.('role')) === 'admin' ? 'admin' : 'student';
  const action = query.action || urlObj.searchParams?.get?.('action') || 'login';
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${proto}://${host}/api/auth/google/callback`;

  const stateObj = { role, action, ts: Date.now() };
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&access_type=offline` +
    `&prompt=select_account` +
    `&state=${encodeURIComponent(state)}`;

  if (format === 'json') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ url: authUrl, state, role, redirectUri }, null, 2));
  }

  res.statusCode = 302;
  res.setHeader('Location', authUrl);
  return res.end();
};
