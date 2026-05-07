import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const error_description = searchParams.get("error_description");

    if (error) {
        console.error("OAuth Error:", error, error_description);
        return NextResponse.redirect(`${origin}/?error=${error_description}`);
    }

    if (code) {
        const supabase = await createClient();
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
            console.error("Exchange Error:", exchangeError);
            return NextResponse.redirect(`${origin}/?error=${exchangeError.message}`);
        }
    }

    return NextResponse.redirect(`${origin}/dashboard`);
}