import { useEffect, useRef, useState } from 'react';
import type { CosmeticItem } from '../../lib/catalog';

const GRID = 20;
type Pt = { x: number; y: number };

export default function Snake({ skin, onFinish }: { skin?: CosmeticItem; onFinish: (score: number) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dirRef = useRef<Pt>({ x: 1, y: 0 });
    const queued = useRef<Pt[]>([]);
    const [score, setScore] = useState(0);
    const [state, setState] = useState<'ready' | 'playing' | 'over'>('ready');
    const body = skin?.value ?? '#4ade80';
    const head = skin?.accent ?? '#16a34a';

    const turn = (d: Pt) => {
        const last = queued.current[queued.current.length - 1] ?? dirRef.current;
        if (last.x + d.x === 0 && last.y + d.y === 0) return;
        if (last.x === d.x && last.y === d.y) return;
        if (queued.current.length < 3) queued.current.push(d);
    };

    useEffect(() => {
        const keys: Record<string, Pt> = {
            ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
            ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }
        };
        const onKey = (e: KeyboardEvent) => {
            const d = keys[e.key];
            if (d) {
                e.preventDefault();
                if (state === 'ready') setState('playing');
                turn(d);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [state]);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const size = canvas.width / GRID;
        let snake: Pt[] = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
        let food = spawn(snake);
        let eaten = 0;
        let timer: number | undefined;
        dirRef.current = { x: 1, y: 0 };
        queued.current = [];

        function spawn(s: Pt[]): Pt {
            let p: Pt;
            do p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
            while (s.some((q) => q.x === p.x && q.y === p.y));
            return p;
        }

        function draw() {
            ctx.fillStyle = '#0b0a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            for (let i = 0; i <= GRID; i++) {
                ctx.beginPath(); ctx.moveTo(i * size, 0); ctx.lineTo(i * size, canvas.height); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i * size); ctx.lineTo(canvas.width, i * size); ctx.stroke();
            }
            ctx.shadowBlur = 16;
            ctx.shadowColor = '#f43f5e';
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size * 0.36, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowColor = body;
            snake.forEach((p, i) => {
                ctx.fillStyle = i === 0 ? head : body;
                ctx.globalAlpha = i === 0 ? 1 : Math.max(0.45, 1 - i / (snake.length + 8));
                const pad = i === 0 ? 1 : 2;
                ctx.beginPath();
                ctx.roundRect(p.x * size + pad, p.y * size + pad, size - pad * 2, size - pad * 2, 5);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }

        function tick() {
            if (queued.current.length) dirRef.current = queued.current.shift()!;
            const d = dirRef.current;
            const next = { x: snake[0].x + d.x, y: snake[0].y + d.y };
            const hit = next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID || snake.some((p) => p.x === next.x && p.y === next.y);
            if (hit) {
                setState('over');
                onFinish(eaten);
                return;
            }
            snake = [next, ...snake];
            if (next.x === food.x && next.y === food.y) {
                eaten++;
                setScore(eaten);
                food = spawn(snake);
            } else snake.pop();
            draw();
            timer = window.setTimeout(tick, Math.max(55, 130 - eaten * 3));
        }

        draw();
        if (state === 'playing') timer = window.setTimeout(tick, 130);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state === 'playing']);

    const touch = useRef<Pt | null>(null);

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full max-w-[420px] font-display text-sm">
                <span>APPLES <span className="text-rose-400">{score}</span></span>
                <span className="text-zinc-400">Arrows / WASD / swipe</span>
            </div>
            <div
                className="relative"
                onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
                onTouchEnd={(e) => {
                    if (!touch.current) return;
                    const dx = e.changedTouches[0].clientX - touch.current.x;
                    const dy = e.changedTouches[0].clientY - touch.current.y;
                    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
                    if (state === 'ready') setState('playing');
                    turn(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) });
                }}
            >
                <canvas ref={canvasRef} width={420} height={420} className="rounded-xl border border-white/10 w-full max-w-[420px] aspect-square touch-none" />
                {state === 'ready' && (
                    <button onClick={() => setState('playing')} className="absolute inset-0 grid place-items-center bg-black/50 rounded-xl font-display text-xl">
                        PRESS TO START
                    </button>
                )}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:hidden">
                <span />
                <Pad onClick={() => turn({ x: 0, y: -1 })}>▲</Pad>
                <span />
                <Pad onClick={() => turn({ x: -1, y: 0 })}>◀</Pad>
                <Pad onClick={() => turn({ x: 0, y: 1 })}>▼</Pad>
                <Pad onClick={() => turn({ x: 1, y: 0 })}>▶</Pad>
            </div>
        </div>
    );
}

function Pad(props: { onClick: () => void; children: React.ReactNode }) {
    return <button onClick={props.onClick} className="w-14 h-14 rounded-lg bg-white/10 active:bg-white/20 text-xl">{props.children}</button>;
}
