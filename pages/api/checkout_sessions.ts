// --- Stripe Checkout (Express version) ---
app.post('/api/checkout_sessions', async (req, res) => {
  try {
    const Stripe = (await import('stripe')).default;
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return res.status(501).json({ error: { message: 'Stripe is not configured' } });
    }
    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

    const { lang } = (req.body ?? {}) as { lang?: 'fa' | 'en' };
    const locale: Stripe.Checkout.SessionCreateParams.Locale | undefined =
      lang === 'fa' ? 'auto' : 'en';

    // Build base URL from env (preferred) or headers
    const base =
      (process.env.PUBLIC_BASE_URL && process.env.PUBLIC_BASE_URL.replace(/\/+$/, '')) ||
      `${(req.headers['x-forwarded-proto'] as string) || 'https'}://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'PIP Assist Full Answers',
              description: 'One-time payment for full access to all form assistants.'
            },
            unit_amount: 1999 // £19.99
          },
          quantity: 1
        }
      ],
      // Option A: success/cancel pages (recommended; you already added /success & /cancel)
      success_url: `${base}/success`,
      cancel_url: `${base}/cancel`,

      // Option B (alternative): use query flags instead of pages
      // success_url: `${base}/?paid=true`,
      // cancel_url: `${base}/?canceled=true`,

      locale
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (err: any) {
    console.error('Stripe Error:', err?.message || err);
    return res.status(500).json({ error: { message: err?.message || 'server error' } });
  }
});
