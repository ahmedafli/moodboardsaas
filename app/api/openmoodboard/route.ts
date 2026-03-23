import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_OPEN_MOODBOARD_WEBHOOK;

    if (!webhookUrl) {
      return NextResponse.json({ message: "Webhook URL not configured" }, { status: 500 });
    }

    const response = await fetch(webhookUrl);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Open Moodboard Proxy Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
