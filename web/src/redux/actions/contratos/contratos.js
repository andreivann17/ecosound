// redux/actions/contratos/contratos.js
import axios from "axios";
import {
  FETCH_CONTRATOS_REQUEST,
  FETCH_CONTRATOS_SUCCESS,
  FETCH_CONTRATOS_FAILURE,
  FETCH_CONTRATO_ONE_SUCCESS,
  FETCH_CONTRATO_ONE_FAILURE,
} from "./types";
import { PATH } from "../../utils";

const API_BASE = `${PATH}`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

const authHeader = () => {
  const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ========= Action: listar contratos =========
export const actionContratosGet = (params = {}) => async (dispatch) => {
  dispatch({ type: FETCH_CONTRATOS_REQUEST });
  try {
    // Limpia undefined para no mandar parámetros vacíos
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const res = await api.get("/contratos", {
      headers: authHeader(),
      params: cleanParams,
    });
    dispatch({ type: FETCH_CONTRATOS_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar contratos";
    dispatch({ type: FETCH_CONTRATOS_FAILURE, payload: { error: msg } });
  }
};

// ========= Action: obtener un contrato por id =========
export const actionContratoGetById = (id) => async (dispatch) => {
  try {
    const res = await api.get(`/contratos/${id}`, { headers: authHeader() });
    dispatch({ type: FETCH_CONTRATO_ONE_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar contrato";
    dispatch({ type: FETCH_CONTRATO_ONE_FAILURE, payload: { error: msg } });
  }
};

// ========= Helpers para mutaciones (CREATE / UPDATE / DELETE) =========
// Se usan directamente con axios desde la página — no necesitan pasar por Redux
// para evitar sobre-ingeniería, pero sí usan el mismo auth header.

export const apiContratosInstance = api;
export { authHeader as authHeaderContratos };
