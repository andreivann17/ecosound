import axios from "axios";
import {
  FETCH_EVENTOS_REQUEST,
  FETCH_EVENTOS_SUCCESS,
  FETCH_EVENTOS_FAILURE,
  FETCH_EVENTO_ONE_SUCCESS,
  FETCH_EVENTO_ONE_FAILURE,
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

export const actionEventosGet = (params = {}) => async (dispatch) => {
  dispatch({ type: FETCH_EVENTOS_REQUEST });
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const res = await api.get("/eventos", {
      headers: authHeader(),
      params: cleanParams,
    });
    dispatch({ type: FETCH_EVENTOS_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar eventos";
    dispatch({ type: FETCH_EVENTOS_FAILURE, payload: { error: msg } });
  }
};

export const actionEventoGetById = (id) => async (dispatch) => {
  try {
    const res = await api.get(`/eventos/${id}`, { headers: authHeader() });
    dispatch({ type: FETCH_EVENTO_ONE_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar evento";
    dispatch({ type: FETCH_EVENTO_ONE_FAILURE, payload: { error: msg } });
  }
};

export const apiEventosInstance = api;
export { authHeader as authHeaderEventos };
