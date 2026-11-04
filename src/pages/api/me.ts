import { ensurePlayer, getProfile, handle, json, requireUser } from '../../lib/server';

export const prerender = false;

export const GET = handle(async (request) => {
    const user = await requireUser(request);
    await ensurePlayer(user);
    return json(await getProfile(user.id));
});
