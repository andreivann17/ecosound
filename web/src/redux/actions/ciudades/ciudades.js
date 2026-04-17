// redux/actions/ciudades/ciudades.js
import axios from "axios";
import {
  FETCH_CIUDADES_FAILURE,
  FETCH_CIUDADES_SUCCESS,
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
const fetchCiudadesSuccess = (payload) => ({
  type: FETCH_CIUDADES_SUCCESS,
  payload,
});

const fetchCiudadesFailure = (message) => ({
  type: FETCH_CIUDADES_FAILURE,
  payload: { error: message },
});

/**
 * LIST (GET /ciudades)
 */
export const actionCiudadesGet = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("ciudades", {
        headers: { ...authHeader() },
      });
      dispatch(fetchCiudadesSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "Error al cargar ciudades";
      dispatch(fetchCiudadesFailure(msg));
    }
  };
};

/**
 * CARDS (GET /ciudades/cards)
 * Nota: este endpoint NO acepta body de filtros en tu backend actual.
 */
export const actionCiudadesCards = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("ciudades/cards", {
        headers: { ...authHeader() },
      });
      dispatch(fetchCiudadesSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "Error al cargar ciudades";
      dispatch(fetchCiudadesFailure(msg));
    }
  };
};

/**
 * CREATE (POST /ciudades)
 * payload esperado: { nombre, id_estado, active? }
 */
export const actionCiudadCreate = (payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.post("ciudades", payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionCiudadesGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "No se pudo crear la ciudad";
      dispatch(fetchCiudadesFailure(msg));
      throw error;
    }
  };
};

/**
 * GET BY CODE (GET /ciudades/code/{code})
 */
export const actionCiudadGetByCode = (code) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get(`ciudades/code/${encodeURIComponent(code)}`, {
        headers: { ...authHeader() },
      });
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "Error al cargar ciudad";
      dispatch(fetchCiudadesFailure(msg));
      throw error;
    }
  };
};

/**
 * UPDATE BY CODE (PATCH /ciudades/code/{code})
 */
export const actionCiudadUpdateByCode = (code, payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.patch(`ciudades/code/${encodeURIComponent(code)}`, payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionCiudadesGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "No se pudo actualizar la ciudad";
      dispatch(fetchCiudadesFailure(msg));
      throw error;
    }
  };
};

/**
 * DELETE BY CODE (DELETE /ciudades/code/{code})
 * Soft delete en backend: active = 0
 */
export const actionCiudadDeleteByCode = (code, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServiceGet.delete(`ciudades/code/${encodeURIComponent(code)}`, {
        headers: { ...authHeader() },
      });
      await dispatch(actionCiudadesGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "No se pudo eliminar la ciudad";
      dispatch(fetchCiudadesFailure(msg));
      throw error;
    }
  };
};
