import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return Response.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { data, error } = await supabase
            .from('milestones')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (error) {
            // PGRST116 = no row found
            // First time user visits milestones — no row exists yet
            if (error.code === 'PGRST116') {
                return Response.json({
                    data: {
                        oss_prs: 0,
                        real_users: 0,
                    }
                })
            }

            console.error('Milestones fetch error:', error)
            return Response.json(
                { error: 'Failed to fetch milestones' },
                { status: 500 }
            )
        }

        return Response.json({ data })

    } catch (err) {
        console.error('Unexpected error:', err)
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}


// ─────────────────────────────────────────
// PATCH /api/milestones
// Update milestone numbers
// ─────────────────────────────────────────
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return Response.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { oss_prs, real_users } = body

        // At least one field must be provided
        if (oss_prs === undefined && real_users === undefined) {
            return Response.json(
                { error: 'Provide at least oss_prs or real_users' },
                { status: 400 }
            )
        }

        // Validate — numbers only, no negatives
        if (oss_prs !== undefined && (typeof oss_prs !== 'number' || oss_prs < 0)) {
            return Response.json(
                { error: 'oss_prs must be a positive number' },
                { status: 400 }
            )
        }

        if (real_users !== undefined && (typeof real_users !== 'number' || real_users < 0)) {
            return Response.json(
                { error: 'real_users must be a positive number' },
                { status: 400 }
            )
        }

        // Build update payload — only include fields that were sent
        const updatePayload: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        }
        if (oss_prs !== undefined) updatePayload.oss_prs = oss_prs
        if (real_users !== undefined) updatePayload.real_users = real_users

        // Upsert — create the row if it doesn't exist yet
        // First time user updates milestones, the row gets created automatically
        const { data, error } = await supabase
            .from('milestones')
            .upsert(
                {
                    user_id: user.id,
                    ...updatePayload
                },
                {
                    onConflict: 'user_id'  // one row per user
                }
            )
            .select()
            .single()

        if (error) {
            console.error('Milestones update error:', error)
            return Response.json(
                { error: 'Failed to update milestones' },
                { status: 500 }
            )
        }

        return Response.json({
            message: 'Milestones updated',
            data
        })

    } catch (err) {
        console.error('Unexpected error:', err)
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}