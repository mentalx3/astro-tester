import { useCallback, useEffect, useState } from 'react';
import { getUser, handleAuthCallback, logout, onAuthChange, updateUser, type User } from '@netlify/identity';
import {
    CATALOG, DAILY_BONUS, DAILY_EARN_CAP, GAMES, GEM_PACKS, SLOT_LABELS, gemsForScore, getItem,
    type CosmeticItem, type GameId, type GameInfo, type Slot
} from '../lib/catalog';
import { api, type Profile } from './api';
import AuthModal from './AuthModal';
import { Avatar, Gem, PlayerName } from './Avatar';
import Snake from './games/Snake';
import Memory from './games/Memory';
import Reaction from './games/Reaction';

type Tab = 'arcade' | 'shop' | 'locker' | 'gems' | 'leaderboard';
const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'arcade', label: 'Arcade', icon: '🕹️' },
    { id: 'shop', label: 'Shop', icon: '🛍️' },
    { id: 'locker', label: 'Locker', icon: '🎒' },
    { id: 'gems', label: 'Get Gems', icon: '💎' },
    { id: 'leaderboard', label: 'Leaderboards', icon: '🏆' }
];

const RARITY_STYLE: Record<CosmeticItem['rarity'], string> = {
    common: 'text-zinc-300 border-zinc-500/40',
    rare: 'text-sky-300 border-sky-400/50',
    epic: 'text-fuchsia-300 border-fuchsia-400/50',
    legendary: 'text-amber-300 border-amber-400/60'
};

export default function ArcadeApp() {
    const [user, setUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [tab, setTabState] = useState<Tab>('arcade');
    const [authModal, setAuthModal] = useState<null | 'login' | 'signup'>(null);
    const [recovery, setRecovery] = useState(false);
    const [toast, setToast] = useState<{ text: string; ok?: boolean } | null>(null);
    const [playing, setPlaying] = useState<GameInfo | null>(null);
    const [paymentsEnabled, setPaymentsEnabled] = useState(false);

    const notify = useCallback((text: string, ok = true) => {
        setToast({ text, ok });
        setTimeout(() => setToast(null), 3200);
    }, []);

    const setTab = (t: Tab) => {
        setTabState(t);
        const url = new URL(location.href);
        url.searchParams.set('tab', t);
        url.searchParams.delete('purchase');
        history.replaceState(null, '', url);
    };

    const loadProfile = useCallback(async () => {
        try {
            setProfile(await api<Profile>('/api/me'));
        } catch {
            setProfile(null);
        }
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const t = params.get('tab') as Tab;
        if (TABS.some((x) => x.id === t)) setTabState(t);
        const purchase = params.get('purchase');
        if (purchase === 'success') notify('Payment received! Your gems will appear in a moment.');
        if (purchase === 'cancelled') notify('Checkout cancelled.', false);

        api<{ paymentsEnabled: boolean }>('/api/config').then((c) => setPaymentsEnabled(c.paymentsEnabled)).catch(() => {});

        (async () => {
            try {
                const result = await handleAuthCallback();
                if (result?.type === 'recovery') setRecovery(true);
                if (result?.type === 'confirmation') notify('Email confirmed — welcome to the arcade!');
            } catch {
                /* ignore malformed callbacks */
            }
            setUser(await getUser());
            setAuthReady(true);
        })();
        return onAuthChange((_e, u) => setUser(u));
    }, [notify]);

    useEffect(() => {
        if (user) loadProfile();
        else setProfile(null);
    }, [user, loadProfile]);

    // Refresh after a Stripe return so webhook-credited gems show up.
    useEffect(() => {
        if (!user || new URLSearchParams(location.search).get('purchase') !== 'success') return;
        const t = setTimeout(loadProfile, 3000);
        return () => clearTimeout(t);
    }, [user, loadProfile]);

    const requireLogin = () => {
        if (!user) {
            setAuthModal('signup');
            return false;
        }
        return true;
    };

    const claimDaily = async () => {
        if (!requireLogin()) return;
        try {
            const r = await api<{ awarded: number; profile: Profile }>('/api/daily', {});
            setProfile(r.profile);
            notify(`+${r.awarded} gems — daily bonus claimed!`);
        } catch (e) {
            notify((e as Error).message, false);
        }
    };

    const submitScore = async (game: GameInfo, score: number) => {
        if (!user) return { awarded: 0, guest: true };
        try {
            const r = await api<{ awarded: number; capped: boolean; profile: Profile }>('/api/scores', { gameId: game.id, score });
            setProfile(r.profile);
            return { awarded: r.awarded, capped: r.capped };
        } catch (e) {
            notify((e as Error).message, false);
            return { awarded: 0 };
        }
    };

    const buy = async (item: CosmeticItem) => {
        if (!requireLogin()) return;
        try {
            const r = await api<{ profile: Profile }>('/api/shop/buy', { itemId: item.id });
            setProfile(r.profile);
            notify(`Unlocked ${item.name}!`);
        } catch (e) {
            notify((e as Error).message, false);
        }
    };

    const equip = async (item: CosmeticItem) => {
        try {
            const r = await api<{ profile: Profile }>('/api/equip', { itemId: item.id });
            setProfile(r.profile);
            notify(`Equipped ${item.name}`);
        } catch (e) {
            notify((e as Error).message, false);
        }
    };

    const checkout = async (packId: string) => {
        if (!requireLogin()) return;
        try {
            const r = await api<{ url: string }>('/api/checkout', { packId });
            location.href = r.url;
        } catch (e) {
            notify((e as Error).message, false);
        }
    };

    return (
        <div className="min-h-screen">
            {/* Top bar */}
            <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0b0a1a]/80 backdrop-blur">
                <div className="flex items-center gap-3 max-w-6xl px-4 py-3 mx-auto">
                    <a href="/" className="font-display text-lg sm:text-2xl tracking-wide no-underline logo-glow">
                        PIXEL<span className="text-cyan-300">PALACE</span>
                    </a>
                    <div className="flex items-center gap-2 ml-auto sm:gap-3">
                        {user && profile && (
                            <>
                                <button onClick={() => setTab('gems')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-cyan-300/30 font-display text-sm hover:bg-white/10" title="Your gems">
                                    <Gem /> {profile.gems.toLocaleString()}
                                </button>
                                <button onClick={() => setTab('locker')} className="flex items-center gap-2" title="Your locker">
                                    <Avatar avatar={profile.equipped.avatar} frame={profile.equipped.frame} size={38} />
                                    <span className="hidden md:block max-w-[140px] text-sm"><PlayerName name={profile.displayName} color={profile.equipped.nameColor} /></span>
                                </button>
                                <button onClick={() => logout()} className="text-xs text-zinc-400 hover:text-white">Log out</button>
                            </>
                        )}
                        {authReady && !user && (
                            <>
                                <button onClick={() => setAuthModal('login')} className="px-3 py-1.5 text-sm text-zinc-300 hover:text-white">Log in</button>
                                <button onClick={() => setAuthModal('signup')} className="btn-primary !py-1.5 text-sm">Sign up</button>
                            </>
                        )}
                    </div>
                </div>
                {/* Tabs */}
                <nav className="max-w-6xl px-2 mx-auto overflow-x-auto" role="tablist">
                    <div className="flex gap-1 min-w-max">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                role="tab"
                                aria-selected={tab === t.id}
                                onClick={() => setTab(t.id)}
                                className={`relative px-4 py-3 text-sm font-semibold transition ${tab === t.id ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                            >
                                <span className="mr-1.5">{t.icon}</span>
                                {t.label}
                                {tab === t.id && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded bg-gradient-to-r from-cyan-300 to-fuchsia-400" />}
                            </button>
                        ))}
                    </div>
                </nav>
            </header>

            <main className="max-w-6xl px-4 py-8 mx-auto">
                {tab === 'arcade' && <ArcadeTab user={user} profile={profile} onPlay={setPlaying} onDaily={claimDaily} onSignup={() => setAuthModal('signup')} />}
                {tab === 'shop' && <ShopTab profile={profile} onBuy={buy} onEquip={equip} />}
                {tab === 'locker' && <LockerTab user={user} profile={profile} onEquip={equip} onLogin={() => setAuthModal('login')} goShop={() => setTab('shop')} />}
                {tab === 'gems' && <GemsTab profile={profile} paymentsEnabled={paymentsEnabled} onBuy={checkout} onDaily={claimDaily} goArcade={() => setTab('arcade')} />}
                {tab === 'leaderboard' && <LeaderboardTab />}
            </main>

            <footer className="py-10 text-xs text-center text-zinc-500">Pixel Palace · Play games, earn gems, look fabulous.</footer>

            {playing && (
                <GameModal
                    game={playing}
                    profile={profile}
                    loggedIn={!!user}
                    onClose={() => setPlaying(null)}
                    onSubmit={(score) => submitScore(playing, score)}
                    onSignup={() => {
                        setPlaying(null);
                        setAuthModal('signup');
                    }}
                />
            )}
            {authModal && <AuthModal initial={authModal} onClose={() => setAuthModal(null)} />}
            {recovery && <RecoveryModal onDone={() => { setRecovery(false); notify('Password updated.'); }} />}
            {toast && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold toast-in ${toast.ok ? 'bg-emerald-500 text-emerald-950' : 'bg-rose-500 text-rose-950'}`}>
                    {toast.text}
                </div>
            )}
        </div>
    );
}

// ---------------- Arcade ----------------

const GAME_ART: Record<GameId, string> = {
    snake: 'from-emerald-400/30 via-emerald-500/10 to-transparent',
    memory: 'from-amber-300/30 via-orange-500/10 to-transparent',
    reaction: 'from-rose-400/30 via-fuchsia-500/10 to-transparent'
};

function ArcadeTab({ user, profile, onPlay, onDaily, onSignup }: { user: User | null; profile: Profile | null; onPlay: (g: GameInfo) => void; onDaily: () => void; onSignup: () => void }) {
    return (
        <div className="space-y-10">
            <section className="relative overflow-hidden rounded-3xl hero p-8 sm:p-12">
                <div className="relative z-10 max-w-xl space-y-4">
                    <p className="font-display text-xs tracking-[0.3em] text-cyan-300">INSERT COIN · OR DON’T, IT’S FREE</p>
                    <h1 className="font-display text-4xl sm:text-6xl leading-[0.95]">Play. Earn gems.<br />Flex your style.</h1>
                    <p className="text-zinc-300">Three arcade classics, one shared wallet. Every run earns gems you can spend on avatars, frames, skins and more.</p>
                    <div className="flex flex-wrap gap-3 pt-2">
                        {!user && <button onClick={onSignup} className="btn-primary">Create free account · +100 <Gem /></button>}
                        {user && profile?.dailyAvailable && <button onClick={onDaily} className="btn-primary animate-pulse">Claim daily +{DAILY_BONUS} <Gem /></button>}
                        {user && profile && !profile.dailyAvailable && <span className="px-4 py-2 text-sm rounded-xl bg-white/5 text-zinc-400">Daily bonus claimed ✓</span>}
                    </div>
                </div>
                <div className="absolute right-[-40px] top-1/2 -translate-y-1/2 text-[220px] sm:text-[300px] opacity-20 select-none pointer-events-none rotate-12" aria-hidden>🕹️</div>
            </section>

            {user && profile && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                    <span>Gems earned from play today:</span>
                    <div className="h-2 w-48 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-300 to-fuchsia-400" style={{ width: `${(profile.gemsEarnedToday / DAILY_EARN_CAP) * 100}%` }} />
                    </div>
                    <span className="font-display text-zinc-200">{profile.gemsEarnedToday}/{DAILY_EARN_CAP}</span>
                </div>
            )}

            <section>
                <h2 className="mb-5 font-display text-2xl">Games</h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {GAMES.map((g) => (
                        <button key={g.id} onClick={() => onPlay(g)} className="group relative text-left rounded-2xl panel p-6 overflow-hidden transition hover:-translate-y-1 hover:border-white/25">
                            <div className={`absolute inset-0 bg-gradient-to-br ${GAME_ART[g.id]} opacity-80`} />
                            <div className="relative space-y-3">
                                <div className="text-6xl transition group-hover:scale-110 group-hover:-rotate-6 w-fit">{g.emoji}</div>
                                <h3 className="font-display text-xl">{g.name}</h3>
                                <p className="text-sm text-zinc-300">{g.tagline}</p>
                                <div className="flex items-center justify-between pt-2 text-xs text-zinc-400">
                                    <span>Up to {g.maxGemsPerRun} <Gem /> per run</span>
                                    <span className="px-3 py-1 rounded-full bg-white/10 text-white font-semibold group-hover:bg-cyan-300 group-hover:text-black transition">PLAY ▶</span>
                                </div>
                            </div>
                        </button>
                    ))}
                    <div className="grid place-items-center rounded-2xl border-2 border-dashed border-white/10 p-6 text-center text-zinc-500 min-h-[220px]">
                        <div>
                            <div className="text-4xl mb-2">🚧</div>
                            <p className="font-display">More games soon</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function GameModal({ game, profile, loggedIn, onClose, onSubmit, onSignup }: {
    game: GameInfo; profile: Profile | null; loggedIn: boolean; onClose: () => void;
    onSubmit: (score: number) => Promise<{ awarded: number; capped?: boolean; guest?: boolean }>; onSignup: () => void;
}) {
    const [runKey, setRunKey] = useState(0);
    const [result, setResult] = useState<null | { score: number; awarded?: number; capped?: boolean; pending: boolean }>(null);

    const finish = async (score: number) => {
        setResult({ score, pending: true });
        const r = await onSubmit(score);
        setResult({ score, awarded: r.awarded, capped: r.capped, pending: false });
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const props = { onFinish: finish };
    return (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/80 backdrop-blur-sm">
            <div className="flex flex-col items-center max-w-2xl gap-5 px-4 py-6 mx-auto">
                <div className="flex items-center w-full">
                    <h2 className="font-display text-2xl">{game.emoji} {game.name}</h2>
                    <button onClick={onClose} className="ml-auto px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20">✕ Exit</button>
                </div>
                <div className="relative w-full p-4 rounded-2xl panel">
                    {game.id === 'snake' && <Snake key={runKey} skin={getItem(profile?.equipped.snakeSkin)} {...props} />}
                    {game.id === 'memory' && <Memory key={runKey} cardBack={getItem(profile?.equipped.cardBack)} {...props} />}
                    {game.id === 'reaction' && <Reaction key={runKey} {...props} />}

                    {result && (
                        <div className="absolute inset-0 grid place-items-center rounded-2xl bg-[#0b0a1a]/90 backdrop-blur-sm">
                            <div className="space-y-3 text-center">
                                <p className="font-display text-sm tracking-widest text-zinc-400">GAME OVER</p>
                                <p className="font-display text-6xl">{result.score}</p>
                                <p className="text-zinc-400">{game.scoreLabel}</p>
                                {result.pending && <p className="text-zinc-400">Saving…</p>}
                                {!result.pending && loggedIn && (
                                    <p className="font-display text-xl text-cyan-300">
                                        +{result.awarded ?? 0} <Gem />
                                        {result.capped && <span className="block mt-1 text-xs text-zinc-400 font-sans">Daily earning cap reached</span>}
                                    </p>
                                )}
                                {!result.pending && !loggedIn && (
                                    <div className="space-y-2">
                                        <p className="text-sm text-zinc-300">That run was worth <b className="text-cyan-300">{gemsForScore(game.id, result.score)} gems</b>.</p>
                                        <button onClick={onSignup} className="btn-primary">Sign up to keep your gems</button>
                                    </div>
                                )}
                                <div className="flex justify-center gap-3 pt-2">
                                    <button onClick={() => { setResult(null); setRunKey((k) => k + 1); }} className="btn-primary">Play again</button>
                                    <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20">Back to arcade</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------------- Shop ----------------

function ItemPreview({ item }: { item: CosmeticItem }) {
    switch (item.slot) {
        case 'avatar':
            return <Avatar avatar={item.id} size={72} />;
        case 'frame':
            return <Avatar frame={item.id} size={72} />;
        case 'nameColor':
            return <span className="text-2xl"><PlayerName name="Player" color={item.id} /></span>;
        case 'snakeSkin':
            return (
                <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <span key={i} className="w-5 h-5 rounded" style={{ background: i === 4 ? item.accent : item.value, boxShadow: `0 0 10px ${item.value}88`, opacity: i === 4 ? 1 : 0.55 + i * 0.1 }} />
                    ))}
                </div>
            );
        case 'cardBack':
            return (
                <span className="block w-14 h-20 rounded-md border-2 -rotate-6" style={{ borderColor: item.accent, background: `repeating-linear-gradient(45deg, ${item.value} 0 6px, color-mix(in oklab, ${item.value} 70%, ${item.accent}) 6px 12px)` }} />
            );
    }
}

function ItemCard({ item, profile, onBuy, onEquip }: { item: CosmeticItem; profile: Profile | null; onBuy?: (i: CosmeticItem) => void; onEquip: (i: CosmeticItem) => void }) {
    const owned = profile?.owned.includes(item.id);
    const isEquipped = profile?.equipped[item.slot] === item.id;
    const canAfford = (profile?.gems ?? 0) >= item.price;
    return (
        <div className={`flex flex-col rounded-2xl panel overflow-hidden border ${RARITY_STYLE[item.rarity].split(' ')[1]}`}>
            <div className="grid place-items-center h-32 bg-gradient-to-b from-white/[0.06] to-transparent">
                <ItemPreview item={item} />
            </div>
            <div className="flex flex-col gap-1 p-4 grow">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${RARITY_STYLE[item.rarity].split(' ')[0]}`}>{item.rarity} · {SLOT_LABELS[item.slot]}</span>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-xs text-zinc-400 grow">{item.description}</p>
                <div className="pt-3">
                    {isEquipped ? (
                        <span className="block w-full py-2 text-sm text-center rounded-lg bg-emerald-400/15 text-emerald-300">Equipped ✓</span>
                    ) : owned ? (
                        <button onClick={() => onEquip(item)} className="w-full py-2 text-sm font-semibold rounded-lg bg-white/10 hover:bg-white/20">Equip</button>
                    ) : onBuy ? (
                        <button
                            onClick={() => onBuy(item)}
                            disabled={!!profile && !canAfford}
                            className="flex items-center justify-center w-full gap-1.5 py-2 text-sm font-display rounded-lg bg-cyan-300 text-black hover:bg-cyan-200 disabled:bg-white/10 disabled:text-zinc-500"
                        >
                            <Gem /> {item.price}
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function ShopTab({ profile, onBuy, onEquip }: { profile: Profile | null; onBuy: (i: CosmeticItem) => void; onEquip: (i: CosmeticItem) => void }) {
    const [filter, setFilter] = useState<Slot | 'all'>('all');
    const items = CATALOG.filter((i) => i.price > 0 && (filter === 'all' || i.slot === filter));
    const featured = CATALOG.filter((i) => i.rarity === 'legendary');
    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="font-display text-4xl">Item Shop</h1>
                    <p className="text-zinc-400">Spend gems on cosmetics. They show up in games and on the leaderboards.</p>
                </div>
                {profile && <div className="flex items-center gap-2 font-display text-2xl"><Gem /> {profile.gems.toLocaleString()}</div>}
            </div>

            <section className="grid gap-4 sm:grid-cols-2">
                {featured.map((f) => (
                    <div key={f.id} className="relative flex items-center gap-6 p-6 overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-fuchsia-500/10 to-transparent">
                        <div className="shrink-0"><ItemPreview item={f} /></div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold tracking-widest text-amber-300">★ FEATURED LEGENDARY</span>
                            <h3 className="font-display text-xl">{f.name}</h3>
                            <p className="text-sm text-zinc-300">{f.description}</p>
                            {profile?.owned.includes(f.id) ? (
                                <p className="text-sm text-emerald-300">Owned</p>
                            ) : (
                                <button onClick={() => onBuy(f)} className="mt-2 btn-primary !py-1.5 text-sm"><Gem /> {f.price}</button>
                            )}
                        </div>
                    </div>
                ))}
            </section>

            <div className="flex flex-wrap gap-2">
                {(['all', ...Object.keys(SLOT_LABELS)] as (Slot | 'all')[]).map((s) => (
                    <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full text-sm ${filter === s ? 'bg-white text-black' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}>
                        {s === 'all' ? 'All' : SLOT_LABELS[s]}
                    </button>
                ))}
            </div>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {items.map((i) => <ItemCard key={i.id} item={i} profile={profile} onBuy={onBuy} onEquip={onEquip} />)}
            </div>
        </div>
    );
}

// ---------------- Locker ----------------

function LockerTab({ user, profile, onEquip, onLogin, goShop }: { user: User | null; profile: Profile | null; onEquip: (i: CosmeticItem) => void; onLogin: () => void; goShop: () => void }) {
    if (!user) return <Gate text="Log in to see your locker." action="Log in" onClick={onLogin} />;
    if (!profile) return <p className="text-zinc-400">Loading your locker…</p>;
    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-6 p-6 rounded-3xl panel">
                <Avatar avatar={profile.equipped.avatar} frame={profile.equipped.frame} size={96} />
                <div>
                    <p className="text-xs tracking-widest text-zinc-400">PLAYER CARD</p>
                    <p className="text-3xl"><PlayerName name={profile.displayName} color={profile.equipped.nameColor} /></p>
                    <p className="text-sm text-zinc-400">{profile.owned.length} of {CATALOG.length} items collected</p>
                </div>
                <button onClick={goShop} className="ml-auto btn-primary">Visit shop</button>
            </div>
            {(Object.keys(SLOT_LABELS) as Slot[]).map((slot) => {
                const items = CATALOG.filter((i) => i.slot === slot && profile.owned.includes(i.id));
                return (
                    <section key={slot}>
                        <h2 className="mb-3 font-display text-lg">{SLOT_LABELS[slot]}</h2>
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                            {items.map((i) => <ItemCard key={i.id} item={i} profile={profile} onEquip={onEquip} />)}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

// ---------------- Gems ----------------

function GemsTab({ profile, paymentsEnabled, onBuy, onDaily, goArcade }: { profile: Profile | null; paymentsEnabled: boolean; onBuy: (id: string) => void; onDaily: () => void; goArcade: () => void }) {
    return (
        <div className="space-y-10">
            <div>
                <h1 className="font-display text-4xl">Get Gems</h1>
                <p className="text-zinc-400">Gems are the Pixel Palace premium currency. Earn them free or grab a pack.</p>
            </div>

            <section className="grid gap-4 sm:grid-cols-2">
                <div className="p-6 rounded-2xl panel space-y-3">
                    <div className="text-4xl">🎁</div>
                    <h3 className="font-display text-xl">Daily bonus</h3>
                    <p className="text-sm text-zinc-400">Log in every day for {DAILY_BONUS} free gems.</p>
                    <button onClick={onDaily} disabled={!!profile && !profile.dailyAvailable} className="btn-primary disabled:opacity-40">
                        {profile && !profile.dailyAvailable ? 'Claimed today ✓' : `Claim +${DAILY_BONUS}`}
                    </button>
                </div>
                <div className="p-6 rounded-2xl panel space-y-3">
                    <div className="text-4xl">🕹️</div>
                    <h3 className="font-display text-xl">Play to earn</h3>
                    <p className="text-sm text-zinc-400">Every run pays out based on your score — up to {DAILY_EARN_CAP} gems per day.</p>
                    <button onClick={goArcade} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold">Go play</button>
                </div>
            </section>

            <section>
                <h2 className="mb-4 font-display text-2xl">Gem packs</h2>
                {!paymentsEnabled && <p className="mb-4 text-sm text-amber-300/80">Gem packs are coming soon — purchases aren’t open yet.</p>}
                <div className="grid gap-5 sm:grid-cols-3">
                    {GEM_PACKS.map((p, idx) => (
                        <div key={p.id} className={`relative flex flex-col items-center gap-3 p-6 text-center rounded-2xl panel ${p.badge ? 'border-cyan-300/40' : ''}`}>
                            {p.badge && <span className="absolute -top-3 px-3 py-0.5 text-[10px] font-bold tracking-widest rounded-full bg-fuchsia-400 text-black">{p.badge.toUpperCase()}</span>}
                            <div className="flex -space-x-3 text-5xl" aria-hidden>
                                {Array.from({ length: idx + 1 }).map((_, i) => <Gem key={i} className="drop-shadow-[0_0_12px_#22d3ee]" />)}
                            </div>
                            <h3 className="font-display text-xl">{p.name}</h3>
                            <p className="font-display text-3xl">{(p.gems + p.bonus).toLocaleString()}</p>
                            {p.bonus > 0 && <p className="text-xs text-emerald-300">includes +{p.bonus} bonus</p>}
                            <button onClick={() => onBuy(p.id)} disabled={!paymentsEnabled} className="w-full mt-auto btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                                ${(p.priceCents / 100).toFixed(2)}
                            </button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

// ---------------- Leaderboard ----------------

interface Entry { name: string; score: number; avatar?: string; frame?: string; nameColor?: string }

function LeaderboardTab() {
    const [game, setGame] = useState<GameId>('snake');
    const [entries, setEntries] = useState<Entry[] | null>(null);
    useEffect(() => {
        setEntries(null);
        api<{ entries: Entry[] }>(`/api/leaderboard?game=${game}`).then((r) => setEntries(r.entries)).catch(() => setEntries([]));
    }, [game]);
    const info = GAMES.find((g) => g.id === game)!;
    return (
        <div className="space-y-6">
            <h1 className="font-display text-4xl">Leaderboards</h1>
            <div className="flex flex-wrap gap-2">
                {GAMES.map((g) => (
                    <button key={g.id} onClick={() => setGame(g.id)} className={`px-4 py-2 rounded-full text-sm font-semibold ${game === g.id ? 'bg-white text-black' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}>
                        {g.emoji} {g.name}
                    </button>
                ))}
            </div>
            <div className="overflow-hidden rounded-2xl panel">
                {entries === null && <p className="p-6 text-zinc-400">Loading…</p>}
                {entries?.length === 0 && <p className="p-6 text-zinc-400">No scores yet. Be the first legend!</p>}
                {entries?.map((e, i) => (
                    <div key={i} className={`flex items-center gap-4 px-5 py-3 ${i % 2 ? 'bg-white/[0.02]' : ''}`}>
                        <span className={`w-8 font-display text-lg ${i === 0 ? 'text-amber-300' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-orange-400' : 'text-zinc-500'}`}>#{i + 1}</span>
                        <Avatar avatar={e.avatar} frame={e.frame} size={36} />
                        <span className="min-w-0 grow"><PlayerName name={e.name} color={e.nameColor} /></span>
                        <span className="font-display">{e.score} <span className="text-xs text-zinc-500 font-sans">{info.scoreLabel}</span></span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------------- Misc ----------------

function Gate({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
    return (
        <div className="grid place-items-center py-24 text-center">
            <div className="space-y-4">
                <div className="text-6xl">🔒</div>
                <p className="text-zinc-300">{text}</p>
                <button onClick={onClick} className="btn-primary">{action}</button>
            </div>
        </div>
    );
}

function RecoveryModal({ onDone }: { onDone: () => void }) {
    const [pw, setPw] = useState('');
    const [err, setErr] = useState('');
    return (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70">
            <form
                className="w-full max-w-sm p-6 space-y-4 rounded-2xl panel"
                onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                        await updateUser({ password: pw });
                        onDone();
                    } catch (x) {
                        setErr((x as Error).message);
                    }
                }}
            >
                <h2 className="font-display text-xl">Choose a new password</h2>
                <input type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} className="input" />
                {err && <p className="text-sm text-rose-300">{err}</p>}
                <button className="w-full btn-primary">Save password</button>
            </form>
        </div>
    );
}
