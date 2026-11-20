const http = require('node:http');

const port = 54329;
const testAccessToken = 'pw-test-access-token';
const now = Math.floor(Date.now() / 1000);
const consumedTokenHashes = new Set();
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'playwright@example.test',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: new Date(now * 1000).toISOString(),
  updated_at: new Date(now * 1000).toISOString(),
  is_anonymous: false,
};

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);

  if (request.method === 'GET' && url.pathname === '/auth/v1/health') {
    return sendJson(response, 200, { status: 'ok' });
  }

  if (request.method === 'GET' && url.pathname === '/auth/v1/user') {
    if (request.headers.authorization === `Bearer ${testAccessToken}`) return sendJson(response, 200, user);
    return sendJson(response, 401, { code: 'invalid_token', message: 'No test session' });
  }

  if (request.method === 'POST' && url.pathname === '/auth/v1/verify') {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); } catch { return sendJson(response, 400, { message: 'Invalid JSON' }); }

      const knownToken = payload.token_hash === 'pw-valid-token'
        || payload.token_hash === 'pw-update-token'
        || /^pw-race-[A-Za-z0-9-]+$/.test(payload.token_hash);
      if (payload.type !== 'recovery' || !knownToken || consumedTokenHashes.has(payload.token_hash)) {
        return sendJson(response, 403, { code: 'otp_expired', message: 'Token has expired or is invalid' });
      }
      consumedTokenHashes.add(payload.token_hash);

      return sendJson(response, 200, {
        access_token: testAccessToken,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: 'pw-test-refresh-token',
        user,
      });
    });
    return;
  }

  if (request.method === 'PUT' && url.pathname === '/auth/v1/user') {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); } catch { return sendJson(response, 400, { message: 'Invalid JSON' }); }
      if (request.headers.authorization !== `Bearer ${testAccessToken}` || typeof payload.password !== 'string' || payload.password.length < 8) {
        return sendJson(response, 400, { code: 'validation_failed', message: 'Invalid password update' });
      }
      return sendJson(response, 200, { ...user, updated_at: new Date().toISOString() });
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/auth/v1/logout') {
    response.writeHead(204);
    return response.end();
  }

  return sendJson(response, 404, { message: 'Not found' });
});

server.listen(port, '127.0.0.1');
