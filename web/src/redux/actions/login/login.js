import { apiServiceNoToken } from "../../../containers/pages/utils/apiService";
import {
  FETCH_LOGIN_SUCCESS,
  FETCH_LOGIN_FAILURE,
  FETCH_ME_FAILURE,
  FETCH_ME_SUCCESS,
} from "./types";
import axios from "axios";
import {PATH} from "../../utils"
const SESSION_EXPIRED = "SESSION_EXPIRED";

const API_BASE = `${PATH}`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

const authHeader = () => {
  const token = localStorage.getItem("token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

const handle401 = (dispatch) => {
  localStorage.removeItem("token");
  localStorage.removeItem("tokenadmin");
  localStorage.removeItem("role");
  localStorage.removeItem("activeButtonAdmin");
  localStorage.removeItem("activeButtonUser");
  if (dispatch) dispatch({ type: SESSION_EXPIRED });
};

export const actionUserMeGet = (onDone = () => {}) => {
  return async (dispatch) => {
    try {
      const res = await api.get("users/me", { headers: { ...authHeader() } });

      dispatch({
        type: FETCH_ME_SUCCESS,
        payload: res.data?.user || null,
      });

      onDone(res.data);
    } catch (err) {
      if (err?.response?.status === 401) handle401(dispatch);

      dispatch({
        type: FETCH_ME_FAILURE,
        payload: err?.response?.data || { detail: "Error al obtener usuario" },
      });
      onDone(null);
    }
  };
};

const BASE_URL = `${PATH}`;

/**
 * actionLogin
 * Backend esperado:
 *   200 { access_token: string, role: "admin" | "patient" }
 *   ó   { message: "...", options: ["admin","patient"] }  // multi-rol
 *   401 { detail: "Incorrect password" | "Email not found" }
 */
export const actionLogin = (params, onSuccess, onError) => {
  return async (dispatch) => {
    try {
      if (!params?.email || !params?.password) {
        throw new Error("Email and password are required");
      }



      const { data } = await axios.post(
        `${BASE_URL}/auth/login`,
        { email: params.email, password: params.password, withCredentials: true  },
        {
          headers: { "Content-Type": "application/json" },
        }
      );



      // Caso multi-rol
      if (data?.message && Array.isArray(data?.options)) {
        dispatch(
          fetchLoginSuccess({
            needsRoleSelection: true,
            options: data.options,
          })
        );
        onSuccess({ needsRoleSelection: true, options: data.options });
        return;
      }

      const token = data?.access_token;
      console.log(data)
      if (!token) throw new Error("Invalid login response");

      localStorage.setItem("tokenadmin", token);
      localStorage.setItem("token", token);
      localStorage.setItem("email", params.email);

      // ====== NUEVO: historial de correos (por PC) ======
      try {
        const e = String(params.email || "").trim().toLowerCase();
        if (e) {
          const saved = JSON.parse(localStorage.getItem("email_history") || "[]");
          const list = Array.isArray(saved) ? saved : [];
          const next = [e, ...list.filter((x) => String(x || "").toLowerCase() !== e)].slice(0, 15);
          localStorage.setItem("email_history", JSON.stringify(next));
        }
      } catch {}

    

      if (data?.role) {
        localStorage.setItem("role", data.role);
        if (data.role === "admin") {
          localStorage.setItem("activeButtonAdmin", "1");
          localStorage.setItem("activeButtonUser", "0");
        } else {
          localStorage.setItem("activeButtonAdmin", "0");
          localStorage.setItem("activeButtonUser", "1");
        }
      }

      dispatch(fetchLoginSuccess({ role: data.role }));
      onSuccess({ role: data.role });
    } catch (err) {
      const msg =
        err?.response?.data?.detail || "Email or password does not match";
      dispatch(fetchLoginFailure(msg));
      onError(msg);
    }
  };
};
export const actionLogout = ( ) => {
  return async (dispatch) => {
    try {
     



      const { data } = await axios.post(
        `${BASE_URL}/auth/logout`,
        {  },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (err) {
   console.log(err)
    }
  };
};
export const actionCorreo = (parametros, callback, callbackError) => {
  return async () => {
    try {
      const response = await apiServiceNoToken.fetchData(
        `http://${window.location.hostname}:8000/users/email/`,
        parametros
      );
      callback(response.data);
    } catch (error) {
      callbackError(error.message);
    }
  };
};

export const actionCodigo = (parametros, callback, callbackError) => {
  return async () => {
    try {
      const response = await apiServiceNoToken.fetchData(
        `http://${window.location.hostname}:8000/users/validate-code/`,
        parametros
      );
      callback(response.data);
    } catch (error) {
      callbackError(error.message);
    }
  };
};

export const actionNewPassword = (parametros, callback, callbackError) => {
  return async () => {
    try {
      const response = await apiServiceNoToken.fetchData(
        `http://${window.location.hostname}:8000/users/new-password/`,
        parametros
      );
      callback(response.data);
    } catch (error) {
      callbackError(error.message);
    }
  };
};

export const actionSignUp = (parametros, callback, callbackError) => {
  return async () => {
    try {
      await axios.post("http://${window.location.hostname}:8000/auth/register/", parametros, {
        headers: { "Content-Type": "application/json" },
      });

      callback();
    } catch (error) {
      callbackError(error?.response?.data?.detail || error.message);
    }
  };
};

export const actionConfirm = (parametros, token, callback, callbackError) => {
  return async () => {
    try {
      const body = { token: token, new_password: parametros.password };

      await axios.post(
        "https://bvmailcenter.com:8000/auth/user-reset-password/confirm",
        body,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      callback();
    } catch (error) {
      callbackError(error?.response?.data?.detail || error.message);
    }
  };
};

export const actionConfirmAdmin = (parametros, token, callback, callbackError) => {
  return async () => {
    try {
      const body = { token: token, new_password: parametros.password };

      await axios.post(
        "https://bvmailcenter.com:8000/auth/admin-reset-password/confirm",
        body,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      callback();
    } catch (error) {
      callbackError(error?.response?.data?.detail || error.message);
    }
  };
};

export const actionReset = (parametros, callback, callbackError, admin) => {
  return async () => {
    try {
      let url = "https://bvmailcenter.com:8000/auth/user-reset-password";
      if (admin) url = "https://bvmailcenter.com:8000/auth/admin-reset-password";

      const body = { email: parametros.email };

      await axios.post(url, body, {
        headers: { "Content-Type": "application/json" },
      });

      callback();
    } catch (error) {
      callbackError(error?.message || "Error");
    }
  };
};

export const actionEmail = (parametros, callback, callbackError) => {
  return async () => {
    try {
      const response = await apiServiceNoToken.fetchData(
        `http://${window.location.hostname}:5000/users/email/`,
        parametros
      );
      callback(response.data);
    } catch (error) {
      callbackError(error.message);
    }
  };
};

export const fetchLoginSuccess = (value) => ({
  type: FETCH_LOGIN_SUCCESS,
  payload: value,
});
export const fetchLoginFailure = (value) => ({
  type: FETCH_LOGIN_FAILURE,
  payload: value,
});
