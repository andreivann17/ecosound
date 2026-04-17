// redux/actions/autoridades/autoridades.js
import axios from "axios";
import {
  FETCH_AUTORIDADES_FAILURE,
  FETCH_AUTORIDADES_SUCCESS,
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
const fetchAutoridadesSuccess = (payload) => ({
  type: FETCH_AUTORIDADES_SUCCESS,
  payload,
});

const fetchAutoridadesFailure = (message) => ({
  type: FETCH_AUTORIDADES_FAILURE,
  payload: { error: message },
});

/**
 * LIST (GET /autoridades)
 */
export const actionAutoridadesGet = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("autoridades?tipo_autoridad=1", {
        headers: { ...authHeader() },
      });
      dispatch(fetchAutoridadesSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "Error al cargar autoridades";
      dispatch(fetchAutoridadesFailure(msg));
    }
  };
};
export const actionAutoridadesTribunalGet = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("autoridades?tipo_autoridad=2", {
        headers: { ...authHeader() },
      });
      dispatch(fetchAutoridadesSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "Error al cargar autoridades";
      dispatch(fetchAutoridadesFailure(msg));
    }
  };
};
/**
 * CARDS (GET /autoridades/cards)
 */
export const actionAutoridadesCards = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("autoridades/cards", {
        headers: { ...authHeader() },
      });
      dispatch(fetchAutoridadesSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "Error al cargar autoridades";
      dispatch(fetchAutoridadesFailure(msg));
    }
  };
};

/**
 * CREATE (POST /autoridades)
 * payload: { nombre, id_user_created?, id_user_updated?, active? }
 */
export const actionAutoridadCreate = (payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.post("autoridades", payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionAutoridadesGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "No se pudo crear la autoridad";
      dispatch(fetchAutoridadesFailure(msg));
      throw error;
    }
  };
};

/**
 * GET BY CODE (GET /autoridades/code/{code})
 */
export const actionAutoridadGetByCode = (code) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get(`autoridades/code/${encodeURIComponent(code)}`, {
        headers: { ...authHeader() },
      });
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "Error al cargar autoridad";
      dispatch(fetchAutoridadesFailure(msg));
      throw error;
    }
  };
};

/**
 * UPDATE BY CODE (PATCH /autoridades/code/{code})
 */
export const actionAutoridadUpdateByCode = (code, payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.patch(`autoridades/code/${encodeURIComponent(code)}`, payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionAutoridadesGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "No se pudo actualizar la autoridad";
      dispatch(fetchAutoridadesFailure(msg));
      throw error;
    }
  };
};

/**
 * DELETE BY CODE (DELETE /autoridades/code/{code}) — soft delete active=0
 */
export const actionAutoridadDeleteByCode = (code, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServiceGet.delete(`autoridades/code/${encodeURIComponent(code)}`, {
        headers: { ...authHeader() },
      });
      await dispatch(actionAutoridadesGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "No se pudo eliminar la autoridad";
      dispatch(fetchAutoridadesFailure(msg));
      throw error;
    }
  };
};
