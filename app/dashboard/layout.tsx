import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import MainContentWrapper from '@/components/dashboard/MainContentWrapper';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) redirect('/login');

    const firstName = (user.user_metadata?.full_name || 'User').split(' ')[0];
    const avatarUrl = user.user_metadata?.avatar_url || undefined;

    return (
        <div
            className="flex h-screen w-full bg-[#F3F4F6] overflow-hidden"
            style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
        >
            <Sidebar avatarUrl={avatarUrl} firstName={firstName} />
            <MainContentWrapper>
                {children}
            </MainContentWrapper>
        </div>
    );
}
