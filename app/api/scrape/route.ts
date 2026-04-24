import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export async function POST(req: NextRequest) {
    const WEBHOOK_URL = process.env.WEBHOOK_SCRAPE_URL;

    if (!WEBHOOK_URL) {
        return NextResponse.json(
            { error: "Webhook URL is not configured." },
            { status: 500 }
        );
    }
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();

        const webhookResponse = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...body,
                user_id: user.id,
            }),
        });

        if (!webhookResponse.ok) {
            return NextResponse.json(
                { error: `Webhook returned status ${webhookResponse.status}` },
                { status: webhookResponse.status }
            );
        }

        const data = await webhookResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Scrape API error:", error);
        return NextResponse.json(
            { error: "Failed to reach the scraping service." },
            { status: 500 }
        );
    }
}
