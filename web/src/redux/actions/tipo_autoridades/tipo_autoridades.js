// redux/actions/tipo_autoridades/tipo_autoridades.js
import axios from "axios";
import {
  FETCH_TIPO_AUTORIDADES_FAILURE,
  FETCH_TIPO_AUTORIDADES_SUCCESS,
} from "./types";
import {PATH} from "../../utils"
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

// ========= Action creators =========
const fetchTipo_autoridadesSuccess = (payload) => ({
  type: FETCH_TIPO_AUTORIDADES_SUCCESS,
  payload,
});

const fetchTipo_autoridadesFailure = (message) => ({
  type: FETCH_TIPO_AUTORIDADES_FAILURE,
  payload: { error: message },
});

/**
 * LIST (GET /tipo_autoridades)
 */
export const actionTipo_autoridadesGet = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("tipo-autoridades", {
        headers: { ...authHeader() },
      });
      dispatch(fetchTipo_autoridadesSuccess(resp.data));
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "Error al cargar tipo_autoridades";
      dispatch(fetchTipo_autoridadesFailure(msg));
    }
  };
};

/**
 * CARDS (GET /tipo_autoridades/cards)
 */
export const actionTipo_autoridadesCards = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("tipo-autoridades/cards", {
        headers: { ...authHeader() },
      });
      dispatch(fetchTipo_autoridadesSuccess(resp.data));
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "Error al cargar tipo_autoridades";
      dispatch(fetchTipo_autoridadesFailure(msg));
    }
  };
};

/**
 * CREATE (POST /tipo_autoridades)
 * payload: { nombre, id_user_created?, id_user_updated?, active? }
 */
export const actionTipo_autoridadCreate = (payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.post("tipo-autoridades", payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionTipo_autoridadesGet());
      onDone();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "No se pudo crear la tipo_autoridad";
      dispatch(fetchTipo_autoridadesFailure(msg));
      throw error;
    }
  };
};

/**
 * GET BY CODE (GET /tipo_autoridades/code/{code})
 */
export const actionTipo_autoridadGetByCode = (code) => {
  return async () => {
    const resp = await apiServiceGet.get(`tipo-autoridades/code/${encodeURIComponent(code)}`, {
      headers: { ...authHeader() },
    });
    return resp.data;
  };
};

/**
 * UPDATE BY CODE (PATCH /tipo_autoridades/code/{code})
 */
export const actionTipo_autoridadUpdateByCode = (code, payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.patch(`tipo-autoridades/code/${encodeURIComponent(code)}`, payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionTipo_autoridadesGet());
      onDone();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "No se pudo actualizar la tipo_autoridad";
      dispatch(fetchTipo_autoridadesFailure(msg));
      throw error;
    }
  };
};

/**
 * DELETE BY CODE (DELETE /tipo_autoridades/code/{code}) — soft delete active=0
 */
export const actionTipo_autoridadDeleteByCode = (code, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServiceGet.delete(`tipo-autoridades/code/${encodeURIComponent(code)}`, {
        headers: { ...authHeader() },
      });
      await dispatch(actionTipo_autoridadesGet());
      onDone();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "No se pudo eliminar la tipo_autoridad";
      dispatch(fetchTipo_autoridadesFailure(msg));
      throw error;
    }
  };
};
