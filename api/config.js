// ============================================================================
// Vercel Serverless Function: Public Client Configuration
// Endpoint: GET /api/config
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

  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${proto}://${host}/api/auth/google/callback`;

  const config = {
    googleClientId: clientId,
    googleRedirectUri: redirectUri,
    supabaseUrl: process.env.SUPABASE_URL || 'https://nxqujcjaxykvcgmmzbvd.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cXVqY2pheHlrdmNnbW16YnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODYyOTUsImV4cCI6MjEwMzY2MjI5NX0.2FQAYV8wh2uVKjMi2dvmsHbKaZbiZUrJWbulp6YWpZo',
    nodeEnv: process.env.NODE_ENV || 'production',
    hasGoogleSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET && !process.env.GOOGLE_CLIENT_SECRET.includes('example'))
  };

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  return res.end(JSON.stringify(config, null, 2));
};
