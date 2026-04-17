// redux/actions/objetos/objetos.js
import axios from "axios";
import {
  FETCH_OBJETOS_FAILURE,
  FETCH_OBJETOS_SUCCESS,
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
const fetchObjetosSuccess = (payload) => ({
  type: FETCH_OBJETOS_SUCCESS,
  payload,
});

const fetchObjetosFailure = (message) => ({
  type: FETCH_OBJETOS_FAILURE,
  payload: { error: message },
});

/**
 * LIST (GET /objetos)
 */
export const actionObjetosGet = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("objetos", {
        headers: { ...authHeader() },
      });
      dispatch(fetchObjetosSuccess(resp.data));
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "Error al cargar objetos";
      dispatch(fetchObjetosFailure(msg));
    }
  };
};

/**
 * CARDS (GET /objetos/cards)
 */
export const actionObjetosCards = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("objetos/cards", {
        headers: { ...authHeader() },
      });
      dispatch(fetchObjetosSuccess(resp.data));
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "Error al cargar objetos";
      dispatch(fetchObjetosFailure(msg));
    }
  };
};

/**
 * CREATE (POST /objetos)
 * payload: { nombre, id_user_created?, id_user_updated?, active? }
 */
export const actionObjetoCreate = (payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.post("objetos", payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionObjetosGet());
      onDone();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "No se pudo crear el objeto";
      dispatch(fetchObjetosFailure(msg));
      throw error;
    }
  };
};

/**
 * GET BY CODE (GET /objetos/code/{code})
 */
export const actionObjetoGetByCode = (code) => {
  return async () => {
    const resp = await apiServiceGet.get(`objetos/code/${encodeURIComponent(code)}`, {
      headers: { ...authHeader() },
    });
    return resp.data;
  };
};

/**
 * UPDATE BY CODE (PATCH /objetos/code/{code})
 */
export const actionObjetoUpdateByCode = (code, payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.patch(`objetos/code/${encodeURIComponent(code)}`, payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionObjetosGet());
      onDone();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "No se pudo actualizar el objeto";
      dispatch(fetchObjetosFailure(msg));
      throw error;
    }
  };
};

/**
 * DELETE BY CODE (DELETE /objetos/code/{code}) — soft delete active=0
 */
export const actionObjetoDeleteByCode = (code, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServiceGet.delete(`objetos/code/${encodeURIComponent(code)}`, {
        headers: { ...authHeader() },
      });
      await dispatch(actionObjetosGet());
      onDone();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "No se pudo eliminar el objeto";
      dispatch(fetchObjetosFailure(msg));
      throw error;
    }
  };
};
