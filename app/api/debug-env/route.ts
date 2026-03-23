import { NextResponse } from 'next/server';

// Debug endpoint - visit /api/debug-env on your deployed site to check env vars
export async function GET() {
  return NextResponse.json({
    LOGIN_WEBHOOK: process.env.LOGIN_WEBHOOK ? "✅ SET" : "❌ MISSING",
    OPEN_MOODBOARD_WEBHOOK: process.env.OPEN_MOODBOARD_WEBHOOK ? "✅ SET" : "❌ MISSING",
    SAVE_MOODBOARD_WEBHOOK: process.env.SAVE_MOODBOARD_WEBHOOK ? "✅ SET" : "❌ MISSING",
    WEBHOOK_SCRAPE_URL: process.env.WEBHOOK_SCRAPE_URL ? "✅ SET" : "❌ MISSING",
    N8N_GETALLPRODUCTS_WEBHOOK: process.env.N8N_GETALLPRODUCTS_WEBHOOK ? "✅ SET" : "❌ MISSING",
    N8N_REMOVE_BG_WEBHOOK: process.env.N8N_REMOVE_BG_WEBHOOK ? "✅ SET" : "❌ MISSING",
    NODE_ENV: process.env.NODE_ENV,
  });
}
