import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Popover } from "antd";
import {
  HomeOutlined,
  CalendarFilled,
  AppstoreOutlined,
  FileTextOutlined,
  FileSearchOutlined,
  BarChartOutlined,
  UserOutlined,
  SettingFilled,
  DollarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import logoPng from "../../assets/img/logo_hersoft_event.webp";
import { Typography } from "antd";
import { usePermisos } from "../../context/PermisosContext";
import { useTema, logoUrlFromPath } from "../../context/TemaContext";
import { performLogout } from "../../utils/logout";

const { Text } = Typography;

const SIDEBAR_COLLAPSED = 56;
const SIDEBAR_EXPANDED = 228;

export default function VerticalSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname || "/";
  const [hovered, setHovered] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { perm } = usePermisos() || { perm: () => true };
  const { tema } = useTema() || {};
  const sidebarLogo =
    tema?.plan_deluxe === 1 && tema?.logo_container ? logoUrlFromPath(tema.logo_container) : logoPng;
  const sidebarTitle =
    tema?.plan_deluxe === 1 && tema?.nombre_app ? tema.nombre_app : "Herrsoft Events";

  const userEmail = localStorage.getItem("email") || "—";
  const userAvatar = localStorage.getItem("userAvatar") || "";
  const userInitials = (() => {
    const name = userEmail.trim();
    const a = name[0] || "J";
    const b = name[1] || "D";
    return (a + b).toUpperCase();
  })();

  const width = hovered ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  const ALL_ITEMS = [
    {
      label: "Inicio",
      icon: <HomeOutlined />,
      path: "/app/home",
      match: (p) => p.startsWith("/app/home"),
      show: true,
    },
    {
      label: "Eventos",
      icon: <CalendarFilled />,
      path: "/app/eventos",
      match: (p) => p.startsWith("/app/eventos"),
      show: perm("eventos", "modulo"),
    },
    {
      label: "Paquetes",
      icon: <AppstoreOutlined />,
      path: "/app/paquetes",
      match: (p) => p.startsWith("/app/paquetes"),
      show: perm("paquetes", "modulo"),
    },
    {
      label: "Cotizaciones",
      icon: <FileTextOutlined />,
      path: "/app/cotizaciones",
      match: (p) => p.startsWith("/app/cotizaciones"),
      show: true,
    },
    {
      label: "Agenda",
      icon: <CalendarFilled />,
      path: "/app/agenda",
      match: (p) => p.startsWith("/app/agenda"),
      show: perm("agenda", "modulo"),
    },
    {
      label: "Gastos",
      icon: <DollarOutlined />,
      path: "/app/gastos",
      match: (p) => p.startsWith("/app/gastos"),
      show: perm("gastos", "modulo"),
    },
    {
      label: "Estadísticas",
      icon: <BarChartOutlined />,
      path: "/app/estadisticas",
      match: (p) => p.startsWith("/app/estadisticas"),
      show: perm("estadisticas", "modulo"),
    },
    {
      label: "Informes",
      icon: <FileSearchOutlined />,
      path: "/app/informes",
      match: (p) => p.startsWith("/app/informes"),
      show: perm("informes", "modulo"),
    },
    {
      label: "Trabajadores",
      icon: <TeamOutlined />,
      path: "/app/trabajadores",
      match: (p) => p.startsWith("/app/trabajadores"),
      show: perm("trabajadores", "modulo"),
    },
    {
      label: "Usuarios",
      icon: <UserOutlined />,
      path: "/app/usuarios",
      match: (p) => p.startsWith("/app/usuarios"),
      show: perm("usuarios", "modulo"),
    },
    {
      label: "Configuración",
      icon: <SettingFilled />,
      path: "/app/configuracion",
      match: (p) => p.startsWith("/app/configuracion"),
      show: perm("configuracion", "modulo"),
    },
  ];

  const visibleItems = ALL_ITEMS.filter((i) => i.show);

  const userCard = (
    <div className="eh-user-pop">
      <div className="eh-user-avatar">
        {userAvatar ? <img src={userAvatar} alt="avatar" /> : userInitials}
      </div>
      <div className="eh-user-email">{userEmail}</div>
      <div className="eh-user-actions">
        {localStorage.getItem("usuario_cliente") === "1" && (
          <button
            type="button"
            className="eh-user-btn"
            onClick={() => { setUserOpen(false); navigate("/app/mi-cuenta"); }}
          >
            Mi cuenta
          </button>
        )}
        <button
          type="button"
          className="eh-user-btn"
          onClick={() => { setUserOpen(false); navigate("/app/perfil"); }}
        >
          Perfil
        </button>
        <button
          type="button"
          className="eh-user-btn danger"
          onClick={() => {
            setUserOpen(false);
            performLogout({ admin: false });
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <aside
      className="vs-root"
      style={{ width }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Logo */}
      <div className="vs-logo">
        <img src={sidebarLogo} alt="Logo" className="vs-logo-img" />
        {hovered && <span className="vs-logo-text">{sidebarTitle}</span>}
      </div>

      {/* Nav items */}
      <nav className="vs-nav vs-nav--all">
        {visibleItems.map((item) => {
          const active = item.match(pathname);
          return (
            <button
              key={item.path}
              type="button"
              className={`vs-item${active ? " vs-item--active" : ""}`}
              onClick={() => navigate(item.path)}
              title={!hovered ? item.label : undefined}
            >
              <span className="vs-item-icon">{item.icon}</span>
              {hovered && <span className="vs-item-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Usuario fijo abajo */}
      <div className="vs-bottom">
        <Popover
          content={userCard}
          trigger="click"
          placement="rightBottom"
          open={userOpen}
          onOpenChange={setUserOpen}
          overlayClassName="eh-popover vs-user-popover"
        >
          <button
            type="button"
            className="vs-avatar-btn"
            title={!hovered ? userEmail : undefined}
          >
            <span className="vs-avatar">
              {userAvatar ? <img src={userAvatar} alt="avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : userInitials}
            </span>
            {hovered && <span className="vs-avatar-email">{userEmail}</span>}
          </button>
        </Popover>
      </div>
    </aside>
  );
}
