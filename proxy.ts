import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("pp_session")?.value
  const isAuthed = Boolean(token)
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/dashboard") && !isAuthed) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  if ((pathname === "/auth/login" || pathname === "/auth/sign-up") && isAuthed) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
