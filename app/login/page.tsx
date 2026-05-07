'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            setIsLoading(true);
            const supabase = createClient();
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
        } catch (error) {
            console.error('Error logging in with Google:', error);
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full bg-[#F3F4F6] flex items-center justify-center"
            style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
        >
            <div className="w-full max-w-sm px-4">

                {/* Card */}
                <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-10 flex flex-col items-center">

                    {/* Logo mark */}
                    <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center mb-8">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>

                    {/* Heading */}
                    <h1 className="text-[22px] font-bold text-gray-900 tracking-tight mb-1.5 text-center">
                        Welcome back
                    </h1>
                    <p className="text-[14px] font-medium text-gray-500 text-center mb-8 leading-relaxed">
                        Sign in to your productivity cockpit.
                    </p>

                    {/* Google Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-800 font-semibold text-[14px] py-3 px-5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        )}
                        <span>{isLoading ? 'Signing in…' : 'Continue with Google'}</span>
                    </button>

                    {/* Divider hint */}
                    <p className="mt-8 text-[11px] font-medium text-gray-400 text-center leading-relaxed">
                        By continuing, you agree to our{' '}
                        <span className="text-gray-500 underline underline-offset-2 cursor-pointer hover:text-gray-700 transition-colors">Terms</span>
                        {' '}and{' '}
                        <span className="text-gray-500 underline underline-offset-2 cursor-pointer hover:text-gray-700 transition-colors">Privacy Policy</span>.
                    </p>
                </div>

                {/* Below card tagline */}
                <p className="text-center text-[12px] font-medium text-gray-400 mt-6">
                    Your personal developer cockpit.
                </p>
            </div>
        </div>
    );
}