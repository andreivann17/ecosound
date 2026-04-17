import axios from "axios";
import {
  FETCH_CONCILIACION_FAILURE,
  FETCH_CONCILIACION_SUCCESS,
  FETCH_CONCILIACION_DOCUMENTO_FAILURE,
  FETCH_CONCILIACION_DOCUMENTO_SUCCESS,
  FETCH_CONCILIACION_DETALLES_FAILURE,
  FETCH_CONCILIACION_DETALLES_SUCCESS,
  FETCH_CONCILIACION_AUDIENCIAS_FAILURE,
  FETCH_CONCILIACION_AUDIENCIAS_SUCCESS,
  FETCH_CONCILIACION_HISTORIAL_FAILURE,
  FETCH_CONCILIACION_HISTORIAL_SUCCESS,
  FETCH_AUDIT_LOG_FAILURE,
  FETCH_AUDIT_LOG_ONE_FAILURE,
  FETCH_AUDIT_LOG_ONE_SUCCESS,
  FETCH_AUDIT_LOG_SUCCESS
} from "./types";
import { notification } from "antd";
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
const fetchConciliacionSuccess = (payload) => ({
  type: FETCH_CONCILIACION_SUCCESS,
  payload,
});

const fetchConciliacionFailure = (message) => ({
  type: FETCH_CONCILIACION_FAILURE,
  payload: { error: message },
});

const fetchConciliacionDocumentosSuccess = (payload) => ({
  type: FETCH_CONCILIACION_DOCUMENTO_SUCCESS,
  payload,
});

const fetchConciliacionDocumentosFailure = (message) => ({
  type: FETCH_CONCILIACION_DOCUMENTO_FAILURE,
  payload: { error: message },
});

const fetchConciliacionHistorialSuccess = (payload) => ({
  type: FETCH_CONCILIACION_HISTORIAL_SUCCESS,
  payload,
});

const fetchConciliacionHistorialFailure = (message) => ({
  type: FETCH_CONCILIACION_HISTORIAL_FAILURE,
  payload: { error: message },
});

const fetchConciliacionDetallesSuccess = (payload) => ({
  type: FETCH_CONCILIACION_DETALLES_SUCCESS,
  payload,
});

const fetchConciliacionDetallesFailure = (message) => ({
  type: FETCH_CONCILIACION_DETALLES_FAILURE,
  payload: { error: message },
});

const fetchConciliacionAudienciasSuccess = (payload) => ({
  type: FETCH_CONCILIACION_AUDIENCIAS_SUCCESS,
  payload,
});

const fetchConciliacionAudienciasFailure = (message) => ({
  type: FETCH_CONCILIACION_AUDIENCIAS_FAILURE,
  payload: { error: message },
});

const buildBody = ({
  // filtros del UI
  tipo_conciliacion,
  tipo,                 // alias opcional
  estado,               // id_estado
  ciudad,               // id_ciudad
  autoridad,            // id_autoridad

  status,
  abogado_contrario,
  abogado,

  search,
  q,                    // alias opcional
  id,
  id_empresa,
  empresa,              // alias opcional (si mandas nombre)
  nombre_solicitante,

  date_from,
  date_to,
  active,
} = {}) => {
  const body = {};

  const isAny = (v) => {
    if (v == null) return true;
    const s = String(v).trim();
    if (!s) return true;
    const low = s.toLowerCase();
    return low === "cualquiera" || low === "todos" || low === "__all__";
  };

  // tipo_conciliacion
  const tipoVal = !isAny(tipo_conciliacion) ? tipo_conciliacion : (!isAny(tipo) ? tipo : null);
  if (!isAny(tipoVal)) body.tipo_conciliacion = tipoVal;

  // estado / ciudad / autoridad
  if (!isAny(estado)) body.id_estado = estado;
  if (!isAny(ciudad)) body.id_ciudad = ciudad;
  if (!isAny(autoridad)) body.id_autoridad = autoridad;

  // id
  if (!isAny(id)) body.id = id;

  // search (soporta q)
  const searchVal = !isAny(search) ? search : (!isAny(q) ? q : null);
  if (!isAny(searchVal)) body.search = searchVal;

  // status
  if (!isAny(status)) body.id_status = status;

  // abogado contrario (soporta abogado)
  if (!isAny(abogado_contrario)) body.abogado_contrario = abogado_contrario;
  else if (!isAny(abogado)) body.abogado_contrario = abogado;

  // empresa (id o nombre si tu backend lo soporta)
  if (!isAny(id_empresa)) body.id_empresa = id_empresa;
  if (!isAny(empresa)) body.empresa = empresa;

  // solicitante
  if (!isAny(nombre_solicitante)) body.nombre_solicitante = nombre_solicitante;

  // fechas
  if (!isAny(date_from)) body.date_from = date_from;
  if (!isAny(date_to)) body.date_to = date_to;

  // active
  if (!isAny(active)) body.active = active;

  return body;
};
const buildBodyMulti = ({
  city_ids,
  company_ids,
  date_from,
  date_to,
  preset,
  format,
  status,
  abogado_contrario,
  search,
  nombre_solicitante,
  active,
} = {}) => {
  const body = {};

  if (Array.isArray(city_ids) && city_ids.length > 0) {
    body.city_ids = city_ids.map(Number);
  }

  if (Array.isArray(company_ids) && company_ids.length > 0) {
    body.company_ids = company_ids.map(Number);
  }

  if (date_from) body.date_from = date_from;
  if (date_to) body.date_to = date_to;

  if (preset) body.preset = preset;
  if (format) body.format = format;

  if (status != null) body.id_status = status;
  if (abogado_contrario) body.abogado_contrario = abogado_contrario;
  if (search) body.search = search;
  if (nombre_solicitante) body.nombre_solicitante = nombre_solicitante;
  if (active != null) body.active = active;

  return body;
};

export const actionConciliacionSearchExpedientes = ({ q = "", limit = 6 } = {}) => {
  return async (dispatch) => {
    try {
      const body = {
        expediente: String(q || "").trim(),
        active: 1,
        limit: Number(limit) || 6,
        offset: 0,
      };

      const resp = await apiServicePost.post("conciliaciones/cards", body, {
        headers: { ...authHeader() },
      });

      // aquí NO tocamos redux (no dispatch success/failure)
      // porque esto es solo para autocomplete y no quieres romper nada
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      return null;
    }
  };
};
const fetchAuditLogSuccess = (payload) => ({
  type: FETCH_AUDIT_LOG_SUCCESS,
  payload,
});

const fetchAuditLogFailure = (message) => ({
  type: FETCH_AUDIT_LOG_FAILURE,
  payload: { error: message },
});

const fetchAuditLogOneSuccess = (payload) => ({
  type: FETCH_AUDIT_LOG_ONE_SUCCESS,
  payload,
});

const fetchAuditLogOneFailure = (message) => ({
  type: FETCH_AUDIT_LOG_ONE_FAILURE,
  payload: { error: message },
});


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

  add("limit", params.limit ?? 50);
  add("offset", params.offset ?? 0);

  const qs = qp.toString();
  return qs ? `?${qs}` : "";
};

export const actionConciliacionGet = (params = {}) => {
  return async (dispatch) => {
    try {
   
      const body = buildBody(params);

      const resp = await apiServicePost.post("conciliaciones/cards", body, {
        headers: { ...authHeader() },
      });

      dispatch(fetchConciliacionSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar conciliacion";
      dispatch(fetchConciliacionFailure(msg));
    }
  };
};
export const actionExportReports = (params = {}) => {
  return async (dispatch) => {
    try {
      const body = buildBodyMulti(params);

      const resp = await apiServicePost.post(
        "conciliaciones/cards-multi",
        body,
        { headers: { ...authHeader() } }
      );

     // dispatch(fetchConciliacionSuccess(resp.data));
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al exportar conciliaciones";

   //   dispatch(fetchConciliacionFailure(msg));
      throw error;
    }
  };
};

export const actionConciliacionDocumentosGet = (id) => {
  return async (dispatch) => {
    try {
      const resp = await apiServicePost.get(`conciliaciones/${id}/documentos`, {
        headers: { ...authHeader() },
      });
      dispatch(fetchConciliacionDocumentosSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "Error al cargar conciliacion documentos";
      dispatch(fetchConciliacionDocumentosFailure(msg));
    }
  };
};

export const actionConciliacionHistorialGetByID = (id) => {
  return async (dispatch) => {
    try {
      const resp = await apiServicePost.get(`conciliaciones/${id}/historia-procesal`, {
        headers: { ...authHeader() },
      });
      dispatch(fetchConciliacionHistorialSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "Error al cargar conciliacion documentos";
      dispatch(fetchConciliacionHistorialFailure(msg));
    }
  };
};

export const actionConciliacionCreate = (payload, onDone = () => {}, filesMap = null) => {
  return async (dispatch) => {
    try {
      const hasFiles =
        filesMap &&
        typeof filesMap === "object" &&
        Object.values(filesMap).some((f) => f instanceof File);

      let res;

      if (hasFiles) {
        const fd = new FormData();
        fd.append("payload", JSON.stringify(payload));

        Object.entries(filesMap).forEach(([key, file]) => {
          if (file instanceof File) {
            fd.append(key, file);
          }
        });

        res = await apiForm.post("conciliaciones", fd, {
          headers: { ...authHeader() },
        });
      } else {
        res = await apiServicePost.post("conciliaciones", payload, {
          headers: { ...authHeader() },
        });
      }

      await dispatch(actionConciliacionGet({}));
      onDone();

      return res.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);

      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo crear la conciliación";

      notification.error({
        message: "Error",
        description: msg,
      });

      dispatch(fetchConciliacionFailure(msg));
      throw error;
    }
  };
};

export const actionConciliacionDocumentoCreate = (payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      const fd = new FormData();

      fd.append(
        "payload",
        JSON.stringify({
          id_conciliacion: payload.id_conciliacion,
          id_tipo_documento: payload.id_tipo_documento ?? 14,
        })
      );

      fd.append("documento", payload.file);

      await apiForm.post(
        `conciliaciones/${payload.id_conciliacion}/documentos`,
        fd,
        { headers: { ...authHeader() } }
      );

      await dispatch(actionConciliacionDocumentosGet(payload.id));
      await dispatch(actionConciliacionAudienciasGetByID(payload.id));

      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo agregar el documento";

      dispatch(fetchConciliacionDocumentosFailure(msg));
      throw error;
    }
  };
};
// redux/actions/conciliacion/conciliacion.js (o donde tengas tus actions)
export const actionConstanciaCumplimientoCreate = (payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      const fd = new FormData();

      // metadata en JSON dentro de "payload" (igual que tu ejemplo)
      console.log(payload)
      fd.append(
        "payload",
        JSON.stringify({
          id: payload.id,
          id_conciliacion_audiencia: payload.id_conciliacion_audiencia,
          fecha_cumplimiento: payload.fecha_cumplimiento,
          estado_cumplimiento: payload.estado_cumplimiento || "completo",
          notas_cumplimiento: payload.notas_cumplimiento || "",
        })
);


      // archivo como "file" (ajusta el nombre si tu backend espera otro)
      console.log(payload)
      fd.append("archivo_constancia", payload.file);

      // usa apiForm como en tu ejemplo (FormData)
      const res = await apiForm.put(
        `conciliaciones-audiencias/${payload.id}/constancia-cumplimiento`,
        fd,
        { headers: { ...authHeader() } }
      );

      // si después quieres refrescar audiencia/docs, aquí dispatch de tus gets:
      await dispatch(actionConciliacionAudienciasGetByID(payload.id));
      await dispatch(actionConciliacionDocumentosGet(payload.id));

      onDone(res?.data);
      return res?.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);

      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error.message ||
        "No se pudo guardar el cumplimiento";

      // si tienes un failure específico, úsalo; si no, deja uno genérico
      dispatch(fetchConciliacionDocumentosFailure(msg));
      throw error;
    }
  };
};

export const actionConciliacionDocumentoDelete = (
  { id, idDocumento },
  onDone = () => {}
) => {
  return async (dispatch) => {
    try {
  
      await apiServicePost.delete(
        `conciliaciones/documentos/${idDocumento}`,
        {
          headers: { ...authHeader() },
        }
      );

      await dispatch(actionConciliacionAudienciasGetByID(id));

      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo eliminar el documento";
      dispatch({
        type: FETCH_CONCILIACION_FAILURE,
        payload: { error: msg },
      });
      throw error;
    }
  };
};

export const actionConciliacionPrimeraAudiencia = (
  payload,
  id,
  onDone = () => {},
  filesMap = null
) => {
  return async (dispatch) => {
    try {
      if (!id) {
        throw new Error("Falta id en el payload");
      }

      const jsonPayload = { ...payload };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(jsonPayload));

      if (filesMap) {
        if (filesMap.archivo_convenio) fd.append("archivo_convenio", filesMap.archivo_convenio);
        if (filesMap.archivo_diferimiento) fd.append("archivo_diferimiento", filesMap.archivo_diferimiento);
        if (filesMap.archivo_no_conciliacion) fd.append("archivo_no_conciliacion", filesMap.archivo_no_conciliacion);
        if (filesMap.archivo_constancia_cumplimiento) {
          fd.append("archivo_constancia_cumplimiento", filesMap.archivo_constancia_cumplimiento);
        }
      }

      const response = await apiForm.post(
        `conciliaciones-audiencias/primera/${id}`,
        fd,
        { headers: { ...authHeader() } }
      );

      await dispatch(actionConciliacionAudienciasGetByID(id));
      await dispatch(actionConciliacionDocumentosGet(id));
      await dispatch(actionConciliacionHistorialGetByID(id));
      await dispatch(actionConciliacionGetByID(id));
      await dispatch(actionAuditLogGet({ id_modulo: 1, id_key: response.data.id_conciliacion, limit: 100 }));
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo crear la primera audiencia";
      dispatch(fetchConciliacionFailure(msg));
      throw error;
    }
  };
};

export const actionConciliacionAudienciaGenerica = (
  payload,
  id,
  onDone = () => {},
  filesMap = null
) => {
  return async (dispatch) => {
    try {
      if (!id) {
        throw new Error("Falta id en el payload");
      }

      const jsonPayload = { ...payload };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(jsonPayload));

      if (filesMap) {
        if (filesMap.archivo_convenio) fd.append("archivo_convenio", filesMap.archivo_convenio);
        if (filesMap.archivo_diferimiento) fd.append("archivo_diferimiento", filesMap.archivo_diferimiento);
        if (filesMap.archivo_no_conciliacion) fd.append("archivo_no_conciliacion", filesMap.archivo_no_conciliacion);
        if (filesMap.archivo_constancia_cumplimiento) {
          fd.append("archivo_constancia_cumplimiento", filesMap.archivo_constancia_cumplimiento);
        }
      }

      const response = await apiForm.post(
        `conciliaciones-audiencias/generica/${id}`,
        fd,
        { headers: { ...authHeader() } }
      );

      await dispatch(actionConciliacionAudienciasGetByID(id));
      await dispatch(actionConciliacionHistorialGetByID(id));
      await dispatch(actionConciliacionGetByID(id));
      await dispatch(actionAuditLogGet({ id_modulo: 1, id_key: id, limit: 100 }));
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo crear la audiencia";
      dispatch(fetchConciliacionFailure(msg));
      throw error;
    }
  };
};

export const actionConciliacionAudienciaGenericaEdit = (
  payload,
  id,
  id_audiencia,
  onDone = () => {},
  filesMap = null
) => {
  return async (dispatch) => {
    try {
      const idAudiencia = id_audiencia;

      if (!idAudiencia) {
        throw new Error("Falta id_audiencia en el payload");
      }

      const jsonPayload = { ...payload };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(jsonPayload));

      if (filesMap) {
        if (filesMap.archivo_convenio) fd.append("archivo_convenio", filesMap.archivo_convenio);
        if (filesMap.archivo_diferimiento) fd.append("archivo_diferimiento", filesMap.archivo_diferimiento);
        if (filesMap.archivo_no_conciliacion) fd.append("archivo_no_conciliacion", filesMap.archivo_no_conciliacion);
        if (filesMap.archivo_constancia_cumplimiento) {
          fd.append("archivo_constancia_cumplimiento", filesMap.archivo_constancia_cumplimiento);
        }
      }

      const response = await apiForm.put(
        `conciliaciones-audiencias/generica/${idAudiencia}`,
        fd,
        { headers: { ...authHeader() } }
      );

      await dispatch(actionConciliacionAudienciasGetByID(id));
      await dispatch(actionConciliacionDocumentosGet(id));
      await dispatch(actionConciliacionHistorialGetByID(id));
      await dispatch(actionConciliacionGetByID(id));
      await dispatch(actionAuditLogGet({ id_modulo: 1, id_key: response.data.id_conciliacion, limit: 100 }));
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo actualizar la audiencia";
      dispatch(fetchConciliacionFailure(msg));
      throw error;
    }
  };
};

export const actionConciliacionPrimeraAudienciaEdit = (
  payload,
  id,
  id_audiencia,
  onDone = () => {},
  filesMap = null
) => {
  return async (dispatch) => {
    try {
      const idAudiencia = id_audiencia;

      if (!idAudiencia) {
        throw new Error("Falta id_audiencia en el payload");
      }

      const jsonPayload = { ...payload };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(jsonPayload));

      if (filesMap) {
        if (filesMap.archivo_convenio) fd.append("archivo_convenio", filesMap.archivo_convenio);
        if (filesMap.archivo_diferimiento) fd.append("archivo_diferimiento", filesMap.archivo_diferimiento);
        if (filesMap.archivo_no_conciliacion) fd.append("archivo_no_conciliacion", filesMap.archivo_no_conciliacion);
        if (filesMap.archivo_constancia_cumplimiento) {
          fd.append("archivo_constancia_cumplimiento", filesMap.archivo_constancia_cumplimiento);
        }
      }

      const response = await apiForm.put(
        `conciliaciones-audiencias/primera/${idAudiencia}`,
        fd,
        { headers: { ...authHeader() } }
      );

      await dispatch(actionConciliacionAudienciasGetByID(id));
      await dispatch(actionConciliacionDocumentosGet(id));
      await dispatch(actionConciliacionHistorialGetByID(id));
      await dispatch(actionConciliacionGetByID(id));
      await dispatch(actionAuditLogGet({ id_modulo: 1, id_key: idAudiencia, limit: 100 }));
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo actualizar la primera audiencia";
      dispatch(fetchConciliacionFailure(msg));
      throw error;
    }
  };
};

export const actionConciliacionGetByID = (id) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get(`conciliaciones/${id}`, {
        headers: { ...authHeader() },
      });
      dispatch(fetchConciliacionDetallesSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "Error al cargar conciliacion detalles";
      dispatch(fetchConciliacionDetallesFailure(msg));
    }
  };
};

export const actionConciliacionGetByIDNoRedux = (
  id,
  callback,
  errorCallback
) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get(`conciliaciones/${id}`, {
        headers: { ...authHeader() },
      });

      if (typeof callback === "function") {
        callback(resp.data);
      }
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar conciliación";

      if (typeof errorCallback === "function") {
        errorCallback(msg);
      }
    }
  };
};

export const actionConciliacionAudienciasGetByID = (id) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get(`conciliaciones/${id}/audiencias`, {
        headers: { ...authHeader() },
      });
      dispatch(fetchConciliacionAudienciasSuccess(resp.data));
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "Error al cargar conciliacion audiencias";
      dispatch(fetchConciliacionAudienciasFailure(msg));
    }
  };
};

export const actionConciliacionUpdate = (
  id_conciliacion,
  payload,
  onDone = () => {},
  filesMap = null
) => {
  return async (dispatch) => {
    try {
      const hasFiles =
        filesMap &&
        typeof filesMap === "object" &&
        Object.values(filesMap).some((f) => f instanceof File);

      if (hasFiles) {
        const fd = new FormData();
        fd.append("payload", JSON.stringify(payload));

        Object.entries(filesMap).forEach(([key, file]) => {
          if (file instanceof File) {
            fd.append(key, file);
          }
        });

        await apiForm.patch(`conciliaciones/${id_conciliacion}`, fd, {
          headers: { ...authHeader() },
        });
      } else {
        await apiServicePost.patch(`conciliaciones/${id_conciliacion}`, payload, {
          headers: { ...authHeader() },
        });
      }

      await dispatch(actionConciliacionGet({}));
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo actualizar la conciliacion";

      notification.error({
        message: "Error",
        description: msg,
      });

      dispatch(fetchConciliacionFailure(msg));
      throw error;
    }
  };
};

export const actionConciliacionDelete = (id_conciliacion, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      await apiServiceGet.delete(`conciliaciones/${id_conciliacion}`, {
        headers: { ...authHeader() },
      });
      await dispatch(actionConciliacionGet({}));
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "No se pudo eliminar la conciliacion";
      dispatch(fetchConciliacionFailure(msg));
      throw error;
    }
  };
};

export const actionConciliacionImportPreview = (file) => {
  return async () => {
    const fd = new FormData();
    fd.append("file", file);
    const resp = await apiForm.post("conciliaciones/import/preview", fd, {
      headers: { ...authHeader() },
    });
    return resp.data;
  };
};

const getPublicIp = async () => {
  try {
    const r = await axios.get("https:/http://${window.location.hostname}:8000.ipify.org?format=json");
    return r?.data?.ip || "";
  } catch {
    return "";
  }
};

export const actionConciliacionImportSave = (rows, opts = {}, onDone = () => {}) => {
  return async (dispatch) => {
    let lugar = (opts && opts.lugar) || "";
    if (!lugar) {
      const counts = {};
      for (const r of rows) {
        const c = (r?.ciudad || "").trim();
        if (!c) continue;
        counts[c] = (counts[c] || 0) + 1;
      }
      lugar = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "";
    }

    const ip = await getPublicIp();

    const body = { rows, ip, lugar };

    try {
      await apiServicePost.post("conciliaciones/import/save", body, {
        headers: { ...authHeader() },
      });
      await dispatch(actionConciliacionGet({}));
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg = error?.response?.data?.detail || error.message || "No se pudo guardar la importación";
      dispatch(fetchConciliacionFailure(msg));
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

export const actionAuditLogGetById = (id_audit_log) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get(`audit-log/${id_audit_log}`, {
        headers: { ...authHeader() },
      });
      dispatch(fetchAuditLogOneSuccess(resp.data));
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar el registro de audit_log";
      dispatch(fetchAuditLogOneFailure(msg));
      throw error;
    }
  };
};

export const actionAuditLogCreate = (payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      const body = {
        ...payload,
        user_agent: payload?.user_agent || window?.navigator?.userAgent || "",
      };

      const resp = await apiServicePost.post("audit-log", body, {
        headers: { ...authHeader() },
      });

      onDone(resp.data);
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo crear audit_log";
      dispatch(fetchAuditLogFailure(msg));
      throw error;
    }
  };
};

export const actionAuditLogGetNoRedux = (params = {}, callback, errorCallback) => {
  return async () => {
    try {
      const qs = buildQuery(params);
      const resp = await apiServiceGet.get(`audit-log${qs}`, {
        headers: { ...authHeader() },
      });
      if (typeof callback === "function") callback(resp.data);
      return resp.data;
    } catch (error) {
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar audit_log";
      if (typeof errorCallback === "function") errorCallback(msg);
      throw error;
    }
  };
};
