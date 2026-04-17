// redux/actions/materias/materias.js
import axios from "axios";
import {
  FETCH_MATERIAS_FAILURE,
  FETCH_MATERIAS_SUCCESS,
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
const fetchMateriasSuccess = (payload) => ({
  type: FETCH_MATERIAS_SUCCESS,
  payload,
});

const fetchMateriasFailure = (message) => ({
  type: FETCH_MATERIAS_FAILURE,
  payload: { error: message },
});

/**
 * LIST (GET /materias)
 */
export const actionMateriasGet = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("materias?tipo_materia=1", {
        headers: { ...authHeader() },
      });
      dispatch(fetchMateriasSuccess(resp.data));
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "Error al cargar materias";
      dispatch(fetchMateriasFailure(msg));
    }
  };
};

/**
 * CARDS (GET /materias/cards)
 */
export const actionMateriasCards = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("materias/cards", {
        headers: { ...authHeader() },
      });
      dispatch(fetchMateriasSuccess(resp.data));
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "Error al cargar materias";
      dispatch(fetchMateriasFailure(msg));
    }
  };
};

/**
 * CREATE (POST /materias)
 * payload: { nombre, id_user_created?, id_user_updated?, active? }
 */
export const actionMateriaCreate = (payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.post("materias", payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionMateriasGet());
      onDone();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "No se pudo crear la materia";
      dispatch(fetchMateriasFailure(msg));
      throw error;
    }
  };
};

/**
 * GET BY CODE (GET /materias/code/{code})
 */
export const actionMateriaGetByCode = (code) => {
  return async () => {
    const resp = await apiServiceGet.get(`materias/code/${encodeURIComponent(code)}`, {
      headers: { ...authHeader() },
    });
    return resp.data;
  };
};

/**
 * UPDATE BY CODE (PATCH /materias/code/{code})
 */
export const actionMateriaUpdateByCode = (code, payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.patch(`materias/code/${encodeURIComponent(code)}`, payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionMateriasGet());
      onDone();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "No se pudo actualizar la materia";
      dispatch(fetchMateriasFailure(msg));
      throw error;
    }
  };
};

/**
 * DELETE BY CODE (DELETE /materias/code/{code}) — soft delete active=0
 */
export const actionMateriaDeleteByCode = (code, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServiceGet.delete(`materias/code/${encodeURIComponent(code)}`, {
        headers: { ...authHeader() },
      });
      await dispatch(actionMateriasGet());
      onDone();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "No se pudo eliminar la materia";
      dispatch(fetchMateriasFailure(msg));
      throw error;
    }
  };
};
