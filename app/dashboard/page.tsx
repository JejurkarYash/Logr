'use client';

import { useState, useEffect } from 'react';
import { subDays, format } from 'date-fns';
import Link from 'next/link';
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
}

interface LogEntry {
    date: string;
    saas_hours: number;
    oss_hours: number;
    profile_hours: number;
    win: string | null;
}

interface TodayLog {
    win: string | null;
    blocker: string | null;
    tomorrow_goal: string | null;
}

const COLORS = {
    saas: '#111827',
    oss: '#6B7280',
    profile: '#D1D5DB',
};

const HEATMAP_DAYS = 112;

function buildHeatmapData(logs: LogEntry[]) {
    const logMap = new Map<string, { total: number; win: string | null }>();
    logs.forEach(log => {
        const total = (log.saas_hours || 0) + (log.oss_hours || 0) + (log.profile_hours || 0);
        logMap.set(log.date, { total, win: log.win });
    });

    return Array.from({ length: HEATMAP_DAYS }).map((_, i) => {
        const dateStr = format(subDays(new Date(), HEATMAP_DAYS - 1 - i), 'yyyy-MM-dd');
        const displayDate = format(new Date(dateStr + 'T00:00:00'), 'MMM d');
        const entry = logMap.get(dateStr);
        const hours = entry?.total || 0;

        let intensity = 0;
        if (hours > 0 && hours <= 2) intensity = 1;
        else if (hours > 2 && hours <= 5) intensity = 2;
        else if (hours > 5) intensity = 3;

        return { dateStr, displayDate, intensity, hours, win: entry?.win || null };
    });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
    return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayFormatted = format(new Date(), 'MMM d, yyyy');

    const [firstName, setFirstName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── State shape ──────────────────────────────────────────────────────────
    const [streak, setStreak] = useState({ currentStreak: 0 });
    const [milestones, setMilestones] = useState({ oss_prs: 0, real_users: 0 });
    const [analyze, setAnalyze] = useState<{
        days: DayData[];
        weeklyTotals: { saas: number; oss: number; profile: number };
        deepWorkMonth: number;
    }>({ days: [], weeklyTotals: { saas: 0, oss: 0, profile: 0 }, deepWorkMonth: 0 });
    const [heatmapLogs, setHeatmapLogs] = useState<LogEntry[]>([]);
    const [todayLog, setTodayLog] = useState<TodayLog | null>(null);

    // ── Fetch ────────────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        const init = async () => {
            try {
                // Fire all data calls in parallel — user info comes from Supabase session cache (no network round-trip)
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();

                const [{ data: { user } }, streakRes, milestonesRes, analyzeRes, logsRes, todayRes] = await Promise.all([
                    supabase.auth.getUser(),
                    axiosInstance.get('/streak'),
                    axiosInstance.get('/milestones'),
                    axiosInstance.get('/analyze/week'),
                    axiosInstance.get(`/logs?limit=${HEATMAP_DAYS}&offset=0`),
                    axiosInstance.get(`/logs/${todayStr}`).catch(() => ({ data: { data: null } })),
                ]);

                if (cancelled) return;

                if (user) {
                    setFirstName((user.user_metadata?.full_name || 'User').split(' ')[0]);
                    setAvatarUrl(user.user_metadata?.avatar_url || null);
                }

                const streakData = streakRes.data?.data;
                setStreak({
                    currentStreak: streakData?.currentStreak ?? streakData?.streak ?? 0,
                });

                const mData = milestonesRes.data?.data;
                setMilestones({
                    oss_prs: mData?.oss_prs ?? 0,
                    real_users: mData?.real_users ?? 0,
                });

                const aData = analyzeRes.data?.data;
                setAnalyze({
                    days: aData?.days ?? [],
                    weeklyTotals: aData?.weeklyTotals ?? { saas: 0, oss: 0, profile: 0 },
                    deepWorkMonth: aData?.deepWorkMonth ?? 0,
                });

                setHeatmapLogs(logsRes.data?.data ?? []);
                setTodayLog(todayRes.data?.data ?? null);

            } catch (err) {
                if (!cancelled) {
                    console.error('Dashboard fetch error:', err);
                    setError('Failed to load dashboard data.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        init();
        return () => { cancelled = true; };
    }, [todayStr]);


    // ── Derived values ───────────────────────────────────────────────────────
    const heatmapData = buildHeatmapData(heatmapLogs);
    const weekDays = analyze.days;
    const weeklyTotals = analyze.weeklyTotals;
    const maxWeeklyDayHours = Math.max(8, ...weekDays.map(d => d.total_hours));

    // ── Error state ──────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="w-full max-w-[1400px] pt-8">
                <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-10 text-center">
                    <p className="text-[14px] font-semibold text-gray-500 mb-4">{error}</p>
                    <button onClick={() => window.location.reload()} className="bg-gray-900 text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="w-full max-w-[1400px] space-y-8 pb-10 pt-4">

            {/* ── Row 1: Greeting + Today's Entry ─────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Greeting */}
                <div className="lg:col-span-3 bg-white rounded-[20px] p-8 flex items-center justify-between border border-gray-200 shadow-sm">
                    {loading ? (
                        <div className="space-y-2 flex-1"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 mt-2" /></div>
                    ) : (
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Hello, {firstName}.</h1>
                            <p className="text-[15px] font-medium text-gray-500">Here is your productivity overview for today.</p>
                        </div>
                    )}
                    <div className="w-12 h-12 rounded-full shrink-0 ml-4 overflow-hidden border border-gray-200 shadow-inner">
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt={firstName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[15px] font-bold text-gray-500">
                                {firstName ? firstName[0].toUpperCase() : '?'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Today's Entry */}
                <div className="lg:col-span-2 bg-white rounded-[20px] p-8 border border-gray-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[16px] font-bold text-gray-900 tracking-tight">Today's Entry</h3>
                        <span className="text-[12px] font-semibold text-gray-500">{todayFormatted}</span>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ) : todayLog ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                                <span className="text-[13px] font-semibold text-gray-400 w-20">Key Win</span>
                                <span className="text-[14px] font-medium text-gray-900 truncate">{todayLog.win || '—'}</span>
                                <span className="text-[13px] font-semibold text-gray-400 w-20">Blocker</span>
                                <span className="text-[14px] font-medium text-gray-900 truncate">{todayLog.blocker || '—'}</span>
                                <span className="text-[13px] font-semibold text-gray-400 w-20">Tomorrow</span>
                                <span className="text-[14px] font-medium text-gray-900 truncate">{todayLog.tomorrow_goal || '—'}</span>
                            </div>
                            <Link href="/dashboard/log" className="inline-block text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mt-2">
                                View all records &rarr;
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col items-start gap-4">
                            <p className="text-[14px] font-medium text-gray-500">No entry has been recorded for today.</p>
                            <Link href="/dashboard/checkin" className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-gray-800 transition-colors">
                                Create Entry
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Row 2: Stat Cards ────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-[20px] p-6 border border-gray-200 shadow-sm">
                            <Skeleton className="h-3 w-24 mb-3" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                    ))
                ) : (
                    [
                        { label: 'Day Streak', value: streak.currentStreak },
                        { label: 'OSS PRs Merged', value: milestones.oss_prs },
                        { label: 'Real Users', value: milestones.real_users },
                        { label: 'Deep Work (This Month)', value: `${Math.round(analyze.deepWorkMonth)}h` },
                    ].map((card, i) => (
                        <div key={i} className="bg-white rounded-[20px] p-6 border border-gray-200 shadow-sm flex flex-col justify-center">
                            <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-2">{card.label}</p>
                            <p className="text-3xl font-bold text-gray-900 tracking-tight">{card.value}</p>
                        </div>
                    ))
                )}
            </div>

            {/* ── Row 3: Heatmap + Chart + Pillar Balance ──────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Left: Heatmap + Bar Chart */}
                <div className="lg:col-span-3 space-y-6">

                    {/* Heatmap */}
                    <div className="bg-white rounded-[20px] p-8 border border-gray-200 shadow-sm">
                        <h3 className="text-[16px] font-bold text-gray-900 tracking-tight mb-5">Consistency</h3>
                        {loading ? (
                            <div className="flex flex-wrap gap-[4px]">
                                {[...Array(HEATMAP_DAYS)].map((_, i) => (
                                    <div key={i} className="w-[14px] h-[14px] rounded-sm bg-gray-100 animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-[4px]">
                                    {heatmapData.map((day, i) => {
                                        let bg = '#F3F4F6';
                                        if (day.intensity === 1) bg = '#D1D5DB';
                                        else if (day.intensity === 2) bg = '#9CA3AF';
                                        else if (day.intensity === 3) bg = '#374151';

                                        const tooltip = day.hours > 0
                                            ? `${day.displayDate} — ${day.hours}h${day.win ? ` — Win: ${day.win}` : ''}`
                                            : `${day.displayDate} — No activity`;

                                        return (
                                            <div key={i} title={tooltip}
                                                className="w-[14px] h-[14px] rounded-sm cursor-pointer transition-all duration-200 relative group"
                                                style={{ background: bg }}
                                            >
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-[11px] font-medium px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-sm hidden group-hover:block">
                                                    {tooltip}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center justify-end gap-2 mt-4 text-[11px] font-medium text-gray-400">
                                    <span>Less</span>
                                    {['#F3F4F6', '#D1D5DB', '#9CA3AF', '#374151'].map(c => (
                                        <div key={c} className="w-[12px] h-[12px] rounded-sm" style={{ background: c }} />
                                    ))}
                                    <span>More</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Bar Chart */}
                    <div className="bg-white rounded-[20px] p-8 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[16px] font-bold text-gray-900 tracking-tight">This Week</h3>
                            <div className="flex gap-4">
                                {[['SaaS', COLORS.saas], ['OSS', COLORS.oss], ['Profile', COLORS.profile]].map(([l, c]) => (
                                    <div key={l} className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                                        <span className="text-[11px] font-semibold text-gray-500">{l}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-end justify-between h-48 gap-4">
                            {loading ? (
                                [...Array(7)].map((_, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
                                        <div className="w-full rounded-sm animate-pulse bg-gray-100" style={{ height: `${20 + Math.random() * 60}%` }} />
                                        <Skeleton className="h-3 w-6" />
                                    </div>
                                ))
                            ) : weekDays.map((day, i) => {
                                const isToday = day.date === todayStr;
                                const isEmpty = day.total_hours === 0;
                                const saasPct = day.saas_hours > 0 ? (day.saas_hours / maxWeeklyDayHours) * 100 : 0;
                                const ossPct = day.oss_hours > 0 ? (day.oss_hours / maxWeeklyDayHours) * 100 : 0;
                                const profPct = day.profile_hours > 0 ? (day.profile_hours / maxWeeklyDayHours) * 100 : 0;

                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group h-full">
                                        <div className="w-full h-full flex flex-col justify-end relative">
                                            {isEmpty ? (
                                                <div className="w-full border-t-2 border-dashed border-gray-200 h-[10%]" />
                                            ) : (
                                                <div className="w-full flex flex-col justify-end gap-[1px] h-full overflow-hidden">
                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[11px] font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm pointer-events-none">
                                                        {day.total_hours}h
                                                    </div>
                                                    {profPct > 0 && <div className="w-full rounded-t-sm" style={{ height: `${profPct}%`, background: COLORS.profile }} />}
                                                    {ossPct > 0 && <div className="w-full" style={{ height: `${ossPct}%`, background: COLORS.oss }} />}
                                                    {saasPct > 0 && <div className="w-full rounded-b-sm" style={{ height: `${saasPct}%`, background: COLORS.saas }} />}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: isToday ? '#111827' : '#9CA3AF' }}>
                                            {day.day.substring(0, 3)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right: Pillar Balance */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[20px] p-8 border border-gray-200 shadow-sm h-full flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[16px] font-bold text-gray-900 tracking-tight">Distribution</h3>
                            <span className="text-[12px] font-semibold text-gray-500">This Week</span>
                        </div>

                        <div className="space-y-6 flex-1 flex flex-col justify-center">
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-12" /></div>
                                        <Skeleton className="h-2 w-full rounded-full" />
                                    </div>
                                ))
                            ) : (
                                [
                                    { name: 'SaaS Product', hours: weeklyTotals.saas, target: 17.5, color: COLORS.saas },
                                    { name: 'Open Source', hours: weeklyTotals.oss, target: 14, color: COLORS.oss },
                                    { name: 'Profile', hours: weeklyTotals.profile, target: 7, color: COLORS.profile },
                                ].map((pillar, i) => {
                                    // Each bar = progress vs its own weekly target (100% = you hit the goal)
                                    const pct = Math.min(100, (pillar.hours / pillar.target) * 100);
                                    return (
                                        <div key={i} className="space-y-2">
                                            <div className="flex items-center justify-between text-[13px]">
                                                <span className="font-semibold text-gray-900">{pillar.name}</span>
                                                <span className="text-gray-500 font-medium">
                                                    {pillar.hours}h <span className="text-gray-300">/ {pillar.target}h</span>
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full transition-all duration-500"
                                                    style={{ width: `${Math.max(pct, 2)}%`, background: pillar.color }} />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}