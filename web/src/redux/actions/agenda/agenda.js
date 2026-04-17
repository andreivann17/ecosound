import axios from "axios";
import {
  FETCH_AGENDA_FAILURE,
  FETCH_AGENDA_SUCCESS,
  FETCH_AGENDA_REQUEST,
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
const fetchAgendaRequest = () => ({
  type: FETCH_AGENDA_REQUEST,
});

const fetchAgendaSuccess = (payload) => ({
  type: FETCH_AGENDA_SUCCESS,
  payload,
});

const fetchAgendaFailure = (message) => ({
  type: FETCH_AGENDA_FAILURE,
  payload: { error: message },
});

export const actionAgendaPost = (payload = {}) => {
  return async (dispatch) => {
    dispatch(fetchAgendaRequest());
    try {
      const resp = await apiServicePost.post("agenda/filter", payload, {
        headers: { ...authHeader() },
      });
      dispatch(fetchAgendaSuccess(resp.data));
      return resp.data;
    } catch (error) {
      // Token caducado o inválido
      if (error?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("tokenadmin");
        window.location.href = "/login";
        return;
      }

      const msg = handleApiError(dispatch, error, "Error al cargar agenda");
      dispatch(fetchAgendaFailure(msg));
      throw error;
    }
  };
};


export const actionAgendaGet = (params = {}) => {
  return async (dispatch) => {
    dispatch(fetchAgendaRequest());
    try {
      const resp = await apiServiceGet.get("agenda", {
        headers: { ...authHeader() },
        params,
      });
      dispatch(fetchAgendaSuccess(resp.data));
      return resp.data;
    } catch (error) {
      const msg = handleApiError(dispatch, error, "Error al cargar agenda");
      dispatch(fetchAgendaFailure(msg));
      throw error;
    }
  };
};

/**
 * GET ONE (GET /agenda/{id})
 */
export const actionAgendaGetById = (idAgenda) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get(`agenda/${idAgenda}`, {
        headers: { ...authHeader() },
      });
      return resp.data;
    } catch (error) {
      const msg = handleApiError(dispatch, error, "Error al cargar evento");
      dispatch(fetchAgendaFailure(msg));
      throw error;
    }
  };
};

/**
 * CREATE (POST /agenda)
 */
export const actionAgendaCreate = (
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

        const resp = await apiForm.post("agenda", fd, {
          headers: { ...authHeader() },
        });

        await dispatch(actionAgendaGet(refreshParams));
        onDone(resp.data);
        return resp.data;
      }

      // Si NO hay documento -> JSON normal
      const resp = await apiServicePost.post("agenda", payload, {
        headers: { ...authHeader() },
      });

      await dispatch(actionAgendaGet(refreshParams));
      onDone(resp.data);
      return resp.data;
    } catch (error) {
      const msg = handleApiError(dispatch, error, "No se pudo crear el evento");
      dispatch(fetchAgendaFailure(msg));
      throw error;
    }
  };
};
/**
 * UPDATE (PUT /agenda/{id})
 */
export const actionAgendaUpdate = (
  idAgenda,
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

        const resp = await apiForm.put(`agenda/${encodeURIComponent(idAgenda)}`, fd, {
          headers: { ...authHeader() },
        });

        await dispatch(actionAgendaGet(refreshParams));
        onDone(resp.data);
        return resp.data;
      }

      // Si NO hay documento -> JSON normal
      const resp = await apiServicePost.put(`agenda/${idAgenda}`, payload, {
        headers: { ...authHeader() },
      });

      await dispatch(actionAgendaGet(refreshParams));
      onDone(resp.data);
      return resp.data;
    } catch (error) {
      const msg = handleApiError(dispatch, error, "No se pudo actualizar el evento");
      dispatch(fetchAgendaFailure(msg));
      throw error;
    }
  };
};
/**
 * DELETE (DELETE /agenda/{id})
 */
export const actionAgendaDelete = (
  idAgenda,
  refreshParams = {},
  onDone = () => {}
) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.delete(`agenda/${idAgenda}`, {
        headers: { ...authHeader() },
      });

      await dispatch(actionAgendaGet(refreshParams));
      onDone(resp.data);
      return resp.data;
    } catch (error) {
      const msg = handleApiError(
        dispatch,
        error,
        "No se pudo eliminar el evento"
      );
      dispatch(fetchAgendaFailure(msg));
      throw error;
    }
  };
};
