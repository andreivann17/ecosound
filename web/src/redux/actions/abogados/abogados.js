// redux/actions/abogados/abogados.js
import axios from "axios";
import {
  FETCH_ABOGADOS_FAILURE,
  FETCH_ABOGADOS_SUCCESS,
} from "./types";
import {PATH} from "../../utils"
// IMPORTANTE:
// Define este type en tu reducer de auth (o donde manejes sesión).
// Aquí lo dejo como string paraf no romper imports.
const SESSION_EXPIRED = "SESSION_EXPIRED";

// ========= Instancias =========
const API_BASE = `${PATH}`;

const apiServiceGet = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

const apiServicePost = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ========= Auth header =========
const authHeader = () => {
  const token =
    localStorage.getItem("tokenadmin") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ========= Helpers =========
const clearTokens = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("tokenadmin");
};

const extractErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

/**
 * Manejo centralizado:
 * - Si 401: limpia tokens + dispatch SESSION_EXPIRED
 * - Devuelve mensaje para UI/Redux
 */
const handleApiError = (dispatch, error, fallbackMsg) => {
  const status = error?.response?.status;

  if (status === 401) {
    clearTokens();
    if (dispatch) dispatch({ type: SESSION_EXPIRED });
    return "Tu sesión ha expirado. Autentícate nuevamente.";
  }

  return extractErrorMessage(error, fallbackMsg);
};

// ========= Action creators =========
const fetchAbogadosSuccess = (payload) => ({
  type: FETCH_ABOGADOS_SUCCESS,
  payload,
});

const fetchAbogadosFailure = (message) => ({
  type: FETCH_ABOGADOS_FAILURE,
  payload: { error: message },
});

/**
 * LIST (GET /abogados)
 */
export const actionAbogadosGet = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("abogados", {
        headers: { ...authHeader() },
      });

      dispatch(fetchAbogadosSuccess(resp.data));
    } catch (error) {
      const msg = handleApiError(dispatch, error, "Error al cargar abogados");
      dispatch(fetchAbogadosFailure(msg));
    }
  };
};

/**
 * CARDS (GET /abogados/cards)
 */
export const actionAbogadosCards = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("abogados/cards", {
        headers: { ...authHeader() },
      });
      dispatch(fetchAbogadosSuccess(resp.data));
    } catch (error) {
      const msg = handleApiError(dispatch, error, "Error al cargar abogados");
      dispatch(fetchAbogadosFailure(msg));
    }
  };
};

/**
 * CREATE (POST /abogados)
 * payload: { nombre, id_user_created?, id_user_updated?, active? }
 */
export const actionAbogadoCreate = (payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.post("abogados", payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionAbogadosGet());
      onDone();
    } catch (error) {
      const msg = handleApiError(
        dispatch,
        error,
        "No se pudo crear el abogado"
      );
      dispatch(fetchAbogadosFailure(msg));
      throw error;
    }
  };
};

/**
 * GET BY CODE (GET /abogados/code/{code})
 * OJO: ahora sí recibe dispatch para poder disparar SESSION_EXPIRED si hay 401
 */
export const actionAbogadoGetByCode = (code) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get(
        `abogados/code/${encodeURIComponent(code)}`,
        {
          headers: { ...authHeader() },
        }
      );
      return resp.data;
    } catch (error) {
      const msg = handleApiError(
        dispatch,
        error,
        "No se pudo obtener el abogado"
      );
      dispatch(fetchAbogadosFailure(msg));
      throw error;
    }
  };
};

/**
 * UPDATE BY CODE (PATCH /abogados/code/{code})
 */
export const actionAbogadoUpdateByCode = (code, payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.patch(
        `abogados/code/${encodeURIComponent(code)}`,
        payload,
        {
          headers: { ...authHeader() },
        }
      );
      await dispatch(actionAbogadosGet());
      onDone();
    } catch (error) {
      const msg = handleApiError(
        dispatch,
        error,
        "No se pudo actualizar el abogado"
      );
      dispatch(fetchAbogadosFailure(msg));
      throw error;
    }
  };
};

/**
 * DELETE BY CODE (DELETE /abogados/code/{code}) — soft delete active=0
 */
export const actionAbogadoDeleteByCode = (code, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServiceGet.delete(`abogados/code/${encodeURIComponent(code)}`, {
        headers: { ...authHeader() },
      });
      await dispatch(actionAbogadosGet());
      onDone();
    } catch (error) {
      const msg = handleApiError(
        dispatch,
        error,
        "No se pudo eliminar el abogado"
      );
      dispatch(fetchAbogadosFailure(msg));
      throw error;
    }
  };
};
