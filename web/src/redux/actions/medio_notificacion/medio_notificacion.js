// redux/actions/medio-notificacion/medio-notificacion.js
import axios from "axios";

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



/**
 * LIST (GET /medio-notificacion)
 */
export const actionMedioNotificacionGet = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("medio-notificacion", {
        headers: { ...authHeader() },
      });
      console.log(resp.data)
      return resp.data;
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "Error al cargar medio-notificacion";
     return msg;
    }
  };
};



/**
 * CREATE (POST /medio-notificacion)
 * payload: { nombre, id_user_created?, id_user_updated?, active? }
 */
export const actionMedioNotificacionCreate = (payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.post("medio-notificacion", payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionMedioNotificacionGet());
      onDone();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "No se pudo crear el abogado";
      throw error;
    }
  };
};

/**
 * GET BY CODE (GET /medio-notificacion/code/{code})
 */
export const actionMedioNotificacionGetByCode = (code) => {
  return async () => {
    const resp = await apiServiceGet.get(`medio-notificacion/code/${encodeURIComponent(code)}`, {
      headers: { ...authHeader() },
    });
    return resp.data;
  };
};

/**
 * UPDATE BY CODE (PATCH /medio-notificacion/code/{code})
 */
export const actionMedioNotificacionUpdateByCode = (code, payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServicePost.patch(`medio-notificacion/code/${encodeURIComponent(code)}`, payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionMedioNotificacionGet());
      onDone();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "No se pudo actualizar el abogado";
      throw error;
    }
  };
};

/**
 * DELETE BY CODE (DELETE /medio-notificacion/code/{code}) — soft delete active=0
 */
export const actionMedioNotificacionDeleteByCode = (code, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServiceGet.delete(`medio-notificacion/code/${encodeURIComponent(code)}`, {
        headers: { ...authHeader() },
      });
      await dispatch(actionMedioNotificacionGet());
      onDone();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || "No se pudo eliminar el abogado";
      throw error;
    }
  };
};
