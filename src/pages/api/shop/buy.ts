import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../../../../db/index.js';
import { inventory, players, transactions } from '../../../../db/schema.js';
import { getItem } from '../../../lib/catalog';
import { ensurePlayer, getProfile, handle, HttpError, json, owns, requireUser } from '../../../lib/server';

export const prerender = false;

export const POST = handle(async (request) => {
    const user = await requireUser(request);
    await ensurePlayer(user);
    const { itemId } = (await request.json().catch(() => ({}))) as { itemId?: string };
    const item = getItem(itemId);
    if (!item) throw new HttpError(404, 'Item not found');
    if (await owns(user.id, item.id)) throw new HttpError(409, 'You already own this item');

    // Deduct only if the balance covers it.
    const debited = await db
        .update(players)
        .set({ gems: sql`${players.gems} - ${item.price}` })
        .where(and(eq(players.userId, user.id), gte(players.gems, item.price)))
        .returning({ gems: players.gems });
    if (debited.length === 0) throw new HttpError(402, 'Not enough gems');

    const added = await db.insert(inventory).values({ userId: user.id, itemId: item.id }).onConflictDoNothing().returning();
    if (added.length === 0) {
        // Lost a race with a duplicate request — refund.
        await db.update(players).set({ gems: sql`${players.gems} + ${item.price}` }).where(eq(players.userId, user.id));
        throw new HttpError(409, 'You already own this item');
    }

    await db.insert(transactions).values({ userId: user.id, amount: -item.price, reason: `buy:${item.id}` });
    return json({ profile: await getProfile(user.id) });
});
