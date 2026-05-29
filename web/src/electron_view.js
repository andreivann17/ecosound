import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Popover, Button, Typography, notification  } from "antd";
import {
  SearchOutlined,
  HomeOutlined,
  BellFilled,
  WarningOutlined,
  FolderOpenOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  CalendarFilled,
  BarChartOutlined,
  TeamOutlined,
  UserOutlined,
  SettingFilled,
  CameraOutlined,
  SoundOutlined,
  ToolOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { usePermisos } from "./context/PermisosContext";
import BuscarExpedienteModal from "./containers/pages/buscar.jsx";
import logoPng from "./assets/img/logo_hersoft_event.webp";
import logoAdminPng from "./assets/img/logo_herrsoft.webp";
import "./styles.css";
import { actionNotificacionesGet } from "./redux/actions/notificaciones/notificaciones";
import { WS_PATH } from "./redux/utils.js";
import { performLogout } from "./utils/logout";
const { Text } = Typography;

export default function ElectronHeader({ hideUserPopover }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const concSlice = useSelector((state) => state.notificaciones || {});

  const [notifOpen, setNotifOpen] = useState(false);
  const [lastSeenTs, setLastSeenTs] = useState(
    () => Number(localStorage.getItem("notif_last_seen") || 0)
  );
  const [userOpen, setUserOpen] = useState(false);
  const [isBuscarOpen, setIsBuscarOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);

  const appMenuRef = useRef(null);
  const userMenuRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastToastAtRef = useRef(0);
  const pendingToastRef = useRef(null);

  const isElectron = useMemo(() => {
    return typeof window !== "undefined" && !!window.electronAPI;
  }, []);

  const isLoginPage = ["/login", "/admin-login", "/signup", "/prelogin"].includes(location.pathname);
  const canShowUser = !isLoginPage;

  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("email") || "—");
  const userInitials = useMemo(() => {
    const name = userEmail.trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "J";
    const b = parts[0]?.[1] || "D";
    return (a + b).toUpperCase();
  }, [userEmail]);

  const [userAvatar, setUserAvatar] = useState(() => localStorage.getItem("userAvatar") || "");

  useEffect(() => {
    const syncEmail = () => setUserEmail(localStorage.getItem("email") || "—");
    window.addEventListener("permisos-refresh", syncEmail);
    return () => window.removeEventListener("permisos-refresh", syncEmail);
  }, []);

  useEffect(() => {
    const handler = (e) => setUserAvatar(e.detail || "");
    window.addEventListener("avatar-updated", handler);
    return () => window.removeEventListener("avatar-updated", handler);
  }, []);

  useEffect(() => {
    if (hideUserPopover) return;
    dispatch(actionNotificacionesGet());
  }, [dispatch, hideUserPopover]);

  useEffect(() => {
    if (hideUserPopover && userOpen) setUserOpen(false);
  }, [hideUserPopover, userOpen]);

  const notifyWsUpdate = useCallback(
    (text) => {
      const now = Date.now();
      const cooldownMs = 1500;

      if (now - lastToastAtRef.current < cooldownMs) {
        if (pendingToastRef.current) clearTimeout(pendingToastRef.current);

        pendingToastRef.current = setTimeout(() => {
          lastToastAtRef.current = Date.now();
          notification.info({
  message: "Nueva notificación",
  description: text || "Se detectó una nueva notificación.",
  placement: "topRight",
});
          pendingToastRef.current = null;
        }, cooldownMs);

        return;
      }

      lastToastAtRef.current = now;
      notification.info({
  message: "Nueva notificación",
  description: text || "Se detectó una nueva notificación.",
  placement: "topRight",
});
    },
    []
  );

const connectWS = useCallback(() => {
  const url = `${WS_PATH}/ws/notificaciones`;
  const ws = new WebSocket(url);
  wsRef.current = ws;

  ws.onopen = () => {
    try {
      ws.send(JSON.stringify({ type: "HELLO", page: "header_notificaciones" }));
    } catch {}
  };

  ws.onmessage = (ev) => {
    let msg = ev.data;

    try {
      msg = JSON.parse(ev.data);
    } catch {}

    if (msg?.type === "NOTIFICACION_INVALIDATE") {
      notifyWsUpdate(
        msg?.descripcion_notificacion || "Nueva notificación detectada."
      );

      dispatch(actionNotificacionesGet());
    }
  };

  ws.onerror = () => {
    try {
      ws.close();
    } catch {}
  };

  ws.onclose = () => {
    reconnectTimeoutRef.current = setTimeout(() => {
      connectWS();
    }, 1000);
  };
}, [dispatch, notifyWsUpdate]);

  useEffect(() => {
    if (isLoginPage) return;

    connectWS();

    return () => {
      if (pendingToastRef.current) clearTimeout(pendingToastRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [connectWS, isLoginPage]);

  useEffect(() => {
    if (!appMenuOpen) return;
    const handler = (e) => {
      if (appMenuRef.current && !appMenuRef.current.contains(e.target)) {
        setAppMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [appMenuOpen]);

  useEffect(() => {
    if (!userOpen) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userOpen]);

  const { perm } = usePermisos() || { perm: () => true };

  const pathname = location.pathname || "/";

  const isAdmin = pathname.startsWith("/admin");

  const isEventos = pathname.startsWith("/app/eventos");
  const isPaquetes = pathname.startsWith("/app/paquetes");
  const isInventario = pathname.startsWith("/app/inventario");

  const isHomeActive = pathname.startsWith("/app/home");
  const isAdminHome = pathname === "/admin";
  const isAdminApps = pathname.startsWith("/admin/apps");

  const isAdminClientes = pathname.startsWith("/admin/clientes");

  const links = isAdmin
    ? [
        { label: "Inicio",     onClick: () => navigate("/admin"),           active: isAdminHome     },
        { label: "Apps",      onClick: () => navigate("/admin/apps"),      active: isAdminApps     },
        { label: "Clientes",  onClick: () => navigate("/admin/clientes"),  active: isAdminClientes },
      ]
    : [
        { label: "Inicio",onClick: () => navigate("/app/home"), active: isHomeActive },
        ...(perm("eventos", "modulo")    ? [{ label: "Eventos",    onClick: () => navigate("/app/eventos"),    active: isEventos    }] : []),
        ...(perm("paquetes", "modulo")   ? [{ label: "Paquetes",   onClick: () => navigate("/app/paquetes"),   active: isPaquetes   }] : []),
      ];

  const appItems = isAdmin ? [] : [
    ...(perm("agenda",        "modulo") ? [{ key: "agenda",        label: "Agenda",        icon: <CalendarFilled />,   iconCls: "eh-app-icon-agenda",        path: "/app/agenda"        }] : []),
    ...(perm("configuracion", "modulo") ? [{ key: "configuracion", label: "Configuración", icon: <SettingFilled />,    iconCls: "eh-app-icon-configuracion", path: "/app/configuracion" }] : []),
    ...(perm("estadisticas",  "modulo") ? [{ key: "estadisticas",  label: "Estadísticas",  icon: <BarChartOutlined />, iconCls: "eh-app-icon-estadisticas",  path: "/app/estadisticas"  }] : []),
    ...(perm("gastos",        "modulo") ? [{ key: "gastos",        label: "Gastos",        icon: <DollarOutlined />,   iconCls: "eh-app-icon-gastos",        path: "/app/gastos"        }] : []),
    ...(perm("usuarios",      "modulo") ? [{ key: "usuarios",      label: "Usuarios",      icon: <UserOutlined />,     iconCls: "eh-app-icon-usuarios",      path: "/app/usuarios"      }] : []),
  ];

  const hasActiveApp = appItems.some((i) => pathname.startsWith(i.path));

  const ACTION_LABEL = {
    CREATE: "Creación",
    UPDATE: "Actualización",
    DELETE: "Eliminación",
    UPLOAD: "Carga de archivo",
  };

  const MODULO_LABEL = {
    1: "Conciliaciones",
    2: "Eventos",
    3: "Sesiones de Fotos",
    4: "Paquetes",
    5: "Trabajadores",
    6: "Inventario",
    7: "Usuarios",
    8: "Clientes",
    9: "Gastos",
  };

  const notifications = (concSlice?.data?.items || []).map((item) => {
    const action = (item?.action || "").toUpperCase();
    const moduloNombre = MODULO_LABEL[item?.id_modulo] || "";

    let type = "info";
    if (action === "DELETE") {
      type = "danger";
    } else if (action === "UPDATE") {
      type = "warn";
    } else if (action === "UPLOAD") {
      type = "neutral";
    }

    let icon = <FolderOpenOutlined className="eh-notif-icon info" />;
    if (type === "danger") {
      icon = <WarningOutlined className="eh-notif-icon danger" />;
    } else if (type === "warn") {
      icon = <ClockCircleOutlined className="eh-notif-icon warn" />;
    } else if (type === "neutral") {
      icon = <FileTextOutlined className="eh-notif-icon neutral" />;
    }

    const actionLabel = ACTION_LABEL[action] || action || "Notificación";
    const title = moduloNombre ? `${moduloNombre} — ${actionLabel}` : actionLabel;
    const desc = item?.message || item?.descripcion || "Sin descripción";

    const itemTs = item.datetime ? new Date(item.datetime).getTime() : 0;

    return {
      id: item.id_audit_log || item.id,
      type,
      icon,
      title,
      desc,
      meta: item.datetime || item.fecha_notificacion || "",
      unread: itemTs > lastSeenTs,
    };
  });

  const unreadCount = notifications.filter((n) => n.unread).length;

  const notifCard = (
    <div className="eh-notif-pop">
      <div className="eh-notif-head">
        <div className="eh-notif-title">Notificaciones</div>
      </div>

      <div className="eh-notif-list">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`eh-notif-item ${n.type}`}
              onClick={() => {
                setNotifOpen(false);
                navigate(`/app/notificaciones/${n.id}`);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="eh-notif-ico-wrap">{n.icon}</div>

              <div className="eh-notif-body">
                <div className="eh-notif-item-title">{n.title}</div>
                <div className="eh-notif-item-desc">{n.desc}</div>
                <div className="eh-notif-item-meta">{n.meta}</div>
              </div>

              {n.unread && <span className="eh-notif-dot" />}
            </div>
          ))
        ) : (
          <div className="eh-notif-item neutral">
            <div className="eh-notif-ico-wrap">
              <FileTextOutlined className="eh-notif-icon neutral" />
            </div>

            <div className="eh-notif-body">
              <div className="eh-notif-item-title">Sin notificaciones</div>
              <div className="eh-notif-item-desc">No hay notificaciones registradas.</div>
              <div className="eh-notif-item-meta">—</div>
            </div>
          </div>
        )}
      </div>

      <div className="eh-notif-foot">
        <button
          className="eh-notif-link"
          type="button"
          onClick={() => {
            setNotifOpen(false);
            navigate("/app/notificaciones");
          }}
        >
          Ver todas las notificaciones
        </button>
      </div>
    </div>
  );


  return (
    <>
 

      <header className="eh-root">
        <div className="eh-bar" style={isAdmin ? { background: "#01369e" } : undefined}>
          <div className="eh-left">
            <div className="eh-brand">
              <img className="eh-logo" style={{width:isAdmin ? "80px" : "50px"}} src={isAdmin ? logoAdminPng : logoPng} alt="Logo" />
            </div>

            {isLoginPage !== true && (
              <nav className="eh-nav electron-no-drag" style={{ marginLeft: 16 }}>
                {links.map((l) => (
                  <button
                    key={l.label}
                    type="button"
                    className={`eh-link nav-link ${l.active ? "nav-link--active active" : ""}`}
                    onClick={l.onClick}
                  >
                    {l.icon && <span style={{ marginRight: 6, fontSize: 13 }}>{l.icon}</span>}
                    {l.label}
                  </button>
                ))}
              </nav>
            )}
          </div>

          <div className="eh-right electron-no-drag">
            {isLoginPage !== true && (
              <>
              

                {perm("notificaciones", "modulo") && (
                <Popover
                  content={notifCard}
                  trigger="click"
                  placement="bottomRight"
                  open={notifOpen}
                  onOpenChange={(v) => {
                    setNotifOpen(v);
                    if (v) {
                      setUserOpen(false);
                      const now = Date.now();
                      localStorage.setItem("notif_last_seen", String(now));
                      setLastSeenTs(now);
                    }
                  }}
                  overlayClassName="eh-popover"
                >
                  <button
                    type="button"
                    className="eh-bell-btn electron-no-drag"
                    aria-label="Notificaciones"
                    style={{ position: "relative" }}
                  >
                    <BellFilled style={{ fontSize: 18 }} />
                    {unreadCount > 0 && (
                      <span className="eh-bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                    )}
                  </button>
                </Popover>
                )}

                <div className="eh-app-menu-wrapper electron-no-drag" ref={appMenuRef}>
                  <button
                    type="button"
                    className={`eh-app-trigger eh-app-icon-btn${appMenuOpen ? " open" : ""}${hasActiveApp && !appMenuOpen ? " has-active" : ""}`}
                    aria-label="Acceso rápido"
                    onClick={() => {
                      setAppMenuOpen((v) => !v);
                      setUserOpen(false);
                    }}
                  >
                    <AppstoreOutlined />
                  </button>

                  {appMenuOpen && (
                    <div className="eh-app-dropdown">
                      <span className="eh-app-dropdown-label">Acceso rápido</span>
                      <div className="eh-app-items">
                        {appItems.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            className={`eh-app-item${pathname.startsWith(item.path) ? " active" : ""}`}
                            onClick={() => {
                              setAppMenuOpen(false);
                              navigate(item.path);
                            }}
                          >
                            <span className={`eh-app-item-icon ${item.iconCls}`}>
                              {item.icon}
                            </span>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {canShowUser && (
                  <div className="eh-user-menu-wrapper electron-no-drag" ref={userMenuRef}>
                    <button
                      type="button"
                      className="eh-avatar"
                      aria-label="Usuario"
                      onClick={() => {
                        setUserOpen((v) => !v);
                        setAppMenuOpen(false);
                      }}
                    >
                      {userAvatar ? <img src={userAvatar} alt="avatar" /> : userInitials}
                    </button>

                    {userOpen && (
                      <div className="eh-user-dropdown">
                        <div className="eh-user-pop">
                          <div className="eh-user-avatar">
                            {userAvatar ? <img src={userAvatar} alt="avatar" /> : userInitials}
                          </div>
                          <div className="eh-user-email">{userEmail}</div>
                          {isAdmin && (
                            <span style={{
                              display: "inline-block",
                              margin: "10px auto 4px",
                              padding: "4px 16px",
                              borderRadius: 999,
                              background: "rgba(96,165,250,0.15)",
                              color: "#93c5fd",
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: ".10em",
                              border: "1px solid rgba(96,165,250,0.35)",
                              textTransform: "uppercase",
                            }}>
                              Admin
                            </span>
                          )}
                          <div className="eh-user-actions">
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
                                if (isAdmin) {
                                  localStorage.removeItem("tokenadmin");
                                  setUserOpen(false);
                                  // Cierre completo: backend + reset Redux + replace history.
                                  performLogout({ admin: true });
                                } else {
                                  ["token", "tokenadmin", "email", "role", "activeButtonAdmin", "activeButtonUser"].forEach(
                                    (k) => localStorage.removeItem(k)
                                  );
                                  setUserOpen(false);
                                  // Cierre completo: backend + reset Redux + replace history.
                                  performLogout({ admin: false });
                                }
                              }}
                            >
                              Cerrar sesión
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {isElectron && (
              <div className="win-controls">
                <button
                  className="electron-btn"
                  title="Minimizar"
                  onClick={() => window.electronAPI?.minimize?.()}
                >
                  🗕
                </button>
                <button
                  className="electron-btn"
                  title="Maximizar/Restaurar"
                  onClick={() => window.electronAPI?.maximize?.()}
                >
                  🗖
                </button>
                <button
                  className="electron-btn electron-btn-close"
                  title="Cerrar"
                  onClick={() => window.electronAPI?.close?.()}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="eh-drag-overlay" />
      </header>

      <BuscarExpedienteModal
        open={isBuscarOpen}
        onClose={() => setIsBuscarOpen(false)}
        onSearch={(payload) => {
          console.log("Buscar expediente:", payload);
        }}
      />
    </>
  );
}