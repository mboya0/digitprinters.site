export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { code, grant_type, refresh_token, redirect_uri } = await request.json();
  const clientId = process.env.DERIV_OAUTH_CLIENT_ID || process.env.VITE_DERIV_APP_ID || '332LK4VWd9A4pEEfTMn53';
  const clientSecret = process.env.DERIV_OAUTH_CLIENT_SECRET;
  const redirectUri =
    redirect_uri ||
    process.env.DERIV_OAUTH_REDIRECT_URI ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://digitprinters.site');

  if (!clientId || !clientSecret) {
    response.status(500).json({ error: 'OAuth server not configured' });
    return;
  }

  if (!code && grant_type !== 'refresh_token') {
    response.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  if (grant_type === 'refresh_token' && !refresh_token) {
    response.status(400).json({ error: 'Missing refresh token' });
    return;
  }

  const body = new URLSearchParams({
    grant_type: grant_type || 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  if (grant_type === 'refresh_token') {
    body.append('refresh_token', refresh_token);
  } else {
    body.append('code', code);
  }

  try {
    const tokenResponse = await fetch('https://oauth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await tokenResponse.json();
    const status = tokenResponse.ok ? 200 : 502;
    response.status(status).json(data);
  } catch (error) {
    response.status(500).json({ error: error.message || 'Token exchange failed' });
  }
}
