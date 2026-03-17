import { NextResponse } from "next/server";

export async function GET() {
  try {
    const webhookUrl = process.env.N8N_GETALLPRODUCTS_WEBHOOK;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "N8N Webhook URL is not configured in environment variables" },
        { status: 500 }
      );
    }

    const response = await fetch(webhookUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch products from N8N" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching all products:", error);
    return NextResponse.json(
      { error: "Internal server error fetching products" },
      { status: 500 }
    );
  }
}
