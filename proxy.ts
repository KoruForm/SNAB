import { NextResponse, type NextRequest } from "next/server";
import { comingSoonHome, previewCookie, previewKey } from "./lib/launch";

// While the coming soon teaser is on, hide the app: every page except the teaser redirects home,
// unless this browser has opened the private preview link (see lib/launch.ts).
export function proxy(request: NextRequest) {
  if (!comingSoonHome) return NextResponse.next();
  const { pathname, searchParams } = request.nextUrl;
  const key = previewKey();

  const preview = searchParams.get("preview");
  if ((key && preview === key) || preview === "off") {
    const url = request.nextUrl.clone();
    url.search = "";
    url.pathname = preview === "off" ? "/" : "/welcome";
    const response = NextResponse.redirect(url);
    if (preview === "off") response.cookies.delete(previewCookie);
    else if (key) response.cookies.set(previewCookie, key, { path: "/", maxAge: 60 * 60 * 24 * 180, httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:" });
    return response;
  }

  if (pathname === "/" || pathname === "/coming-soon") return NextResponse.next();
  if (key && request.cookies.get(previewCookie)?.value === key) return NextResponse.next();

  const home = request.nextUrl.clone();
  home.pathname = "/";
  home.search = "";
  return NextResponse.redirect(home);
}

// Skip Next's own files, the API and anything with a file extension (images, fonts, the manifest).
export const config = { matcher: ["/((?!_next/|api/|.*\\..*).*)"] };
