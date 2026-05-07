'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format, parseISO, subDays, addDays } from 'date-fns';
import axiosInstance from '@/services/axios';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DayData {
    day: string;
    date: string;
    saas_hours: number;
    oss_hours: number;
    profile_hours: number;
    total_hours: number;
    logged: boolean;
    day_type: string | null;
    win: string | null;
    blocker: string | null;
}

interface WeekData {
    week: { start: string; end: string };
    days: DayData[];
    weeklyTotals: { saas: number; oss: number; profile: number };
}

const DAY_TYPE_META: Record<string, { label: string; bg: string; color: string }> = {
    full:    { label: 'Full',    bg: '#DCFCE7', color: '#15803D' },
    college: { label: 'College', bg: '#FEF3C7', color: '#B45309' },
    crunch:  { label: 'Crunch',  bg: '#FEE2E2', color: '#B91C1C' },
};

const PILLAR_COLORS = { saas: '#111827', oss: '#6B7280', profile: '#D1D5DB' };
const IDEAL = { saas: 60, oss: 25, profile: 15 };

// Get current Monday as YYYY-MM-DD
function getCurrentMonday(): string {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return monday.toISOString().split('T')[0];
}

export default function AnalyzePage() {
    const currentMonday = getCurrentMonday();

    const [weekStart, setWeekStart] = useState(currentMonday);
    const [data, setData] = useState<WeekData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const fetchWeek = useCallback(async (start: string) => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get(`/analyze/week?start=${start}`);
            setData(res.data?.data ?? null);
        } catch {
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchWeek(weekStart); }, [weekStart, fetchWeek]);

    const goToPrevWeek = () => setWeekStart(prev => format(subDays(parseISO(prev), 7), 'yyyy-MM-dd'));
    const goToNextWeek = () => setWeekStart(prev => format(addDays(parseISO(prev), 7), 'yyyy-MM-dd'));

    const isCurrentWeek = weekStart === currentMonday;

    // Derived metrics
    const days = data?.days ?? [];
    const totals = data?.weeklyTotals ?? { saas: 0, oss: 0, profile: 0 };
    const totalWeek = totals.saas + totals.oss + totals.profile;
    const daysLogged = days.filter(d => d.logged).length;
    const bestDay = days.reduce((best, d) => d.total_hours > best.hours ? { day: d.day, hours: d.total_hours } : best, { day: '—', hours: 0 });
    const avgHours = daysLogged > 0 ? Math.round((totalWeek / daysLogged) * 10) / 10 : 0;
    const maxDayHours = Math.max(8, ...days.map(d => d.total_hours));

    const saasPct = totalWeek > 0 ? Math.round((totals.saas / totalWeek) * 100) : 0;
    const ossPct  = totalWeek > 0 ? Math.round((totals.oss / totalWeek) * 100) : 0;
    const profPct = totalWeek > 0 ? Math.round((totals.profile / totalWeek) * 100) : 0;

    const wins    = days.filter(d => d.win);
    const blockers = days.filter(d => d.blocker);

    const weekLabel = data
        ? `${format(parseISO(data.week.start), 'MMM d')} – ${format(parseISO(data.week.end), 'MMM d, yyyy')}`
        : '—';

    // Plain-English summary
    function buildSummary(): string {
        if (!data || daysLogged === 0) return 'No logs recorded this week yet.';
        const missed = days.filter(d => !d.logged).map(d => d.day);
        const weakPillar = totals.saas <= totals.oss && totals.saas <= totals.profile ? 'SaaS'
            : totals.oss <= totals.profile ? 'OSS' : 'Profile';
        let s = `You logged ${daysLogged} out of 7 days this week with ${totalWeek}h total.`;
        s += ` Your strongest pillar was ${bestDay.day} at ${bestDay.hours}h.`;
        if (weakPillar !== 'SaaS' || totals.oss < 5) s += ` ${weakPillar} needs more attention this week.`;
        if (missed.length > 0) s += ` You missed ${missed.join(', ')}.`;
        return s;
    }

    return (
        <div className="w-full max-w-4xl mx-auto pt-4 pb-12 space-y-6">

            {/* ── Header ───────────────────────────────────────────── */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Analyze</h1>
                    <p className="text-[14px] font-medium text-gray-500">
                        {isLoading ? 'Loading…' : `Week of ${weekLabel}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToPrevWeek}
                        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 border border-gray-200 bg-white px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                        Prev
                    </button>
                    <button
                        onClick={goToNextWeek}
                        disabled={isCurrentWeek}
                        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 border border-gray-200 bg-white px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4 animate-pulse">
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white rounded-[20px] border border-gray-200" />)}
                    </div>
                    <div className="h-56 bg-white rounded-[20px] border border-gray-200" />
                    <div className="h-40 bg-white rounded-[20px] border border-gray-200" />
                </div>
            ) : (
                <>
                    {/* ── Section 1: Scorecard ─────────────────────────── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Days logged',   value: `${daysLogged}/7` },
                            { label: 'Total hours',   value: `${totalWeek}h` },
                            { label: 'Best day',      value: bestDay.hours > 0 ? `${bestDay.hours}h` : '—' },
                            { label: 'Daily average', value: daysLogged > 0 ? `${avgHours}h` : '—' },
                        ].map((c, i) => (
                            <div key={i} className="bg-white rounded-[20px] border border-gray-200 shadow-sm px-5 py-4">
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{c.label}</p>
                                <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Section 2: Bar Chart ─────────────────────────── */}
                    <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[15px] font-bold text-gray-900">This week — hours per day</h3>
                            <div className="flex gap-4">
                                {[['SaaS', PILLAR_COLORS.saas], ['OSS', PILLAR_COLORS.oss], ['Profile', PILLAR_COLORS.profile]].map(([l, c]) => (
                                    <div key={l} className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                                        <span className="text-[11px] font-semibold text-gray-500">{l}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-end gap-3 h-44">
                            {days.map((day) => {
                                const sP = (day.saas_hours / maxDayHours) * 100;
                                const oP = (day.oss_hours / maxDayHours) * 100;
                                const pP = (day.profile_hours / maxDayHours) * 100;
                                const todayStr = new Date().toISOString().split('T')[0];
                                const isToday = day.date === todayStr;

                                return (
                                    <div key={day.day} className="flex-1 flex flex-col items-center gap-2 group h-full">
                                        <div className="w-full h-full flex flex-col justify-end relative">
                                            {day.total_hours === 0 ? (
                                                <div className="w-full border-t-2 border-dashed border-gray-200 h-[8%]" />
                                            ) : (
                                                <>
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-semibold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm pointer-events-none">
                                                        {day.total_hours}h
                                                    </div>
                                                    <div className="w-full flex flex-col gap-[1px] justify-end h-full">
                                                        {pP > 0 && <div className="w-full rounded-t-sm" style={{ height: `${pP}%`, background: PILLAR_COLORS.profile }} />}
                                                        {oP > 0 && <div className="w-full" style={{ height: `${oP}%`, background: PILLAR_COLORS.oss }} />}
                                                        {sP > 0 && <div className="w-full rounded-b-sm" style={{ height: `${sP}%`, background: PILLAR_COLORS.saas }} />}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <span className="text-[11px] font-semibold uppercase tracking-wider"
                                            style={{ color: isToday ? '#111827' : '#9CA3AF' }}>
                                            {day.day}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Section 3: Pillar Balance ─────────────────────── */}
                    <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-6">
                        <h3 className="text-[15px] font-bold text-gray-900 mb-5">Pillar balance</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'SaaS',    hours: totals.saas,    pct: saasPct, ideal: IDEAL.saas,    color: PILLAR_COLORS.saas },
                                { label: 'OSS',     hours: totals.oss,     pct: ossPct,  ideal: IDEAL.oss,     color: PILLAR_COLORS.oss },
                                { label: 'Profile', hours: totals.profile, pct: profPct, ideal: IDEAL.profile, color: PILLAR_COLORS.profile },
                            ].map(p => (
                                <div key={p.label} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[13px]">
                                        <span className="font-semibold text-gray-800">{p.label}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-gray-900">{p.hours}h</span>
                                            <span className="text-gray-400 font-medium w-8 text-right">{p.pct}%</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${Math.max(p.pct, 1)}%`, background: p.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-[12px] font-medium text-gray-400 mt-5 pt-4 border-t border-gray-100">
                            Ideal balance → {IDEAL.saas}% SaaS · {IDEAL.oss}% OSS · {IDEAL.profile}% Profile
                        </p>
                    </div>

                    {/* ── Section 4: Day by Day Table ──────────────────── */}
                    <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100">
                            <h3 className="text-[15px] font-bold text-gray-900">Day by day</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {/* Table header */}
                            <div className="grid grid-cols-[80px_80px_60px_60px_70px_60px_40px] gap-2 px-6 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                                <span>Day</span><span>Type</span><span>SaaS</span><span>OSS</span><span>Profile</span><span>Total</span><span>Win</span>
                            </div>
                            {days.map(day => {
                                const meta = day.day_type ? DAY_TYPE_META[day.day_type] : null;
                                const isExpanded = expandedRow === day.date;
                                return (
                                    <div key={day.date}>
                                        <button
                                            onClick={() => setExpandedRow(isExpanded ? null : day.date)}
                                            className="w-full grid grid-cols-[80px_80px_60px_60px_70px_60px_40px] gap-2 px-6 py-3.5 text-left hover:bg-gray-50 transition-colors items-center"
                                        >
                                            <span className="text-[13px] font-semibold text-gray-800">{day.day}</span>
                                            <span>
                                                {meta ? (
                                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                                        style={{ background: meta.bg, color: meta.color }}>
                                                        {meta.label}
                                                    </span>
                                                ) : (
                                                    <span className="text-[13px] text-gray-300">—</span>
                                                )}
                                            </span>
                                            <span className="text-[13px] font-medium text-gray-700">{day.logged ? `${day.saas_hours}h` : '—'}</span>
                                            <span className="text-[13px] font-medium text-gray-700">{day.logged ? `${day.oss_hours}h` : '—'}</span>
                                            <span className="text-[13px] font-medium text-gray-700">{day.logged ? `${day.profile_hours}h` : '—'}</span>
                                            <span className="text-[13px] font-bold text-gray-900">{day.logged ? `${day.total_hours}h` : '0h'}</span>
                                            <span>
                                                {day.win ? (
                                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                ) : (
                                                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                                )}
                                            </span>
                                        </button>
                                        {isExpanded && day.logged && (
                                            <div className="px-6 py-4 bg-[#FAFAFA] border-t border-gray-100 space-y-2.5">
                                                {[
                                                    { label: 'Win', value: day.win },
                                                    { label: 'Blocker', value: day.blocker },
                                                ].map(r => (
                                                    r.value && (
                                                        <div key={r.label} className="grid grid-cols-[70px_1fr] gap-3 items-start">
                                                            <span className="text-[12px] font-semibold text-gray-400">{r.label}</span>
                                                            <span className="text-[13px] font-medium text-gray-700">{r.value}</span>
                                                        </div>
                                                    )
                                                ))}
                                                <Link
                                                    href={`/dashboard/checkin?date=${day.date}`}
                                                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-white transition-colors mt-1"
                                                >
                                                    Edit this day
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Section 5: Wins & Blockers ────────────────────── */}
                    {(wins.length > 0 || blockers.length > 0) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {wins.length > 0 && (
                                <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-6">
                                    <h3 className="text-[15px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                                        Wins this week
                                    </h3>
                                    <div className="space-y-3">
                                        {wins.map(d => (
                                            <div key={d.date} className="grid grid-cols-[40px_1fr] gap-2 items-start">
                                                <span className="text-[12px] font-semibold text-gray-400 pt-0.5">{d.day}</span>
                                                <span className="text-[13px] font-medium text-gray-700 leading-relaxed">{d.win}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {blockers.length > 0 && (
                                <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-6">
                                    <h3 className="text-[15px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
                                        Blockers this week
                                    </h3>
                                    <div className="space-y-3">
                                        {blockers.map(d => (
                                            <div key={d.date} className="grid grid-cols-[40px_1fr] gap-2 items-start">
                                                <span className="text-[12px] font-semibold text-gray-400 pt-0.5">{d.day}</span>
                                                <span className="text-[13px] font-medium text-gray-700 leading-relaxed">{d.blocker}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Section 6: Week Summary ───────────────────────── */}
                    <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-6">
                        <h3 className="text-[15px] font-bold text-gray-900 mb-3">Week summary</h3>
                        <p className="text-[14px] font-medium text-gray-600 leading-relaxed">{buildSummary()}</p>
                    </div>
                </>
            )}
        </div>
    );
}
