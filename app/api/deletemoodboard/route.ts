import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export async function POST(request: Request) {
  try {
    const webhookUrl = process.env.DELETE_MOODBOARD_WEBHOOK;
    if (!webhookUrl) {
      return NextResponse.json({ message: "Delete moodboard webhook not configured" }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const moodboardname = typeof body?.moodboardname === "string" ? body.moodboardname.trim() : "";

    if (!moodboardname) {
      return NextResponse.json({ message: "moodboardname is required" }, { status: 400 });
    }

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        moodboardname,
      }),
    });

    let responseData: unknown = null;
    try {
      responseData = await webhookResponse.json();
    } catch {
      responseData = { message: webhookResponse.ok ? "Delete request sent" : "Delete webhook failed" };
    }

    return NextResponse.json(responseData, { status: webhookResponse.status });
  } catch (error) {
    console.error("Delete Moodboard Proxy Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
