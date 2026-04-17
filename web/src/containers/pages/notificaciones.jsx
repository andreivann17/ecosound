// src/pages/notificaciones/Notificaciones.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../assets/css/notificaciones.css";
import {actionNotificacionesGet} from "../../redux/actions/notificaciones/notificaciones"
import { useDispatch, useSelector } from "react-redux";
const ensureHeadLink = (id, href) => {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
};

function Notificaciones() {
  const navigate = useNavigate();

  useEffect(() => {
    ensureHeadLink(
      "gfont-public-sans",
      "https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap"
    );
    ensureHeadLink(
      "gfont-material-symbols",
      "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
    );
  }, []);

  const [activeCategory, setActiveCategory] = useState("all"); // all | unread | read | urgent | mentions
  const [tab, setTab] = useState("all"); // all | upcoming | newcases
  const [dept, setDept] = useState({ conciliacion: true, tribunal: true });

  const dispatch  = useDispatch()
  const notiSlice = useSelector((state) => state.notificaciones || {});
const apiItems = notiSlice?.data?.items || [];

const notifications = useMemo(() => {
  const currentUserId = Number(notiSlice?.data?.user_id);

  return apiItems.map((x) => {
    const yaLeyeron = Array.isArray(x?.usuarios_leyeron) ? x.usuarios_leyeron : [];

    const leidoPorUsuarioActual = yaLeyeron.some(
      (u) => Number(u?.id_user) === currentUserId
    );

    return {
      id: `n${x.id}`,
      db_id: x.id,

      type: x.urgente === 1 ? "urgent" : "newcase",
      label: x.nombre_modulo,
      time: new Date(x.fecha_notificacion || x.datetime).toLocaleString("es-MX"),
      user: x.nombre_usuario,

      title: x.nombre_tipo_notificacion,
      expediente: `Tipo: ${x.nombre_tipo_notificacion}`,
      description: x.descripcion,
      usuariosLeyeron: x.usuarios_leyeron,

      img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAI362VNuhQP57e-8CIoyuep5SEpS-qTqZ4jrfieRgI1jeqvGRIGowywrYoB2qiqh4qCkkHRhwxMzIGZLVk9OZQCySiFofhO-nCb46ZFE7xOAjtVx2MDPpp4z9yw6Pb_9rAYt39k0zOhn2JGyy8zpfrb-NWasb3lzJPV1Va1KkWsrKhyi_ZPCVrDp_cq--Cip0kU75gBCqRDCv8EQW8iuj4shRaqK67E2I3Df9th7F4kHelz4g7JiyJ7IKAUvq-JnC2F2IZuzRjIwU",

      ctaVariant: x.urgente === 1 ? "primary" : "neutral",
      border: x.urgente === 1 ? "red" : "slate",

      unread: !leidoPorUsuarioActual,
      read: leidoPorUsuarioActual,
      urgent: x.urgente === 1,
      isNewCase: false,
      isUpcoming: false,
      departments: x.id_modulo.toString(),
      route: "/notificaciones",
    };
  });
}, [apiItems, notiSlice]);
useEffect(() => {
  dispatch(actionNotificacionesGet());
}, [dispatch]);
const counts = useMemo(() => {
  const total = notifications.length;
  const unread = notifications.filter((n) => n.unread).length;
  const read = notifications.filter((n) => n.read).length;
  const urgent = notifications.filter((n) => n.urgent).length;

  return { total, unread, read, urgent };
}, [notifications]);
const concSlice = useSelector((state) => state.notificaciones || {});

  const filtered = useMemo(() => {
    let list = [...notifications];

    if (activeCategory === "unread") list = list.filter((n) => n.unread);
    if (activeCategory === "read") list = list.filter((n) => n.read);
    if (activeCategory === "urgent") list = list.filter((n) => n.urgent);
    if (activeCategory === "mentions") list = list.filter((n) => n.type === "mention");

    if (!dept.conciliacion) list = list.filter((n) => !n.departments.includes("1"));
    if (!dept.tribunal) list = list.filter((n) => !n.departments.includes("3"));

    if (tab === "upcoming") list = list.filter((n) => n.isUpcoming);
    if (tab === "newcases") list = list.filter((n) => n.isNewCase);

    return list;
  }, [notifications, activeCategory, dept, tab]);

  const onOpenCase = (n) => {
    if (n?.route) navigate(n.route);
  };

  return (
    <div className="ll-root">
  

      <main className="ll-main">
        <aside className="ll-aside">
          <div>
            <h1 className="ll-aside-title">Categorías</h1>

            <div className="ll-catlist">
              <button
                type="button"
                className={`ll-cat ${activeCategory === "all" ? "is-active" : ""}`}
                onClick={() => setActiveCategory("all")}
              >
                <span className="material-symbols-outlined ll-icon">inbox</span>
                <span className="ll-cat-label">Todas</span>
                <span className="ll-pill ll-pill--active">{counts.total}</span>
              </button>

              <button
                type="button"
                className={`ll-cat ${activeCategory === "unread" ? "is-active" : ""}`}
                onClick={() => setActiveCategory("unread")}
              >
                <span className="material-symbols-outlined ll-icon">mark_email_unread</span>
                <span className="ll-cat-label">No leídas</span>
                <span className="ll-pill">{counts.unread}</span>
              </button>
<button
  type="button"
  className={`ll-cat ${activeCategory === "read" ? "is-active" : ""}`}
  onClick={() => setActiveCategory("read")}
>
  <span className="material-symbols-outlined ll-icon">drafts</span>
  <span className="ll-cat-label">Leídas</span>
  <span className="ll-pill">{counts.read}</span>
</button>
              <button
                type="button"
                className={`ll-cat ${activeCategory === "urgent" ? "is-active" : ""}`}
                onClick={() => setActiveCategory("urgent")}
              >
                <span className="material-symbols-outlined ll-icon ll-icon--danger">warning</span>
                <span className="ll-cat-label">Urgentes</span>
                <span className="ll-pill ll-pill--danger">{counts.urgent}</span>
              </button>

              
            </div>
          </div>

          <div className="ll-divider" />

          <div>
            <h2 className="ll-aside-title">Departamentos</h2>

            <label className="ll-check">
              <input
                type="checkbox"
                checked={dept.conciliacion}
                onChange={(e) => setDept((p) => ({ ...p, conciliacion: e.target.checked }))}
              />
              <span>Centro Conciliación</span>
            </label>

            <label className="ll-check">
              <input
                type="checkbox"
                checked={dept.tribunal}
                onChange={(e) => setDept((p) => ({ ...p, tribunal: e.target.checked }))}
              />
              <span>Tribunal Laboral</span>
            </label>
          </div>
        </aside>

        <section className="ll-content">
          <div className="ll-content-head">
            <div className="ll-titlewrap">
              <h2 className="ll-title">Centro de Notificaciones</h2>
              <p className="ll-subtitle">Vista Detallada • Gestión de avisos procesales y términos legales</p>
            </div>

           
          </div>

          <div className="ll-list">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`ll-card ll-border-${n.border}`}
                role="article"
                aria-label={n.title}
              >
                <div className="ll-card-row">
                  
                  <div className="ll-card-body">
                    <div className="ll-card-top">
                      <div className="ll-meta">
                        <span
                          className={[
                            "ll-badge",
                            n.type === "urgent"
                              ? "ll-badge--urgent"
                              : n.type === "newcase"
                              ? "ll-badge--newcase"
                              : "ll-badge--mention",
                          ].join(" ")}
                        >
                          {n.label}
                        </span>
                        <span className="ll-time">{n.time}</span>
                           <span className="ll-time">Generado por: {n.user}</span>
                      </div>
                   
                    </div>

                    <h3 className="ll-card-title">{n.title}</h3>


                    <p className="ll-desc">
                      {n.type === "mention" ? (
                        <>
                          <span className="ll-mention">@Lic. Garcia</span>{" "}
                          {n.description.replace("@Lic. Garcia", "").trim()}
                        </>
                      ) : (
                        n.description
                      )}
                    </p>
                       {Array.isArray(n.usuariosLeyeron) && n.usuariosLeyeron.length > 0 && (
  <p className="ll-time">
    Leído por: {n.usuariosLeyeron.map((u) => u.nombre).join(", ")}
  </p>
)}
                  </div>

                  <div className="ll-card-cta">
                    <button
                      type="button"
                      className={[
                        "ll-ctabtn",
                        n.ctaVariant === "primary"
                          ? "ll-ctabtn--primary"
                          : n.ctaVariant === "soft"
                          ? "ll-ctabtn--soft"
                          : "ll-ctabtn--neutral",
                      ].join(" ")}
                      onClick={() => navigate(`/notificaciones/${n.db_id}`)}
                    >
                      <span>Ver Detalles</span>
                      <span className="material-symbols-outlined ll-icon ll-icon--arrow">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="ll-loadmore">
              <button type="button" className="ll-loadmore-btn">
                <span className="material-symbols-outlined ll-icon">expand_more</span>
                <span>Cargar notificaciones anteriores</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Notificaciones;