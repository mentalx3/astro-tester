import type { Slot } from '../lib/catalog';

export interface Profile {
    displayName: string;
    gems: number;
    dailyAvailable: boolean;
    gemsEarnedToday: number;
    owned: string[];
    equipped: Partial<Record<Slot, string>>;
}

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.error ?? 'Request failed');
    return data as T;
}
