import axios from "axios";
import {
  FETCH_TRABAJADORES_REQUEST,
  FETCH_TRABAJADORES_SUCCESS,
  FETCH_TRABAJADORES_FAILURE,
  FETCH_TRABAJADOR_ONE_SUCCESS,
  FETCH_TRABAJADOR_ONE_FAILURE,
  FETCH_PUESTOS_SUCCESS,
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

export const actionTrabajadoresGet = (params = {}) => async (dispatch) => {
  dispatch({ type: FETCH_TRABAJADORES_REQUEST });
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const res = await api.get("/trabajadores", {
      headers: authHeader(),
      params: cleanParams,
    });
    dispatch({ type: FETCH_TRABAJADORES_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar trabajadores";
    dispatch({ type: FETCH_TRABAJADORES_FAILURE, payload: { error: msg } });
  }
};

export const actionPuestosGet = () => async (dispatch) => {
  try {
    const res = await api.get("/trabajadores/puestos", { headers: authHeader() });
    dispatch({ type: FETCH_PUESTOS_SUCCESS, payload: res.data });
  } catch {
    dispatch({ type: FETCH_PUESTOS_SUCCESS, payload: [] });
  }
};

export const actionTrabajadorGetById = (id) => async (dispatch) => {
  try {
    const res = await api.get(`/trabajadores/${id}`, { headers: authHeader() });
    dispatch({ type: FETCH_TRABAJADOR_ONE_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar trabajador";
    dispatch({ type: FETCH_TRABAJADOR_ONE_FAILURE, payload: { error: msg } });
  }
};

export const apiTrabajadoresInstance = api;
export { authHeader as authHeaderTrabajadores };
