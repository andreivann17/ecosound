import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { PATH } from "../redux/utils";
import { isTokenExpired } from "../utils/tokenUtils";

// Un token presente pero vencido (que no se limpió porque el usuario nunca
// pasó por el loader de /app/*) debe tratarse como "sin sesión" para efectos
// de tema — si no, una pantalla pública como /login podía heredar el color
// de la última sesión autenticada.
function getValidToken() {
  const token = localStorage.getItem("token");
  return token && !isTokenExpired(token) ? token : null;
}

// Garantía extra: cualquier pantalla de login (genérica, admin o /:clave)
// nunca debe recibir el tema dinámico global, sin importar si hay un token
// (válido o no) guardado en este navegador. El branding de /:clave/login lo
// resuelve esa página por su cuenta, de forma local.
function isLoginRoute() {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  return p === "/login" || p === "/admin-login" || /^\/[^/]+\/login$/.test(p);
}

const TemaContext = createContext(null);

const DEFAULT_TEMA = { plan_deluxe: 0 };
const CACHE_KEY = "tema_cache";

// Preferencia de apariencia (claro/oscuro/auto) elegida por el propio usuario
// en su Perfil — independiente del branding del cliente (arriba). "auto"
// sigue prefers-color-scheme del sistema/navegador.
const PREFERENCIA_CACHE_KEY = "tema_preferencia_cache";

function readCachedPreferencia() {
  try {
    return localStorage.getItem(PREFERENCIA_CACHE_KEY) || "auto";
  } catch {
    return "auto";
  }
}

function writeCachedPreferencia(preferencia) {
  try {
    localStorage.setItem(PREFERENCIA_CACHE_KEY, preferencia || "auto");
  } catch {}
}

function systemPrefersDark() {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolveDark(preferencia) {
  if (preferencia === "oscuro") return true;
  if (preferencia === "claro") return false;
  return systemPrefersDark();
}

function applyContentTheme(preferencia) {
  document.documentElement.setAttribute(
    "data-eh-content-theme",
    resolveDark(preferencia) ? "dark" : "light"
  );
}

function readCachedTema() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) || DEFAULT_TEMA : DEFAULT_TEMA;
  } catch {
    return DEFAULT_TEMA;
  }
}

function writeCachedTema(tema) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(tema || DEFAULT_TEMA));
  } catch {}
}

// Caché por clave, compartido entre login.jsx (tarjeta) y electron_view.js
// (barra superior) para /:clave/login — evita el parpadeo "fábrica -> mi
// diseño" en ambos, aplicando de inmediato lo último visto para esa clave.
const CLAVE_CACHE_PREFIX = "tema_clave_cache_";

export function readClaveCache(clave) {
  if (!clave) return null;
  try {
    const raw = localStorage.getItem(CLAVE_CACHE_PREFIX + clave);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeClaveCache(clave, data) {
  if (!clave) return;
  try {
    localStorage.setItem(CLAVE_CACHE_PREFIX + clave, JSON.stringify(data));
  } catch {}
}

export function logoUrlFromPath(path) {
  if (!path) return null;
  return `${PATH}/${String(path).replace(/^\/+/, "")}`;
}

// Aclara (percent > 0) u oscurece (percent < 0) un color hex mezclándolo
// hacia blanco o negro, para poder derivar un segundo tono de degradado
// a partir de un único color dinámico (primary_button_color).
function shadeHex(hex, percent) {
  const clean = String(hex || "").replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(num)) return null;

  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const target = percent < 0 ? 0 : 255;
  const p = Math.min(1, Math.abs(percent));

  const mix = (c) => Math.round(c + (target - c) * p);
  const toHex = (c) => c.toString(16).padStart(2, "0");

  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

// Convierte un hex ("#fff" / "#ffffff") al triplete "r,g,b" que usan las
// reglas rgba(var(--eh-nav-fg-rgb), X) en styles.css. Retorna null si el
// hex no es válido, para poder hacer fallback al blanco por defecto.
function hexToRgbTriplet(hex) {
  const clean = String(hex || "").replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(num)) return null;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `${r},${g},${b}`;
}

// Tono derivado para el segundo stop de un degradado: si el color base es
// oscuro lo aclaramos, si es claro lo oscurecemos, para que el fade siempre
// se note (nunca queda un color plano). Para colores casi negros usamos un
// aclarado sutil (no queremos que el segundo stop se vea gris claro).
function gradientShade(hex) {
  const clean = String(hex || "").replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(num)) return null;

  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return shadeHex(hex, luminance > 0.5 ? -0.35 : 0.15);
}

function applyTemaVars(tema) {
  const root = document.documentElement;
  if (tema?.plan_deluxe === 1) {
    if (tema.navbar_color) root.style.setProperty("--eh-navbar-bg", tema.navbar_color);
    if (tema.header_color) root.style.setProperty("--eh-header-bg", tema.header_color);
    if (tema.color_primary_active_nabvar) root.style.setProperty("--eh-active-color", tema.color_primary_active_nabvar);
    if (tema.primary_button_color) {
      root.style.setProperty("--eh-primary-btn", tema.primary_button_color);
      const shade = gradientShade(tema.primary_button_color);
      if (shade) root.style.setProperty("--eh-primary-btn-2", shade);
    }
    // Color del texto/íconos del navbar: viene directo de text_color_navbar
    // (campo explícito que el admin elige), NO se infiere de dark_design —
    // son dos configuraciones independientes a propósito.
    const navFg = hexToRgbTriplet(tema.text_color_navbar);
    if (navFg) root.style.setProperty("--eh-nav-fg-rgb", navFg);
    else root.style.removeProperty("--eh-nav-fg-rgb");
  } else {
    root.style.removeProperty("--eh-navbar-bg");
    root.style.removeProperty("--eh-header-bg");
    root.style.removeProperty("--eh-active-color");
    root.style.removeProperty("--eh-primary-btn");
    root.style.removeProperty("--eh-primary-btn-2");
    root.style.removeProperty("--eh-nav-fg-rgb");
  }
  // El claro/oscuro del CONTENIDO ya no depende de dark_design (config de
  // cliente/admin) sino de la preferencia personal del usuario — ver
  // applyContentTheme() más abajo, aplicada por separado en fetchTema().
}

export function TemaProvider({ children }) {
  // El tema dinámico SOLO existe dentro de la app autenticada (navbar,
  // header, botones). Las pantallas de login (/login, /admin-login) son
  // siempre de fábrica — nunca leen ni aplican este contexto.
  //
  // Estado inicial = último tema conocido en este dispositivo, aplicado de
  // forma síncrona ANTES del primer paint (evita el parpadeo azul→color al
  // refrescar una página ya autenticada). Si no hay sesión, se fuerza
  // fábrica de una vez, por si quedó algo aplicado de una sesión anterior.
  const [tema, setTema] = useState(() => {
    if (isLoginRoute() || !getValidToken()) {
      applyTemaVars(DEFAULT_TEMA);
      return DEFAULT_TEMA;
    }
    const cached = readCachedTema();
    applyTemaVars(cached);
    return cached;
  });
  const [preferencia, setPreferencia] = useState(() => {
    if (isLoginRoute() || !getValidToken()) {
      applyContentTheme("claro");
      return "claro";
    }
    const cached = readCachedPreferencia();
    applyContentTheme(cached);
    return cached;
  });
  const [loaded, setLoaded] = useState(false);

  const fetchTema = useCallback(async ({ respectLoginRoute = true } = {}) => {
    // El chequeo de ruta solo aplica al arranque (boot) de la página, donde
    // window.location ya refleja la URL real sin ambigüedad. El evento
    // "permisos-refresh" se dispara justo DESPUÉS de guardar el token pero
    // ANTES de que navigate() actualice la URL (ver redux/actions/login/login.js),
    // así que ahí solo debe importar si el token es válido, no la ruta actual
    // — si no, el tema se quedaba en fábrica hasta el próximo refresh manual.
    const token = respectLoginRoute && isLoginRoute() ? null : getValidToken();

    if (!token) {
      setTema(DEFAULT_TEMA);
      applyTemaVars(DEFAULT_TEMA);
      setPreferencia("claro");
      applyContentTheme("claro");
      setLoaded(true);
      return;
    }

    // Aplica de inmediato lo último cacheado en este dispositivo (si lo hay)
    // ANTES de esperar la red — así al iniciar sesión se salta directo al
    // color correcto en vez de mostrar fábrica mientras responde el fetch.
    // El fetch de abajo solo confirma/actualiza con el dato fresco.
    const cached = readCachedTema();
    setTema(cached);
    applyTemaVars(cached);

    const cachedPreferencia = readCachedPreferencia();
    setPreferencia(cachedPreferencia);
    applyContentTheme(cachedPreferencia);

    try {
      const [temaRes, prefRes] = await Promise.all([
        axios.get(`${PATH}/clientes/tema/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${PATH}/users/me/tema`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const next = temaRes.data || DEFAULT_TEMA;
      setTema(next);
      applyTemaVars(next);
      writeCachedTema(next);

      const nextPreferencia = prefRes.data?.tema_preferencia || "auto";
      setPreferencia(nextPreferencia);
      applyContentTheme(nextPreferencia);
      writeCachedPreferencia(nextPreferencia);
    } catch {
      setTema(DEFAULT_TEMA);
      applyTemaVars(DEFAULT_TEMA);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchTema();
  }, [fetchTema]);

  useEffect(() => {
    const handler = () => fetchTema({ respectLoginRoute: false });
    window.addEventListener("permisos-refresh", handler);
    return () => window.removeEventListener("permisos-refresh", handler);
  }, [fetchTema]);

  // En modo "auto" seguimos prefers-color-scheme en vivo, sin esperar a un
  // refresh de página, por si el usuario cambia el tema del SO mientras
  // tiene la app abierta.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      setPreferencia((current) => {
        if (current === "auto") applyContentTheme("auto");
        return current;
      });
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Actualiza la preferencia del usuario: aplica de inmediato (optimista) y
  // persiste en su perfil para que se recuerde entre dispositivos/sesiones.
  const setTemaPreferencia = useCallback(async (nuevaPreferencia) => {
    const token = getValidToken();
    setPreferencia(nuevaPreferencia);
    applyContentTheme(nuevaPreferencia);
    writeCachedPreferencia(nuevaPreferencia);
    if (!token) return;
    await axios.patch(
      `${PATH}/users/me/tema`,
      { tema_preferencia: nuevaPreferencia },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }, []);

  return (
    <TemaContext.Provider value={{ tema, loaded, refresh: fetchTema, preferencia, setTemaPreferencia }}>
      {children}
    </TemaContext.Provider>
  );
}

export const useTema = () => useContext(TemaContext);
