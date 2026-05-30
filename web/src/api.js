// Resolución del API URL:
// 1) Si está definida REACT_APP_API_URL al build, gana
// 2) Si el navegador no es localhost (producción detrás de nginx en herrsoft.com),
//    usar ruta relativa /api — nginx la proxy_pass al backend interno
// 3) En desarrollo local, fallback al backend FastAPI en 127.0.0.1:8000
function resolveApiUrl() {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "";
    if (!isLocal) return "/api";
  }
  return "http://127.0.0.1:8000";
}

export const API_URL = resolveApiUrl();
