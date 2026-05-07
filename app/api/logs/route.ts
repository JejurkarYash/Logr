import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        // Step 1 — get supabase client
        const supabase = await createClient()

        // Step 2 — check if user is logged in
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return Response.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Step 3 — read the request body
        const body = await request.json()

        // Step 4 — validate required fields
        const { date, day_type, saas_hours, oss_hours, profile_hours, win, blocker, tomorrow_goal } = body

        if (!date || !day_type) {
            return Response.json(
                { error: 'date and day_type are required' },
                { status: 400 }
            )
        }

        // Step 5 — validate day_type value
        const validDayTypes = ['full', 'college', 'crunch']
        if (!validDayTypes.includes(day_type)) {
            return Response.json(
                { error: 'day_type must be one of: full, college, crunch' },
                { status: 400 }
            )
        }

        // Step 6 — insert into database
        const { data, error } = await supabase
            .from('daily_logs')
            .insert({
                user_id: user.id,       // always from the token, never from body
                date,
                day_type,
                saas_hours: saas_hours ?? 0,
                oss_hours: oss_hours ?? 0,
                profile_hours: profile_hours ?? 0,
                win: win ?? null,
                blocker: blocker ?? null,
                tomorrow_goal: tomorrow_goal ?? null,
            })
            .select()                 // returns the inserted row
            .single()                 // we inserted one row, get one back

        if (error) {
            // Supabase error code 23505 = unique constraint violation
            // meaning a log for this date already exists
            if (error.code === '23505') {
                return Response.json(
                    { error: 'A log for this date already exists' },
                    { status: 409 }
                )
            }

            console.error('DB insert error:', error)
            return Response.json(
                { error: 'Failed to create log' },
                { status: 500 }
            )
        }

        // Step 7 — return the created log
        return Response.json(
            { message: 'Log created', data },
            { status: 201 }
        )

    } catch (err) {
        console.error('Unexpected error:', err)
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}


// ─────────────────────────────────────────
// GET /api/logs
// Get all logs for the logged-in user
// ─────────────────────────────────────────
export async function GET(request: NextRequest) {
    try {
        // Step 1 — get supabase client
        const supabase = await createClient()

        // Step 2 — check if user is logged in
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return Response.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Step 3 — read optional` query params
        // Example: /api/logs?limit=10&offset=0
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') ?? '30')
        const offset = parseInt(searchParams.get('offset') ?? '0')

        // Step 4 — fetch logs from database
        const { data, error, count } = await supabase
            .from('daily_logs')
            .select('*', { count: 'exact' })   // count: exact gives total row count
            .eq('user_id', user.id)            // RLS also enforces this, double safety
            .order('date', { ascending: false }) // newest first
            .range(offset, offset + limit - 1)  // pagination

        if (error) {
            console.error('DB fetch error:', error)
            return Response.json(
                { error: 'Failed to fetch logs' },
                { status: 500 }
            )
        }

        // Step 5 — return logs with pagination info
        return Response.json({
            data,
            pagination: {
                total: count,
                limit,
                offset,
                hasMore: offset + limit < (count ?? 0)
            }
        })

    } catch (err) {
        console.error('Unexpected error:', err)
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}