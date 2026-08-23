if (typeof addEventListener === 'function') {
  addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event.request));
  });
}

if (typeof process !== 'undefined' && process.versions?.node && typeof require === 'function' && !process.env.VERCEL) {
  const http = require('node:http');
  const port = Number(process.env.PORT) || 8787;

  http.createServer(async (request, response) => {
    const workerRequest = new Request(`http://localhost:${port}${request.url}`, {
      method: request.method,
      headers: request.headers
    });
    const workerResponse = await handleRequest(workerRequest);
    response.writeHead(workerResponse.status, Object.fromEntries(workerResponse.headers));
    response.end(await workerResponse.text());
  }).listen(port, () => {
    console.log(`Local server running at http://localhost:${port}`);
  });
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function encodePaymentData(upiId, name, amount) {
  const data = JSON.stringify({ pa: upiId, pn: name, am: amount });
  const bytes = new TextEncoder().encode(data);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodePaymentData(value) {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    return null;
  }
}

const RATE_LIMIT_MAX_REQUESTS = 12;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const rateLimitStore = new Map();

function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0].trim() || 'unknown';
}

function checkRateLimit(request) {
  const now = Date.now();
  const clientIP = getClientIP(request);
  const recentRequests = (rateLimitStore.get(clientIP) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitStore.set(clientIP, recentRequests);
    return Math.ceil((recentRequests[0] + RATE_LIMIT_WINDOW_MS - now) / 1000);
  }

  recentRequests.push(now);
  rateLimitStore.set(clientIP, recentRequests);
  return 0;
}

function modernStyles() {
  return `
      :root {
        color-scheme: dark;
        --ink: #f4f7f5;
        --muted: #a8b5b1;
        --surface: rgba(18, 31, 30, 0.88);
        --surface-soft: rgba(29, 48, 45, 0.72);
        --line: rgba(176, 209, 194, 0.2);
        --accent: #b9f227;
        --accent-strong: #d4ff62;
        --accent-ink: #182000;
        --cyan: #71e4d2;
        --danger: #ff806d;
      }

      * { box-sizing: border-box; }
      body {
        min-height: 100svh;
        height: auto;
        padding: 32px 18px;
        font-family: "DM Sans", sans-serif;
        background: #0d1716;
        background-image: radial-gradient(circle at 12% 8%, rgba(113, 228, 210, .13), transparent 28%), radial-gradient(circle at 88% 92%, rgba(185, 242, 39, .1), transparent 30%), linear-gradient(135deg, #0d1716 0%, #132321 52%, #0b1110 100%);
      }
      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        opacity: .24;
        background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
        background-size: 34px 34px;
        mask-image: linear-gradient(to bottom, black, transparent 80%);
      }
      .container {
        position: relative;
        width: min(100%, 560px);
        max-width: 560px;
        padding: clamp(24px, 5vw, 44px);
        border: 1px solid var(--line);
        border-radius: 24px;
        background: linear-gradient(145deg, rgba(28, 47, 44, .94), rgba(13, 24, 23, .96));
        box-shadow: 0 24px 80px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.025) inset;
        animation: rise .55s ease both;
      }
      .eyebrow { color: var(--accent); font-size: .78rem; letter-spacing: .12em; text-transform: uppercase; }
      h1 { margin: 8px 0 10px; color: var(--ink); font-size: clamp(2rem, 6vw, 3rem); line-height: 1; letter-spacing: .01em; }
      .subtitle { margin: 0 0 28px; color: var(--muted); line-height: 1.55; }
      label { display: block; margin: 18px 0 8px; color: var(--ink); font-size: .95rem; }
      input { width: 100%; min-height: 50px; padding: 13px 15px; border: 1px solid var(--line); border-radius: 12px; outline: none; background: rgba(5, 12, 11, .55); color: var(--ink); font: inherit; transition: border-color .2s, box-shadow .2s, background .2s; }
      input::placeholder { color: #70807b; }
      input:focus { border-color: var(--cyan); background: rgba(5, 12, 11, .8); box-shadow: 0 0 0 4px rgba(113, 228, 210, .12); }
      .amount-row { display: flex; gap: 8px; align-items: end; }
      .amount-row label { flex: 1; }
      .presets { display: flex; gap: 6px; padding-bottom: 1px; }
      .preset, .icon-button { border: 1px solid var(--line); border-radius: 10px; background: var(--surface-soft); color: var(--muted); cursor: pointer; font: inherit; transition: .2s ease; }
      .preset { min-height: 36px; padding: 0 10px; font-size: .8rem; }
      .preset:hover, .preset:focus-visible, .icon-button:hover, .icon-button:focus-visible { border-color: var(--accent); color: var(--accent-strong); }
      .primary-action, #generateButton .primary-action { width: 100%; min-height: 52px; margin-top: 28px; border: 0; border-radius: 12px; background: var(--accent); color: var(--accent-ink); cursor: pointer; font: inherit; font-weight: 700; box-shadow: 0 10px 24px rgba(185, 242, 39, .14); transition: transform .2s, background .2s, box-shadow .2s; }
      .primary-action:hover { transform: translateY(-2px); background: var(--accent-strong); box-shadow: 0 14px 30px rgba(185, 242, 39, .22); }
      .primary-action:active { transform: translateY(0); }
      .result { display: none; margin-top: 22px; padding: 16px; border: 1px solid var(--line); border-radius: 14px; background: rgba(5, 12, 11, .4); }
      #generatedURLContainer.result.is-visible { display: block; animation: rise .35s ease both; }
      .result-label { display: block; margin-bottom: 8px; color: var(--muted); font-size: .8rem; }
      .home-qr { display: grid; place-items: center; margin: 4px 0 18px; padding: 16px; border-radius: 14px; background: #f2f5ed; }
      .home-qr img { display: block; width: min(100%, 220px); height: auto; border-radius: 5px; }
      .result-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 12px; }
      .secondary-action { display: grid; grid-auto-flow: column; gap: 8px; min-height: 48px; place-items: center; border: 1px solid var(--line); border-radius: 12px; background: var(--surface-soft); color: var(--ink); cursor: pointer; font: inherit; font-weight: 700; text-decoration: none; transition: .2s ease; }
      .secondary-action:hover { border-color: var(--cyan); color: var(--cyan); transform: translateY(-2px); }
      .url-row { display: flex; gap: 8px; align-items: stretch; }
      textarea { width: 100%; min-height: 76px; resize: vertical; padding: 11px; border: 1px solid var(--line); border-radius: 10px; background: rgba(18,31,30,.8); color: var(--ink); font: .84rem/1.45 monospace; }
      .icon-button { width: 46px; min-width: 46px; color: var(--accent); font-size: 1.1rem; }
      #copyButton { position: static; transform: none; }
      #copyButton:hover { transform: none; }
      .toast { min-height: 20px; margin: 9px 0 0; color: var(--cyan); font-size: .82rem; }
      .payment-header { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
      .payment-header h1 { margin-bottom: 0; }
      .amount-badge { flex-shrink: 0; padding: 8px 11px; border: 1px solid rgba(185,242,39,.35); border-radius: 999px; color: var(--accent); font-size: .85rem; }
      .identity { display: flex; gap: 12px; align-items: center; margin: 24px 0 18px; color: var(--muted); }
      .avatar { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 50%; background: rgba(113,228,210,.14); color: var(--cyan); font-weight: 700; }
      .identity strong { display: block; color: var(--ink); font-size: 1.05rem; }
      .identity small { display: block; margin-top: 3px; }
      #qrCode { display: grid; place-items: center; margin: 22px 0; padding: 20px; border: 1px solid var(--line); border-radius: 18px; background: #f2f5ed; }
      #qrCode img { display: block; width: min(100%, 260px); height: auto; border-radius: 6px; }
      .payment-actions { display: grid; grid-template-columns: 1fr auto; gap: 9px; }
      #payButton .pay-action { display: grid; width: 100%; min-height: 52px; place-items: center; border: 0; border-radius: 12px; background: var(--accent); color: var(--accent-ink); cursor: pointer; font: inherit; font-weight: 700; transition: transform .2s, background .2s; }
      #payButton .pay-action:hover { transform: translateY(-2px); background: var(--accent-strong); }
      #notFound { padding: 14px; border: 1px solid rgba(255,128,109,.35); border-radius: 12px; background: rgba(255,128,109,.1); color: var(--danger); text-align: center; }
      .back-link { display: inline-block; margin-top: 22px; color: var(--muted); font-size: .84rem; text-decoration: none; }
      .back-link:hover { color: var(--ink); }
      @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @media (min-width: 800px) { body { padding: 64px 24px; } .container { width: min(100%, 760px); max-width: 760px; padding: 54px 64px; border-radius: 28px; } h1 { font-size: 3.35rem; max-width: 620px; } .subtitle { max-width: 540px; font-size: 1.02rem; } #generateForm { display: grid; grid-template-columns: 1fr 1fr; column-gap: 18px; } #generateForm > .eyebrow, #generateForm > h1, #generateForm > .subtitle, #generateForm > #generateButton { grid-column: 1 / -1; } #generateForm > label:nth-of-type(1), #generateForm > input:nth-of-type(1), #generateForm > label:nth-of-type(2), #generateForm > input:nth-of-type(2) { grid-column: auto; } #generateForm > label:nth-of-type(1) { grid-row: 4; } #generateForm > input:nth-of-type(1) { grid-row: 5; } #generateForm > label:nth-of-type(2) { grid-column: 2; grid-row: 4; } #generateForm > input:nth-of-type(2) { grid-column: 2; grid-row: 5; } #generateForm > .amount-row, #generateForm > input:nth-of-type(3) { grid-column: 1 / -1; } #generateButton { margin-top: 34px; } }
      @media (max-width: 480px) { body { align-items: flex-start; padding: 16px 12px; } .container { width: 100%; margin: 0 auto; padding: 24px; border-radius: 18px; } h1 { font-size: 2.05rem; } .subtitle { margin-bottom: 22px; } .payment-header { gap: 10px; } .amount-badge { padding: 7px 9px; font-size: .78rem; } .amount-row { display: block; } .presets { margin-top: 9px; } .payment-actions { grid-template-columns: minmax(0, 1fr) 46px; } .result-actions { grid-template-columns: 1fr; } }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
  `;
}

function paymentHTML(qrImageUrl, upiId, upiLink, amount, name, paymentUrl) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: "DM Sans", sans-serif;
        margin: 0;
        padding: 0;
        background: linear-gradient(135deg, #440a67, #330867, #200441);
        color: #fff;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
      }

      .container {
        max-width: 450px;
        padding: 30px;
        background-color: rgba(0, 0, 0, 0.7);
        border-radius: 16px;
        box-shadow: 0 0 30px rgba(255, 0, 255, 0.8), 0 0 60px rgba(255, 0, 255, 0.8), inset 0 0 20px rgba(255, 0, 255, 0.5);
      }

      h1 {
        text-align: center;
        margin-bottom: 30px;
      }

      #qrCode {
        text-align: center;
        margin-top: 30px;
        border: 2px solid #6b146d;
        padding: 10px;
        border-radius: 8px;
        background-color: #330867;
      }

      #qrCode img {
        max-width: 100%;
        height: auto;
      }

      #payButton {
        text-align: center;
        margin-top: 30px;
      }

      #notFound {
        font-size: 1.5rem;
        font-weight: bold;
        color: white;
        background-color: red;
        padding: 8px 25px;
        margin-top: 30px;
        border-radius: 3px;
        text-align: center;
        box-shadow: 0 0 5px red, 0 0 10px red, 0 0 20px red, 0 0 30px red;
        animation: glow 1.5s infinite;
      }

      @keyframes glow {
        0% {
          box-shadow: 0 0 5px red, 0 0 10px red, 0 0 15px red, 0 0 20px red;
        }
        50% {
          box-shadow: 0 0 10px red, 0 0 30px red, 0 0 40px red, 0 0 50px red;
        }
        100% {
          box-shadow: 0 0 5px red, 0 0 10px red, 0 0 15px red, 0 0 20px red;
        }
      }

      #payButton a {
        color: #fff;
        text-decoration: none;
        border: none;
        padding: 15px 30px;
        border-radius: 8px;
        background: linear-gradient(135deg, #ae5aea, #6b146d);
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.3);
        display: inline-block;
        font-weight: 600;
      }

      #payButton a:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.6), 0 14px 32px rgba(0, 0, 0, 0.4);
      }

      .upiId {
        text-align: center;
        margin-top: 20px;
        font-size: 18px;
        font-weight: 600;
        border: 2px solid #6b146d;
        padding: 10px;
        border-radius: 8px;
      }
      ${modernStyles()}
    </style>
  </head>
  <body>
    <div class="container">
      ${upiId ? `<div class="eyebrow">Secure UPI payment</div>` : ''}
      <div class="payment-header">
        <div><h1>${upiId ? 'Pay securely' : 'Payment unavailable'}</h1><p class="subtitle">${upiId ? 'Scan the code or open your preferred UPI app.' : 'This payment link is missing a valid UPI ID.'}</p></div>
        ${amount ? `<div class="amount-badge">Rs. ${escapeHTML(amount)}</div>` : ''}
      </div>
      ${upiId ? `<div class="identity"><div class="avatar">${escapeHTML((name || upiId).charAt(0).toUpperCase())}</div><div><strong>${escapeHTML(name || 'Unknown')}</strong><small>${escapeHTML(upiId)}</small></div></div>` : ''}
      <div id="qrCode">
        <img src="${escapeHTML(qrImageUrl)}" alt="QR Code" draggable="false">
      </div>
      <div class="payment-actions" id="payButton">
        <button class="pay-action" type="button" id="payLink">Click Here to Pay</button>
        <button class="icon-button" type="button" id="copyPayLink" title="Copy payment link" aria-label="Copy payment link"><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg></button>
      </div>
      ${upiId ? '' : `<div id="notFound">Not Found</div>`}
      ${upiId ? `<a class="back-link" href="/">&#8592; Create another payment link</a><p class="toast" id="paymentToast" role="status" aria-live="polite"></p>` : ''}
    </div>
    <script>
      if (${JSON.stringify(upiId)} === null || ${JSON.stringify(upiId)} === "") {
        document.getElementById('qrCode').style.display = 'none';
        document.getElementById('payButton').style.display = 'none';
      }
      const copyPayLink = document.getElementById('copyPayLink');
      const payLink = document.getElementById('payLink');
      if (payLink) {
        payLink.addEventListener('click', () => { window.location.href = ${JSON.stringify(upiLink)}; });
      }
      if (copyPayLink) {
        copyPayLink.addEventListener('click', async () => {
          const link = ${JSON.stringify(paymentUrl)};
          try {
            await navigator.clipboard.writeText(link);
          } catch (error) {
            const fallback = document.createElement('textarea');
            fallback.value = link;
            document.body.appendChild(fallback);
            fallback.select();
            document.execCommand('copy');
            fallback.remove();
          }
          document.getElementById('paymentToast').textContent = 'Payment link copied';
          setTimeout(() => { document.getElementById('paymentToast').textContent = ''; }, 2200);
        });
      }
      history.replaceState({}, document.title, location.pathname);
    </script>
  </body>
</html>
  `;
}

function landingHTML() {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generate Payment URL</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: "DM Sans", sans-serif;
        margin: 0;
        padding: 0;
        background: linear-gradient(135deg, #440a67, #330867, #200441);
        color: #fff;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
      }
  
      .container {
        max-width: 450px;
        padding: 30px;
        background-color: rgba(0, 0, 0, 0.7);
        border-radius: 16px;
        box-shadow: 0 0 30px rgba(255, 0, 255, 0.8), 0 0 60px rgba(255, 0, 255, 0.8), inset 0 0 20px rgba(255, 0, 255, 0.5);
      }
  
      h1 {
        text-align: center;
        margin-bottom: 30px;
      }
  
      label {
        display: block;
        margin-top: 10px;
      }
  
      input {
        width: calc(100% - 22px);
        padding: 10px;
        margin-top: 5px;
        border-radius: 8px;
        border: 2px solid #6b146d;
        background-color: #330867;
        color: #fff;
      }
  
      #generateButton {
        text-align: center;
        margin-top: 30px;
      }
  
      #generateButton button {
        font-family: "Balsamiq Sans", cursive;
        color: #fff;
        text-decoration: none;
        border: none;
        padding: 15px 30px;
        border-radius: 8px;
        background: linear-gradient(135deg, #ae5aea, #6b146d);
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.3);
        display: inline-block;
        font-weight: 600;
      }
  
      #generateButton button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.6), 0 14px 32px rgba(0, 0, 0, 0.4);
      }
  
      #generatedURLContainer {
        margin-top: 20px;
        padding: 10px;
        border: 2px solid #6b146d;
        border-radius: 8px;
        background-color: #330867;
        display: none;
        position: relative;
        word-wrap: break-word;
      }
  
      #generatedURL {
        text-align: left;
        margin: 0;
        background-color: rgba(0, 0, 0, 0.7);
        color: #fff;
      }
  
      #copyButton {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        color: #fff;
        cursor: pointer;
        font-size: 16px;
      }
  
      #copyButton:hover {
        transform: translateY(-52%);
      }
      ${modernStyles()}
    </style>
  </head>
  <body>
    <div class="container">
      <form id="generateForm">
        <div class="eyebrow">UPI payment links</div>
        <h1>Create a payment link</h1>
        <p class="subtitle">Turn your UPI ID into a shareable QR code in seconds.</p>
        <label for="name">Recipient name <span>(optional)</span></label>
        <input type="text" id="name" name="name" placeholder="e.g. sanchit" autocomplete="name">
        <label for="upiId">UPI ID</label>
        <input type="text" id="upiId" name="upiId" placeholder="yourname@bank" autocomplete="off" required>
        <div class="amount-row"><label for="amount">Amount</label><div class="presets"><button class="preset" type="button" data-amount="100">Rs. 100</button><button class="preset" type="button" data-amount="500">Rs. 500</button><button class="preset" type="button" data-amount="1000">Rs. 1k</button></div></div>
        <input type="number" id="amount" name="amount" placeholder="Enter amount in rupees" min="1" step="0.01" inputmode="decimal" required>
        <div id="generateButton">
          <button class="primary-action" type="button" id="generateQRButton">Generate QR <span aria-hidden="true">&#8594;</span></button>
        </div>
      </form>
      <div id="generatedURLContainer" class="result">
        <span class="result-label">Your QR code is ready</span>
        <div class="home-qr"><img id="generatedQR" alt="Generated UPI QR code"></div>
        <div class="url-row"><textarea rows="3" id="generatedURL" readonly aria-label="Generated payment URL"></textarea>
        </div>
        <div class="result-actions"><button class="secondary-action" id="copyButton" type="button"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg> Copy Url</button><a class="secondary-action" id="generatedPayLink" href="#">Click Here To Pay</a></div>
        <p class="toast" id="copyStatus" role="status" aria-live="polite"></p>
      </div>
    </div>
    <script>
      document.getElementById('generateQRButton').addEventListener('click', () => {
        generateQR().catch((error) => {
          document.getElementById('copyStatus').textContent = error.message || 'Could not generate QR. Please try again.';
        });
      });

      function validateForm() {
        const fields = ['upiId', 'amount'];
        const invalidField = fields.map((id) => document.getElementById(id)).find((field) => !field.value.trim());
        if (invalidField) {
          invalidField.focus();
          return false;
        }
        return Number(document.getElementById('amount').value) > 0;
      }

      async function generateQR() {
        const button = document.getElementById('generateQRButton');
        if (!validateForm()) return;
        const upiId = document.getElementById('upiId').value.trim();
        const name = document.getElementById('name').value.trim();
        const amount = document.getElementById('amount').value;
        const params = new URLSearchParams({ pa: upiId, pn: name, am: amount });
        button.disabled = true;
        button.textContent = 'Generating QR...';
        try {
          const apiUrl = new URL('/api/qr?' + params.toString(), window.location.href);
          const response = await fetch(apiUrl.toString(), { headers: { Accept: 'application/json' } });
          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Unable to generate QR');
          }
          const data = await response.json();
          if (!data.qrImageUrl || !data.paymentUrl || !data.upiLink) throw new Error('QR response is incomplete');
          window.location.assign(data.paymentUrl);
        } catch (error) {
          const upiLink = 'upi://pay?' + new URLSearchParams({ pa: upiId, pn: name, cu: 'INR', am: amount }).toString();
          const encodedData = btoa(JSON.stringify({ pa: upiId, pn: name, am: amount })).split('+').join('-').split('/').join('_').replace(/=+$/, '');
          const paymentUrl = new URL('/pay?ds=' + encodedData, window.location.href).toString();
          window.location.assign(paymentUrl);
        } finally {
          button.disabled = false;
          button.innerHTML = 'Generate QR <span aria-hidden="true">&#8594;</span>';
        }
      }
  
      function copyURL() {
        const generatedURL = document.getElementById("generatedURL");
        navigator.clipboard.writeText(generatedURL.value).then(() => {
          document.getElementById('copyStatus').textContent = 'URL copied to clipboard';
        }).catch(() => {
          generatedURL.select();
          document.execCommand("copy");
          document.getElementById('copyStatus').textContent = 'URL copied to clipboard';
        });
      }
      document.querySelectorAll('[data-amount]').forEach((button) => button.addEventListener('click', () => { document.getElementById('amount').value = button.dataset.amount; }));
      document.getElementById('copyButton').addEventListener('click', copyURL);
    </script>
  </body>
  </html>
  `;
}

async function generateQR(request) {
  const params = new URL(request.url).searchParams;
  const upiId = params.get('pa');
  const name = params.get('pn');
  const amount = params.get('am');

  const upiParams = new URLSearchParams({
    pa: upiId || '',
    pn: name || '',
    cu: 'INR'
  });
  if (amount !== null && amount !== "") {
    upiParams.set('am', amount);
  }
  const upiLink = `upi://pay?${upiParams.toString()}`;
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiLink)}&size=200x200`;

  return { qrImageUrl: qrDataUrl, upiId: upiId, upiLink: upiLink, amount: amount, name: name };
}

function jsonResponse(body, status = 200, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      ...extraHeaders
    }
  });
}

async function apiQR(request) {
  const retryAfter = checkRateLimit(request);
  if (retryAfter > 0) {
    return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429, { 'Retry-After': String(retryAfter) });
  }

  const params = new URL(request.url).searchParams;
  const upiId = params.get('pa')?.trim();
  const name = params.get('pn')?.trim();
  const amount = params.get('am')?.trim();

  if (!upiId || !amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return jsonResponse({ error: 'Query parameters pa and a positive am are required. pn is optional.' }, 400);
  }

  const qr = await generateQR(request);
  const paymentUrl = new URL('/pay', request.url);
  if (paymentUrl.hostname === 'localhost') {
    paymentUrl.port = '8787';
  }
  paymentUrl.searchParams.set('ds', encodePaymentData(upiId, name, amount));
  return jsonResponse({
    qrImageUrl: qr.qrImageUrl,
    upiLink: qr.upiLink,
    paymentUrl: paymentUrl.toString(),
    upiId,
    name,
    amount
  });
}

async function handleRequest(request) {
  const url = new URL(request.url);

  if (url.pathname === '/') {
    const landingPageHTML = landingHTML();
    return new Response(landingPageHTML, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
  else if (url.pathname === '/api/qr') {
    return apiQR(request);
  }
  else if (url.pathname === '/pay') {
    const paymentData = url.searchParams.get('ds')
    const decodedData = paymentData ? decodePaymentData(paymentData) : null;
    const paymentRequest = decodedData
      ? new Request(new URL(`/pay?pa=${encodeURIComponent(decodedData.pa || '')}&pn=${encodeURIComponent(decodedData.pn || '')}&am=${encodeURIComponent(decodedData.am || '')}`, request.url))
      : request;
    const { qrImageUrl, upiId, upiLink, amount, name } = await generateQR(paymentRequest);
    const paymentPageHTML = paymentHTML(qrImageUrl, upiId, upiLink, amount, name, url.toString());
    return new Response(paymentPageHTML, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } else {
    return new Response('404 Not Found', { status: 404 });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = async function vercelHandler(request, response) {
    const protocol = request.headers['x-forwarded-proto'] || 'http';
    const host = request.headers.host || 'localhost';
    const workerRequest = new Request(`${protocol}://${host}${request.url}`, {
      method: request.method,
      headers: request.headers
    });
    const workerResponse = await handleRequest(workerRequest);
    response.statusCode = workerResponse.status;
    workerResponse.headers.forEach((value, key) => response.setHeader(key, value));
    response.end(await workerResponse.text());
  };
}
