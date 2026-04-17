// PRODUCCION
//export const PATH = "/api";
//export const WS_PATH = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;

// DESARROLLO
export const PATH = `http://${window.location.hostname}:8000`;
export const WS_PATH = `ws://${window.location.hostname}:8000`;