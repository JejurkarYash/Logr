'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import axiosInstance from '@/services/axios';

type DayType = 'full' | 'college' | 'crunch';

interface LogData {
    day_type: DayType;
    saas_hours: number;
    oss_hours: number;
    profile_hours: number;
    win: string;
    blocker: string;
    tomorrow_goal: string;
}

interface SuccessData {
    streak: number;
    saas_hours: number;
    oss_hours: number;
    profile_hours: number;
}

const DAY_TYPES: { value: DayType; label: string }[] = [
    { value: 'full', label: 'Full day' },
    { value: 'college', label: 'College day' },
    { value: 'crunch', label: 'Crunch day' },
];

const PILLARS = [
    { key: 'saas_hours' as const, label: 'SaaS Development' },
    { key: 'oss_hours' as const, label: 'Open Source' },
    { key: 'profile_hours' as const, label: 'Profile & Outreach' },
];

export default function CheckinPage() {
    const searchParams = useSearchParams();
    const todayStr = new Date().toISOString().split('T')[0];
    // If ?date= param present, we're editing a past log
    const targetDate = searchParams.get('date') || todayStr;
    const isEditingPast = targetDate !== todayStr;
    const targetFormatted = format(parseISO(targetDate), 'EEEE, MMMM d yyyy');

    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [isExisting, setIsExisting] = useState(false);
    const [success, setSuccess] = useState<SuccessData | null>(null);

    const [dayType, setDayType] = useState<DayType>('full');
    const [hours, setHours] = useState({ saas_hours: 0, oss_hours: 0, profile_hours: 0 });
    const [win, setWin] = useState('');
    const [blocker, setBlocker] = useState('');
    const [tomorrowGoal, setTomorrowGoal] = useState('');

    const totalHours = hours.saas_hours + hours.oss_hours + hours.profile_hours;

    // On mount: fetch the target date's log to pre-fill if it exists
    const fetchLog = useCallback(async () => {
        try {
            const res = await axiosInstance.get<{ data: LogData }>(`/logs/${targetDate}`);
            const data = res.data?.data;
            if (data) {
                setIsExisting(true);
                setDayType(data.day_type || 'full');
                setHours({
                    saas_hours: data.saas_hours || 0,
                    oss_hours: data.oss_hours || 0,
                    profile_hours: data.profile_hours || 0,
                });
                setWin(data.win || '');
                setBlocker(data.blocker || '');
                setTomorrowGoal(data.tomorrow_goal || '');
            }
        } catch {
            // no log for this date, that's fine
        } finally {
            setIsInitializing(false);
        }
    }, [targetDate]);

    useEffect(() => {
        fetchLog();
    }, [fetchLog]);

    const adjustHour = (key: keyof typeof hours, delta: number) => {
        setHours(prev => ({
            ...prev,
            [key]: Math.max(0, Math.round((prev[key] + delta) * 2) / 2),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const payload = {
            date: targetDate,
            day_type: dayType,
            saas_hours: hours.saas_hours,
            oss_hours: hours.oss_hours,
            profile_hours: hours.profile_hours,
            win,
            blocker,
            tomorrow_goal: tomorrowGoal,
        };

        try {
            // POST (new) or PATCH (existing)
            if (isExisting) {
                await axiosInstance.patch(`/logs/${targetDate}`, payload);
            } else {
                await axiosInstance.post('/logs', payload);
            }

            // Mark streak — POST already returns currentStreak, no need for a second GET
            const streakRes = await axiosInstance.post('/streak', { completed: true });
            const streakData = streakRes.data?.data;
            const streak = streakData?.currentStreak ?? streakData?.streak ?? 0;

            setSuccess({ streak, ...hours });
            setIsExisting(true);
        } catch (err) {
            console.error('Check-in error:', err);
            alert('Failed to save. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Success State ───────────────────────────────────────────────
    if (success) {
        return (
            <div className="w-full max-w-xl mx-auto pt-4 pb-12">
                <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-10 text-center">
                    {/* Check icon */}
                    <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-6">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Day logged.</h2>
                    <p className="text-[14px] font-medium text-gray-500 mb-8">Your record has been saved successfully.</p>

                    {/* Streak */}
                    <div className="bg-[#F3F4F6] rounded-[16px] py-5 px-6 mb-6 inline-flex items-center gap-3 mx-auto">
                        <span className="text-[13px] font-semibold text-gray-500">Current streak</span>
                        <span className="text-2xl font-bold text-gray-900">{success.streak} days</span>
                    </div>

                    {/* Hours summary */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {[
                            { label: 'SaaS', hours: success.saas_hours },
                            { label: 'OSS', hours: success.oss_hours },
                            { label: 'Profile', hours: success.profile_hours },
                        ].map(p => (
                            <div key={p.label} className="bg-[#F3F4F6] rounded-[14px] py-4 px-3">
                                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{p.label}</p>
                                <p className="text-xl font-bold text-gray-900">{p.hours}h</p>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Link
                            href="/dashboard"
                            className="flex-1 py-3 rounded-lg bg-gray-900 text-white text-[13px] font-semibold hover:bg-gray-800 transition-colors text-center"
                        >
                            View dashboard
                        </Link>
                        <button
                            onClick={() => setSuccess(null)}
                            className="flex-1 py-3 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Edit log
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Loading skeleton ────────────────────────────────────────────
    if (isInitializing) {
        return (
            <div className="w-full max-w-xl mx-auto pt-4 space-y-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded-lg w-48" />
                <div className="h-4 bg-gray-100 rounded w-64" />
                <div className="h-40 bg-gray-100 rounded-[20px]" />
                <div className="h-56 bg-gray-100 rounded-[20px]" />
                <div className="h-64 bg-gray-100 rounded-[20px]" />
            </div>
        );
    }

    // ─── Main Form ───────────────────────────────────────────────────
    return (
        <div className="w-full max-w-xl mx-auto pt-4 pb-12 space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{targetFormatted}</p>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {isEditingPast ? 'Edit this day' : 'How did today go?'}
                    </h1>
                    {(isExisting || isEditingPast) && (
                        <span className="inline-flex items-center gap-1.5 mt-2 text-[12px] font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zM16.862 4.487L19.5 7.125" /></svg>
                            {isEditingPast ? 'Editing past entry' : 'Updating today\'s log'}
                        </span>
                    )}
                </div>
                {isEditingPast && (
                    <Link href="/dashboard/log" className="text-[13px] font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                        ← Back to log
                    </Link>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Day Type */}
                <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-6">
                    <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Day type</h3>
                    <div className="flex gap-2">
                        {DAY_TYPES.map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setDayType(value)}
                                className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 hover:cursor-pointer "
                                style={{
                                    background: dayType === value ? '#111827' : 'transparent',
                                    color: dayType === value ? '#ffffff' : '#6B7280',
                                    border: dayType === value ? '1px solid #111827' : '1px solid #E5E7EB',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Hours */}
                <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-6">
                    <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Time breakdown</h3>

                    <div className="space-y-3">
                        {PILLARS.map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between gap-4">
                                <span className="text-[14px] font-medium text-gray-700 w-36 shrink-0">{label}</span>
                                <div className="flex-1 flex items-center bg-[#F3F4F6] rounded-lg overflow-hidden border border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => adjustHour(key, -0.5)}
                                        className="w-11 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors text-lg font-medium shrink-0 hover:cursor-pointer"
                                    >
                                        −
                                    </button>
                                    <div className="flex-1 text-center">
                                        <span className="text-[15px] font-bold text-gray-900">
                                            {hours[key]}h
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => adjustHour(key, 0.5)}
                                        className="w-11 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors text-lg font-medium shrink-0 hover:cursor-pointer"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                        <span className="text-[13px] font-semibold text-gray-500">Total logged today</span>
                        <span className="text-[15px] font-bold text-gray-900">{totalHours}h</span>
                    </div>
                </div>

                {/* Reflections */}
                <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-6">
                    <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Today's reflection</h3>

                    <div className="space-y-5">
                        {/* Win */}
                        <div>
                            <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-2">
                                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                What was your win today?
                            </label>
                            <textarea
                                value={win}
                                onChange={e => setWin(e.target.value)}
                                placeholder="Something you're proud of today..."
                                rows={2}
                                className="w-full px-4 py-3 bg-[#F3F4F6] border border-transparent rounded-lg text-[14px] font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all resize-none"
                            />
                        </div>

                        {/* Blocker */}
                        <div>
                            <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-2">
                                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                                What blocked you?
                            </label>
                            <textarea
                                value={blocker}
                                onChange={e => setBlocker(e.target.value)}
                                placeholder="What slowed you down or got in the way?"
                                rows={2}
                                className="w-full px-4 py-3 bg-[#F3F4F6] border border-transparent rounded-lg text-[14px] font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all resize-none"
                            />
                        </div>

                        {/* Tomorrow */}
                        <div>
                            <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-2">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                                What's tomorrow's goal?
                            </label>
                            <textarea
                                value={tomorrowGoal}
                                onChange={e => setTomorrowGoal(e.target.value)}
                                placeholder="One main thing you want to accomplish..."
                                rows={2}
                                className="w-full px-4 py-3 bg-[#F3F4F6] border border-transparent rounded-lg text-[14px] font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className='space-y-2'>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-gray-900 text-white rounded-lg text-[14px] font-semibold hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:cursor-pointer"
                    >
                        {isLoading ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Saving...
                            </>
                        ) : (
                            isExisting ? 'Update today\'s log' : 'Save today\'s log'
                        )}
                    </button>
                    <p className="text-center text-[12px] font-medium text-gray-400 mt-3 flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Submitting will also mark your streak for today
                    </p>
                </div>

            </form>
        </div>
    );
}
