import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

const WAVESPEED_API_URL = process.env.WAVESPEED_API_URL;

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to generate images." },
        { status: 401 }
      );
    }

    // 2. PRE-DEDUCT 1 credit BEFORE generating (prevents race condition / double-spend)
    // spend_credit uses auth.uid() internally so no user_id is passed from the client.
    const { data: spendResult, error: spendError } = await supabase.rpc("spend_credit");

    if (spendError || !spendResult) {
      console.error("Credit spend error:", spendError);
      return NextResponse.json(
        { error: "Insufficient balance! Please purchase more credits to generate." },
        { status: 403 }
      );
    }

    const {
      background,  // Base64 data URL of the room
      product,     // Base64 data URL of the furniture (reference)
      mask,        // Base64 data URL of the B&W mask (white = area to fill)
      composite,   // Base64 composed canvas
      prompt,
      mode,        // 'mask' or 'drag'
      width,
      height
    } = await request.json();

    if (!background || (mode === 'mask' && !mask)) {
      return NextResponse.json(
        { error: "Background image and mask are required in Mask Mode" },
        { status: 400 }
      );
    }

    // Pull the API key from environment variables
    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "WaveSpeed API key is not configured" },
        { status: 500 }
      );
    }

    if (!WAVESPEED_API_URL) {
      return NextResponse.json(
        { error: "WaveSpeed API URL is not configured in .env.local. Please restart npm run dev." },
        { status: 500 }
      );
    }

    console.log(`Starting WaveSpeed AI generation with flux-2-klein-9b/edit in ${mode?.toUpperCase() || 'UNKNOWN'} mode...`);

    // Strip the data URL prefix "data:image/png;base64," to pass raw base64
    const stripDataUrl = (dataUrl: string | null): string | null => {
      if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;
      return dataUrl.startsWith("data:") ? dataUrl.split(",")[1] : dataUrl;
    };

    const cleanComposite = stripDataUrl(composite);
    const cleanProduct = stripDataUrl(product);

    let editPrompt = "";
    let imagesArray = [];
    let generationStrength = 0.95;

    if (mode === 'drag') {
      // In Drag Mode, the 'composite' is the room with the furniture ALREADY drawn on it.
      // We send it solo, asking the AI to harmonize and blend the flat cutout into the room.
      editPrompt = `Harmonize the recently placed furniture item in the room shown in Figure 1. Match the room's lighting, scale, and architectural perspective perfectly. Add realistic shadows to ground the item on the floor. Photorealistic interior design.`;

      if (prompt) {
        editPrompt += ` Additional styling details for the item: ${prompt}.`;
      }

      imagesArray = [cleanComposite];
      generationStrength = 0.5; // Lower strength for harmonization so we don't completely change the room or item
    } else {
      // Mask Mode Logic
      editPrompt = cleanProduct
        ? `Insert the furniture item shown in Figure 1 in place of the solid orange drawn area in Figure 2. Perfectly match the room's lighting, scale, and architectural perspective. Ensure the final result looks like a photorealistic interior design, removing all traces of the orange color.`
        : `Replace the solid orange area in Figure 1 with this item: "${prompt}". Match the lighting and scale perfectly.`;

      if (cleanProduct && prompt) {
        editPrompt += ` Additional styling details for the item: ${prompt}.`;
      }

      if (cleanProduct) {
        imagesArray = [cleanProduct, cleanComposite];
      } else {
        imagesArray = [cleanComposite];
      }
      generationStrength = 0.95; // High strength to completely remove the orange mask
    }

    // Prepare WaveSpeed flux-2-klein-9b/edit properties
    const wavespeedPayload: any = {
      prompt: editPrompt,
      images: imagesArray,
      strength: generationStrength,
      num_inference_steps: 25,
      guidance_scale: 3.5
    };

    // Explicitly pass the size string to prevent the model from assuming 1024x1024 ratio and cropping
    if (width && height) {
      wavespeedPayload.size = `${width}*${height}`;
    }

    // 3. Credit already deducted — now attempt the WaveSpeed generation.
    //    If ANYTHING fails from here, we REFUND the credit.
    try {
      const response = await fetch(WAVESPEED_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(wavespeedPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("WaveSpeed API Error:", errorData);
        // REFUND the credit since generation failed
        await supabase.rpc("refund_credit");
        return NextResponse.json(
          { error: errorData.message || errorData.error || `WaveSpeed API returned ${response.status}` },
          { status: response.status }
        );
      }

      const responseJson = await response.json();
      console.log("WaveSpeed initial response received format:", JSON.stringify(responseJson).substring(0, 200));

      // WaveSpeed AI returns an async prediction task that we must poll
      let payload = responseJson.data || responseJson;

      // If the task gives us a 'get' URL, we need to poll it until completion
      if (payload.urls && payload.urls.get) {
        const pollUrl = payload.urls.get;
        let status = payload.status;
        let attempts = 0;

        console.log(`Polling WaveSpeed AI at ${pollUrl}...`);

        // Poll every 1-2 seconds (max 60 seconds)
        while ((status === "created" || status === "starting" || status === "processing") && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 2000));

          const pollRes = await fetch(pollUrl, {
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            }
          });

          if (pollRes.ok) {
            const pollData = await pollRes.json();
            payload = pollData.data || pollData;
            status = payload.status;
            console.log(`Poll ${attempts + 1}: status = ${status}`);
          } else {
            console.log(`Poll error: status ${pollRes.status}`);
          }
          attempts++;
        }

        if (status !== "succeeded" && status !== "success" && status !== "completed") {
          // REFUND the credit since generation timed out / failed
          await supabase.rpc("refund_credit");
          return NextResponse.json(
            { error: `Generation timed out or failed with status: ${status}` },
            { status: 500 }
          );
        }
      }

      // Extract the generated image URL
      let imageUrl = null;
      if (payload.outputs && Array.isArray(payload.outputs) && payload.outputs.length > 0) {
        imageUrl = payload.outputs[0];
      } else if (payload.output && Array.isArray(payload.output) && payload.output.length > 0) {
        imageUrl = payload.output[0];
      } else if (typeof payload.output === 'string') {
        imageUrl = payload.output;
      } else if (payload.image_url) {
        imageUrl = payload.image_url;
      }

      // Check if the response image is raw base64 instead of a URL/DataURI
      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
        imageUrl = `data:image/png;base64,${imageUrl}`;
      }

      if (!imageUrl) {
        console.error("Unexpected response format:", JSON.stringify(payload).substring(0, 500));
        // REFUND the credit since we couldn't extract the result
        await supabase.rpc("refund_credit");
        return NextResponse.json(
          { error: "Could not extract image from response" },
          { status: 500 }
        );
      }

      // SUCCESS — credit was already deducted, image is ready!
      return NextResponse.json({ imageUrl });

    } catch (generationError: any) {
      // If anything crashed during the generation pipeline, REFUND
      console.error("Generation pipeline error, refunding credit:", generationError);
      await supabase.rpc("refund_credit");
      throw generationError; // re-throw so the outer catch handles the response
    }

  } catch (error: any) {
    console.error("Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
