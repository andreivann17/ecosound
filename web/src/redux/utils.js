// Detectamos si estamos en local o en el servidor
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
console.log(isLocal)
// --- CONFIGURACIÓN DE RUTAS ---

// Si es local, usa el puerto 8000. Si es producción, usa la ruta relativa /api que maneja Nginx.
export const PATH = isLocal 
    ? `http://${window.location.hostname}:8000` 
    : `https://${window.location.hostname}/api`;

// Si es local, usa ws. Si es producción, usa wss y deja que Nginx haga el trabajo en el puerto 443.
export const WS_PATH = isLocal
    ? `ws://${window.location.hostname}:8000`
    : `wss://${window.location.hostname}`;

// El módulo Evaluation corre como servicio independiente (proceso propio,
// puerto propio) — a propósito NO comparte proceso con el backend de
// HerrSoft Events, para que nada de ahí pueda tumbar la app principal.
// En producción, Nginx debe enrutar /evaluation-api hacia ese proceso
// (igual que /api ya enruta hacia el backend principal).
export const EVALUATION_PATH = isLocal
    ? `http://${window.location.hostname}:8001`
    : `https://${window.location.hostname}/evaluation-api`;