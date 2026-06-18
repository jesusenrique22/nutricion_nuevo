import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = Boolean(req.auth);
  const role = req.auth?.user?.role;

  const isDashboard = nextUrl.pathname.startsWith("/dashboard");
  const isAdminArea = nextUrl.pathname.startsWith("/dashboard/admin");
  const isAuthPage =
    nextUrl.pathname === "/login" || nextUrl.pathname === "/register";

  // Usuario logueado intentando entrar a login/register -> al dashboard
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Zona protegida sin sesión -> login
  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Zona admin para no-admin -> dashboard
  if (isAdminArea && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // CV solo visible embebido en /nutricionista/especialidad (admin puede abrir el archivo)
  if (nextUrl.pathname.startsWith("/uploads/cv/")) {
    if (role !== "ADMIN") {
      return new NextResponse("No encontrado", { status: 404 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/register",
    "/uploads/cv/:path*",
  ],
};
