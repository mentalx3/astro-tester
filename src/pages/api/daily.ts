import { sql } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { transactions } from '../../../db/schema.js';
import { DAILY_BONUS } from '../../lib/catalog';
import { ensurePlayer, getProfile, handle, HttpError, json, requireUser, rowsOf } from '../../lib/server';

export const prerender = false;

export const POST = handle(async (request) => {
    const user = await requireUser(request);
    await ensurePlayer(user);

    // Atomic: only succeeds once per calendar day.
    const res = await db.execute(sql`
        UPDATE players SET gems = gems + ${DAILY_BONUS}, last_daily_claim = CURRENT_DATE
        WHERE user_id = ${user.id} AND (last_daily_claim IS NULL OR last_daily_claim < CURRENT_DATE)
        RETURNING gems`);
    if (rowsOf(res).length === 0) throw new HttpError(409, 'Daily bonus already claimed — come back tomorrow!');

    await db.insert(transactions).values({ userId: user.id, amount: DAILY_BONUS, reason: 'daily' });
    return json({ awarded: DAILY_BONUS, profile: await getProfile(user.id) });
});
