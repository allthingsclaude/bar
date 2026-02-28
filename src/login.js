import { randomBytes, createHash } from 'crypto';
import { createServer } from 'http';
import { writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { request } from './http.js';

const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const AUTH_URL = 'https://claude.ai/oauth/authorize';
const TOKEN_URL = 'https://platform.claude.com/v1/oauth/token';
const SCOPES = 'user:profile user:inference';

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generatePKCE() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function openBrowser(url) {
  try {
    execSync(`open "${url}"`, { stdio: 'ignore' });
  } catch {
    try {
      execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
    } catch {
      console.log(`Open this URL in your browser:\n${url}`);
    }
  }
}

function successHTML() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bar</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;justify-content:center;
align-items:center;min-height:100vh;margin:0;background:#F5F0E8;color:#111}
.c{text-align:center}.h{font-size:32px;font-weight:600;margin-bottom:12px}
.s{color:#888;font-size:16px}</style></head>
<body><div class="c"><div class="h">Logged in</div>
<div class="s">You can close this tab and return to your terminal.</div></div></body></html>`;
}

function saveTokens(data) {
  const tokensPath = join(homedir(), '.bar', 'tokens.json');
  mkdirSync(dirname(tokensPath), { recursive: true, mode: 0o700 });
  writeFileSync(tokensPath, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export async function login() {
  const { verifier, challenge } = generatePKCE();
  const state = base64url(randomBytes(16));

  // Start local callback server on a random port
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const redirectUri = `http://localhost:${port}/callback`;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  const authUrl = `${AUTH_URL}?${params}`;
  console.log('Opening browser for authentication...');
  openBrowser(authUrl);

  // Auto-close after 5 minutes
  const timeout = setTimeout(() => {
    console.error('Login timed out after 5 minutes.');
    server.close();
    process.exit(1);
  }, 5 * 60 * 1000);

  // Wait for callback
  const code = await new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end();
        return;
      }
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      if (returnedState !== state) {
        res.writeHead(400);
        res.end('State mismatch');
        reject(new Error('State mismatch'));
        return;
      }
      if (!code) {
        res.writeHead(400);
        res.end('No code returned');
        reject(new Error('No authorization code'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(successHTML());
      resolve(code);
    });
  });

  clearTimeout(timeout);
  server.close();

  // Exchange code for tokens
  console.log('Exchanging authorization code...');
  const body = JSON.stringify({
    grant_type: 'authorization_code',
    code,
    client_id: CLIENT_ID,
    code_verifier: verifier,
    redirect_uri: `http://localhost:${port}/callback`,
    state,
  });

  const res = await request(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) {
    console.error(`Token exchange failed (${res.status}): ${res.body}`);
    process.exit(1);
  }

  const json = JSON.parse(res.body);
  const tokens = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || null,
    expiresIn: json.expires_in || 3600,
  };

  saveTokens(tokens);
  console.log('Logged in successfully. Token saved to ~/.bar/tokens.json');
}

export function logout() {
  const tokensPath = join(homedir(), '.bar', 'tokens.json');
  try {
    unlinkSync(tokensPath);
    console.log('Logged out. Token removed.');
  } catch {
    console.log('No token found.');
  }
}
