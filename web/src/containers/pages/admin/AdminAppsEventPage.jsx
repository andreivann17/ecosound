import React, { useState } from "react";
import { TeamOutlined, BarChartOutlined, DollarOutlined, DatabaseOutlined, SettingOutlined } from "@ant-design/icons";
import logoHersom from "../../../assets/img/logo_hersom_event_2.png";
import ClientesEventPage from "./events/ClientesEventPage";
import CrearClienteEventPage from "./events/CrearClienteEventPage";
import ClienteEventDetallePage from "./events/ClienteEventDetallePage";
import AlmacenamientoEventPage from "./events/AlmacenamientoEventPage";

const BLUE = "#01369e";

const navItems = [
  { key: "clientes",       label: "Clientes",       icon: <TeamOutlined /> },
  { key: "estadisticas",   label: "Estadísticas",   icon: <BarChartOutlined /> },
  { key: "pagos",          label: "Pagos",          icon: <DollarOutlined /> },
  { key: "almacenamiento", label: "Almacenamiento", icon: <DatabaseOutlined /> },
  { key: "configuracion",  label: "Configuración",  icon: <SettingOutlined /> },
];

function PlaceholderView({ title, desc }) {
  return (
    <div>
      <h3 style={{ fontWeight: 700, fontSize: 18, color: "#111827", marginBottom: 4 }}>{title}</h3>
      <p style={{ color: "#6b7280", fontSize: 14 }}>{desc}</p>
    </div>
  );
}

export default function AdminAppsEventPage() {
  const [active, setActive] = useState("clientes");
  // subView: null | { type: "crear" } | { type: "editar", data } | { type: "detalle", id }
  const [subView, setSubView] = useState(null);

  const handleNavClick = (key) => {
    setActive(key);
    setSubView(null);
  };

  const renderContent = () => {
    if (active === "clientes") {
      if (!subView) {
        return (
          <ClientesEventPage
            onNavigate={setSubView}
          />
        );
      }
      if (subView.type === "crear") {
        return (
          <CrearClienteEventPage
            onBack={() => setSubView(null)}
          />
        );
      }
      if (subView.type === "editar") {
        return (
          <CrearClienteEventPage
            cliente={subView.data}
            onBack={() => setSubView(null)}
          />
        );
      }
      if (subView.type === "detalle") {
        return (
          <ClienteEventDetallePage
            idCliente={subView.id}
            onBack={() => setSubView(null)}
            onEdit={(data) => setSubView({ type: "editar", data })}
          />
        );
      }
    }

    const placeholders = {
      estadisticas:   { title: "Estadísticas",   desc: "Estadísticas del módulo Events." },
      pagos:          { title: "Pagos",           desc: "Gestión de pagos del módulo Events." },
      almacenamiento: null,
      configuracion:  { title: "Configuración",   desc: "Configuración del módulo Events." },
    };
    if (active === "almacenamiento") return <AlmacenamientoEventPage />;

    const p = placeholders[active];
    return p ? <PlaceholderView title={p.title} desc={p.desc} /> : null;
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 55px)", background: "#f3f4f6" }}>

      {/* Sidebar */}
      <div
        style={{
          width: 220,
          background: "#fff",
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          padding: "24px 12px",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #e5e7eb",
        }}>
          <img src={logoHersom} alt="Events" style={{ width: 56, height: 56, objectFit: "contain", marginBottom: 8 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", letterSpacing: 0.5 }}>Events</span>
        </div>

        {navItems.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, border: "none",
                background: isActive ? `${BLUE}12` : "transparent",
                color: isActive ? BLUE : "#374151",
                fontWeight: isActive ? 600 : 500,
                fontSize: 14, cursor: "pointer", textAlign: "left", width: "100%",
                transition: "background .15s, color .15s",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f3f4f6"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Content panel */}
      <div style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>
        {renderContent()}
      </div>
    </div>
  );
}
