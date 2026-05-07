import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"
import { calculateStreak } from "@/lib/helpers/streak"


export async function POST() {
    try {
        // Step 1 — auth check
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return Response.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Step 2 — get today's date in YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0]

        // Step 3 — upsert today's streak entry
        // upsert = insert if not exists, update if exists
        const { error: upsertError } = await supabase
            .from('streaks')
            .upsert(
                {
                    user_id: user.id,
                    date: today,
                    completed: true,
                },
                {
                    onConflict: 'user_id, date', // if same user + date exists, update it
                }
            )

        if (upsertError) {
            console.error('Streak upsert error:', upsertError)
            return Response.json(
                { error: 'Failed to mark streak' },
                { status: 500 }
            )
        }

        // Step 4 — fetch all streak entries for this user ordered by date descending
        const { data: streakRows, error: fetchError } = await supabase
            .from('streaks')
            .select('date, completed')
            .eq('user_id', user.id)
            .order('date', { ascending: false })

        if (fetchError) {
            console.error('Streak fetch error:', fetchError)
            return Response.json(
                { error: 'Failed to fetch streak data' },
                { status: 500 }
            )
        }

        // Step 5 — calculate current streak
        // Walk backwards from today, count consecutive completed days
        const currentStreak = calculateStreak(streakRows)

        // Step 6 — return result
        return Response.json({
            message: 'Streak marked for today',
            data: {
                date: today,
                currentStreak,
            }
        }, { status: 200 })

    } catch (err) {
        console.error('Unexpected error:', err)
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}


export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return Response.json(
                {
                    error: "Unauthorized"
                },
                {
                    status: 401
                }
            );
        }
        const today = new Date().toISOString().split("T")[0];
        const { data: streakRows, error: fetchError } = await supabase
            .from('streaks')
            .select('date, completed')
            .eq('user_id', user.id)
            .order('date', { ascending: false })

        if (fetchError) {
            console.error('Streak fetch error:', fetchError)
            return Response.json(
                {
                    error: 'Failed to fetch streak data'
                },
                {
                    status: 500
                }
            );
        }
        const currentStreak = calculateStreak(streakRows);
        return Response.json({
            message: 'Streak marked for today',
            data: {
                date: today,
                currentStreak,
            }
        }, { status: 200 });
    } catch (err) {
        console.error('Unexpected error:', err)
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}