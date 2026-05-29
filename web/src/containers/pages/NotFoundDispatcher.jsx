import React from "react";
import { useLocation } from "react-router-dom";
import NotFound from "../errors/error404";
import ErrorLanding from "./ErrorLanding";

/**
 * Decide qué página de "no encontrado" mostrar según la ruta actual.
 *  - /app/*    → NotFound interno (shell de la app)
 *  - /admin/*  → NotFound interno (shell de la app)
 *  - cualquier otra ruta → ErrorLanding (con LandingLayout)
 */
export default function NotFoundDispatcher() {
  const { pathname } = useLocation();
  const isInternal = pathname.startsWith("/app") || pathname.startsWith("/admin");
  return isInternal ? <NotFound /> : <ErrorLanding code="404" />;
}
