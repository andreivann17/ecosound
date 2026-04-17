// src/redux/actions/empresas/empresas.js
import axios from "axios";
import { FETCH_EMPRESAS_FAILURE, FETCH_EMPRESAS_SUCCESS } from "./types";
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
const fetchEmpresaSuccess = (payload) => ({
  type: FETCH_EMPRESAS_SUCCESS,
  payload,
});

const fetchEmpresaFailure = (message) => ({
  type: FETCH_EMPRESAS_FAILURE,
  payload: { error: message },
});

// ========= Helper: body de filtros (EMPRESAS CARDS) =========
const buildBody = ({ q, nombre_solicitante, search, include_inactive } = {}) => {
  const body = {};

  const term =
    (q != null ? String(q) : "") ||
    (nombre_solicitante != null ? String(nombre_solicitante) : "") ||
    (search != null ? String(search) : "");

  const t = String(term || "").trim();
  if (t) body.q = t;

  if (include_inactive != null) body.include_inactive = !!include_inactive;

  return body;
};

/**
 * GET listado básico (GET /empresas)
 */
export const actionEmpresasGet = (params = {}) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("empresas", {
        params,
        headers: { ...authHeader() },
      });
      dispatch(fetchEmpresaSuccess(resp.data));
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar empresas";
      dispatch(fetchEmpresaFailure(msg));
      throw error;
    }
  };
};

/**
 * Cards de empresas (POST /empresas/cards)
 */
export const actionEmpresasCard = (params = {}) => {
  return async (dispatch) => {
    try {
      const body = buildBody(params);
      const resp = await apiServicePost.post("empresas/cards", body, {
        headers: { ...authHeader() },
      });
      dispatch(fetchEmpresaSuccess(resp.data));
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar empresas";
      dispatch(fetchEmpresaFailure(msg));
      throw error;
    }
  };
};

export const actionEmpresasdistinct = () => {
  return async () => {
    try {
      const resp = await apiServiceGet.get("empresas/distinct", {
        headers: { ...authHeader() },
      });
      return resp.data;
    } catch (error) {
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar empresas";
      return msg;
    }
  };
};

/**
 * CREATE (POST /empresas)
 */
export const actionEmpresaCreate = (payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      const resp = await apiServicePost.post("empresas", payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionEmpresasGet({}));
      onDone(resp.data);
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo crear la empresa";
      dispatch(fetchEmpresaFailure(msg));
      throw error;
    }
  };
};

/**
 * GET BY ID (GET /empresas/{id_empresa})
 *
 * Nota: aquí NO hay dispatch porque tu firma es return async () => {}
 * No se dispara SESSION_EXPIRED en 401 sin cambiar estructura.
 */
export const actionEmpresaGetById = (id_empresa) => {
  return async () => {
    const resp = await apiServiceGet.get(`empresas/${id_empresa}`, {
      headers: { ...authHeader() },
    });
    return resp.data;
  };
};

/**
 * UPDATE (PATCH /empresas/{id_empresa})
 */
export const actionEmpresaUpdate = (id_empresa, payload, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      const resp = await apiServicePost.patch(`empresas/${id_empresa}`, payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionEmpresasGet({}));
      onDone(resp.data);
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo actualizar la empresa";
      dispatch(fetchEmpresaFailure(msg));
      throw error;
    }
  };
};

/**
 * ✅ ALIAS para que tu página compile:
 */
export const actionEmpresaUpdateById = (id_empresa, payload, onDone = () => {}) => {
  return actionEmpresaUpdate(id_empresa, payload, onDone);
};

/**
 * DELETE (DELETE /empresas/{id_empresa})
 */
export const actionEmpresaDelete = (id_empresa, onDone = () => {}) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.delete(`empresas/${id_empresa}`, {
        headers: { ...authHeader() },
      });
      await dispatch(actionEmpresasGet({}));
      onDone(resp.data);
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo eliminar la empresa";
      dispatch(fetchEmpresaFailure(msg));
      throw error;
    }
  };
};

/**
 * IMPORT PREVIEW (POST /empresas/import/preview) - multipart/form-data
 */
export const actionEmpresasImportPreview = (file) => {
  return async () => {
    const fd = new FormData();
    fd.append("file", file);
    const resp = await apiForm.post("empresas/import/preview", fd, {
      headers: { ...authHeader() },
    });
    return resp.data;
  };
};

/**
 * IP pública del cliente (ipify)
 */
const getPublicIp = async () => {
  try {
    const r = await axios.get("https:/http://${window.location.hostname}:8000.ipify.org?format=json");
    return r?.data?.ip || "";
  } catch {
    return "";
  }
};
/**
 * STATS (GET /empresas/{id_empresa}/stats?fecha_inicio=YYYY-MM-DD&fecha_final=YYYY-MM-DD)
 */
export const actionEmpresaStats = (id_empresa, params = {}) => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get(`empresas/${id_empresa}/stats`, {
        params,
        headers: { ...authHeader() },
      });
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar estadísticas de la empresa";
      dispatch(fetchEmpresaFailure(msg));
      throw error;
    }
  };
};

/**
 * IMPORT SAVE (POST /empresas/import/save)
 */
export const actionEmpresasImportSave = (rows, opts = {}, onDone = () => {}) => {
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
      const resp = await apiServicePost.post("empresas/import/save", body, {
        headers: { ...authHeader() },
      });
      await dispatch(actionEmpresasGet({}));
      onDone(resp.data);
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo guardar la importación";
      dispatch(fetchEmpresaFailure(msg));
      throw error;
    }
  };
};
