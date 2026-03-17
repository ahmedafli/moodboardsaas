import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Call the n8n webhook
    const webhookUrl = process.env.N8N_REMOVE_BG_WEBHOOK;

    if (!webhookUrl) {
      console.error('N8N_REMOVE_BG_WEBHOOK is missing in .env.local');
      return NextResponse.json(
        { error: 'Webhook configuration is missing' },
        { status: 500 }
      );
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to process image with webhook' },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    let newImageUrl = image; // fallback to original

    try {
      const data = JSON.parse(responseText);
      if (data && data.imageUrl) {
        newImageUrl = data.imageUrl;
      }
    } catch (err) {
      // Ignore parse error
    }

    // Proxy the image to bypass Google Drive's restrictive rendering policies
    // Only wrap if it's a direct drive link and not already proxied
    if (newImageUrl.includes('drive.google.com') && !newImageUrl.startsWith('/api/proxy-image')) {
      newImageUrl = `/api/proxy-image?url=${encodeURIComponent(newImageUrl)}`;
    }

    return NextResponse.json({ imageUrl: newImageUrl });
  } catch (error) {
    console.error('Error in remove-bg API route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
