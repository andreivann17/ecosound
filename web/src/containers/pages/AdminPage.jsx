import React from "react";
import { useNavigate } from "react-router-dom";

export default function AdminPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "40px 32px" }}>
      <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 8 }}>Panel de Administración</h2>
      <p style={{ color: "#6b7280" }}>Selecciona una opción del menú para continuar.</p>
    </div>
  );
}
