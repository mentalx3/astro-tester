import { sql } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { GAMES_BY_ID, type GameId } from '../../lib/catalog';
import { handle, HttpError, json, rowsOf } from '../../lib/server';

export const prerender = false;

export const GET = handle(async (request) => {
    const gameId = new URL(request.url).searchParams.get('game') as GameId;
    if (!GAMES_BY_ID.has(gameId)) throw new HttpError(404, 'Unknown game');

    const res = await db.execute(sql`
        SELECT p.display_name AS name, best.score,
               (SELECT item_id FROM equipped e WHERE e.user_id = p.user_id AND e.slot = 'avatar') AS avatar,
               (SELECT item_id FROM equipped e WHERE e.user_id = p.user_id AND e.slot = 'frame') AS frame,
               (SELECT item_id FROM equipped e WHERE e.user_id = p.user_id AND e.slot = 'nameColor') AS "nameColor"
        FROM (SELECT user_id, MAX(score) AS score FROM scores WHERE game_id = ${gameId} GROUP BY user_id) best
        JOIN players p ON p.user_id = best.user_id
        ORDER BY best.score DESC
        LIMIT 10`);
    return json({ entries: rowsOf(res).map((r) => ({ ...r, score: Number(r.score) })) });
});
