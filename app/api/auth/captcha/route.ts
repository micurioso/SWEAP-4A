import { NextResponse } from "next/server";
import { createCaptchaChallenge } from "@/lib/captcha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await createCaptchaChallenge(), {
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}
