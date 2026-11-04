import { db } from '../../../db/index.js';
import { equipped } from '../../../db/schema.js';
import { getItem } from '../../lib/catalog';
import { ensurePlayer, getProfile, handle, HttpError, json, owns, requireUser } from '../../lib/server';

export const prerender = false;

export const POST = handle(async (request) => {
    const user = await requireUser(request);
    await ensurePlayer(user);
    const { itemId } = (await request.json().catch(() => ({}))) as { itemId?: string };
    const item = getItem(itemId);
    if (!item) throw new HttpError(404, 'Item not found');
    if (!(await owns(user.id, item.id))) throw new HttpError(403, 'You don’t own this item');

    await db
        .insert(equipped)
        .values({ userId: user.id, slot: item.slot, itemId: item.id })
        .onConflictDoUpdate({ target: [equipped.userId, equipped.slot], set: { itemId: item.id } });

    return json({ profile: await getProfile(user.id) });
});
