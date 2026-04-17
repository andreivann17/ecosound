import axios from "axios";
import {
  FETCH_NOTIFICACIONES_FAILURE,
  FETCH_NOTIFICACIONES_SUCCESS,
  FETCH_NOTIFICACIONES_REQUEST,
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
const apiForm = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "multipart/form-data" },
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

const handleApiError = (dispatch, error, fallbackMsg) => {
  const status = error?.response?.status;

  if (status === 401) {
    clearTokens();
    if (dispatch) dispatch({ type: SESSION_EXPIRED });
    return "Tu sesión ha expirado. Autentícate nuevamente.";
  }

  return extractErrorMessage(error, fallbackMsg);
};

// ========= Actions =========
const fetchNotificacionesRequest = () => ({
  type: FETCH_NOTIFICACIONES_REQUEST,
});

const fetchNotificacionesSuccess = (payload) => ({
  type: FETCH_NOTIFICACIONES_SUCCESS,
  payload,
});

const fetchNotificacionesFailure = (message) => ({
  type: FETCH_NOTIFICACIONES_FAILURE,
  payload: { error: message },
});



export const actionNotificacionesGet = (params = {}) => {
  return async (dispatch) => {
    dispatch(fetchNotificacionesRequest());
    try {
      const resp = await apiServiceGet.get("notificaciones", {
        headers: { ...authHeader() },
        params,
      });
      dispatch(fetchNotificacionesSuccess(resp.data));
      return resp.data;
    } catch (error) {
      const msg = handleApiError(dispatch, error, "Error al cargar notificaciones");
      dispatch(fetchNotificacionesFailure(msg));
      throw error;
    }
  };
};

/**
 * GET ONE (GET /notificaciones/{id})
 */
export const actionNotificacionesGetById = (idNotificaciones) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get(`notificaciones/${idNotificaciones}`, {
        headers: { ...authHeader() },
      });
      return resp.data;
    } catch (error) {
      const msg = handleApiError(dispatch, error, "Error al cargar evento");
      dispatch(fetchNotificacionesFailure(msg));
      throw error;
    }
  };
};

/**
 * CREATE (POST /notificaciones)
 */
export const actionNotificacionesCreate = (
  payload,
  refreshParams = {},
  onDone = () => {},
  filesMap = null
) => {
  return async (dispatch) => {
    try {
      // Si hay documento -> multipart
      if (filesMap && filesMap.documento) {
        const jsonPayload = { ...payload };

        const fd = new FormData();
        fd.append("payload", JSON.stringify(jsonPayload));

        const doc = filesMap.documento?.originFileObj || filesMap.documento;
        if (doc) {
          fd.append("documento", doc, doc.name || "documento");
        }

        const resp = await apiForm.post("notificaciones", fd, {
          headers: { ...authHeader() },
        });

        await dispatch(actionNotificacionesGet(refreshParams));
        onDone(resp.data);
        return resp.data;
      }

      // Si NO hay documento -> JSON normal
      const resp = await apiServicePost.post("notificaciones", payload, {
        headers: { ...authHeader() },
      });

      await dispatch(actionNotificacionesGet(refreshParams));
      onDone(resp.data);
      return resp.data;
    } catch (error) {
      const msg = handleApiError(dispatch, error, "No se pudo crear el evento");
      dispatch(fetchNotificacionesFailure(msg));
      throw error;
    }
  };
};
/**
 * UPDATE (PUT /notificaciones/{id})
 */
export const actionNotificacionesUpdate = (
  idNotificaciones,
  payload,
  refreshParams = {},
  onDone = () => {},
  filesMap = null
) => {
  return async (dispatch) => {
    try {
      // Si hay documento -> multipart
      if (filesMap && filesMap.documento) {
        const jsonPayload = { ...payload };

        const fd = new FormData();
        fd.append("payload", JSON.stringify(jsonPayload));

        const doc = filesMap.documento?.originFileObj || filesMap.documento;
        if (doc) {
          fd.append("documento", doc, doc.name || "documento");
        }

        const resp = await apiForm.put(`notificaciones/${encodeURIComponent(idNotificaciones)}`, fd, {
          headers: { ...authHeader() },
        });

        await dispatch(actionNotificacionesGet(refreshParams));
        onDone(resp.data);
        return resp.data;
      }

      // Si NO hay documento -> JSON normal
      const resp = await apiServicePost.put(`notificaciones/${idNotificaciones}`, payload, {
        headers: { ...authHeader() },
      });

      await dispatch(actionNotificacionesGet(refreshParams));
      onDone(resp.data);
      return resp.data;
    } catch (error) {
      const msg = handleApiError(dispatch, error, "No se pudo actualizar el evento");
      dispatch(fetchNotificacionesFailure(msg));
      throw error;
    }
  };
};
/**
 * DELETE (DELETE /notificaciones/{id})
 */
export const actionNotificacionesDelete = (
  idNotificaciones,
  refreshParams = {},
  onDone = () => {}
) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.delete(`notificaciones/${idNotificaciones}`, {
        headers: { ...authHeader() },
      });

      await dispatch(actionNotificacionesGet(refreshParams));
      onDone(resp.data);
      return resp.data;
    } catch (error) {
      const msg = handleApiError(
        dispatch,
        error,
        "No se pudo eliminar el evento"
      );
      dispatch(fetchNotificacionesFailure(msg));
      throw error;
    }
  };
};
