import axios from "axios";
import {
  FETCH_PAQUETES_REQUEST,
  FETCH_PAQUETES_SUCCESS,
  FETCH_PAQUETES_FAILURE,
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

export const actionPaquetesGet = (params = {}) => async (dispatch) => {
  dispatch({ type: FETCH_PAQUETES_REQUEST });
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const res = await api.get("/paquetes", { headers: authHeader(), params: cleanParams });
    dispatch({ type: FETCH_PAQUETES_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar paquetes";
    dispatch({ type: FETCH_PAQUETES_FAILURE, payload: { error: msg } });
  }
};

export const apiPaquetesInstance = api;
export { authHeader as authHeaderPaquetes };
