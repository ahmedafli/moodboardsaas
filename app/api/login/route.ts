import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const webhookUrl = process.env.LOGIN_WEBHOOK;

    if (!webhookUrl) {
      return NextResponse.json({ message: "Webhook URL not configured" }, { status: 500 });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Login Proxy Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
