import { pgTable, text, integer, timestamp, serial, primaryKey, index, date } from 'drizzle-orm/pg-core';

// One row per Identity user. Gem balance lives here.
export const players = pgTable('players', {
    userId: text('user_id').primaryKey(),
    displayName: text('display_name').notNull(),
    gems: integer().notNull().default(0),
    lastDailyClaim: date('last_daily_claim'),
    gemsEarnedToday: integer('gems_earned_today').notNull().default(0),
    earnDay: date('earn_day'),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// Cosmetics a player owns.
export const inventory = pgTable(
    'inventory',
    {
        userId: text('user_id')
            .notNull()
            .references(() => players.userId, { onDelete: 'cascade' }),
        itemId: text('item_id').notNull(),
        acquiredAt: timestamp('acquired_at').defaultNow().notNull()
    },
    (t) => [primaryKey({ columns: [t.userId, t.itemId] })]
);

// Which owned cosmetic is equipped in each slot.
export const equipped = pgTable(
    'equipped',
    {
        userId: text('user_id')
            .notNull()
            .references(() => players.userId, { onDelete: 'cascade' }),
        slot: text().notNull(),
        itemId: text('item_id').notNull()
    },
    (t) => [primaryKey({ columns: [t.userId, t.slot] })]
);

// Game results, used for leaderboards and gem rewards.
export const scores = pgTable(
    'scores',
    {
        id: serial().primaryKey(),
        userId: text('user_id')
            .notNull()
            .references(() => players.userId, { onDelete: 'cascade' }),
        gameId: text('game_id').notNull(),
        score: integer().notNull(),
        gemsAwarded: integer('gems_awarded').notNull().default(0),
        createdAt: timestamp('created_at').defaultNow().notNull()
    },
    (t) => [index('scores_game_score_idx').on(t.gameId, t.score)]
);

// Ledger of every gem change (earned, spent, purchased).
export const transactions = pgTable('transactions', {
    id: serial().primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => players.userId, { onDelete: 'cascade' }),
    amount: integer().notNull(),
    reason: text().notNull(),
    reference: text().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});
