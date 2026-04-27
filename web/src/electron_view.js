import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Popover, Button, Typography, notification  } from "antd";
import {
  SearchOutlined,
  BellFilled,
  WarningOutlined,
  FolderOpenOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import BuscarExpedienteModal from "./containers/pages/buscar.jsx";
import logoPng from "./assets/img/logo2.png";
import "./styles.css";
import { actionNotificacionesGet } from "./redux/actions/notificaciones/notificaciones";
import { WS_PATH } from "./redux/utils.js";
const { Text } = Typography;

export default function ElectronHeader({ hideUserPopover }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const concSlice = useSelector((state) => state.notificaciones || {});

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [isBuscarOpen, setIsBuscarOpen] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastToastAtRef = useRef(0);
  const pendingToastRef = useRef(null);

  const isElectron = useMemo(() => {
    return typeof window !== "undefined" && !!window.electronAPI;
  }, []);

  const isLoginPage = location.pathname.includes("/login");
  const canShowUser = !isLoginPage;

  const userEmail = localStorage.getItem("email") || "—";
  const userInitials = useMemo(() => {
    const name = (localStorage.getItem("email") || "JD").trim();
    const parts = name.split(/\s+/).filter(Boolean);

    const a = parts[0]?.[0] || "J";
    const b = parts[0]?.[1] || "D";
    return (a + b).toUpperCase();
  }, []);

  useEffect(() => {
    console.log(hideUserPopover)
    if(hideUserPopover){
      return
    }
   // dispatch(actionNotificacionesGet());
  }, [dispatch]);

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

  const pathname = location.pathname || "/";

  const isEventos = pathname.startsWith("/eventos");
  const isSesiones = pathname.startsWith("/sesiones");
  const isEstadisticas = pathname.startsWith("/estadisticas");
  const isAgendaActive = pathname.startsWith("/agenda");
  const isHomeActive = pathname.startsWith("/home");
  const links = [
    { label: "Inicio", onClick: () => navigate("/home"), active: isHomeActive },
    { label: "Eventos", onClick: () => navigate("/eventos"), active: isEventos },
    { label: "Sesiones", onClick: () => navigate("/sesiones"), active: isSesiones },
    { label: "Estadísticas", onClick: () => navigate("/estadisticas"), active: isEstadisticas },
    { label: "Agenda", onClick: () => navigate("/agenda"), active: isAgendaActive },
  ];

  const notifications = (concSlice?.data?.items || []).map((item) => {
    let type = "info";

    if (Number(item?.urgente) === 1) {
      type = "danger";
    } else if ((item?.nombre_modulo || "").toLowerCase().includes("tribunal")) {
      type = "warn";
    } else if ((item?.nombre_tipo_notificacion || "").toLowerCase().includes("document")) {
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

    const currentUserId = Number(concSlice?.data?.user_id);
    const yaLeyeron = Array.isArray(item?.usuarios_leyeron) ? item.usuarios_leyeron : [];

    const leidoPorUsuarioActual = yaLeyeron.some(
      (u) => Number(u?.id_user) === currentUserId
    );

    return {
      id: item.id,
      type,
      icon,
      title: item.nombre_tipo_notificacion || "Notificación",
      desc: item.descripcion || "Sin descripción",
      meta: `${item.fecha_notificacion || item.datetime || ""} • ${
        leidoPorUsuarioActual ? "Leído" : "No leído"
      }`,
      unread: !leidoPorUsuarioActual,
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
                navigate(`/notificaciones/${n.id}`);
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
            navigate("/notificaciones");
          }}
        >
          Ver todas las notificaciones
        </button>
      </div>
    </div>
  );

  const userCard = (
    <div className="eh-user-pop">
      <div className="eh-user-avatar">{userInitials}</div>
      <div className="eh-user-email">
        <Text type="secondary" style={{ fontSize: 12 }}>
          {userEmail}
        </Text>
      </div>

      <div className="eh-user-actions">
        <Button
          block
          disabled
          onClick={() => {
            setUserOpen(false);
            navigate("/settings");
          }}
        >
          Settings
        </Button>

        <Button
          block
          onClick={() => {
            setUserOpen(false);
            navigate("/usuarios");
          }}
        >
          Usuarios
        </Button>

        <Button
          block
          danger
          onClick={() => {
            localStorage.removeItem("token");
            setUserOpen(false);
            navigate("/login");
          }}
        >
          Cerrar Sesion
        </Button>
      </div>
    </div>
  );

  return (
    <>
 

      <header className="eh-root">
        <div className="eh-bar">
          <div className="eh-left">
            <div className="eh-brand">
              <img className="eh-logo" src={logoPng} alt="Logo" />
            </div>

            {isLoginPage !== true && (
              <nav className="eh-nav electron-no-drag">
                {links.map((l) => (
                  <button
                    key={l.label}
                    type="button"
                    className={`eh-link nav-link ${l.active ? "nav-link--active active" : ""}`}
                    onClick={l.onClick}
                  >
                    {l.label}
                  </button>
                ))}
              </nav>
            )}
          </div>

          <div className="eh-right electron-no-drag">
            {isLoginPage !== true && (
              <>
              

                <div style={{ display: "none" }}>
                <Popover
                  content={notifCard}
                  trigger="click"
                  placement="bottomRight"
                  open={notifOpen}
                  onOpenChange={(v) => {
                    setNotifOpen(v);
                    if (v) setUserOpen(false);
                  }}
                  overlayClassName="eh-popover"
                >
                  
                </Popover>
                </div>

                {canShowUser && (
                  <Popover
                    content={userCard}
                    trigger="click"
                    placement="bottomRight"
                    open={userOpen}
                    onOpenChange={(v) => {
                      setUserOpen(v);
                      if (v) setNotifOpen(false);
                    }}
                    overlayClassName="eh-popover"
                  >
                    <button type="button" className="eh-avatar" aria-label="Usuario">
                      {userInitials}
                    </button>
                  </Popover>
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