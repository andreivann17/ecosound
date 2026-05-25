// src/components/calendar/OutlookCalendarWeekDayView.jsx
import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/es";
import { DatePicker, Dropdown, Menu } from "antd";
import { SyncOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  buildDaysForView,
  eventKey,
  groupEventsByDay,
} from "./boardUtils";

dayjs.extend(utc);
dayjs.extend(isoWeek);

// ─── Tipo contrato badge config ───────────────────────────────────────────────
const TIPO_CFG = {
  1:  { label: "Bodas",        bg: "#fce7f3", color: "#be123c", dot: "#be123c", tipoKey: 1  },
  2:  { label: "XV",           bg: "#ede9fe", color: "#7c3aed", dot: "#7c3aed", tipoKey: 2  },
  3:  { label: "Graduación",   bg: "#dbeafe", color: "#1d4ed8", dot: "#1d4ed8", tipoKey: 3  },
  4:  { label: "Corporativo",  bg: "#d1fae5", color: "#0f766e", dot: "#0f766e", tipoKey: 4  },
  5:  { label: "Cumpleaños",   bg: "#ffedd5", color: "#ea580c", dot: "#ea580c", tipoKey: 5  },
  6:  { label: "Citas",        bg: "#e0f2fe", color: "#0891b2", dot: "#0891b2", tipoKey: 6  },
  7:  { label: "Reunion Zoom", bg: "#eef2ff", color: "#4f46e5", dot: "#4f46e5", tipoKey: 7  },
  8:  { label: "Pendiente",    bg: "#fef3c7", color: "#d97706", dot: "#d97706", tipoKey: 8  },
  10: { label: "Fotografía",   bg: "#fdf4ff", color: "#c026d3", dot: "#c026d3", tipoKey: 10 },
};
const SESION_BADGE = { label: "Sesión Fotos", bg: "#fdf2f8", color: "#be185d", dot: "#e91e8c", tipoKey: "sesion" };
const OTHER_BADGE  = { label: "Otro",         bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af", tipoKey: "otro"  };

const BADGE_ORDER = [
  { tipoKey: 1,        label: "Bodas",        bg: "#fce7f3", color: "#be123c", dot: "#be123c" },
  { tipoKey: 2,        label: "XV",           bg: "#ede9fe", color: "#7c3aed", dot: "#7c3aed" },
  { tipoKey: 3,        label: "Graduación",   bg: "#dbeafe", color: "#1d4ed8", dot: "#1d4ed8" },
  { tipoKey: 4,        label: "Corporativo",  bg: "#d1fae5", color: "#0f766e", dot: "#0f766e" },
  { tipoKey: 5,        label: "Cumpleaños",   bg: "#ffedd5", color: "#ea580c", dot: "#ea580c" },
  { tipoKey: 6,        label: "Citas",        bg: "#e0f2fe", color: "#0891b2", dot: "#0891b2" },
  { tipoKey: 7,        label: "Reunion Zoom", bg: "#eef2ff", color: "#4f46e5", dot: "#4f46e5" },
  { tipoKey: 8,        label: "Pendiente",    bg: "#fef3c7", color: "#d97706", dot: "#d97706" },
  { tipoKey: 10,       label: "Fotografía",   bg: "#fdf4ff", color: "#c026d3", dot: "#c026d3" },
  { tipoKey: "sesion", label: "Sesión Fotos", bg: "#fdf2f8", color: "#be185d", dot: "#e91e8c" },
  { tipoKey: "otro",   label: "Otro",         bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af" },
];

// Ciudad config por id (ciudades de EcoSound)
const CITY_CFG = {
  1: { label: "SLRC", bg: "#dbeafe", color: "#1d4ed8" },
  2: { label: "MXL",  bg: "#f3e8ff", color: "#7e22ce" },
  3: { label: "PÑS",  bg: "#dcfce7", color: "#15803d" },
  4: { label: "V.SL", bg: "#e0f2fe", color: "#0369a1" },
  5: { label: "V.MX", bg: "#fef3c7", color: "#92400e" },
};
const OTHER_CITY = { label: "GEN", bg: "#f3f4f6", color: "#6b7280" };

const TIPO_LABELS = {
  1:  "Bodas",
  2:  "XV Años",
  3:  "Graduación",
  4:  "Corporativo",
  5:  "Cumpleaños",
  6:  "Citas",
  7:  "Reunion Zoom",
  8:  "Pendiente",
  10: "Fotografía",
};

function getEventBadge(ev) {
  if (ev?.source === "sesiones_fotos" || ev?.color_hex === "#e91e8c") return SESION_BADGE;
  return TIPO_CFG[Number(ev?.contrato_tipo_id)] || OTHER_BADGE;
}

function getBadgeTipoKey(ev) {
  if (ev?.source === "sesiones_fotos" || ev?.color_hex === "#e91e8c") return "sesion";
  return Number(ev?.contrato_tipo_id) || "otro";
}

function getCityBadge(ev) {
  return CITY_CFG[Number(ev?.ciudad_id)] || OTHER_CITY;
}

function getModulo(ev) {
  if (ev?.source === "sesiones_fotos") return "Sesión Fotos";
  const src = (ev?.source_table || "").toLowerCase();
  if (src.includes("sesion")) return "Sesión Fotos";
  if (src.includes("evento")) return "Eventos";
  if (src.includes("contrato")) return "Contratos";
  if (src.includes("agenda")) return "Agenda";
  return "General";
}

function getTipo(ev) {
  if (ev?.source === "sesiones_fotos") return "SESIÓN";
  const id = Number(ev?.contrato_tipo_id);
  return (TIPO_LABELS[id] || "Evento").toUpperCase();
}

function fmtAmPm(iso) {
  return dayjs(iso).format("hh:mm A");
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const COLS = "120px 80px 1fr 160px 180px";

// ─── Single event row ─────────────────────────────────────────────────────────
function EventRow({ ev, openPeek, onEditEvent, onDeleteEvent }) {
  const tipoBadge = getEventBadge(ev);
  const cityBadge = getCityBadge(ev);

  const menu = (
    <Menu
      items={[
        {
          key: "edit",
          icon: <SyncOutlined />,
          label: "Editar",
          onClick: () => onEditEvent?.(ev),
        },
        {
          key: "del",
          icon: <DeleteOutlined />,
          danger: true,
          label: "Eliminar",
          onClick: () => onDeleteEvent?.(ev),
        },
      ]}
    />
  );

  return (
    <Dropdown overlay={menu} trigger={["contextMenu"]}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: COLS,
          alignItems: "center",
          padding: "10px 16px",
          borderBottom: "1px solid #f3f4f6",
          background: "transparent",
          borderLeft: `4px solid ${tipoBadge.dot}`,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onClick={(e) => {
          e.stopPropagation();
          openPeek?.(ev, e.currentTarget);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEditEvent?.(ev);
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fafb"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        {/* HORA */}
        <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", whiteSpace: "nowrap" }}>
          {fmtAmPm(ev.start)}
        </div>

        {/* CIUDAD */}
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.03em",
              background: cityBadge.bg,
              color: cityBadge.color,
            }}
          >
            {cityBadge.label}
          </span>
        </div>

        {/* ASUNTO / TÍTULO */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: "#111827",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {ev.title || "(Sin título)"}
          </div>
          {ev.location && (
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{ev.location}</div>
          )}
        </div>

        {/* TIPO */}
        <div style={{ paddingLeft: 8 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 700,
              background: tipoBadge.bg,
              color: tipoBadge.color,
            }}
          >
            {getTipo(ev)}
          </span>
        </div>

        {/* MÓDULO */}
        <div style={{ textAlign: "right", fontWeight: 600, fontSize: 12, color: "#374151", paddingRight: 4 }}>
          {getModulo(ev)}
        </div>
      </div>
    </Dropdown>
  );
}

// ─── NavArrow ─────────────────────────────────────────────────────────────────
function NavArrow({ onClick, path }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 10px",
        border: "1px solid #e5e7eb",
        borderRadius: 6,
        background: "#fff",
        cursor: "pointer",
        color: "#9ca3af",
        display: "flex",
        alignItems: "center",
      }}
    >
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
      </svg>
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function OutlookCalendarWeekDayView({
  anchor,
  cursorDate,
  view,
  evs,
  peek,
  openPeek,
  closePeek,
  onSelectSlot,
  onEditEvent,
  onDeleteEvent,
  onPrev,
  onNext,
  onPickDate,
  filters,
  setFilters,
}) {
  const [calOpen, setCalOpen] = useState(false);
  const isDayView = view === "day";

  const daysForView = useMemo(() => buildDaysForView(anchor, view), [anchor, view]);

  const dayRange = useMemo(() => {
    const start = daysForView[0]?.startOf("day") ?? anchor.startOf("day");
    const end = (
      daysForView[daysForView.length - 1]?.startOf("day") ?? anchor.startOf("day")
    )
      .add(1, "day")
      .endOf("day");
    return { start, end };
  }, [daysForView, anchor]);

  const byDay = useMemo(
    () => groupEventsByDay({ evs, rangeStart: dayRange.start, rangeEnd: dayRange.end }),
    [evs, dayRange.start.valueOf(), dayRange.end.valueOf()]
  );

  const allEvs = useMemo(() => {
    const out = [];
    for (const arr of byDay.values()) out.push(...arr);
    return out;
  }, [byDay]);

  const tipoCounts = useMemo(() => {
    const map = {};
    for (const ev of allEvs) {
      const key = getBadgeTipoKey(ev);
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [allEvs]);

  const isActive = (tipoKey) => {
    if (tipoKey === "sesion") return filters?.showSesiones !== false;
    if (tipoKey === "otro") return true;
    const ids = filters?.tipoContratoIds;
    if (!Array.isArray(ids)) return true;
    return ids.includes(tipoKey);
  };

  const toggleBadge = (tipoKey) => {
    if (!setFilters) return;
    if (tipoKey === "sesion") {
      setFilters((p) => ({ ...(p || {}), showSesiones: !p?.showSesiones }));
      return;
    }
    if (tipoKey === "otro") return;
    setFilters((p) => {
      const cur = new Set(Array.isArray(p?.tipoContratoIds) ? p.tipoContratoIds : []);
      cur.has(tipoKey) ? cur.delete(tipoKey) : cur.add(tipoKey);
      return { ...(p || {}), tipoContratoIds: Array.from(cur) };
    });
  };

  const dateText = useMemo(() => {
    if (isDayView) {
      const m = cap(anchor.locale("es").format("MMMM"));
      return `${anchor.format("D")} de ${m} de ${anchor.format("YYYY")}`;
    }
    const s = daysForView[0];
    const e = daysForView[daysForView.length - 1];
    const mE = cap(e.locale("es").format("MMMM"));
    const y = e.format("YYYY");
    if (s.month() === e.month()) {
      return `${s.format("D")} - ${e.format("D")} ${mE} ${y}`;
    }
    const mS = cap(s.locale("es").format("MMMM"));
    return `${s.format("D")} ${mS} - ${e.format("D")} ${mE} ${y}`;
  }, [isDayView, anchor, daysForView]);

  const rightLabel = isDayView
    ? anchor.locale("es").format("dddd").toUpperCase()
    : "SEMANA";
  const rightNum = isDayView ? anchor.format("D") : anchor.isoWeek();

  function renderDayContent(dayStart, dayEvs) {
    if (!dayEvs || dayEvs.length === 0) {
      return (
        <div
          style={{
            padding: "14px 16px",
            textAlign: "center",
            fontSize: 12,
            color: "#9ca3af",
            fontStyle: "italic",
          }}
        >
          Sin eventos programados
        </div>
      );
    }
    return dayEvs.map((ev) => (
      <EventRow
        key={eventKey(ev)}
        ev={ev}
        openPeek={openPeek}
        onEditEvent={onEditEvent}
        onDeleteEvent={onDeleteEvent}
      />
    ));
  }

  const colHeaderStyle = {
    display: "grid",
    gridTemplateColumns: COLS,
    padding: "8px 16px",
    borderBottom: "1px solid #f3f4f6",
    background: "#f9fafb",
  };
  const colLabelStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
          border: "1px solid #f1f3f5",
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Card Header ──────────────────────────────────────────────── */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 6 }}>
              {BADGE_ORDER.filter((b) => (tipoCounts[b.tipoKey] || 0) > 0).map((b) => {
                const active = isActive(b.tipoKey);
                return (
                  <button
                    key={String(b.tipoKey)}
                    onClick={() => toggleBadge(b.tipoKey)}
                    title={active ? `Ocultar ${b.label}` : `Mostrar ${b.label}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 12px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      background: b.bg,
                      color: b.color,
                      border: "none",
                      cursor: "pointer",
                      opacity: active ? 1 : 0.38,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: b.dot,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {b.label}: {tipoCounts[b.tipoKey] || 0}
                  </button>
                );
              })}
              {allEvs.length > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "5px 12px",
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#f9fafb",
                    color: "#6b7280",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  TOTAL: {allEvs.length}
                </span>
              )}
            </div>
          </div>

          {/* Right: date display + nav + number */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ position: "relative" }}>
              <DatePicker
                open={calOpen}
                value={anchor}
                onChange={(v) => { if (v) { onPickDate?.(v); setCalOpen(false); } }}
                onOpenChange={(o) => { if (!o) setCalOpen(false); }}
                style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none", top: "100%", left: 0 }}
                popupStyle={{ zIndex: 10001 }}
                allowClear={false}
                inputReadOnly
              />
              <div
                onClick={() => setCalOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    background: "#01369e",
                    padding: "8px 12px",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div
                  style={{
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#4b5563",
                    whiteSpace: "nowrap",
                  }}
                >
                  {dateText}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 4 }}>
              <NavArrow onClick={onPrev} path="M15 19l-7-7 7-7" />
              <NavArrow onClick={onNext} path="M9 5l7 7-7 7" />
            </div>

            <div
              style={{
                textAlign: "right",
                borderLeft: "1px solid #e5e7eb",
                paddingLeft: 20,
                minWidth: 60,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 2,
                }}
              >
                {rightLabel}
              </div>
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 900,
                  color: "#1e293b",
                  lineHeight: 1,
                }}
              >
                {rightNum}
              </div>
            </div>
          </div>
        </div>

        {/* ── Column headers ────────────────────────────────────────────── */}
        <div style={colHeaderStyle}>
          <div style={colLabelStyle}>Hora</div>
          <div style={colLabelStyle}>Ciudad</div>
          <div style={colLabelStyle}>Asunto / Título</div>
          <div style={colLabelStyle}>Tipo</div>
          <div style={{ ...colLabelStyle, textAlign: "right" }}>Módulo</div>
        </div>

        {/* ── Content rows ──────────────────────────────────────────────── */}
        <div style={{ flex: "1 1 auto", overflowY: "auto", minHeight: 0 }}>
          {isDayView ? (
            renderDayContent(
              anchor.startOf("day"),
              byDay.get(anchor.format("YYYY-MM-DD")) ?? []
            )
          ) : (
            daysForView.map((d) => {
              const key = d.format("YYYY-MM-DD");
              const dayLabel = cap(d.locale("es").format("dddd D"));
              return (
                <div key={key}>
                  <div
                    style={{
                      background: "#f9fafb",
                      padding: "6px 16px",
                      borderTop: "1px solid #e5e7eb",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#374151",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {dayLabel}
                    </span>
                  </div>
                  {renderDayContent(d.startOf("day"), byDay.get(key) ?? [])}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
