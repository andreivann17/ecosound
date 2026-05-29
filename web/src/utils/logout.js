import axios from "axios";
import { PATH } from "../redux/utils";
import store from "../store";
import { sessionManager } from "../redux/sessionManager";

// Acción que el rootReducer escucha para limpiar el estado de Redux.
export const USER_LOGOUT = "USER_LOGOUT";

// Claves de localStorage que pertenecen a la SESIÓN del usuario que está
// cerrando sesión. Se borran todas en cada logout.
//
// ⚠️ Importante: NO se borran claves "preciadas" del equipo (por ejemplo
// `email_history`, cachés de imágenes, recursos estáticos, etc.) para que
// no se pierdan entre usuarios.
const SESSION_KEYS = [
  "token",
  "tokenadmin",
  "email",
  "role",
  "activeButtonAdmin",
  "activeButtonUser",
  "userAvatar",
  "notif_last_seen",
  "last_login",
];

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (_) {}
}

/**
 * Cierra sesión de forma COMPLETA:
 *   1. Avisa al backend (best-effort, no bloquea si falla).
 *   2. Borra tokens y datos de la sesión actual en localStorage.
 *   3. Limpia sessionStorage (datos efímeros de la pestaña).
 *   4. Cancela cualquier refresh de sesión en curso.
 *   5. Resetea el store de Redux despachando USER_LOGOUT.
 *   6. Reemplaza la entrada del historial y recarga al login, de modo que
 *      el botón "atrás" del navegador NO regrese a una página autenticada.
 *
 * @param {Object}  opts
 * @param {boolean} opts.admin       true si quien cierra sesión es admin
 * @param {string}  [opts.redirectTo] ruta a la que redirigir tras cerrar
 */
export async function performLogout({ admin = false, redirectTo } = {}) {
  const token =
    localStorage.getItem("token") || localStorage.getItem("tokenadmin");

  // 1) Aviso al backend. No bloquea: si falla igual cerramos sesión local.
  try {
    await axios.post(
      `${PATH}/auth/logout`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        // Marca para que el interceptor 401 no dispare el modal de reauth.
        _retryAuth: true,
        timeout: 5000,
      }
    );
  } catch (_) {
    /* swallow */
  }

  // 2) Borrar tokens y datos de la sesión actual.
  SESSION_KEYS.forEach(safeRemove);

  // 3) sessionStorage: todo es de esta pestaña/sesión.
  try {
    sessionStorage.clear();
  } catch (_) {}

  // 4) Cancelar refresh pendiente para evitar callbacks colgados.
  try {
    sessionManager.onAuthFailure();
  } catch (_) {}

  // 5) Reset del store de Redux. El rootReducer detecta USER_LOGOUT y
  //    devuelve el estado inicial de todos los reducers.
  try {
    store.dispatch({ type: USER_LOGOUT });
  } catch (_) {}

  // 6) Reemplazar historial + hard reload → bloquea botón "atrás".
  //    replaceState quita la página actual del historial; location.replace
  //    fuerza una carga limpia, así no queda estado de React/Redux residual.
  const target = redirectTo || (admin ? "/admin-login" : "/login");
  try {
    window.history.replaceState(null, "", target);
  } catch (_) {}
  window.location.replace(target);
}
