import OpenAI from "openai";

import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

async function normalizeImage(
  file: File,
  width: number,
  height: number,
  fitMode: "preserve" | "fill"
) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (fitMode === "fill") {
    return sharp(buffer)
      .resize(width, height, { fit: "cover" })
      .png()
      .toBuffer();
  }

  return sharp(buffer)
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .png()
    .toBuffer();
}

async function buildComposite(
  main: File,
  refs: File[],
  size: "1280x720" | "720x1280",
  fitMode: "preserve" | "fill"
) {
  const [w, h] = size.split("x").map(Number);

  if (refs.length === 0) {
    return normalizeImage(main, w, h, fitMode);
  }

  const mainHeight = Math.floor(h * 0.7);
  const stripHeight = h - mainHeight;
  const refWidth = Math.floor(w / refs.length);

  const mainBuf = await normalizeImage(main, w, mainHeight, fitMode);

  const refBufs = await Promise.all(
    refs.map((r) => normalizeImage(r, refWidth, stripHeight, fitMode))
  );

  const composite = sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: "black",
    },
  });

  const layers: any[] = [
    { input: mainBuf, top: 0, left: 0 },
  ];

  refBufs.forEach((buf, i) => {
    layers.push({
      input: buf,
      top: mainHeight,
      left: i * refWidth,
    });
  });

  return composite.composite(layers).png().toBuffer();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const file = form.get("file") as File | null;
    const refs = form.getAll("references") as File[];
    const prompt = String(form.get("prompt") ?? "");
    const seconds = String(form.get("seconds") ?? "8");
    const size = String(form.get("size") ?? "1280x720") as
      | "1280x720"
      | "720x1280";
    const fitMode = (form.get("fitMode") ?? "preserve") as
      | "preserve"
      | "fill";

    if (!file) return jsonError("Missing image");

    const composite = await buildComposite(file, refs, size, fitMode);

    const base64 = composite.toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    const job = await openai.videos.create({
      model: "sora-2",
      prompt,
      seconds: seconds as any,
      size: size as any,
      input_reference: {
        image_url: dataUrl,
      } as any,
    } as any);
  
    return Response.json({
      id: job.id,
      status: job.status,
    });
  } catch (err: any) {
    console.error(err);
    return jsonError(err.message, 500);
  }
}
