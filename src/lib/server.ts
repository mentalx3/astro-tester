import { getUser, verifyRequestOrigin, type User } from '@netlify/identity';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { equipped, inventory, players, transactions } from '../../db/schema.js';
import { DEFAULT_ITEMS, STARTING_GEMS, type Slot } from './catalog';

export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export class HttpError extends Error {
    constructor(
        public status: number,
        message: string
    ) {
        super(message);
    }
}

export async function requireUser(request: Request): Promise<User> {
    if (request.method !== 'GET') {
        try {
            verifyRequestOrigin(request);
        } catch {
            throw new HttpError(403, 'Invalid request origin');
        }
    }
    const user = await getUser();
    if (!user) throw new HttpError(401, 'Please log in');
    return user;
}

export function handle(fn: (request: Request) => Promise<Response>) {
    return async ({ request }: { request: Request }) => {
        try {
            return await fn(request);
        } catch (e) {
            if (e instanceof HttpError) return json({ error: e.message }, e.status);
            console.error(e);
            return json({ error: 'Something went wrong' }, 500);
        }
    };
}

function displayNameFor(user: User): string {
    const raw = (user.name || user.email?.split('@')[0] || 'Player').trim();
    return raw.slice(0, 24) || 'Player';
}

/** Creates the player row (with starter gems + free cosmetics) on first visit. */
export async function ensurePlayer(user: User) {
    const existing = await db.select().from(players).where(eq(players.userId, user.id));
    if (existing[0]) return existing[0];

    const [created] = await db
        .insert(players)
        .values({ userId: user.id, displayName: displayNameFor(user), gems: STARTING_GEMS })
        .onConflictDoNothing()
        .returning();

    if (created) {
        await db
            .insert(inventory)
            .values(Object.values(DEFAULT_ITEMS).map((itemId) => ({ userId: user.id, itemId })))
            .onConflictDoNothing();
        await db
            .insert(equipped)
            .values(Object.entries(DEFAULT_ITEMS).map(([slot, itemId]) => ({ userId: user.id, slot, itemId })))
            .onConflictDoNothing();
        await db.insert(transactions).values({ userId: user.id, amount: STARTING_GEMS, reason: 'welcome' });
        return created;
    }
    const [row] = await db.select().from(players).where(eq(players.userId, user.id));
    return row;
}

export async function getProfile(userId: string) {
    const [player] = await db.select().from(players).where(eq(players.userId, userId));
    const owned = await db.select({ itemId: inventory.itemId }).from(inventory).where(eq(inventory.userId, userId));
    const eq_ = await db.select().from(equipped).where(eq(equipped.userId, userId));
    const today = await db.execute(sql`SELECT CURRENT_DATE::text AS today`);
    const todayStr = rowsOf(today)[0]?.today as string;

    const lastClaim = player?.lastDailyClaim ? String(player.lastDailyClaim).slice(0, 10) : null;
    const earnDay = player?.earnDay ? String(player.earnDay).slice(0, 10) : null;

    return {
        displayName: player.displayName,
        gems: player.gems,
        dailyAvailable: lastClaim !== todayStr,
        gemsEarnedToday: earnDay === todayStr ? player.gemsEarnedToday : 0,
        owned: owned.map((o) => o.itemId),
        equipped: Object.fromEntries(eq_.map((e) => [e.slot, e.itemId])) as Partial<Record<Slot, string>>
    };
}

export function rowsOf(result: unknown): any[] {
    if (Array.isArray(result)) return result;
    const r = result as { rows?: any[] };
    return r?.rows ?? [];
}

export async function owns(userId: string, itemId: string) {
    const r = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.userId, userId), eq(inventory.itemId, itemId)));
    return r.length > 0;
}
