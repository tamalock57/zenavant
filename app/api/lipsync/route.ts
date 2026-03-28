import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function uint8ArrayFromArrayBuffer(buf: ArrayBuffer) {
  return new Uint8Array(buf);
}

function randName(ext: string) {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
}


/*
STEP 1 — CREATE LIP SYNC JOB
POST /api/lipsync
*/
export async function POST(req: Request) {
  try {

    const token = process.env.REPLICATE_API_TOKEN;

    if (!token) {
      return Response.json(
        { error: "Missing REPLICATE_API_TOKEN" },
        { status: 500 }
      );
    }

    const form = await req.formData();

    const videoUrl = String(form.get("videoUrl") ?? "").trim();
    const audioFile = form.get("audio");

    if (!videoUrl) {
      return Response.json(
        { error: "Missing videoUrl" },
        { status: 400 }
      );
    }

    if (!(audioFile instanceof File)) {
      return Response.json(
        { error: "Missing audio file" },
        { status: 400 }
      );
    }


    /*
    Upload WAV audio to Supabase
    Replicate must access audio via URL
    */

    const audioBuffer = await audioFile.arrayBuffer();
    const audioBytes = uint8ArrayFromArrayBuffer(audioBuffer);

    const audioName = randName("wav");
    const audioPath = `audio/${audioName}`;

    const upload = await supabaseAdmin.storage
      .from("media")
      .upload(audioPath, audioBytes, {
        contentType: "audio/wav",
        upsert: false,
      });

    if (upload.error) {
      return Response.json(
        {
          error: "Supabase upload failed",
          details: upload.error.message,
        },
        { status: 500 }
      );
    }


    /*
    Get public audio URL
    */

    const { data: publicData } =
      supabaseAdmin.storage
        .from("media")
        .getPublicUrl(audioPath);

    const audioUrl = publicData?.publicUrl;

    if (!audioUrl) {
      return Response.json(
        { error: "Failed to get public audio URL" },
        { status: 500 }
      );
    }


    /*
    Create Replicate prediction
    Lipsync-2 model
    */

    const createRes = await fetch(
      "https://api.replicate.com/v1/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({

          version:
            "e4f176abd783cefe6a3964de7c951fa2b51a953e0b22431d36658c44d9233d3d",

          input: {
            video: videoUrl,
            audio: audioUrl
          }

        })
      }
    );


    const createText = await createRes.text();

    let createJson: any = null;

    try {
      createJson = JSON.parse(createText);
    } catch {}

    if (!createRes.ok) {
      return Response.json(
        {
          error: "Replicate create failed",
          status: createRes.status,
          details: createJson ?? createText
        },
        { status: 500 }
      );
    }


    return Response.json({
      id: createJson.id,
      status: createJson.status ?? "starting"
    });

  } catch (e: any) {

    return Response.json(
      {
        error: "Lip sync crashed",
        details: e?.message ?? String(e)
      },
      { status: 500 }
    );

  }
}



/*
STEP 2 — POLL STATUS
GET /api/lipsync?id=XXXX
*/
export async function GET(req: Request) {

  try {

    const token = process.env.REPLICATE_API_TOKEN;

    if (!token) {
      return Response.json(
        { error: "Missing REPLICATE_API_TOKEN" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");

    if (!id) {
      return Response.json(
        { error: "Missing id" },
        { status: 400 }
      );
    }


    const res = await fetch(
      `https://api.replicate.com/v1/predictions/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );


    const text = await res.text();

    let json: any = null;

    try {
      json = JSON.parse(text);
    } catch {}


    if (!res.ok) {
      return Response.json(
        {
          error: "Replicate status failed",
          status: res.status,
          details: json ?? text
        },
        { status: 500 }
      );
    }


    const st = json?.status;


    if (st === "succeeded") {

      const out = json?.output;

      const downloadUrl =
        typeof out === "string"
          ? out
          : Array.isArray(out)
          ? out[0]
          : null;


      return Response.json({
        status: "completed",
        downloadUrl
      });

    }


    if (st === "failed") {

      return Response.json({
        status: "failed",
        error: json?.error ?? "Lip sync failed"
      });

    }


    return Response.json({
      status: st ?? "processing"
    });


  } catch (e: any) {

    return Response.json(
      {
        error: "Status check crashed",
        details: e?.message ?? String(e)
      },
      { status: 500 }
    );

  }
}

