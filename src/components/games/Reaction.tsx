import { useEffect, useRef, useState } from 'react';

const DURATION = 30;
type Target = { id: number; x: number; y: number; born: number; life: number };

export default function Reaction({ onFinish }: { onFinish: (score: number) => void }) {
    const [state, setState] = useState<'ready' | 'playing' | 'over'>('ready');
    const [targets, setTargets] = useState<Target[]>([]);
    const [hits, setHits] = useState(0);
    const [combo, setCombo] = useState(0);
    const [left, setLeft] = useState(DURATION);
    const [pops, setPops] = useState<{ id: number; x: number; y: number }[]>([]);
    const hitsRef = useRef(0);
    const idRef = useRef(0);

    useEffect(() => {
        if (state !== 'playing') return;
        const startedAt = Date.now();
        hitsRef.current = 0;
        const loop = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - startedAt) / 1000;
            setLeft(Math.max(0, Math.ceil(DURATION - elapsed)));
            if (elapsed >= DURATION) {
                clearInterval(loop);
                setTargets([]);
                setState('over');
                onFinish(hitsRef.current);
                return;
            }
            setTargets((ts) => {
                const alive = ts.filter((t) => now - t.born < t.life);
                if (alive.length < ts.length) setCombo(0);
                const want = 1 + Math.floor(elapsed / 8);
                if (alive.length < want && Math.random() < 0.5) {
                    alive.push({ id: ++idRef.current, x: 8 + Math.random() * 84, y: 10 + Math.random() * 80, born: now, life: Math.max(650, 1600 - elapsed * 30) });
                }
                return alive;
            });
        }, 60);
        return () => clearInterval(loop);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);

    const hit = (t: Target) => {
        setTargets((ts) => ts.filter((x) => x.id !== t.id));
        hitsRef.current++;
        setHits(hitsRef.current);
        setCombo((c) => c + 1);
        const pid = t.id;
        setPops((p) => [...p, { id: pid, x: t.x, y: t.y }]);
        setTimeout(() => setPops((p) => p.filter((q) => q.id !== pid)), 400);
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full max-w-[520px] font-display text-sm">
                <span>HITS <span className="text-cyan-300">{hits}</span></span>
                <span>COMBO <span className="text-fuchsia-300">x{combo}</span></span>
                <span>TIME <span className="text-cyan-300">{left}s</span></span>
            </div>
            <div
                className="relative w-full max-w-[520px] aspect-[4/3] rounded-xl border border-white/10 overflow-hidden select-none"
                style={{ background: 'radial-gradient(circle at 50% 40%, #1c1640, #07060f)' }}
                onPointerDown={(e) => e.target === e.currentTarget && state === 'playing' && setCombo(0)}
            >
                {targets.map((t) => {
                    const pct = Math.min(1, (Date.now() - t.born) / t.life);
                    return (
                        <button
                            key={t.id}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                hit(t);
                            }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full target-pulse"
                            style={{
                                left: `${t.x}%`,
                                top: `${t.y}%`,
                                width: 64,
                                height: 64,
                                background: 'radial-gradient(circle, #fff 0 18%, #f43f5e 19% 40%, #fff 41% 55%, #f43f5e 56%)',
                                boxShadow: '0 0 24px #f43f5e',
                                opacity: 1 - pct * 0.6,
                                transform: `translate(-50%,-50%) scale(${1 - pct * 0.45})`
                            }}
                            aria-label="Target"
                        />
                    );
                })}
                {pops.map((p) => (
                    <span key={p.id} className="absolute font-display text-cyan-300 pointer-events-none pop-up" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                        +1
                    </span>
                ))}
                {state === 'ready' && (
                    <button onClick={() => setState('playing')} className="absolute inset-0 grid place-items-center bg-black/40 font-display text-xl">
                        TAP TO START · {DURATION}s
                    </button>
                )}
            </div>
        </div>
    );
}
