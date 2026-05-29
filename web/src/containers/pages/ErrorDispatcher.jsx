import React from "react";
import { useLocation } from "react-router-dom";
import Error401 from "../errors/error401";
import Error403 from "../errors/error403";
import Error500 from "../errors/error500";
import Error503 from "../errors/error503";
import ErrorLanding from "./ErrorLanding";

const INTERNAL = { 401: Error401, 403: Error403, 500: Error500, 503: Error503 };

/**
 * Decide qué página de error mostrar.
 *  - Si la ruta empieza con /app o /admin → componente interno
 *  - Cualquier otro caso → ErrorLanding con código apropiado
 */
export default function ErrorDispatcher({ code }) {
  const { pathname } = useLocation();
  const isInternal = pathname.startsWith("/app") || pathname.startsWith("/admin");

  if (isInternal && INTERNAL[code]) {
    const InternalComp = INTERNAL[code];
    return <InternalComp />;
  }

  return <ErrorLanding code={String(code)} />;
}
