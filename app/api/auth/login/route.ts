import { NextResponse } from "next/server";
import { verifyCaptcha } from "@/lib/captcha";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function hasRealValue(value: string | undefined) {
  return Boolean(value && !/placeholder|your-|replace-with/i.test(value));
}

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!hasRealValue(url)) return false;

  try {
    new URL(url!);
  } catch {
    return false;
  }

  return (
    hasRealValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    hasRealValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identifier = String(body?.identifier ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const captchaToken = String(body?.captchaToken ?? "");
  const captchaAnswer = String(body?.captchaAnswer ?? "");

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Authentication is not configured on this localhost. Add the Supabase credentials to .env.local and restart the server."
      },
      { status: 503 }
    );
  }

  if (!verifyCaptcha(captchaToken, captchaAnswer)) {
    return NextResponse.json(
      { error: "The security code is incorrect or expired. Try a new code." },
      { status: 400 }
    );
  }

  let email = identifier;
  if (!identifier.includes("@")) {
    if (!/^[a-zA-Z0-9ñÑ._-]+$/u.test(identifier)) {
      return NextResponse.json({ error: "Invalid username." }, { status: 400 });
    }

    let data: { email: string } | null = null;
    try {
      const result = await createAdminClient()
        .from("profiles")
        .select("email")
        .eq("username", identifier)
        .maybeSingle();
      data = result.data;

      if (result.error) {
        return NextResponse.json(
          { error: "The authentication service is temporarily unavailable." },
          { status: 503 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "The authentication service is temporarily unavailable." },
        { status: 503 }
      );
    }
    if (!data) {
      return NextResponse.json({ error: "Username not found" }, { status: 404 });
    }
    email = data.email;
  }

  let error: { message: string } | null = null;
  try {
    const result = await createClient().auth.signInWithPassword({ email, password });
    error = result.error;
  } catch {
    return NextResponse.json(
      { error: "The authentication service is temporarily unavailable." },
      { status: 503 }
    );
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
