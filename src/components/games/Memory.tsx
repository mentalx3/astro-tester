import { useEffect, useMemo, useState } from 'react';
import type { CosmeticItem } from '../../lib/catalog';

const FACES = ['🍒', '🚀', '🌙', '⚡', '🎲', '🍄', '💎', '🔥'];

function shuffle<T>(a: T[]): T[] {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
}

export function memoryScore(moves: number, seconds: number) {
    return Math.max(50, Math.min(1000, 1000 - Math.max(0, moves - 8) * 25 - seconds * 4));
}

export default function Memory({ cardBack, onFinish }: { cardBack?: CosmeticItem; onFinish: (score: number) => void }) {
    const deck = useMemo(() => shuffle([...FACES, ...FACES]).map((face, id) => ({ id, face })), []);
    const [flipped, setFlipped] = useState<number[]>([]);
    const [matched, setMatched] = useState<Set<string>>(new Set());
    const [moves, setMoves] = useState(0);
    const [start, setStart] = useState<number | null>(null);
    const [now, setNow] = useState(Date.now());
    const [done, setDone] = useState(false);

    const seconds = start ? Math.floor((now - start) / 1000) : 0;

    useEffect(() => {
        if (!start || done) return;
        const t = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(t);
    }, [start, done]);

    const flip = (i: number) => {
        if (done || flipped.length === 2 || flipped.includes(i) || matched.has(deck[i].face)) return;
        if (!start) setStart(Date.now());
        const next = [...flipped, i];
        setFlipped(next);
        if (next.length === 2) {
            const m = moves + 1;
            setMoves(m);
            const [a, b] = next;
            if (deck[a].face === deck[b].face) {
                const nm = new Set(matched).add(deck[a].face);
                setMatched(nm);
                setFlipped([]);
                if (nm.size === FACES.length) {
                    setDone(true);
                    const secs = Math.floor((Date.now() - (start ?? Date.now())) / 1000);
                    onFinish(memoryScore(m, secs));
                }
            } else setTimeout(() => setFlipped([]), 700);
        }
    };

    const back = cardBack?.value ?? '#1e3a8a';
    const accent = cardBack?.accent ?? '#3b82f6';

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full max-w-[440px] font-display text-sm">
                <span>MOVES <span className="text-amber-300">{moves}</span></span>
                <span>TIME <span className="text-amber-300">{seconds}s</span></span>
                <span>PAIRS <span className="text-amber-300">{matched.size}/{FACES.length}</span></span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-[440px]">
                {deck.map((card, i) => {
                    const up = flipped.includes(i) || matched.has(card.face);
                    return (
                        <button key={card.id} onClick={() => flip(i)} className="aspect-[3/4] [perspective:600px]" aria-label={up ? card.face : 'Hidden card'}>
                            <div className={`relative w-full h-full transition-transform duration-300 [transform-style:preserve-3d] ${up ? '[transform:rotateY(180deg)]' : ''}`}>
                                <div
                                    className="absolute inset-0 rounded-lg border-2 [backface-visibility:hidden]"
                                    style={{
                                        borderColor: accent,
                                        background: `repeating-linear-gradient(45deg, ${back} 0 8px, color-mix(in oklab, ${back} 70%, ${accent}) 8px 16px)`
                                    }}
                                />
                                <div
                                    className={`absolute inset-0 grid place-items-center rounded-lg text-3xl sm:text-4xl bg-zinc-100 [backface-visibility:hidden] [transform:rotateY(180deg)] ${matched.has(card.face) ? 'ring-4 ring-emerald-400/70' : ''}`}
                                >
                                    {card.face}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
