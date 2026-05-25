import axios from "axios";
import {
  FETCH_CLIENTES_EVENTS_REQUEST,
  FETCH_CLIENTES_EVENTS_SUCCESS,
  FETCH_CLIENTES_EVENTS_FAILURE,
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

export const actionClientesEventsGet = (params = {}) => async (dispatch) => {
  dispatch({ type: FETCH_CLIENTES_EVENTS_REQUEST });
  try {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const res = await api.get("/clientes", { headers: authHeader(), params: { id_app: 1, ...clean } });
    dispatch({ type: FETCH_CLIENTES_EVENTS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({
      type: FETCH_CLIENTES_EVENTS_FAILURE,
      payload: { error: err?.response?.data?.detail || err.message },
    });
  }
};

export const apiClientesEventsInstance = api;
export { authHeader as authHeaderClientesEvents };
