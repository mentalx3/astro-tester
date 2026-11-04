import { useState } from 'react';
import { AuthError, login, requestPasswordRecovery, signup } from '@netlify/identity';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthModal({ initial = 'login', onClose }: { initial?: Mode; onClose: () => void }) {
    const [mode, setMode] = useState<Mode>(initial);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
            if (mode === 'login') {
                await login(email, password);
                onClose();
            } else if (mode === 'signup') {
                const user = await signup(email, password, { full_name: name || email.split('@')[0] });
                if (user.confirmedAt) onClose();
                else setMsg({ ok: true, text: 'Almost there! Check your email to confirm your account, then log in.' });
            } else {
                await requestPasswordRecovery(email);
                setMsg({ ok: true, text: 'If that account exists, a reset link is on its way.' });
            }
        } catch (err) {
            let text = 'Something went wrong. Please try again.';
            if (err instanceof AuthError) {
                if (err.status === 401) text = 'Invalid email or password.';
                else if (err.status === 403) text = 'Signups are currently closed.';
                else if (err.status === 422) text = err.message || 'Check your email and password (min 6 characters).';
                else text = err.message;
            } else if (err instanceof Error && err.name === 'MissingIdentityError') text = 'Accounts are not enabled on this site yet.';
            setMsg({ ok: false, text });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm p-6 space-y-4 rounded-2xl panel">
                <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl">{mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Join the arcade' : 'Reset password'}</h2>
                    <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white text-xl" aria-label="Close">×</button>
                </div>
                {mode === 'signup' && (
                    <Field label="Player name">
                        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} className="input" placeholder="ArcadeAce" />
                    </Field>
                )}
                <Field label="Email">
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" />
                </Field>
                {mode !== 'forgot' && (
                    <Field label="Password">
                        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                    </Field>
                )}
                {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.text}</p>}
                <button disabled={busy} className="w-full btn-primary">
                    {busy ? '…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account (+100 gems)' : 'Send reset link'}
                </button>
                <div className="flex justify-between text-sm text-zinc-400">
                    {mode !== 'login' ? (
                        <button type="button" onClick={() => setMode('login')} className="hover:text-white">Have an account? Log in</button>
                    ) : (
                        <button type="button" onClick={() => setMode('signup')} className="hover:text-white">New here? Sign up</button>
                    )}
                    {mode === 'login' && <button type="button" onClick={() => setMode('forgot')} className="hover:text-white">Forgot?</button>}
                </div>
            </form>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wider text-zinc-400">{label}</span>
            {children}
        </label>
    );
}
