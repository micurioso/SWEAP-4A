import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const ADMIN_PREFIXES = ["/admin"];
const MEMBER_EDITOR_PREFIXES = ["/admin/forms"];
const MEMBER_EDITOR_SUFFIXES = ["/edit", "/new"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/api/register" ||
    pathname === "/api/register/check" ||
    pathname === "/member-update" ||
    pathname.startsWith("/api/members/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth/");
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Admin / encoder gate
  const isEditorPrefix = MEMBER_EDITOR_PREFIXES.some(p => pathname.startsWith(p));
  const needsAdmin = !isEditorPrefix && ADMIN_PREFIXES.some(p => pathname.startsWith(p));
  const needsMemberEditor = isEditorPrefix || MEMBER_EDITOR_SUFFIXES.some(s => pathname.endsWith(s));
  if (user && (needsAdmin || needsMemberEditor)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();
    const isAdmin = !!profile && profile.is_active && profile.role === "admin";
    const isEditor = !!profile && profile.is_active && (profile.role === "admin" || profile.role === "encoder");
    const allowed = needsAdmin ? isAdmin : isEditor;
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("error", "forbidden");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
