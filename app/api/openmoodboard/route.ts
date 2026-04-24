import { NextResponse } from 'next/server';
import { createClient } from "../../../utils/supabase/server";

type CachedResult = {
  data: any;
  status: number;
};

type RecentResult = CachedResult & {
  cachedAt: number;
};

const inFlightByUser = new Map<string, Promise<CachedResult>>();
const recentByUser = new Map<string, RecentResult>();
const DEDUPE_WINDOW_MS = 3000;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const webhookUrl = process.env.OPEN_MOODBOARD_WEBHOOK;

    if (!webhookUrl) {
      return NextResponse.json({ message: "Webhook URL not configured" }, { status: 500 });
    }

    const existingRequest = inFlightByUser.get(user.id);
    if (existingRequest) {
      const cached = await existingRequest;
      return NextResponse.json(cached.data, { status: cached.status });
    }

    const recent = recentByUser.get(user.id);
    if (recent && Date.now() - recent.cachedAt < DEDUPE_WINDOW_MS) {
      return NextResponse.json(recent.data, { status: recent.status });
    }

    const webhookRequest = (async (): Promise<CachedResult> => {
      try {
        const url = new URL(webhookUrl);
        url.searchParams.set("user_id", user.id);

        const response = await fetch(url.toString());
        const data = await response.json();
        const result = { data, status: response.status };
        recentByUser.set(user.id, { ...result, cachedAt: Date.now() });
        return result;
      } finally {
        inFlightByUser.delete(user.id);
      }
    })();

    inFlightByUser.set(user.id, webhookRequest);
    const result = await webhookRequest;
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Open Moodboard Proxy Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
