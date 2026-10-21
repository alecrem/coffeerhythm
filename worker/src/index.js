const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp(name + '=([^;]+)'));
  return match ? match[1] : null;
}

async function handleAuth(request, env) {
  const url = new URL(request.url);
  const redirectUri = url.origin + '/callback';
  const state = crypto.randomUUID();

  const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'repo,user');
  authorizeUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      'Set-Cookie': 'oauth_state=' + state + '; HttpOnly; Secure; Path=/; Max-Age=600; SameSite=Lax'
    }
  });
}

function renderCallbackPage(payload) {
  return '<!doctype html><html><body><script>' +
    '(function () {' +
    'function receiveMessage(e) {' +
    'window.opener.postMessage(' + JSON.stringify(payload) + ', e.origin);' +
    'window.removeEventListener("message", receiveMessage, false);' +
    '}' +
    'window.addEventListener("message", receiveMessage, false);' +
    'window.opener.postMessage("authorizing:github", "*");' +
    '})();' +
    '</script></body></html>';
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = readCookie(request, 'oauth_state');

  if (!code || !state || state !== expectedState) {
    return new Response(renderCallbackPage('authorization:github:error:' + JSON.stringify({ message: 'invalid_state' })), {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      code: code
    })
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    return new Response(renderCallbackPage('authorization:github:error:' + JSON.stringify({ message: tokenData.error || 'token_exchange_failed' })), {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  const successPayload = 'authorization:github:success:' + JSON.stringify({ token: tokenData.access_token, provider: 'github' });
  return new Response(renderCallbackPage(successPayload), {
    headers: { 'Content-Type': 'text/html' }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/auth') {
      return handleAuth(request, env);
    }
    if (url.pathname === '/callback') {
      return handleCallback(request, env);
    }
    return new Response('Not found', { status: 404 });
  }
};
