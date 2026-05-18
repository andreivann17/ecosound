import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { PATH } from "../redux/utils";

const PermisosContext = createContext(null);

const MODULES = ["eventos", "trabajadores", "inventario", "usuarios", "agenda", "estadisticas", "configuracion", "paquetes"];
const ACTIONS = ["modulo", "consultar", "insertar", "editar", "eliminar"];

const buildDefault = () =>
  Object.fromEntries(MODULES.map((m) => [m, Object.fromEntries(ACTIONS.map((a) => [a, false]))]));

export function PermisosProvider({ children }) {
  const [permisos, setPermisos] = useState(buildDefault());
  const [loaded, setLoaded] = useState(false);

  const fetchPermisos = useCallback(async () => {
    const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
    if (!token) {
      setPermisos(buildDefault());
      setLoaded(true);
      return;
    }
    try {
      const { data } = await axios.get(`${PATH}/users/me/permisos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPermisos(data || buildDefault());
    } catch {
      setPermisos(buildDefault());
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchPermisos();
  }, [fetchPermisos]);

  useEffect(() => {
    const handler = () => fetchPermisos();
    window.addEventListener("permisos-refresh", handler);
    return () => window.removeEventListener("permisos-refresh", handler);
  }, [fetchPermisos]);

  const perm = (module, action) => Boolean(permisos?.[module]?.[action]);

  return (
    <PermisosContext.Provider value={{ permisos, perm, loaded, refresh: fetchPermisos }}>
      {children}
    </PermisosContext.Provider>
  );
}

export const usePermisos = () => useContext(PermisosContext);
