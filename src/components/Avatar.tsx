import { getItem } from '../lib/catalog';

export function Avatar({ avatar, frame, size = 44 }: { avatar?: string; frame?: string; size?: number }) {
    const a = getItem(avatar) ?? getItem('avatar-pixel')!;
    const f = getItem(frame) ?? getItem('frame-basic')!;
    const ring = f.accent ? `conic-gradient(from 0deg, ${f.value}, ${f.accent}, ${f.value})` : f.value;
    return (
        <span className="inline-grid place-items-center rounded-full shrink-0" style={{ width: size, height: size, background: ring, padding: 3, boxShadow: f.accent ? `0 0 14px ${f.value}66` : undefined }}>
            <span className="grid place-items-center w-full h-full rounded-full bg-[#120f26]" style={{ fontSize: size * 0.5 }}>
                {a.value}
            </span>
        </span>
    );
}

export function PlayerName({ name, color }: { name: string; color?: string }) {
    const c = getItem(color) ?? getItem('name-white')!;
    const style = c.accent
        ? { backgroundImage: `linear-gradient(90deg, ${c.value}, ${c.accent})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
        : { color: c.value };
    return <span className="font-semibold truncate" style={style}>{name}</span>;
}

export function Gem({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={`inline-block w-[1em] h-[1em] ${className}`} aria-hidden>
            <defs>
                <linearGradient id="gemg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#a5f3fc" />
                    <stop offset="0.5" stopColor="#22d3ee" />
                    <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
            </defs>
            <path d="M6 3h12l4 6-10 12L2 9z" fill="url(#gemg)" />
            <path d="M2 9h20M8 3l4 6 4-6M12 9v12" stroke="#0b0a1a" strokeOpacity=".35" strokeWidth="1" fill="none" />
        </svg>
    );
}
