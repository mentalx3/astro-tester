import { json } from '../../lib/server';

export const prerender = false;

export const GET = () => json({ paymentsEnabled: Boolean(process.env.STRIPE_SECRET_KEY) });
