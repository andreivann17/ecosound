import React, { useEffect } from "react";
import { Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import Error403 from "../../containers/errors/error403";

export default function RequireModulo({ modulo, children }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || localStorage.getItem("tokenadmin");
  const { perm, loaded } = usePermisos() || { perm: () => true, loaded: true };

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  // Auth check: no token → render nothing while redirect fires
  if (!token) return null;

  // Permisos still loading → spinner
  if (!loaded) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  // Permisos loaded but no access to this module → 403
  if (!perm(modulo, "modulo")) {
    return <Error403 />;
  }

  return children;
}
