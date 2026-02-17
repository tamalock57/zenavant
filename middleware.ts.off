import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Important: set on BOTH request and response objects
          req.cookies.set({ name, value, ...options });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          req.cookies.set({ name, value: "", ...options });
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // This call refreshes session cookies when needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /dashboard
  if (!user && req.nextUrl.pathname.startsWith("/dashboard")) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirectedFrom", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
