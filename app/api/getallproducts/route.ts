import { NextResponse } from "next/server";
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhookUrl = process.env.N8N_GETALLPRODUCTS_WEBHOOK;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "N8N Webhook URL is not configured in environment variables" },
        { status: 500 }
      );
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

        if (!response.ok) {
          return {
            data: { error: "Failed to fetch products from N8N" },
            status: response.status,
          };
        }

        const data = await response.json();
        const result = { data, status: 200 };
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
    console.error("Error fetching all products:", error);
    return NextResponse.json(
      { error: "Internal server error fetching products" },
      { status: 500 }
    );
  }
}
