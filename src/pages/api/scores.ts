import { sql } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { scores, transactions } from '../../../db/schema.js';
import { DAILY_EARN_CAP, GAMES_BY_ID, gemsForScore, type GameId } from '../../lib/catalog';
import { ensurePlayer, getProfile, handle, HttpError, json, requireUser, rowsOf } from '../../lib/server';

export const prerender = false;

export const POST = handle(async (request) => {
    const user = await requireUser(request);
    await ensurePlayer(user);
    const body = (await request.json().catch(() => ({}))) as { gameId?: string; score?: number };
    const game = GAMES_BY_ID.get(body.gameId as GameId);
    const score = Number(body.score);
    if (!game) throw new HttpError(404, 'Unknown game');
    if (!Number.isInteger(score) || score < 0 || score > game.maxScore) throw new HttpError(400, 'Invalid score');

    const raw = gemsForScore(game.id, score);

    // Atomically award gems, respecting the daily earning cap.
    const res = await db.execute(sql`
        WITH cur AS (
            SELECT user_id, CASE WHEN earn_day = CURRENT_DATE THEN gems_earned_today ELSE 0 END AS today
            FROM players WHERE user_id = ${user.id} FOR UPDATE
        ), amt AS (
            SELECT user_id, today, GREATEST(0, LEAST(${raw}::int, ${DAILY_EARN_CAP}::int - today)) AS a FROM cur
        )
        UPDATE players p
        SET gems = p.gems + amt.a, gems_earned_today = amt.today + amt.a, earn_day = CURRENT_DATE
        FROM amt WHERE p.user_id = amt.user_id
        RETURNING amt.a AS awarded`);
    const awarded = Number(rowsOf(res)[0]?.awarded ?? 0);

    await db.insert(scores).values({ userId: user.id, gameId: game.id, score, gemsAwarded: awarded });
    if (awarded > 0) await db.insert(transactions).values({ userId: user.id, amount: awarded, reason: `play:${game.id}` });

    return json({ awarded, capped: awarded < raw, profile: await getProfile(user.id) });
});
