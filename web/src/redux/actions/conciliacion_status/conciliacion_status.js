// redux/actions/conciliacion_status/conciliacion_status.js
import axios from "axios";
import {
  FETCH_CONCILIACION_STATUS_FAILURE,
  FETCH_CONCILIACION_STATUS_SUCCESS,
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
const fetchConciliacionStatusSuccess = (payload) => ({
  type: FETCH_CONCILIACION_STATUS_SUCCESS,
  payload,
});

const fetchConciliacionStatusFailure = (message) => ({
  type: FETCH_CONCILIACION_STATUS_FAILURE,
  payload: { error: message },
});

/**
 * LIST (GET /conciliacion-status)
 */
export const actionConciliacionStatusGet = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("conciliacion-status", {
        headers: { ...authHeader() },
      });
      dispatch(fetchConciliacionStatusSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar estatus de conciliación";
      dispatch(fetchConciliacionStatusFailure(msg));
    }
  };
};

/**
 * CARDS (GET /conciliacion-status/cards)
 */
export const actionConciliacionStatusCards = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("conciliacion-status/cards", {
        headers: { ...authHeader() },
      });
      dispatch(fetchConciliacionStatusSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar estatus de conciliación";
      dispatch(fetchConciliacionStatusFailure(msg));
    }
  };
};

/**
 * CREATE (POST /conciliacion-status)
 * payload: { status, id_user_created?, id_user_updated?, active? }
 */
export const actionConciliacionStatusCreate = (payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.post("conciliacion-status", payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionConciliacionStatusGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo crear el estatus";
      dispatch(fetchConciliacionStatusFailure(msg));
      throw error;
    }
  };
};

/**
 * GET BY CODE (GET /conciliacion-status/code/{code})
 * code = valor exacto del campo 'status'
 *
 * Nota: aquí NO hay dispatch porque tu firma es return async () => {}
 * No se dispara SESSION_EXPIRED en 401 sin cambiar estructura.
 */
export const actionConciliacionStatusGetByCode = (code) => {
  return async () => {
    const resp = await apiServiceGet.get(
      `conciliacion-status/code/${encodeURIComponent(code)}`,
      { headers: { ...authHeader() } }
    );
    return resp.data;
  };
};

/**
 * UPDATE BY CODE (PATCH /conciliacion-status/code/{code})
 */
export const actionConciliacionStatusUpdateByCode = (code, payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.patch(
        `conciliacion-status/code/${encodeURIComponent(code)}`,
        payload,
        { headers: { ...authHeader() } }
      );
      await dispatch(actionConciliacionStatusGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo actualizar el estatus";
      dispatch(fetchConciliacionStatusFailure(msg));
      throw error;
    }
  };
};

/**
 * DELETE BY CODE (DELETE /conciliacion-status/code/{code}) — soft delete active=0
 */
export const actionConciliacionStatusDeleteByCode = (code, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServiceGet.delete(
        `conciliacion-status/code/${encodeURIComponent(code)}`,
        { headers: { ...authHeader() } }
      );
      await dispatch(actionConciliacionStatusGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo eliminar el estatus";
      dispatch(fetchConciliacionStatusFailure(msg));
      throw error;
    }
  };
};
