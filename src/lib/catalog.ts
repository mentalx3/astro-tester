// Shared between the browser and the API so prices can't be spoofed.

export type Slot = 'avatar' | 'frame' | 'nameColor' | 'snakeSkin' | 'cardBack';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CosmeticItem {
    id: string;
    name: string;
    slot: Slot;
    price: number;
    rarity: Rarity;
    /** Visual payload — meaning depends on slot. */
    value: string;
    /** Optional second colour (gradients, snake head, etc). */
    accent?: string;
    description: string;
}

export const SLOT_LABELS: Record<Slot, string> = {
    avatar: 'Avatar',
    frame: 'Avatar Frame',
    nameColor: 'Name Color',
    snakeSkin: 'Snake Skin',
    cardBack: 'Card Back'
};

/** Free items every player starts with. */
export const DEFAULT_ITEMS: Record<Slot, string> = {
    avatar: 'avatar-pixel',
    frame: 'frame-basic',
    nameColor: 'name-white',
    snakeSkin: 'snake-classic',
    cardBack: 'cards-classic'
};

export const CATALOG: CosmeticItem[] = [
    // Avatars
    { id: 'avatar-pixel', name: 'Pixel Pal', slot: 'avatar', price: 0, rarity: 'common', value: '👾', description: 'The starter companion.' },
    { id: 'avatar-fox', name: 'Fox Runner', slot: 'avatar', price: 120, rarity: 'common', value: '🦊', description: 'Quick, clever, a little sly.' },
    { id: 'avatar-robot', name: 'Unit 7', slot: 'avatar', price: 200, rarity: 'rare', value: '🤖', description: 'Beep boop. High score detected.' },
    { id: 'avatar-dragon', name: 'Ember Wyrm', slot: 'avatar', price: 450, rarity: 'epic', value: '🐉', description: 'Hoards gems. Obviously.' },
    { id: 'avatar-crown', name: 'Arcade Royalty', slot: 'avatar', price: 1200, rarity: 'legendary', value: '👑', description: 'For the undisputed champion.' },

    // Frames
    { id: 'frame-basic', name: 'Plain Steel', slot: 'frame', price: 0, rarity: 'common', value: '#3f3f56', description: 'Gets the job done.' },
    { id: 'frame-neon', name: 'Neon Tube', slot: 'frame', price: 150, rarity: 'rare', value: '#22d3ee', accent: '#a855f7', description: 'Buzzing cyan-to-violet glow.' },
    { id: 'frame-sunset', name: 'Sunset Strip', slot: 'frame', price: 300, rarity: 'epic', value: '#fb923c', accent: '#ec4899', description: 'Warm gradient, cool attitude.' },
    { id: 'frame-gold', name: 'Gilded Halo', slot: 'frame', price: 900, rarity: 'legendary', value: '#facc15', accent: '#f59e0b', description: 'Solid gold. Probably.' },

    // Name colours
    { id: 'name-white', name: 'Default', slot: 'nameColor', price: 0, rarity: 'common', value: '#f4f4f5', description: 'Classic white.' },
    { id: 'name-mint', name: 'Mint', slot: 'nameColor', price: 80, rarity: 'common', value: '#6ee7b7', description: 'Fresh on the leaderboard.' },
    { id: 'name-hotpink', name: 'Hot Pink', slot: 'nameColor', price: 160, rarity: 'rare', value: '#f472b6', description: 'Impossible to miss.' },
    { id: 'name-plasma', name: 'Plasma', slot: 'nameColor', price: 500, rarity: 'epic', value: '#818cf8', accent: '#22d3ee', description: 'Shimmering gradient text.' },

    // Snake skins
    { id: 'snake-classic', name: 'Classic Green', slot: 'snakeSkin', price: 0, rarity: 'common', value: '#4ade80', accent: '#16a34a', description: 'Old-school serpent.' },
    { id: 'snake-lava', name: 'Lava Flow', slot: 'snakeSkin', price: 180, rarity: 'rare', value: '#f97316', accent: '#dc2626', description: 'Hot to the touch.' },
    { id: 'snake-ice', name: 'Glacier', slot: 'snakeSkin', price: 180, rarity: 'rare', value: '#7dd3fc', accent: '#e0f2fe', description: 'Cool, calm, collected.' },
    { id: 'snake-galaxy', name: 'Galaxy Coil', slot: 'snakeSkin', price: 650, rarity: 'legendary', value: '#c084fc', accent: '#facc15', description: 'Swallowed a few stars.' },

    // Card backs
    { id: 'cards-classic', name: 'Classic Blue', slot: 'cardBack', price: 0, rarity: 'common', value: '#1e3a8a', accent: '#3b82f6', description: 'A trusty deck.' },
    { id: 'cards-crimson', name: 'Crimson Velvet', slot: 'cardBack', price: 140, rarity: 'rare', value: '#7f1d1d', accent: '#ef4444', description: 'High-roller vibes.' },
    { id: 'cards-circuit', name: 'Circuit Board', slot: 'cardBack', price: 350, rarity: 'epic', value: '#064e3b', accent: '#34d399', description: 'Matched by machines.' }
];

export const CATALOG_BY_ID = new Map(CATALOG.map((i) => [i.id, i]));

export function getItem(id: string | undefined | null): CosmeticItem | undefined {
    return id ? CATALOG_BY_ID.get(id) : undefined;
}

// ---------- Games & rewards ----------

export type GameId = 'snake' | 'memory' | 'reaction';

export interface GameInfo {
    id: GameId;
    name: string;
    tagline: string;
    emoji: string;
    /** Highest plausible score — anything above is rejected. */
    maxScore: number;
    /** Gems per point (fractional), capped per run. */
    gemsPerPoint: number;
    maxGemsPerRun: number;
    scoreLabel: string;
}

export const GAMES: GameInfo[] = [
    { id: 'snake', name: 'Neon Serpent', tagline: 'Eat, grow, don’t bite your tail.', emoji: '🐍', maxScore: 400, gemsPerPoint: 0.5, maxGemsPerRun: 25, scoreLabel: 'apples' },
    { id: 'memory', name: 'Mind Match', tagline: 'Flip cards, find pairs, beat the clock.', emoji: '🃏', maxScore: 1000, gemsPerPoint: 0.03, maxGemsPerRun: 25, scoreLabel: 'points' },
    { id: 'reaction', name: 'Reflex Rush', tagline: 'Smash targets before they vanish.', emoji: '🎯', maxScore: 200, gemsPerPoint: 0.25, maxGemsPerRun: 25, scoreLabel: 'hits' }
];

export const GAMES_BY_ID = new Map(GAMES.map((g) => [g.id, g]));

export function gemsForScore(gameId: GameId, score: number): number {
    const g = GAMES_BY_ID.get(gameId);
    if (!g) return 0;
    return Math.min(g.maxGemsPerRun, Math.floor(score * g.gemsPerPoint));
}

export const DAILY_BONUS = 50;
export const DAILY_EARN_CAP = 250;
export const STARTING_GEMS = 100;

// ---------- Gem packs (real money) ----------

export interface GemPack {
    id: string;
    name: string;
    gems: number;
    bonus: number;
    priceCents: number;
    badge?: string;
}

export const GEM_PACKS: GemPack[] = [
    { id: 'pack-pouch', name: 'Pouch', gems: 250, bonus: 0, priceCents: 199 },
    { id: 'pack-chest', name: 'Chest', gems: 700, bonus: 100, priceCents: 499, badge: 'Popular' },
    { id: 'pack-vault', name: 'Vault', gems: 1500, bonus: 400, priceCents: 999, badge: 'Best value' }
];

export const GEM_PACKS_BY_ID = new Map(GEM_PACKS.map((p) => [p.id, p]));
