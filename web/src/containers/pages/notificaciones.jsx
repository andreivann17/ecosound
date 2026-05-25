// src/pages/notificaciones/Notificaciones.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../assets/css/notificaciones.css";
import { actionNotificacionesGet } from "../../redux/actions/notificaciones/notificaciones";
import { useDispatch, useSelector } from "react-redux";
import { usePermisos } from "../../context/PermisosContext";

const ensureHeadLink = (id, href) => {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
};

const ALL_MODULOS = [
  { key: "eventos",  label: "Eventos",  id: 2 },
  { key: "paquetes", label: "Paquetes", id: 4 },
  { key: "gastos",   label: "Gastos",   id: 7 },
];

const MODULE_LABEL = { 2: "Eventos", 4: "Paquetes", 7: "Gastos" };

const ACTION_LABEL = {
  CREATE: "Creado",
  UPDATE: "Actualizado",
  DELETE: "Eliminado",
  VIEW: "Visto",
};

const ACTION_BADGE_CLASS = {
  CREATE: "ll-badge--create",
  UPDATE: "ll-badge--update",
  DELETE: "ll-badge--urgent",
};

const LS_KEY = "ecosound_read_audit";

function getReadSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveRead(id) {
  const s = getReadSet();
  s.add(id);
  localStorage.setItem(LS_KEY, JSON.stringify([...s]));
}

function Notificaciones() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { perm } = usePermisos() || { perm: () => true };
  const canConsultar = perm("notificaciones", "consultar");

  const MODULOS = useMemo(
    () => ALL_MODULOS.filter((m) => perm(m.key, "modulo")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [readSet, setReadSet] = useState(getReadSet);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeMods, setActiveMods] = useState(() =>
    Object.fromEntries(ALL_MODULOS.map((m) => [m.key, true]))
  );

  const notiSlice = useSelector((state) => state.notificaciones || {});
  const apiItems = notiSlice?.data?.items || [];

  useEffect(() => {
    ensureHeadLink(
      "gfont-public-sans",
      "https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap"
    );
    ensureHeadLink(
      "gfont-material-symbols",
      "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
    );
    dispatch(actionNotificacionesGet());
  }, [dispatch]);

  const notifications = useMemo(() => {
    return apiItems.map((x) => {
      const isRead = readSet.has(x.id_audit_log);
      const isUrgent = x.action === "DELETE";
      const moduleLabel = MODULE_LABEL[x.id_modulo] || "Sistema";
      const actionLabel = ACTION_LABEL[x.action] || x.action || "Acción";

      return {
        id: `a${x.id_audit_log}`,
        db_id: x.id_audit_log,
        type: isUrgent ? "urgent" : "newcase",
        label: moduleLabel,
        actionLabel,
        actionBadgeClass: ACTION_BADGE_CLASS[x.action] || "ll-badge--newcase",
        id_modulo: x.id_modulo,
        id_key: x.id_key,
        time: x.datetime ? new Date(x.datetime).toLocaleString("es-MX") : "—",
        user: x.user_name || `Usuario ${x.id_user}`,
        description: x.message || "—",
        ctaVariant: isUrgent ? "primary" : "neutral",
        border: isUrgent ? "red" : x.action === "CREATE" ? "primary" : "slate",
        unread: !isRead,
        read: isRead,
        urgent: isUrgent,
      };
    });
  }, [apiItems, readSet]);

  const counts = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter((n) => n.unread).length,
    read: notifications.filter((n) => n.read).length,
    urgent: notifications.filter((n) => n.urgent).length,
  }), [notifications]);

  const filtered = useMemo(() => {
    let list = [...notifications];
    if (activeCategory === "unread") list = list.filter((n) => n.unread);
    if (activeCategory === "read")   list = list.filter((n) => n.read);
    if (activeCategory === "urgent") list = list.filter((n) => n.urgent);
    MODULOS.forEach((m) => {
      if (!activeMods[m.key]) list = list.filter((n) => n.id_modulo !== m.id);
    });
    return list;
  }, [notifications, activeCategory, activeMods]);

  const toggleMod = (key) =>
    setActiveMods((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleViewDetail = useCallback((n) => {
    saveRead(n.db_id);
    setReadSet(getReadSet());
    navigate(`/app/notificaciones/${n.db_id}`);
  }, [navigate]);

  const CATS = [
    { key: "all",    icon: "inbox",              label: "Todas",        count: counts.total,  pillExtra: activeCategory === "all" ? "ll-pill--active" : "", iconExtra: "" },
    { key: "unread", icon: "mark_email_unread",  label: "No leídas",    count: counts.unread, pillExtra: "", iconExtra: "" },
    { key: "read",   icon: "drafts",             label: "Leídas",       count: counts.read,   pillExtra: "", iconExtra: "" },
    { key: "urgent", icon: "warning",            label: "Eliminaciones",count: counts.urgent, pillExtra: "ll-pill--danger", iconExtra: " ll-icon--danger" },
  ];

  return (
    <div className="ll-root">
      <main className="ll-main">

        {/* Sidebar dentro de un card */}
        <div className="ll-sidebar-wrapper">
          <div className="ll-sidebar-card">
            <aside className="ll-aside">
              <div>
                <h1 className="ll-aside-title">Categorías</h1>
                <div className="ll-catlist">
                  {CATS.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      className={`ll-cat ${activeCategory === cat.key ? "is-active" : ""}`}
                      onClick={() => setActiveCategory(cat.key)}
                    >
                      <span className={`material-symbols-outlined ll-icon${cat.iconExtra}`}>
                        {cat.icon}
                      </span>
                      <span className="ll-cat-label">{cat.label}</span>
                      <span className={`ll-pill ${cat.pillExtra}`}>{cat.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="ll-divider" />

              <div>
                <h2 className="ll-aside-title">Módulos</h2>
                {MODULOS.map((m) => (
                  <label key={m.key} className="ll-check">
                    <input
                      type="checkbox"
                      checked={activeMods[m.key]}
                      onChange={() => toggleMod(m.key)}
                    />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </aside>
          </div>
        </div>

        <section className="ll-content">
          <div className="ll-content-head">
            <div className="ll-titlewrap">
              <h2 className="ll-title">Registro de Actividad</h2>
              <p className="ll-subtitle">
                Auditoría &bull; Historial de acciones en todos los módulos
              </p>
            </div>
            <button
              type="button"
              className="ll-refreshbtn"
              onClick={() => dispatch(actionNotificacionesGet())}
            >
              <span className="material-symbols-outlined ll-icon">refresh</span>
              <span>Actualizar</span>
            </button>
          </div>

          <div className="ll-list">
            {filtered.length === 0 && (
              <div className="ll-empty">
                <span className="material-symbols-outlined ll-empty-icon">notifications_none</span>
                <p>No hay registros que coincidan con los filtros.</p>
              </div>
            )}

            {filtered.map((n) => (
              <div
                key={n.id}
                className={`ll-card ll-border-${n.border}${n.unread ? " ll-card--unread" : ""}`}
                role="article"
              >
                <div className="ll-card-row">
                  <div className="ll-card-body">
                    <div className="ll-card-top">
                      <div className="ll-meta">
                        <span className="ll-badge ll-badge--newcase">{n.label}</span>
                        <span className={`ll-badge ${n.actionBadgeClass}`}>{n.actionLabel}</span>
                        {n.unread && <span className="ll-unread-dot" title="No leído" />}
                      </div>
                      <span className="ll-time">{n.time}</span>
                    </div>

                    <h3 className="ll-card-title">{n.description}</h3>

                    <p className="ll-time" style={{ marginTop: 6 }}>
                      Por: <strong>{n.user}</strong>
                      {n.id_key ? ` · Ref: ${n.id_key}` : ""}
                    </p>
                  </div>

                  {canConsultar && (
                  <div className="ll-card-cta">
                    <button
                      type="button"
                      className={`ll-ctabtn ${n.ctaVariant === "primary" ? "ll-ctabtn--primary" : "ll-ctabtn--neutral"}`}
                      onClick={() => handleViewDetail(n)}
                    >
                      <span>Ver Detalles</span>
                      <span className="material-symbols-outlined ll-icon ll-icon--arrow">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Notificaciones;
