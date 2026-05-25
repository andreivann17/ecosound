import axios from "axios";
import {
  FETCH_GASTOS_REQUEST,
  FETCH_GASTOS_SUCCESS,
  FETCH_GASTOS_FAILURE,
} from "./types";
import { PATH } from "../../utils";

const api = axios.create({
  baseURL: PATH,
  headers: { "Content-Type": "application/json" },
});

const authHeader = () => {
  const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const actionGastosGet = (params = {}) => async (dispatch) => {
  dispatch({ type: FETCH_GASTOS_REQUEST });
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const res = await api.get("/gastos", { headers: authHeader(), params: cleanParams });
    dispatch({ type: FETCH_GASTOS_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar gastos";
    dispatch({ type: FETCH_GASTOS_FAILURE, payload: { error: msg } });
  }
};

export const apiGastosInstance = api;
export { authHeader as authHeaderGastos };
