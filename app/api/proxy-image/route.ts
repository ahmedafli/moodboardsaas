import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper function to convert Google Drive URLs to a format that returns actual images
function convertGoogleDriveUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Check if it's a Google Drive URL
    if (urlObj.hostname === 'drive.google.com') {
      // Extract file ID from various Google Drive URL formats
      let fileId: string | null = null;
      
      // Format: https://drive.google.com/uc?export=view&id=FILE_ID
      if (urlObj.pathname === '/uc' && urlObj.searchParams.has('id')) {
        fileId = urlObj.searchParams.get('id');
      }
      // Format: https://drive.google.com/thumbnail?id=FILE_ID
      else if (urlObj.pathname === '/thumbnail' && urlObj.searchParams.has('id')) {
        fileId = urlObj.searchParams.get('id');
      }
      // Format: https://drive.google.com/file/d/FILE_ID/view
      else if (urlObj.pathname.startsWith('/file/d/')) {
        const match = urlObj.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
          fileId = match[1];
        }
      }
      // Format: https://drive.google.com/open?id=FILE_ID
      else if (urlObj.searchParams.has('id')) {
        fileId = urlObj.searchParams.get('id');
      }
      
      if (fileId) {
        // Use the high-performance direct link which is optimized for images 
        // and preserves the alpha channel (transparency) flawlessly.
        return `https://lh3.googleusercontent.com/d/${fileId}=w2000`;
      }
    }
    
    return url;
  } catch (error) {
    return url;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  try {
    const url = new URL(imageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
    }

    const convertedUrl = convertGoogleDriveUrl(imageUrl);

    const response = await fetch(convertedUrl, {
      cache: 'force-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
      },
      redirect: 'follow', 
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch original image' }, { status: response.status });
    }

    // Check if the response is actually an image (Google Drive might return HTML for private files)
    const contentType = response.headers.get('content-type') || 'image/png';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ 
        error: 'Image not accessible. Make sure the Google Drive file is publicly shared.' 
      }, { status: 403 });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
