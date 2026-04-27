import axios from "axios";
import {
  FETCH_SESIONES_REQUEST,
  FETCH_SESIONES_SUCCESS,
  FETCH_SESIONES_FAILURE,
  FETCH_SESION_ONE_SUCCESS,
  FETCH_SESION_ONE_FAILURE,
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

export const actionSesionesFotosGet = (params = {}) => async (dispatch) => {
  dispatch({ type: FETCH_SESIONES_REQUEST });
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const res = await api.get("/sesiones-fotos", {
      headers: authHeader(),
      params: cleanParams,
    });
    dispatch({ type: FETCH_SESIONES_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar sesiones";
    dispatch({ type: FETCH_SESIONES_FAILURE, payload: { error: msg } });
  }
};

export const actionSesionFotoGetById = (id) => async (dispatch) => {
  try {
    const res = await api.get(`/sesiones-fotos/${id}`, { headers: authHeader() });
    dispatch({ type: FETCH_SESION_ONE_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar sesión";
    dispatch({ type: FETCH_SESION_ONE_FAILURE, payload: { error: msg } });
  }
};

export const apiSesionesInstance = api;
export { authHeader as authHeaderSesiones };
