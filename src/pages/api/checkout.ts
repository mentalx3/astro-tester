import { GEM_PACKS_BY_ID } from '../../lib/catalog';
import { ensurePlayer, handle, HttpError, json, requireUser } from '../../lib/server';

export const prerender = false;

// Creates a Stripe Checkout session for a gem pack. Requires STRIPE_SECRET_KEY.
export const POST = handle(async (request) => {
    const user = await requireUser(request);
    await ensurePlayer(user);
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new HttpError(503, 'Gem purchases are not available yet.');

    const { packId } = (await request.json().catch(() => ({}))) as { packId?: string };
    const pack = GEM_PACKS_BY_ID.get(packId ?? '');
    if (!pack) throw new HttpError(404, 'Unknown gem pack');

    const origin = new URL(request.url).origin;
    const form = new URLSearchParams({
        mode: 'payment',
        success_url: `${origin}/?tab=gems&purchase=success`,
        cancel_url: `${origin}/?tab=gems&purchase=cancelled`,
        client_reference_id: user.id,
        'metadata[userId]': user.id,
        'metadata[packId]': pack.id,
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': String(pack.priceCents),
        'line_items[0][price_data][product_data][name]': `${pack.gems + pack.bonus} Gems (${pack.name})`
    });
    if (user.email) form.set('customer_email', user.email);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form
    });
    const session = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !session.url) {
        console.error('Stripe checkout failed', session.error?.message);
        throw new HttpError(502, 'Could not start checkout');
    }
    return json({ url: session.url });
});
