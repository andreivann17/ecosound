import React from "react";
import { useNavigate } from "react-router-dom";
import logoHersom from "../../../assets/img/logo_hersom_event_2.png";
// Add donsimon_logo.png to src/assets/img/ for this import to resolve
import logoDonsimon from "../../../assets/img/donsimon_logo.png";

const BLUE = "#01369e";

function ProximoBadge() {
  return (
    <span
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        background: "#f59e0b",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 11px",
        borderRadius: 20,
        letterSpacing: 0.3,
      }}
    >
      Muy pronto
    </span>
  );
}

function CardButton({ onClick, disabled, children }) {
  const base = {
    border: "none",
    borderRadius: 8,
    padding: "9px 0",
    fontWeight: 600,
    fontSize: 13,
    width: "100%",
    cursor: disabled ? "not-allowed" : "pointer",
    background: disabled ? "#e5e7eb" : BLUE,
    color: disabled ? "#9ca3af" : "#fff",
    transition: "opacity .15s",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={base}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.opacity = "0.88"; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.opacity = "1"; }}
    >
      {children}
    </button>
  );
}

function AppCard({ image, imageBg, badge, title, desc, onAction, actionLabel, disabled }) {
  return (
    <div
      style={{
        width: 260,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,.07)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 160,
          background: imageBg || "#f0f4ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid #e5e7eb",
          position: "relative",
        }}
      >
        {image && (
          <img
            src={image}
            alt={title}
            style={{ maxWidth: 130, maxHeight: 130, objectFit: "contain" }}
          />
        )}
        {badge && <ProximoBadge />}
      </div>

      <div
        style={{
          padding: "18px 20px 20px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16, flex: 1, lineHeight: 1.5 }}>
          {desc}
        </div>
        <CardButton onClick={onAction} disabled={disabled}>
          {actionLabel}
        </CardButton>
      </div>
    </div>
  );
}

export default function AdminAppsPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "40px 36px" }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 4 }}>Apps</h2>
      <p style={{ color: "#6b7280", marginBottom: 32, fontSize: 14 }}>
        Gestiona las aplicaciones del sistema.
      </p>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <AppCard
          image={logoHersom}
          imageBg={BLUE}
          title="Events"
          desc="Sistema gestión de eventos fotográficos y de sonido."
          actionLabel="Ver detalles"
          onAction={() => navigate("/admin/apps/event")}
          disabled={false}
        />

        <AppCard
          image={logoDonsimon}
          imageBg={BLUE}
          badge
          title="Restaurante"
          desc="Sistema de gestión para restaurantes."
          actionLabel="Ver detalles"
          disabled
        />

        <AppCard
          imageBg={BLUE}
          badge
          title="Ferretería"
          desc="Sistema de gestión para ferreterías."
          actionLabel="Ver detalles"
          disabled
        />
      </div>
    </div>
  );
}
