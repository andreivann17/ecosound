// Detectamos si estamos en local o en el servidor
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// --- CONFIGURACIÓN DE RUTAS ---

// Si es local, usa el puerto 8000. Si es producción, usa la ruta relativa /api que maneja Nginx.
export const PATH = isLocal 
    ? `http://${window.location.hostname}:8000` 
    : `https://${window.location.hostname}/api`;

// Si es local, usa ws. Si es producción, usa wss y deja que Nginx haga el trabajo en el puerto 443.
export const WS_PATH = isLocal
    ? `ws://${window.location.hostname}:8000`
    : `wss://${window.location.hostname}`;