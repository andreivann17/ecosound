// redux/actions/desvinculaciones/desvinculaciones.js
import axios from "axios";
import {
  FETCH_DESVINCULACIONES_FAILURE,
  FETCH_DESVINCULACIONES_SUCCESS,
  FETCH_AUDIT_LOG_DESVINCULACION_FAILURE,
  FETCH_AUDIT_LOG_DESVINCULACION_SUCCESS,
} from "./types";
import {PATH} from "../../utils"
const SESSION_EXPIRED = "SESSION_EXPIRED";

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
const fetchDesvinculacionesSuccess = (payload) => ({
  type: FETCH_DESVINCULACIONES_SUCCESS,
  payload,
});

const fetchDesvinculacionesFailure = (message) => ({
  type: FETCH_DESVINCULACIONES_FAILURE,
  payload: { error: message },
});

const fetchAuditLogSuccess = (payload) => ({
  type: FETCH_AUDIT_LOG_DESVINCULACION_SUCCESS,
  payload,
});

const fetchAuditLogFailure = (message) => ({
  type: FETCH_AUDIT_LOG_DESVINCULACION_FAILURE,
  payload: { error: message },
});

// =========================
// AUDIT LOG - helpers
// =========================
const buildQuery = (params = {}) => {
  const qp = new URLSearchParams();

  const add = (k, v) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (!s) return;
    qp.set(k, s);
  };

  add("id_modulo", params.id_modulo);
  add("id_key", params.id_key);
  add("action", params.action);
  add("id_user", params.id_user);
  add("date_from", params.date_from);
  add("date_to", params.date_to);

  // paginación
  add("limit", params.limit !== undefined && params.limit !== null ? params.limit : 50);
  add("offset", params.offset !== undefined && params.offset !== null ? params.offset : 0);

  const qs = qp.toString();
  return qs ? `?${qs}` : "";
};

/* ========= Helpers (FormData como tu ejemplo: payload JSON + documento binary) ========= */
const normalizeFile = (f) => {
  if (!f) return null;

  // AntD UploadFile
  if (f.originFileObj) return f.originFileObj;

  // File/Blob directo
  if (typeof Blob !== "undefined" && f instanceof Blob) return f;

  return null;
};

const buildFormData = (payload, filesMap) => {
  const fd = new FormData();
  fd.append("payload", JSON.stringify(payload || {}));

  if (filesMap) {
    const doc = normalizeFile(filesMap.documento);
    if (doc) {
      fd.append("documento", doc, doc.name || "documento");
    }
  }

  return fd;
};

const hasDocumento = (filesMap) => {
  if (!filesMap) return false;
  return !!normalizeFile(filesMap.documento);
};

/**
 * LIST (GET /desvinculaciones)
 */
export const actionDesvinculacionesGet = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("desvinculaciones", {
        headers: { ...authHeader() },
      });
      dispatch(fetchDesvinculacionesSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error.message ||
        "Error al cargar desvinculaciones";
      dispatch(fetchDesvinculacionesFailure(msg));
    }
  };
};

export const actionAuditLogGet = (params = {}) => {
  return async (dispatch) => {
    try {
      const qs = buildQuery(params);
      const resp = await apiServiceGet.get(`audit-log${qs}`, {
        headers: { ...authHeader() },
      });
      dispatch(fetchAuditLogSuccess(resp.data));
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar audit_log";
      dispatch(fetchAuditLogFailure(msg));
      throw error;
    }
  };
};

/**
 * CARDS (GET /desvinculaciones/cards)
 */
export const actionDesvinculacionesCards = (params = {}) => {
  return async (dispatch) => {
    try {
      const resp = await apiServicePost.post("desvinculaciones/cards", params, {
        headers: { ...authHeader() },
      });
      dispatch(fetchDesvinculacionesSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error.message ||
        "Error al cargar desvinculaciones";
      dispatch(fetchDesvinculacionesFailure(msg));
    }
  };
};

/**
 * CREATE (POST /desvinculaciones)
 * Si hay documento -> manda multipart: payload(JSON) + documento(binary)
 * Si no hay documento -> manda JSON normal
 */
export const actionDesvinculacionCreate = (payload, onDone = () => {}, filesMap = null) => {
  return async (dispatch) => {
    try {
      const jsonPayload = { ...payload };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(jsonPayload));

      if (filesMap && filesMap.documento) {
        const doc = filesMap.documento?.originFileObj || filesMap.documento;
        if (doc) {
          fd.append("documento", doc, doc.name || "documento");
        }
      }

      const response = await apiForm.post("desvinculaciones", fd, {
        headers: { ...authHeader() },
      });

      await dispatch(actionDesvinculacionesGet());
      onDone();
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error.message ||
        "No se pudo crear la desvinculación";
      dispatch(fetchDesvinculacionesFailure(msg));
      throw error;
    }
  };
};

/**
 * GET BY ID (GET /desvinculaciones/{id})
 *
 * Nota: aquí NO hay dispatch porque tu firma es return async () => {}
 * No se dispara SESSION_EXPIRED en 401 sin cambiar estructura.
 */
export const actionDesvinculacionGetById = (id) => {
  return async () => {
    const resp = await apiServiceGet.get(`desvinculaciones/${encodeURIComponent(id)}`, {
      headers: { ...authHeader() },
    });
    return resp.data;
  };
};

/**
 * UPDATE BY ID (PATCH /desvinculaciones/{id})
 * Si hay documento -> manda multipart: payload(JSON) + documento(binary)
 * Si no hay documento -> manda JSON normal
 */
export const actionDesvinculacionUpdateById = (
  id,
  payload,
  onDone = () => {},
  filesMap = null
) => {
  return async (dispatch) => {
    try {
      const jsonPayload = { ...payload };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(jsonPayload));

      if (filesMap && filesMap.documento) {
        const doc = filesMap.documento?.originFileObj || filesMap.documento;
        if (doc) {
          fd.append("documento", doc, doc.name || "documento");
        }
      }

      const response = await apiForm.put(
        `desvinculaciones/${encodeURIComponent(id)}`,
        fd,
        { headers: { ...authHeader() } }
      );

      await dispatch(actionDesvinculacionesGet());
      onDone();
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error.message ||
        "No se pudo actualizar la desvinculación";
      dispatch(fetchDesvinculacionesFailure(msg));
      throw error;
    }
  };
};

/**
 * DELETE BY ID (DELETE /desvinculaciones/{id}) — soft delete active=0
 */
export const actionDesvinculacionDeleteById = (id, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServiceGet.delete(`desvinculaciones/${encodeURIComponent(id)}`, {
        headers: { ...authHeader() },
      });
      await dispatch(actionDesvinculacionesGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error.message ||
        "No se pudo eliminar la desvinculación";
      dispatch(fetchDesvinculacionesFailure(msg));
      throw error;
    }
  };
};
