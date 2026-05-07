'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import axiosInstance from '@/services/axios';

type Filter = 'week' | 'month' | 'all';

interface LogEntry {
    id: string;
    date: string;
    day_type: string;
    saas_hours: number;
    oss_hours: number;
    profile_hours: number;
    win: string | null;
    blocker: string | null;
    tomorrow_goal: string | null;
}

const DAY_TYPE_META: Record<string, { label: string; bg: string; color: string }> = {
    full: { label: 'Full day', bg: '#DCFCE7', color: '#15803D' },
    college: { label: 'College day', bg: '#FEF3C7', color: '#B45309' },
    crunch: { label: 'Crunch day', bg: '#FEE2E2', color: '#B91C1C' },
};

function getDaysForFilter(filter: Filter): string[] {
    const today = new Date();
    let start: Date;
    if (filter === 'week') start = subDays(today, 6);
    else if (filter === 'month') start = subDays(today, 29);
    else start = subDays(today, 89); // ~3 months for "All time" — manageable

    return eachDayOfInterval({ start, end: today })
        .map(d => format(d, 'yyyy-MM-dd'))
        .reverse(); // newest first
}

export default function LogPage() {
    const [filter, setFilter] = useState<Filter>('month');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLogs = useCallback(async (f: Filter) => {
        setIsLoading(true);
        try {
            const limit = f === 'week' ? 7 : f === 'month' ? 31 : 90;
            const res = await axiosInstance.get(`/logs?limit=${limit}&offset=0`);
            setLogs(res.data?.data || []);
        } catch {
            setLogs([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(filter); }, [filter, fetchLogs]);

    const logsMap = new Map<string, LogEntry>(logs.map(l => [l.date, l]));
    const days = getDaysForFilter(filter);

    // Summary stats for the current filter
    const filteredLogs = days.map(d => logsMap.get(d)).filter(Boolean) as LogEntry[];
    const totalDays = filteredLogs.length;
    const totalHours = filteredLogs.reduce((s, l) => s + (l.saas_hours || 0) + (l.oss_hours || 0) + (l.profile_hours || 0), 0);
    const saasTot = filteredLogs.reduce((s, l) => s + (l.saas_hours || 0), 0);
    const ossTot = filteredLogs.reduce((s, l) => s + (l.oss_hours || 0), 0);
    const profTot = filteredLogs.reduce((s, l) => s + (l.profile_hours || 0), 0);

    const filterLabels: Record<Filter, string> = {
        week: 'This week',
        month: 'This month',
        all: 'All time',
    };

    const periodLabel = filter === 'week'
        ? `${format(subDays(new Date(), 6), 'MMM d')} – ${format(new Date(), 'MMM d, yyyy')}`
        : filter === 'month'
            ? format(new Date(), 'MMMM yyyy')
            : 'Last 90 days';

    return (
        <div className="w-full max-w-2xl mx-auto pt-4 pb-12 space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Activity Log</h1>
                    <p className="text-[14px] font-medium text-gray-500">All your logged days in one place.</p>
                </div>
                <Link
                    href="/dashboard/checkin"
                    className="shrink-0 flex items-center gap-1.5 bg-gray-900 text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    New entry
                </Link>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2">
                {(['week', 'month', 'all'] as Filter[]).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 hover:cursor-pointer"
                        style={{
                            background: filter === f ? '#111827' : 'white',
                            color: filter === f ? '#ffffff' : '#6B7280',
                            border: filter === f ? '1px solid #111827' : '1px solid #E5E7EB',
                        }}
                    >
                        {filterLabels[f]}
                    </button>
                ))}
            </div>

            {/* Summary Bar */}
            <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm px-6 py-5">
                <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{periodLabel}</p>
                {isLoading ? (
                    <div className="animate-pulse space-y-2">
                        <div className="h-5 bg-gray-100 rounded w-48" />
                        <div className="h-4 bg-gray-100 rounded w-64" />
                    </div>
                ) : totalDays === 0 ? (
                    <p className="text-[14px] font-medium text-gray-400">No logs recorded yet.</p>
                ) : (
                    <>
                        <div className="flex items-baseline gap-6 mb-2">
                            <span className="text-[15px] font-bold text-gray-900">{totalDays} days logged</span>
                            <span className="text-[15px] font-bold text-gray-900">{totalHours}h total</span>
                        </div>
                        <p className="text-[13px] font-medium text-gray-500">
                            SaaS {saasTot}h
                            <span className="mx-2 text-gray-300">·</span>
                            OSS {ossTot}h
                            <span className="mx-2 text-gray-300">·</span>
                            Profile {profTot}h
                        </p>
                    </>
                )}
            </div>

            {/* Log List */}
            {isLoading ? (
                <div className="flex flex-col gap-4 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white rounded-[20px] border border-gray-200 h-36 shrink-0" />
                    ))}
                </div>
            ) : totalDays === 0 && !isLoading ? (
                /* Empty state */
                <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                    </div>
                    <h3 className="text-[16px] font-bold text-gray-900 mb-1">No logs yet</h3>
                    <p className="text-[14px] font-medium text-gray-500 mb-5">Start your first daily check-in and your history will appear here.</p>
                    <Link
                        href="/dashboard/checkin"
                        className="inline-flex items-center gap-2 bg-gray-900 text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        Start check-in
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {days.map((dateStr) => {
                        const log = logsMap.get(dateStr);
                        const displayDate = format(parseISO(dateStr), 'EEEE, MMMM d');
                        const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

                        /* Ghost card for missing days */
                        if (!log) {
                            return (
                                <div key={dateStr} className="shrink-0 bg-white rounded-[20px] border border-dashed border-gray-200 px-6 py-5 flex items-center justify-between opacity-60">
                                    <div>
                                        <p className="text-[14px] font-semibold text-gray-500">{displayDate}</p>
                                        <p className="text-[12px] font-medium text-gray-400 mt-1">No log recorded</p>
                                    </div>
                                    <Link
                                        href={isToday ? '/dashboard/checkin' : `/dashboard/checkin?date=${dateStr}`}
                                        className="text-[12px] font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        {isToday ? 'Log today' : 'Log'}
                                    </Link>
                                </div>
                            );
                        }

                        const dayMeta = DAY_TYPE_META[log.day_type] || { label: log.day_type, bg: '#F3F4F6', color: '#6B7280' };
                        const total = (log.saas_hours || 0) + (log.oss_hours || 0) + (log.profile_hours || 0);

                        return (
                            <div key={dateStr} className="shrink-0 bg-white rounded-[20px] border border-gray-200 shadow-sm">

                                {/* Card Header */}
                                <div className="flex items-center justify-between px-6 pt-5 pb-4">
                                    <div>
                                        <p className="text-[15px] font-bold text-gray-900">{displayDate}</p>
                                        <span
                                            className="inline-block mt-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                                            style={{ background: dayMeta.bg, color: dayMeta.color }}
                                        >
                                            {dayMeta.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total</p>
                                            <p className="text-xl font-bold text-gray-900">{total}h</p>
                                        </div>
                                        <Link
                                            href={`/dashboard/checkin?date=${dateStr}`}
                                            className="text-[12px] font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Edit
                                        </Link>
                                    </div>
                                </div>

                                {/* Hours Row */}
                                <div className="px-6 pb-4 flex items-center gap-6 border-t border-gray-100 pt-4">
                                    {[
                                        { label: 'SaaS', hours: log.saas_hours || 0 },
                                        { label: 'OSS', hours: log.oss_hours || 0 },
                                        { label: 'Profile', hours: log.profile_hours || 0 },
                                    ].map(p => (
                                        <div key={p.label} className="flex items-baseline gap-1.5">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{p.label}</span>
                                            <span className="text-[14px] font-bold text-gray-900">{p.hours}h</span>
                                        </div>
                                    ))}
                                    <div className="ml-auto flex items-baseline gap-1.5">
                                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total</span>
                                        <span className="text-[14px] font-bold text-gray-900">{total}h</span>
                                    </div>
                                </div>

                                {/* Reflection Rows */}
                                {(log.win || log.blocker || log.tomorrow_goal) && (
                                    <div className="border-t border-gray-100 px-6 pt-4 pb-5 space-y-3 rounded-b-[20px] bg-[#FAFAFA]">
                                        {[
                                            { label: 'Win', value: log.win },
                                            { label: 'Blocker', value: log.blocker },
                                            { label: 'Tomorrow', value: log.tomorrow_goal },
                                        ].map(r => (
                                            <div key={r.label} className="grid grid-cols-[80px_1fr] gap-3 items-start">
                                                <span className="text-[12px] font-semibold text-gray-400">{r.label}</span>
                                                <span className="text-[13px] font-medium text-gray-700 leading-relaxed">{r.value || '—'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
