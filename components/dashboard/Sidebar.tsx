'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
    avatarUrl?: string;
    firstName?: string;
}

// Accent: soft indigo–violet. Visible but not garish.
const ACCENT = {
    color: '#818CF8',          // indigo-400
    glow: 'rgba(99,102,241,0.35)',
    bar: 'linear-gradient(180deg, #818CF8 0%, #A78BFA 100%)',
    badge: 'rgba(99,102,241,0.18)',
    badgeGlow: '0 0 16px rgba(99,102,241,0.4)',
    rowBg: 'linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(167,139,250,0.07) 100%)',
    rowShadow: 'inset 0 1px 0 rgba(129,140,248,0.15)',
};

const navItems = [
    {
        name: 'Dashboard',
        href: '/dashboard',
        exact: true,
        paths: (
            <>
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </>
        ),
    },
    {
        name: 'Check-in',
        href: '/dashboard/checkin',
        exact: false,
        paths: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
    },
    {
        name: 'Log',
        href: '/dashboard/log',
        exact: false,
        paths: (
            <>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
            </>
        ),
    },
    {
        name: 'Analyze',
        href: '/dashboard/analyze',
        exact: false,
        paths: (
            <>
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
            </>
        ),
    },
];

export default function Sidebar({ avatarUrl, firstName = 'U' }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = useCallback(async () => {
        try {
            setIsLoggingOut(true);
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push('/login');
            router.refresh();
        } catch (err) {
            console.error('Logout error:', err);
            setIsLoggingOut(false);
        }
    }, [router]);

    const isActive = (href: string, exact: boolean) =>
        exact ? pathname === href : pathname.startsWith(href);

    return (
        <aside
            className="group relative my-6 ml-6 flex flex-col items-center shrink-0 overflow-hidden transition-all duration-300 ease-in-out w-[80px] hover:w-[220px] rounded-[36px] h-[calc(100%-48px)]"
            style={{
                background: 'linear-gradient(160deg, #111116 0%, #0a0a0e 60%, #0d0b14 100%)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.04)',
                zIndex: 30,
            }}
        >
            {/* ── Ambient orb — breathes slowly behind content ───────── */}
            <div
                className="sidebar-orb pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 w-36 h-36 rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, rgba(167,139,250,0.2) 50%, transparent 75%)',
                    filter: 'blur(24px)',
                    zIndex: 0,
                }}
            />

            {/* ── Subtle top highlight line ───────────────────────────── */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-[55%] pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
            />

            {/* All real content sits above orb */}
            <div className="relative z-10 flex flex-col h-full w-full">

                {/* ── Logo ─────────────────────────────────────────────── */}
                <div className="flex items-center gap-4 px-6 pt-10 pb-8 w-full overflow-hidden">
                    <div className="shrink-0 relative">
                        {/* Glow halo behind "P." */}
                        <div
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                                background: 'radial-gradient(circle, rgba(129,140,248,0.4) 0%, transparent 70%)',
                                filter: 'blur(8px)',
                                transform: 'scale(1.8)',
                            }}
                        />
                        <span
                            className="sidebar-shimmer relative text-white font-extrabold text-2xl tracking-tighter"
                            style={{
                                background: 'linear-gradient(90deg, #fff 20%, #818CF8 40%, #A78BFA 55%, #fff 70%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            P.
                        </span>
                    </div>
                    <span className="text-white/80 font-bold text-[17px] tracking-tight whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
                        Workspace
                    </span>
                </div>

                {/* ── Nav ──────────────────────────────────────────────── */}
                <nav className="flex flex-col gap-1.5 w-full px-3 flex-1">
                    {navItems.map((item, idx) => {
                        const active = isActive(item.href, item.exact);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="sidebar-nav-item relative flex items-center gap-4 h-12 px-3 rounded-2xl overflow-hidden group/item"
                                style={{
                                    animationDelay: `${idx * 60}ms`,
                                    color: active ? '#ffffff' : 'rgba(156,163,175,0.8)',
                                    background: active ? ACCENT.rowBg : 'transparent',
                                    boxShadow: active ? ACCENT.rowShadow : 'none',
                                    transition: 'background 0.25s ease, color 0.2s ease, box-shadow 0.25s ease, transform 0.15s ease',
                                }}
                                // Hover lift handled via CSS — tiny translateY
                                onMouseEnter={e => {
                                    if (!active) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                }}
                            >
                                {/* Left accent bar — colored, spring-animated */}
                                {active && (
                                    <span
                                        className="sidebar-bar-active absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                                        style={{ background: ACCENT.bar, boxShadow: `0 0 8px ${ACCENT.glow}` }}
                                    />
                                )}

                                {/* Hover shimmer overlay */}
                                <span
                                    className="absolute inset-0 rounded-2xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 pointer-events-none"
                                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)' }}
                                />

                                {/* Icon badge */}
                                <span
                                    className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-250 ${active ? 'sidebar-icon-active' : ''}`}
                                    style={{
                                        background: active ? ACCENT.badge : 'rgba(255,255,255,0.04)',
                                        boxShadow: active ? ACCENT.badgeGlow : 'none',
                                    }}
                                >
                                    <svg
                                        width="17"
                                        height="17"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke={active ? ACCENT.color : 'currentColor'}
                                        strokeWidth={active ? '2.5' : '1.6'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ filter: active ? `drop-shadow(0 0 4px ${ACCENT.glow})` : 'none' }}
                                    >
                                        {item.paths}
                                    </svg>
                                </span>

                                {/* Label */}
                                <span
                                    className="text-[14px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100"
                                    style={{
                                        fontWeight: active ? 700 : 500,
                                        color: active ? ACCENT.color : undefined,
                                        textShadow: active ? `0 0 12px ${ACCENT.glow}` : 'none',
                                    }}
                                >
                                    {item.name}
                                </span>

                                {/* Active dot pulse — tiny indicator on the right edge */}
                                {active && (
                                    <span
                                        className="absolute right-3 w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        style={{
                                            background: ACCENT.color,
                                            boxShadow: `0 0 6px ${ACCENT.glow}`,
                                        }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* ── Bottom section ────────────────────────────────────── */}
                <div className="flex flex-col gap-3 w-full px-3 pb-7">

                    {/* Thin separator */}
                    <div
                        className="w-full h-[1px] mx-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }}
                    />

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center gap-4 h-11 w-full px-3 rounded-2xl transition-all duration-200 overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ color: 'rgba(156,163,175,0.7)' }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.color = '#f87171';
                            (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.color = 'rgba(156,163,175,0.7)';
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                    >
                        <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            {isLoggingOut ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                            )}
                        </span>
                        <span className="text-[14px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
                            {isLoggingOut ? 'Signing out…' : 'Logout'}
                        </span>
                    </button>

                    {/* User avatar */}
                    <div className="flex items-center gap-4 h-11 w-full px-3 overflow-hidden">
                        <div
                            className="sidebar-avatar-ring w-8 h-8 rounded-full shrink-0 overflow-hidden"
                            style={{ border: `1.5px solid rgba(129,140,248,0.3)` }}
                        >
                            {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarUrl} alt={firstName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-[12px] font-bold text-white"
                                    style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
                                >
                                    {firstName ? firstName[0].toUpperCase() : '?'}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
                            <span className="text-[13px] font-semibold text-white/80">{firstName}</span>
                            <span className="text-[11px] font-medium" style={{ color: ACCENT.color }}>Active</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}