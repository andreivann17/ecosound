import React, { useMemo, useState } from "react";
import "./TabDocumentosPruebas.css";
import {PATH} from "../../redux/utils"
const API_BASE = PATH;
const Icon = ({ name, className = "" }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const badgeClassByType = (type) => {
  const t = (type || "").toLowerCase();
  if (t.includes("testimonial")) return "lxp-dp-badge lxp-dp-badge--purple";
  if (t.includes("confesional")) return "lxp-dp-badge lxp-dp-badge--orange";
  if (t.includes("inspección") || t.includes("inspeccion")) return "lxp-dp-badge lxp-dp-badge--pink";
  return "lxp-dp-badge lxp-dp-badge--blue";
};

const statusClass = (status) => {
  const s = (status || "").toLowerCase();
  if (s.includes("cargado")) return { dot: "lxp-dp-dot lxp-dp-dot--green", text: "lxp-dp-status lxp-dp-status--green" };
  if (s.includes("pendiente")) return { dot: "lxp-dp-dot lxp-dp-dot--amber", text: "lxp-dp-status lxp-dp-status--amber" };
  if (s.includes("admit")) return { dot: "lxp-dp-dot lxp-dp-dot--blue", text: "lxp-dp-status lxp-dp-status--blue" };
  if (s.includes("desah")) return { dot: "lxp-dp-dot lxp-dp-dot--purple", text: "lxp-dp-status lxp-dp-status--purple" };
  return { dot: "lxp-dp-dot", text: "lxp-dp-status" };
};

const fileIcon = (kind) => {
  const k = (kind || "").toLowerCase();
  if (k.includes("pdf")) return { icon: "picture_as_pdf", box: "lxp-dp-filebox lxp-dp-filebox--red" };
  if (k.includes("doc")) return { icon: "description", box: "lxp-dp-filebox lxp-dp-filebox--blue" };
  if (k.includes("testi")) return { icon: "record_voice_over", box: "lxp-dp-filebox lxp-dp-filebox--purple" };
  if (k.includes("conf")) return { icon: "psychology_alt", box: "lxp-dp-filebox lxp-dp-filebox--orange" };
  if (k.includes("inspec")) return { icon: "visibility", box: "lxp-dp-filebox lxp-dp-filebox--pink" };
  return { icon: "description", box: "lxp-dp-filebox lxp-dp-filebox--blue" };
};

const getExtKind = (path) => {
  const p = (path || "").toLowerCase();
  if (p.endsWith(".pdf")) return "pdf";
  if (p.endsWith(".doc") || p.endsWith(".docx")) return "doc";
  if (p.endsWith(".png") || p.endsWith(".jpg") || p.endsWith(".jpeg") || p.endsWith(".webp")) return "img";
  return "doc";
};

// Ajusta aquí si tu catálogo de tipos cambia
// En tu ejemplo: 1 => Actora, 2 => Demandada
const sideFromTipo = (idTipo) => {
  const n = Number(idTipo);
  if (n === 1) return "actora";
  if (n === 2) return "demandada";
  return "actora";
};

const badgeFromTipo = (idTipo) => {
  const n = Number(idTipo);
  if (n === 1) return "Documental";
  if (n === 2) return "Documental";
  return "Documental";
};

const normalizeDoc = (raw) => {
  const path = raw?.path || raw?.filename || raw?.name || "";
  const kind = getExtKind(path);

  return {
    id: raw?.id ?? path,
    title: path || "—",
    kind,
    badge: badgeFromTipo(raw?.id_tribunal_tipo_documento),
    date: "", // si luego agregas created_at/fecha, lo pintamos
    status: Number(raw?.active ?? 0) === 1 ? "Cargado" : "Inactivo",
    url: raw?.url || "",
    previewUrl: raw?.previews?.[0]?.url || "",
    side: sideFromTipo(raw?.id_tribunal_tipo_documento),
    raw,
  };
};

const DocCard = ({ item, accent = "indigo", onOpen = () => {}, onMenu = () => {} }) => {
  const { dot, text } = statusClass(item.status);
  const { icon, box } = fileIcon(item.kind);

  const menuHover =
    accent === "teal" ? "lxp-dp-menu lxp-dp-menu--teal" : "lxp-dp-menu lxp-dp-menu--indigo";

  const clickable = Boolean(item.url);

  return (
    <div
      className={`lxp-dp-doc group ${clickable ? "lxp-dp-doc--click" : ""}`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={() => clickable && onOpen(item)}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") onOpen(item);
      }}
      title={clickable ? "Abrir documento" : ""}
    >
      <div className={box}>
        {item.previewUrl ? (
          <img
            src={item.previewUrl}
            alt=""
            className="lxp-dp-thumb"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <Icon name={icon} className="lxp-dp-fileicon" />
        )}
      </div>

      <div className="lxp-dp-doc-body">
        <div className="lxp-dp-doc-top">
          <div className="lxp-dp-doc-title" title={item.title}>
            {item.title}
          </div>

          <button
            className={menuHover}
            onClick={(e) => {
              e.stopPropagation();
              onMenu(item);
            }}
            type="button"
            aria-label="menu"
          >
            <Icon name="more_vert" className="lxp-dp-menu-ic" />
          </button>
        </div>

        <div className="lxp-dp-meta">
          {item.badge ? <span className={badgeClassByType(item.badge)}>{item.badge}</span> : null}

          {item.date ? (
            <span className="lxp-dp-date">
              <Icon name="calendar_today" className="lxp-dp-date-ic" />
              {item.date}
            </span>
          ) : null}
        </div>

        <div className="lxp-dp-sep" />

        <div className="lxp-dp-statusrow">
          <span className={dot} />
          <span className={text}>{item.status || "—"}</span>
        </div>
      </div>
    </div>
  );
};

const Column = ({
  accent = "indigo",
  iconName,
  title,
  subtitle,
  countLabel,
  items,
  emptyText = "Sin documentos",
  onOpenDoc = () => {},
  onMenuDoc = () => {},
}) => {
  const headerClass =
    accent === "teal" ? "lxp-dp-colhead lxp-dp-colhead--teal" : "lxp-dp-colhead lxp-dp-colhead--indigo";
  const iconBoxClass =
    accent === "teal" ? "lxp-dp-colicon lxp-dp-colicon--teal" : "lxp-dp-colicon lxp-dp-colicon--indigo";
  const countClass =
    accent === "teal" ? "lxp-dp-count lxp-dp-count--teal" : "lxp-dp-count lxp-dp-count--indigo";
  const listClass =
    accent === "teal" ? "lxp-dp-list lxp-dp-list--teal" : "lxp-dp-list lxp-dp-list--indigo";

  return (
    <div className="lxp-dp-col">
      <div className={headerClass}>
        <div className="lxp-dp-colhead-row">
          <div className="lxp-dp-colhead-left">
            <div className={iconBoxClass}>
              <Icon name={iconName} />
            </div>
            <div>
              <div className="lxp-dp-coltitle">{title}</div>
              <div className="lxp-dp-colsub">{subtitle}</div>
            </div>
          </div>
          <div className={countClass}>{countLabel}</div>
        </div>
      </div>

      <div className={listClass}>
        {items?.length ? (
          items.map((it) => (
            <DocCard key={it.id} item={it} accent={accent} onOpen={onOpenDoc} onMenu={onMenuDoc} />
          ))
        ) : (
          <div className="lxp-dp-empty">{emptyText}</div>
        )}
      </div>
    </div>
  );
};

export default function TabDocumentosPruebas({
  // OPCIONAL: si ya quieres pasar arreglos separados, se respetan
  actorItems = null,
  demandadaItems = null,

  // NUEVO: pásame directamente el objeto pruebas_documentacion
  // ejemplo: data={detalle?.pruebas_documentacion}
  data = null,

  // callbacks
  onFiltrar = () => {},
  onNuevaPrueba = () => {},
  onAccionSidebar = () => {}, // lo dejo por compatibilidad, aquí ya no se usa
}) {
  const [q, setQ] = useState("");

  const normalizedFromData = useMemo(() => {
    const items = data?.documentos?.items;
    if (!Array.isArray(items) || !items.length) return { actora: [], demandada: [] };

    const out = { actora: [], demandada: [] };

    for (const raw of items) {
      const doc = normalizeDoc(raw);
      if (doc.side === "demandada") out.demandada.push(doc);
      else out.actora.push(doc);
    }

    return out;
  }, [data]);

  const baseActor = useMemo(() => {
    if (Array.isArray(actorItems)) return actorItems;
    if (normalizedFromData.actora.length) return normalizedFromData.actora;
    return [];
  }, [actorItems, normalizedFromData.actora]);

  const baseDemandada = useMemo(() => {
    if (Array.isArray(demandadaItems)) return demandadaItems;
    if (normalizedFromData.demandada.length) return normalizedFromData.demandada;
    return [];
  }, [demandadaItems, normalizedFromData.demandada]);

  const actorFiltered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return baseActor;
    return baseActor.filter((x) => (x.title || "").toLowerCase().includes(s));
  }, [q, baseActor]);

  const demandadaFiltered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return baseDemandada;
    return baseDemandada.filter((x) => (x.title || "").toLowerCase().includes(s));
  }, [q, baseDemandada]);

  const openDoc = (doc) => {
    const url = doc?.url;
    if (!url) return;
    window.open(`${PATH}${url}`, "_blank", "noopener,noreferrer");
  };

  const menuDoc = (doc) => {
    // aquí conectas tu menú real (editar, eliminar, descargar, etc.)
    // por ahora lo dejamos consistente y simple:
    console.log("doc menu:", doc);
  };
const etapasMap = useMemo(() => {
  const map = {};

  if (!Array.isArray(data?.etapas)) return map;

  for (const e of data.etapas) {
    const fecha = e?.fecha_notificacion_demanda;

    map[e.num_etapa] = fecha
      ? new Date(fecha).toLocaleDateString("es-MX")
      : null;
  }

  return map;
}, [data]);
  return (
    <div className="lxp-dp-wrap lxp-dp-wrap--full">
      {/* contenido */}
      <div className="lxp-dp-left lxp-dp-left--full">
        {/* barra de búsqueda + botones */}
        <div className="lxp-dp-toolbar">
          <div className="lxp-dp-search">
            <Icon name="search" className="lxp-dp-search-ic" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="lxp-dp-search-in"
              placeholder="Buscar prueba o documento..."
              type="text"
            />
          </div>

          <div className="lxp-dp-actions">
            <button className="lxp-dp-btn lxp-dp-btn--ghost" type="button" onClick={onFiltrar}>
              <Icon name="filter_list" className="lxp-dp-btn-ic" />
              Filtrar
            </button>

            <button className="lxp-dp-btn lxp-dp-btn--primary" type="button" onClick={onNuevaPrueba}>
              <Icon name="add" className="lxp-dp-btn-ic" />
              Nueva Prueba
            </button>
          </div>
        </div>

        {/* columnas */}
        <div className="lxp-dp-grid lxp-dp-grid--2">
          <Column
            accent="indigo"
            iconName="person"
            title="Pruebas Parte Actora"
            subtitle="Ofrecidas en Demanda Inicial"
            countLabel={`${actorFiltered.length} Docs`}
            items={actorFiltered}
            onOpenDoc={openDoc}
            onMenuDoc={menuDoc}
          />

          <Column
            accent="teal"
            iconName="business_center"
            title="Pruebas Demandada"
            subtitle="Ofrecidas en Contestación"
            countLabel={`${demandadaFiltered.length} Docs`}
            items={demandadaFiltered}
            onOpenDoc={openDoc}
            onMenuDoc={menuDoc}
          />
        </div>
      </div>
    </div>
  );
}
