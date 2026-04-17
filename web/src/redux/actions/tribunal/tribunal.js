// redux/actions/tribunal/tribunal.js
import axios from "axios";
import {
  FETCH_TRIBUNAL_FAILURE,
  FETCH_TRIBUNAL_SUCCESS,
  FETCH_TRIBUNAL_ETAPAS_FAILURE,
  FETCH_TRIBUNAL_ETAPAS_SUCCESS,
  FETCH_AUDIT_LOG_TRIBUNAL_FAILURE,
  FETCH_AUDIT_LOG_TRIBUNAL_SUCCESS,
  FETCH_TRIBUNAL_DETALLES_FAILURE,
  FETCH_TRIBUNAL_DETALLES_SUCCESS
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
const fetchTribunalSuccess = (payload) => ({
  type: FETCH_TRIBUNAL_SUCCESS,
  payload,
});

const fetchTribunalDetallesFailure = (message) => ({
  type: FETCH_TRIBUNAL_DETALLES_FAILURE,
  payload: { error: message },
});
const fetchTribunalDetallesSuccess = (payload) => ({
  type: FETCH_TRIBUNAL_DETALLES_SUCCESS,
  payload,
});

const fetchTribunalFailure = (message) => ({
  type: FETCH_TRIBUNAL_FAILURE,
  payload: { error: message },
});
const fetchTribunalDocumentosSuccess = (payload) => ({
  type: FETCH_TRIBUNAL_ETAPAS_SUCCESS,
  payload,
});

const fetchTribunalDocumentosFailure = (message) => ({
  type: FETCH_TRIBUNAL_ETAPAS_FAILURE,
  payload: { error: message },
});
const fetchAuditLogSuccess = (payload) => ({
  type: FETCH_AUDIT_LOG_TRIBUNAL_SUCCESS,
  payload,
});

const fetchAuditLogFailure = (message) => ({
  type: FETCH_AUDIT_LOG_TRIBUNAL_FAILURE,
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
 * LIST (GET /tribunal)
 */
/**
 * LIST (GET /tribunal?...)
 * - ahora sí respeta params del UI
 */
const buildTribunalListQuery = (params = {}) => {
  const qp = new URLSearchParams();

  const add = (k, v) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (!s) return;
    qp.set(k, s);
  };

  // 👇 ajusta nombres EXACTOS a lo que tu backend espera
  add("estado", params.estado);
  add("ciudad", params.ciudad);

  add("tipo_conciliacion", params.tipo_conciliacion);

  // ojo: en tu page mandas id_autoridad
  add("id_autoridad", params.id_autoridad);

  // búsqueda por expediente
  add("expediente", params.expediente);

  // (si luego agregas fechas)
  add("date_from", params.date_from);
  add("date_to", params.date_to);

  const qs = qp.toString();
  return qs ? `?${qs}` : "";
};

export const actionTribunalGet = (params = {}) => {
  return async (dispatch) => {
    try {
      const qs = buildTribunalListQuery(params);

      // DEBUG opcional (déjalo mientras validas)
      console.log("[TRIBUNAL] GET /tribunal", qs, params);

      const resp = await apiServiceGet.get(`tribunal${qs}`, {
        headers: { ...authHeader() },
      });

      dispatch(fetchTribunalSuccess(resp.data));
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error.message ||
        "Error al cargar tribunal";
      dispatch(fetchTribunalFailure(msg));
      throw error;
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
 * CARDS (GET /tribunal/cards)
 */
export const actionTribunalCards = (params = {}) => {
  return async (dispatch) => {
    try {
      console.log("[TRIBUNAL] POST /tribunal/cards params:", params);

      const resp = await apiServicePost.post("tribunal/cards", params, {
        headers: { ...authHeader() },
      });

      dispatch(fetchTribunalSuccess(resp.data));
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error.message ||
        "Error al cargar tribunal";
      dispatch(fetchTribunalFailure(msg));
      throw error;
    }
  };
};

const normalizeFile = (f) => {
  if (!f) return null;
  if (f.originFileObj) return f.originFileObj; // AntD UploadFile
  if (typeof Blob !== "undefined" && f instanceof Blob) return f; // File/Blob
  return null;
};

const appendMany = (fd, fieldName, arr) => {
  (arr || []).forEach((x) => {
    const file = normalizeFile(x?.file || x);
    if (!file) return;
    fd.append(fieldName, file, file.name || "documento");
  });
};
const appendOne = (fd, fieldName, x) => {
  const file = normalizeFile(x?.file || x);
  if (!file) return;
  fd.append(fieldName, file, file.name || fieldName);
};
const buildFormDataMany = (payload, filesMap) => {
  const fd = new FormData();
  fd.append("payload", JSON.stringify(payload || {}));

  // 1) CITATORIO (1 archivo)
  // 👇 este nombre DEBE coincidir con tu backend (UploadFile = File(...))
  appendMany(fd, "documentos_demanda_notificacion", filesMap?.citatorio);


  // 2) Evidencias
  appendMany(fd, "documentos_actora", filesMap?.evidencias_actora);
  appendMany(fd, "documentos_demandada", filesMap?.evidencias_demandada);

  return fd;
};


export const actionTribunalCreate = (payload, onDone = () => {}, filesMap = null) => {
  return async (dispatch) => {
    try {
      const jsonPayload = { ...payload };

      const fd = buildFormDataMany(jsonPayload, filesMap);

      const response = await apiForm.post("tribunal", fd, {
        headers: { ...authHeader() },
      });

      await dispatch(actionTribunalGet());
      onDone();
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error.message ||
        "No se pudo crear el tribunal";
      dispatch(fetchTribunalFailure(msg));
      throw error;
    }
  };
};

/**
 * GET BY ID (GET /tribunal/{id})
 *
 * Nota: aquí NO hay dispatch porque tu firma es return async () => {}
 * No se dispara SESSION_EXPIRED en 401 sin cambiar estructura.
 */
export const actionTribunalGetById = (id) => {
  return async () => {
    const resp = await apiServiceGet.get(`tribunal/${encodeURIComponent(id)}`, {
      headers: { ...authHeader() },
    });
    return resp.data;
  };
};
export const actionValidarNombreTestigo = (nombre) => {
  return async () => {
    const resp = await apiServiceGet.get(`tribunal/testigo?nombre=${encodeURIComponent(nombre)}`, {
      headers: { ...authHeader() },
    });
    return resp.data;
  };
};
export const actionTribunalGetByIdRedux = (id) => {
  return async (dispatch) => {

     try {
      const resp = await apiServiceGet.get(`tribunal/${encodeURIComponent(id)}`, {
        headers: { ...authHeader() },
      });
      dispatch(fetchTribunalDetallesSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "Error al cargar conciliacion detalles";
      dispatch(fetchTribunalDetallesFailure(msg));
    }


   
  };
};
export const actionTribunalDocumentosGetById = (id) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get(`tribunal/${id}/etapas/documentos`, {
        headers: { ...authHeader() },
      });
      dispatch(fetchTribunalDocumentosSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error.message ||
        "Error al cargar tribunal";
      dispatch(fetchTribunalDocumentosFailure(msg));
    }
  };
};
export const actionTribunalEtapaUpdateTerminos = (id_tribunal, num_etapa, data) => {
  return async (dispatch) => {
    try {
      const payload = {
        num_etapa: Number(num_etapa),
        fecha_notificacion_demanda: data?.fecha_notificacion_demanda || null,
        dias_habiles: Number(data?.dias_habiles),
      };

      const response = await apiForm.put(
        `tribunal/${encodeURIComponent(id_tribunal)}/etapas/terminos`,
        payload,
        {
          headers: {
            ...authHeader(),
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);

      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error.message ||
        "No se pudo actualizar términos de la etapa";

      dispatch(fetchTribunalFailure(msg));
      throw error;
    }
  };
};
export const actionTribunalUpdateById = (id, payload, onDone = () => {}, filesMap = null) => {
  return async (dispatch) => {
    try {
      const jsonPayload = { ...payload };

      const fd = buildFormDataMany(jsonPayload, filesMap);

      const response = await apiForm.put(`tribunal/${encodeURIComponent(id)}`, fd, {
        headers: { ...authHeader() },
      });

      await dispatch(actionTribunalGet());
      onDone();
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error.message ||
        "No se pudo actualizar el tribunal";
      dispatch(fetchTribunalFailure(msg));
      throw error;
    }
  };
};

/**
 * DELETE BY ID (DELETE /tribunal/{id}) — soft delete active=0
 */
export const actionTribunalDeleteById = (id, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServiceGet.delete(`tribunal/${encodeURIComponent(id)}`, {
        headers: { ...authHeader() },
      });
      await dispatch(actionTribunalGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error.message ||
        "No se pudo eliminar la desvinculación";
      dispatch(fetchTribunalFailure(msg));
      throw error;
    }
  };
};
/**
 * POST /tribunal/{id}/etapas/{etapa}/documentos
 */
export const actionEtapaUploadDocumento = ({
  expedienteId,
  etapaNumero,
  file,
}) => {
  return async (dispatch) => {
    try {
      const fd = new FormData();
      fd.append("documento", normalizeFile(file));

      const resp = await apiForm.post(
        `tribunal/${encodeURIComponent(expedienteId)}/etapas/${etapaNumero}/documentos`,
        fd,
        { headers: { ...authHeader() } }
      );
      await dispatch(actionTribunalDocumentosGetById(expedienteId));

      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);

      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al subir documento";

      dispatch(fetchTribunalFailure(msg));
      throw error;
    }
  };
};
/**
 * DELETE /tribunal/documentos/{id}
 */
export const actionEtapaDeleteDocumento = (documentoId,expedienteId) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.delete(
        `tribunal/etapas/documentos/${encodeURIComponent(documentoId)}`,
        { headers: { ...authHeader() } }
      );
      await dispatch(actionTribunalDocumentosGetById(expedienteId));

      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);

      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al eliminar documento";

      dispatch(fetchTribunalFailure(msg));
      throw error;
    }
  };
};
/**
 * PUT /tribunal/{id}/etapas/{etapa}/completar
 */
export const actionEtapaMarcarCompletada = ({
  expedienteId,
  etapaNumero,
}) => {
  return async (dispatch) => {
    try {
      const resp = await apiServicePost.put(
        `tribunal/${encodeURIComponent(expedienteId)}/etapas/${etapaNumero}/completar`,
        {},
        { headers: { ...authHeader() } }
      );

      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);

      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al marcar etapa como completada";

      dispatch(fetchTribunalFailure(msg));
      throw error;
    }
  };
};