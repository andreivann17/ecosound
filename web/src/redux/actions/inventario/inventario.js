import axios from "axios";
import {
  FETCH_INVENTARIO_REQUEST,
  FETCH_INVENTARIO_SUCCESS,
  FETCH_INVENTARIO_FAILURE,
  FETCH_EQUIPO_ONE_SUCCESS,
  FETCH_EQUIPO_ONE_FAILURE,
  FETCH_CATEGORIAS_SUCCESS,
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

export const actionInventarioGet = (params = {}) => async (dispatch) => {
  dispatch({ type: FETCH_INVENTARIO_REQUEST });
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const res = await api.get("/inventario/equipo", {
      headers: authHeader(),
      params: cleanParams,
    });
    dispatch({ type: FETCH_INVENTARIO_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar inventario";
    dispatch({ type: FETCH_INVENTARIO_FAILURE, payload: { error: msg } });
  }
};

export const actionCategoriasGet = () => async (dispatch) => {
  try {
    const res = await api.get("/inventario/categorias", { headers: authHeader() });
    dispatch({ type: FETCH_CATEGORIAS_SUCCESS, payload: res.data });
  } catch {
    dispatch({ type: FETCH_CATEGORIAS_SUCCESS, payload: [] });
  }
};

export const actionEquipoGetById = (id) => async (dispatch) => {
  try {
    const res = await api.get(`/inventario/equipo/${id}`, { headers: authHeader() });
    dispatch({ type: FETCH_EQUIPO_ONE_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar equipo";
    dispatch({ type: FETCH_EQUIPO_ONE_FAILURE, payload: { error: msg } });
  }
};

export const apiInventarioInstance = api;
export { authHeader as authHeaderInventario };
