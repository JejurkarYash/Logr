import { createClient } from "@/lib/supabase/server"
import { buildWeekDays, roundHours } from '@/lib/helpers/analyze/analyze'
import { NextRequest } from 'next/server'

// Given a Monday date string, compute the Sunday date string
function getWeekEndFromStart(weekStart: string): string {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 6)
    return d.toISOString().split('T')[0]
}

// Get the Monday of the current week
function getCurrentMonday(): string {
    const today = new Date()
    const day = today.getDay() // 0 = Sun, 1 = Mon...
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    return monday.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Optional ?start= param — if absent, defaults to current Monday
        const { searchParams } = new URL(request.url)
        const startParam = searchParams.get('start')
        const weekStart = startParam ?? getCurrentMonday()
        const weekEnd = getWeekEndFromStart(weekStart)

        // Fetch week's logs
        const { data: weekLogs, error: weekError } = await supabase
            .from('daily_logs')
            .select('date, day_type, saas_hours, oss_hours, profile_hours, win, blocker, tomorrow_goal')
            .eq('user_id', user.id)
            .gte('date', weekStart)
            .lte('date', weekEnd)
            .order('date', { ascending: true })

        if (weekError) {
            return Response.json({ error: 'Failed to fetch week logs' }, { status: 500 })
        }

        const days = buildWeekDays(weekStart, weekLogs ?? [])

        const weeklyTotals = {
            saas:    roundHours(days.reduce((s, d) => s + d.saas_hours, 0)),
            oss:     roundHours(days.reduce((s, d) => s + d.oss_hours, 0)),
            profile: roundHours(days.reduce((s, d) => s + d.profile_hours, 0)),
        }

        return Response.json({
            data: {
                week: { start: weekStart, end: weekEnd },
                days,
                weeklyTotals,
            }
        })

    } catch (err) {
        console.error('Unexpected error:', err)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}