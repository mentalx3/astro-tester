import type { APIRoute } from 'astro';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { players, transactions } from '../../../db/schema.js';
import { GEM_PACKS_BY_ID } from '../../lib/catalog';

export const prerender = false;

function verify(payload: string, header: string, secret: string): boolean {
    const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
    const t = parts.t;
    const sigs = header
        .split(',')
        .filter((p) => p.startsWith('v1='))
        .map((p) => p.slice(3));
    if (!t || sigs.length === 0) return false;
    if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
    const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest();
    return sigs.some((s) => {
        const buf = Buffer.from(s, 'hex');
        return buf.length === expected.length && timingSafeEqual(buf, expected);
    });
}

// Stripe calls this after a successful payment; it credits the gems exactly once.
export const POST: APIRoute = async ({ request }) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return new Response('Webhook not configured', { status: 503 });

    const payload = await request.text();
    if (!verify(payload, request.headers.get('stripe-signature') ?? '', secret)) {
        return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(payload);
    if (event.type === 'checkout.session.completed' && event.data?.object?.payment_status === 'paid') {
        const session = event.data.object;
        const pack = GEM_PACKS_BY_ID.get(session.metadata?.packId);
        const userId = session.metadata?.userId;
        if (pack && userId) {
            const total = pack.gems + pack.bonus;
            // Unique reference makes this idempotent if Stripe retries.
            const inserted = await db
                .insert(transactions)
                .values({ userId, amount: total, reason: `purchase:${pack.id}`, reference: session.id })
                .onConflictDoNothing()
                .returning();
            if (inserted.length > 0) {
                await db.update(players).set({ gems: sql`${players.gems} + ${total}` }).where(eq(players.userId, userId));
            }
        }
    }
    return new Response('ok');
};
