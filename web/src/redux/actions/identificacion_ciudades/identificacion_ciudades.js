// redux/actions/identificacion-ciudad/identificacion-ciudad.js
import axios from "axios";
import {PATH} from "../../utils"
const SESSION_EXPIRED = "SESSION_EXPIRED";

// ========= Instancias =========
const API_BASE = `${PATH}`;

const apiServiceGet = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

const apiServicePost = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ========= Auth header =========
const authHeader = () => {
  const token =
    localStorage.getItem("tokenadmin") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ========= 401 helper =========
const handle401 = (dispatch) => {
  localStorage.removeItem("token");
  localStorage.removeItem("tokenadmin");
  if (dispatch) dispatch({ type: SESSION_EXPIRED });
};

/**
 * LIST (GET /identificacion-ciudad)
 */
export const actionIdentificacionCiudadGet = () => {
  return async (dispatch) => {
    try {
      const resp = await apiServiceGet.get("identificacion-ciudad", {
        headers: { ...authHeader() },
      });
      return resp.data;
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "Error al cargar identificacion-ciudad";
      return msg;
    }
  };
};

/**
 * CREATE (POST /identificacion-ciudad)
 * payload: { nombre, id_ciudad, id_competencia, active? }
 */
export const actionIdentificacionCiudadCreate = (
  payload,
  onDone = () => {}
) => {
  return async (dispatch) => {
    try {
      await apiServicePost.post("identificacion-ciudad", payload, {
        headers: { ...authHeader() },
      });
      await dispatch(actionIdentificacionCiudadGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo crear la identificación de ciudad";
      throw error;
    }
  };
};

/**
 * GET BY CODE (GET /identificacion-ciudad/code/{code})
 *
 * Nota: aquí NO hay dispatch porque tu firma es return async () => {}
 * No se dispara SESSION_EXPIRED en 401 sin cambiar estructura.
 */
export const actionIdentificacionCiudadGetByCode = (code) => {
  return async () => {
    const resp = await apiServiceGet.get(
      `identificacion-ciudad/code/${encodeURIComponent(code)}`,
      {
        headers: { ...authHeader() },
      }
    );
    return resp.data;
  };
};

/**
 * UPDATE BY CODE (PATCH /identificacion-ciudad/code/{code})
 */
export const actionIdentificacionCiudadUpdateByCode = (
  code,
  payload,
  onDone = () => {}
) => {
  return async (dispatch) => {
    try {
      await apiServicePost.patch(
        `identificacion-ciudad/code/${encodeURIComponent(code)}`,
        payload,
        {
          headers: { ...authHeader() },
        }
      );
      await dispatch(actionIdentificacionCiudadGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo actualizar la identificación de ciudad";
      throw error;
    }
  };
};

/**
 * DELETE BY CODE (DELETE /identificacion-ciudad/code/{code}) — soft delete active=0
 */
export const actionIdentificacionCiudadDeleteByCode = (
  code,
  onDone = () => {}
) => {
  return async (dispatch) => {
    try {
      await apiServiceGet.delete(
        `identificacion-ciudad/code/${encodeURIComponent(code)}`,
        {
          headers: { ...authHeader() },
        }
      );
      await dispatch(actionIdentificacionCiudadGet());
      onDone();
    } catch (error) {
      if (error?.response?.status === 401) handle401(dispatch);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        "No se pudo eliminar la identificación de ciudad";
      throw error;
    }
  };
};
