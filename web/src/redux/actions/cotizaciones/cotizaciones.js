import axios from "axios";
import {
  FETCH_COTIZACIONES_REQUEST,
  FETCH_COTIZACIONES_SUCCESS,
  FETCH_COTIZACIONES_FAILURE,
  FETCH_COTIZACION_ONE_SUCCESS,
  FETCH_COTIZACION_ONE_FAILURE,
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

export const actionCotizacionesGet = (params = {}) => async (dispatch) => {
  dispatch({ type: FETCH_COTIZACIONES_REQUEST });
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const res = await api.get("/cotizaciones", {
      headers: authHeader(),
      params: cleanParams,
    });
    dispatch({ type: FETCH_COTIZACIONES_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar cotizaciones";
    dispatch({ type: FETCH_COTIZACIONES_FAILURE, payload: { error: msg } });
  }
};

export const actionCotizacionGetById = (id) => async (dispatch) => {
  try {
    const res = await api.get(`/cotizaciones/${id}`, { headers: authHeader() });
    dispatch({ type: FETCH_COTIZACION_ONE_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar cotización";
    dispatch({ type: FETCH_COTIZACION_ONE_FAILURE, payload: { error: msg } });
  }
};

export const apiCotizacionesInstance = api;
export { authHeader as authHeaderCotizaciones };
