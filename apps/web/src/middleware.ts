import { NextResponse, type NextRequest } from "next/server";
import { getAdminAccess } from "@/lib/adminAccess";

/**
 * Runs on every request under /admin (documents, client navigations and RSC
 * fetches alike), so a child page can never render without the role check.
 * The layout still renders the friendly gate; this is the enforcement point.
 */
export async function middleware(req: NextRequest) {
  const access = await getAdminAccess(req.headers.get("cookie"));
  if (access.status === "admin") return NextResponse.next();
  return NextResponse.rewrite(new URL("/admin/denied", req.url));
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
