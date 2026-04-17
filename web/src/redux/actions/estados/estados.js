// redux/actions/estados/estados.js
import axios from "axios";
import {
  FETCH_ESTADOS_FAILURE,
  FETCH_ESTADOS_SUCCESS,
} from "./types";
import {PATH} from "../../utils"
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
  const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ========= 401 helper =========
const handle401 = (dispatch) => {
  localStorage.removeItem("token");
  localStorage.removeItem("tokenadmin");
  if (dispatch) dispatch({ type: SESSION_EXPIRED });
};

// ========= Action creators =========
const fetchEstadosSuccess = (payload) => ({
  type: FETCH_ESTADOS_SUCCESS,
  payload,
});

const fetchEstadosFailure = (message) => ({
  type: FETCH_ESTADOS_FAILURE,
  payload: { error: message },
});

/**
 * LIST (GET /estados)
 */
export const actionEstadosGet = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("estados", {
        headers: { ...authHeader() },
      });
      dispatch(fetchEstadosSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar estados";
      dispatch(fetchEstadosFailure(msg));
    }
  };
};

/**
 * CARDS (GET /estados/cards)
 */
export const actionEstadosCards = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("estados/cards", {
        headers: { ...authHeader() },
      });
      dispatch(fetchEstadosSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar estados";
      dispatch(fetchEstadosFailure(msg));
    }
  };
};

/**
 * CREATE (POST /estados)
 * payload: { nombre, active? }
 */
export const actionEstadoCreate = (payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.post("estados", payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionEstadosGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo crear el estado";
      dispatch(fetchEstadosFailure(msg));
      throw error;
    }
  };
};

/**
 * GET BY CODE (GET /estados/code/{code})
 *
 * Nota: aquí NO hay dispatch porque tu firma es return async () => {}
 * No se dispara SESSION_EXPIRED en 401 sin cambiar estructura.
 */
export const actionEstadoGetByCode = (code) => {
  return async () => {
    const resp = await apiServiceGet.get(`estados/code/${encodeURIComponent(code)}`, {
      headers: { ...authHeader() },
    });
    return resp.data;
  };
};

/**
 * UPDATE BY CODE (PATCH /estados/code/{code})
 */
export const actionEstadoUpdateByCode = (code, payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.patch(`estados/code/${encodeURIComponent(code)}`, payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionEstadosGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo actualizar el estado";
      dispatch(fetchEstadosFailure(msg));
      throw error;
    }
  };
};

/**
 * DELETE BY CODE (DELETE /estados/code/{code}) — soft delete active=0
 */
export const actionEstadoDeleteByCode = (code, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServiceGet.delete(`estados/code/${encodeURIComponent(code)}`, {
        headers: { ...authHeader() },
      });
      await dispatch(actionEstadosGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo eliminar el estado";
      dispatch(fetchEstadosFailure(msg));
      throw error;
    }
  };
};
