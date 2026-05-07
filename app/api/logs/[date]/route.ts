import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
    const { date } = await params;
    try {
        // Step 1 — get supabase client
        const supabase = await createClient();

        // Step 2 — check if user is logged in
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return Response.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Step 3 — fetch log for the specific date
        const { data, error } = await supabase
            .from("daily_logs")
            .select("*")
            .eq("user_id", user.id)
            .eq("date", date)
            .single();

        if (error) {
            console.error("DB fetch error:", error);
            return Response.json(
                { error: "Failed to fetch log" },
                { status: 500 }
            );
        }

        // Step 4 — return the log if found
        return Response.json({ data });
    } catch (err) {
        console.error("Unexpected error:", err);
        return Response.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}



export async function PATCH(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
    const { date } = await params;

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
        )
    }
    const body = await request.json();
    const updateData: Record<string, any> = {};
    if ('saas_hours' in body) updateData.saas_hours = body.saas_hours;
    if ('oss_hours' in body) updateData.oss_hours = body.oss_hours;
    if ('profile_hours' in body) updateData.profile_hours = body.profile_hours;
    if ('win' in body) updateData.win = body.win;
    if ('blocker' in body) updateData.blocker = body.blocker;
    if ('tomorrow_goal' in body) updateData.tomorrow_goal = body.tomorrow_goal;

    const { data, error } = await supabase
        .from("daily_logs")
        .update(updateData)
        .eq("user_id", user.id)
        .eq("date", date)
        .select()
        .single();
    if (error) {
        console.error("DB update error:", error);
        return Response.json(
            {
                error: "Failed to update log"
            },
            {
                status: 500
            }
        );
    }
    return Response.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
    const { date } = await params;
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
        )
    }
    const { data, error } = await supabase
        .from("daily_logs")
        .delete()
        .eq("user_id", user.id)
        .eq("date", date)
        .select()
        .single();
    if (error) {
        console.error("DB delete error:", error);
        return Response.json(
            {
                error: "Failed to delete log"
            },
            {
                status: 500
            }
        );
    }
    return Response.json({ data });
}