// redux/actions/usuarios/usuarios.js
import axios from "axios";
import {
  FETCH_USUARIOS_REQUEST,
  FETCH_USUARIOS_SUCCESS,
  FETCH_USUARIOS_FAILURE,
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

export const actionUsuariosGet = (params = {}) => async (dispatch) => {
  dispatch({ type: FETCH_USUARIOS_REQUEST });
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const res = await api.get("/users", {
      headers: authHeader(),
      params: cleanParams,
    });
    dispatch({ type: FETCH_USUARIOS_SUCCESS, payload: res.data });
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || "Error al cargar usuarios";
    dispatch({ type: FETCH_USUARIOS_FAILURE, payload: { error: msg } });
  }
};

export const apiUsuariosInstance = api;
export { authHeader as authHeaderUsuarios };
