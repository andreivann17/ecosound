import React from "react";
import { useNavigate } from "react-router-dom";
import { AppstoreOutlined, SettingOutlined } from "@ant-design/icons";

const cards = [
  {
    label: "Apps",
    desc: "Gestiona los módulos y aplicaciones del sistema",
    icon: <AppstoreOutlined style={{ fontSize: 28, color: "#3b82f6" }} />,
    path: "/admin/apps",
  },
  {
    label: "Configuración",
    desc: "Ajustes generales del sistema",
    icon: <SettingOutlined style={{ fontSize: 28, color: "#3b82f6" }} />,
    path: "/admin/configuracion",
  },
];

export default function AdminHomePage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "40px 36px" }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 4 }}>
        Panel de Administración
      </h2>
      <p style={{ color: "#6b7280", marginBottom: 32, fontSize: 14 }}>
        Selecciona una sección para continuar.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {cards.map((c) => (
          <button
            key={c.path}
            type="button"
            onClick={() => navigate(c.path)}
            style={{
              width: 200,
              padding: "24px 20px",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              cursor: "pointer",
              textAlign: "left",
              boxShadow: "0 1px 4px rgba(0,0,0,.06)",
              transition: "box-shadow .15s, border-color .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(29,78,216,.12)";
              e.currentTarget.style.borderColor = "#93c5fd";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.06)";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
          >
            <div style={{ marginBottom: 12 }}>{c.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 4 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>{c.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
