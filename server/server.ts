// server/server.ts
import express, { Request } from 'express';
import path from 'node:path';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// absolute path to Vite build output
const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

// serve static assets produced by Vite
app.use(express.static(DIST, { index: false }));

// simple health check
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// build a canonical base URL from env or headers
function getBaseUrl(req: Request) {
  const fromEnv = process.env.PUBLIC_BASE_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers.host;
  return `${proto}://${host}`;
}

// Stripe Checkout endpoint
app.post('/api/checkout_sessions', async (req, res) => {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return res.status(501).json({ error: { message: 'Stripe is not configured' } });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

    const base = getBaseUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: { name: 'UK PIP Assist - Full Answers' },
            unit_amount: 1999 // £19.99
          },
          quantity: 1
        }
      ],
      success_url: `${base}/success`,
      cancel_url: `${base}/cancel`
    });

    return res.json({ sessionId: session.id });
  } catch (err: any) {
    console.error('checkout error:', err);
    return res.status(500).json({ error: { message: err?.message || 'server error' } });
  }
});

// success and cancel lightweight pages (no framework needed)
app.get('/success', (_req, res) => {
  res.type('html').send(`<!doctype html>
<meta charset="utf-8">
<title>Payment Success</title>
<script>
  try { localStorage.setItem('paid','true'); } catch(e) {}
  location.replace('/');
</script>
<p style="font:16px/1.6 system-ui">Payment successful. Redirecting…</p>`);
});

app.get('/cancel', (_req, res) => {
  res.type('html').send(`<!doctype html>
<meta charset="utf-8">
<title>Payment Cancelled</title>
<p style="font:16px/1.6 system-ui">Payment canceled. <a href="/">Go back</a></p>`);
});

// SPA fallback: send index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// keep process alive with error logs
process.on('unhandledRejection', (r) => console.error('UNHANDLED REJECTION', r));
process.on('uncaughtException', (e) => console.error('UNCAUGHT EXCEPTION', e));
