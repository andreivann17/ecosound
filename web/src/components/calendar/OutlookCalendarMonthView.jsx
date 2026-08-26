// src/components/calendar/OutlookCalendarMonthView.jsx
import React, { useMemo, useRef, useState, useLayoutEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/es";
import { DatePicker, Dropdown, Menu, Modal } from "antd";
import { SyncOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  buildMonthMatrix,
  clamp,
  eventKey,
  fmtTime,
  groupEventsByDay,
} from "./boardUtils";
import { getServiceBadge, getServiceKey, SERVICE_BADGE_ORDER } from "./serviceBadges";

dayjs.extend(utc);
dayjs.extend(isoWeek);

// ─── Badge por servicio agendado (Sonido, Fotografía, Banquete, Barra,
// Sesión Fotos) en vez de por tipo de contrato ─────────────────────────────
const BADGE_ORDER = SERVICE_BADGE_ORDER.map((b) => ({ ...b, tipoKey: b.key }));

function getEventBadge(ev) {
  return getServiceBadge(ev);
}

function getBadgeTipoKey(ev) {
  return getServiceKey(ev);
}

const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// ─── Nav arrow ────────────────────────────────────────────────────────────────
function NavArrow({ onClick, path }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 10px",
        border: "1px solid var(--eh-surface-border, #e5e7eb)",
        borderRadius: 6,
        background: "var(--eh-surface, #fff)",
        cursor: "pointer",
        color: "var(--eh-ink-faint, #9ca3af)",
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

// ─── Cell capacity (adaptive via ResizeObserver) ──────────────────────────────
function useCellCapacity(bodyRef, monthKey) {
  const [cap, setCap] = useState(3);

  useLayoutEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    let raf1 = 0, raf2 = 0;

    const compute = () => {
      const cell = root.querySelector("[data-month-cell]");
      if (!cell) return;
      const cellH = cell.clientHeight || 0;
      if (cellH < 60) return;
      const dateEl = cell.querySelector("[data-month-date]");
      const dateH = dateEl ? dateEl.offsetHeight : 22;
      const available = Math.max(0, cellH - dateH - 10);
      const perItem = 25;
      const n = perItem > 0 ? Math.floor((available + 3) / perItem) : 0;
      setCap(clamp(n, 0, 8));
    };

    const ro = new ResizeObserver(() => compute());
    ro.observe(root);
    const firstCell = root.querySelector("[data-month-cell]");
    if (firstCell) ro.observe(firstCell);

    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => compute()); });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro.disconnect();
    };
  }, [monthKey]);

  return cap;
}

const WEEK_HEADERS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

// ─── Main component ───────────────────────────────────────────────────────────
export default function OutlookCalendarMonthView({
  anchor,
  cursorDate,
  view,
  evs,
  peek,
  openPeek,
  closePeek,
  onEditEvent,
  onDeleteEvent,
  onPrev,
  onNext,
  onPickDate,
  filters,
  setFilters,
}) {
  const [calOpen, setCalOpen] = useState(false);
  const month = useMemo(() => buildMonthMatrix(anchor), [anchor]);
  const monthKey = useMemo(() => anchor.format("YYYY-MM"), [anchor]);
  const today = useMemo(() => dayjs().startOf("day"), []);
  const cursor = useMemo(() => dayjs(cursorDate).startOf("day"), [cursorDate]);

  const bodyRef = useRef(null);
  const cellCap = useCellCapacity(bodyRef, monthKey);

  const byDay = useMemo(() => {
    const gridStart = month.gridStart.startOf("day");
    const gridEnd = month.gridEnd.endOf("day");
    return groupEventsByDay({ evs, rangeStart: gridStart, rangeEnd: gridEnd });
  }, [evs, month.gridStart, month.gridEnd, monthKey]);

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
    const hidden = filters?.hiddenServicios;
    if (!Array.isArray(hidden)) return true;
    return !hidden.includes(tipoKey);
  };

  const toggleBadge = (tipoKey) => {
    if (!setFilters) return;
    setFilters((p) => {
      const cur = new Set(Array.isArray(p?.hiddenServicios) ? p.hiddenServicios : []);
      cur.has(tipoKey) ? cur.delete(tipoKey) : cur.add(tipoKey);
      return { ...(p || {}), hiddenServicios: Array.from(cur) };
    });
  };

  const dateText = useMemo(() => {
    const m = capFirst(anchor.locale("es").format("MMMM"));
    return `${m} ${anchor.format("YYYY")}`;
  }, [anchor]);

  const monthNum = anchor.format("MM");

  const [moreModal, setMoreModal] = useState({ open: false, dayKey: null });
  const closeMore = () => setMoreModal({ open: false, dayKey: null });
  const moreEvents = useMemo(() => {
    if (!moreModal.dayKey) return [];
    return (byDay.get(moreModal.dayKey) ?? []).filter((ev) => isActive(getBadgeTipoKey(ev)));
  }, [moreModal.dayKey, byDay, filters?.showSesiones, filters?.hiddenServicios]);

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div
        style={{
          background: "var(--eh-surface, #fff)",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
          border: "1px solid var(--eh-surface-border, #f1f3f5)",
          overflow: "hidden",
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Card Header ──────────────────────────────────────────────── */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--eh-surface-border, #f3f4f6)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            flexShrink: 0,
          }}
        >
          {/* Left: subtitle + filterable tipo badges */}
          <div>
           
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {BADGE_ORDER.map((b) => {
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
                    background: "var(--eh-surface-2, #f9fafb)",
                    color: "var(--eh-ink-muted, #6b7280)",
                    border: "1px solid var(--eh-surface-border, #e5e7eb)",
                  }}
                >
                  TOTAL: {allEvs.length}
                </span>
              )}
            </div>
          </div>

          {/* Right: calendar icon + month label + nav arrows + MES XX */}
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
                  border: "1px solid var(--eh-surface-border, #e5e7eb)",
                  borderRadius: 8,
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    background: "var(--eh-primary-btn)",
                    padding: "11px 14px",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div
                  style={{
                    padding: "8px 24px",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--eh-ink-2, #4b5563)",
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
                borderLeft: "1px solid var(--eh-surface-border, #e5e7eb)",
                paddingLeft: 20,
                minWidth: 60,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--eh-ink-faint, #9ca3af)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 2,
                }}
              >
                MES
              </div>
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 900,
                  color: "var(--eh-ink, #1e293b)",
                  lineHeight: 1,
                }}
              >
                {monthNum}
              </div>
            </div>
          </div>
        </div>

        {/* ── Week day header row ───────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            background: "var(--eh-surface-2, #f9fafb)",
            borderBottom: "1px solid var(--eh-surface-border, #e5e7eb)",
            flexShrink: 0,
          }}
        >
          {WEEK_HEADERS.map((h) => (
            <div
              key={h}
              style={{
                padding: "10px 0",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--eh-ink-faint, #9ca3af)",
                letterSpacing: "0.08em",
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* ── Calendar grid ─────────────────────────────────────────────── */}
        <div
          ref={bodyRef}
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridAutoRows: "minmax(100px, 1fr)",
          }}
        >
          {month.rows.flat().map((day) => {
            const key = day.format("YYYY-MM-DD");
            const dayEvs = (byDay.get(key) ?? []).filter((ev) => isActive(getBadgeTipoKey(ev)));
            const inMonth = day.month() === anchor.month();
            const isWeekend = day.day() === 0 || day.day() === 6;
            const isCursor = day.isSame(cursor, "day");
            const isToday = day.isSame(today, "day");

            const hasOverflow = dayEvs.length > cellCap;
            const visibleCount = hasOverflow ? Math.max(0, cellCap - 1) : cellCap;
            const hiddenCount = dayEvs.length - visibleCount;

            let cellBg = "var(--eh-surface, #fff)";
            if (!inMonth) cellBg = "var(--eh-surface-2, #f9fafb)";
            else if (isWeekend) cellBg = "var(--eh-surface-2, rgba(243,244,246,0.8))";

            return (
              <div
                key={key}
                data-month-cell="1"
                style={{
                  borderRight: "1px solid var(--eh-surface-border, #e5e7eb)",
                  borderBottom: "1px solid var(--eh-surface-border, #e5e7eb)",
                  background: cellBg,
                  borderLeft: "4px solid transparent",
                  padding: "6px 4px",
                  minHeight: 100,
                  overflow: "hidden",
                }}
              >
                <div
                  data-month-date="1"
                  style={{
                    fontSize: 13,
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? "var(--eh-primary-btn)" : inMonth ? "var(--eh-ink-2, #374151)" : "var(--eh-ink-faint, #d1d5db)",
                    marginBottom: 4,
                    paddingLeft: 2,
                  }}
                >
                  {day.date()}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {dayEvs.slice(0, visibleCount).map((ev) => {
                    const badge = getEventBadge(ev);
                    const evk = eventKey(ev);

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
                      <Dropdown key={evk} overlay={menu} trigger={["contextMenu"]}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 5px",
                            borderRadius: 4,
                            background: badge.bg,
                            cursor: "pointer",
                            overflow: "hidden",
                            height: 22,
                            flexShrink: 0,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openPeek?.(ev, e.currentTarget);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            onEditEvent?.(ev);
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: badge.dot,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 10, color: "var(--eh-ink-muted, #6b7280)", flexShrink: 0, whiteSpace: "nowrap" }}>
                            {fmtTime(ev._start)}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: badge.color,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                            }}
                          >
                            {ev.title || "(Sin título)"}
                          </span>
                        </div>
                      </Dropdown>
                    );
                  })}

                  {hiddenCount > 0 && (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--eh-ink-muted, #6b7280)",
                        padding: "2px 5px",
                        cursor: "pointer",
                        borderRadius: 4,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        closePeek?.();
                        setMoreModal({ open: true, dayKey: key });
                      }}
                    >
                      +{hiddenCount} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── More events modal ────────────────────────────────────────────── */}
      <Modal
        open={moreModal.open}
        onCancel={closeMore}
        footer={null}
        title={
          moreModal.dayKey
            ? dayjs(moreModal.dayKey).locale("es").format("dddd, D [de] MMMM YYYY")
            : "Eventos"
        }
        destroyOnClose
        width={520}
        getContainer={false}
      >
        <div style={{ display: "grid", gap: 8 }}>
          {moreEvents.length === 0 ? (
            <div style={{ padding: 8, color: "var(--eh-ink-muted, #667085)" }}>No hay eventos.</div>
          ) : (
            moreEvents.map((ev) => {
              const badge = getEventBadge(ev);
              const evk = eventKey(ev);
              return (
                <div
                  key={evk}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: badge.bg,
                    borderLeft: `4px solid ${badge.dot}`,
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openPeek?.(ev, e.currentTarget);
                  }}
                >
                  <div style={{ minWidth: 54, fontWeight: 600, fontSize: 12 }}>
                    {fmtTime(ev._start)}
                  </div>
                  <div style={{ flex: 1, fontSize: 13 }}>{ev.title || "(Sin título)"}</div>

                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        {
                          key: "edit",
                          icon: <SyncOutlined />,
                          label: "Editar",
                          onClick: () => { closeMore(); onEditEvent?.(ev); },
                        },
                        {
                          key: "del",
                          icon: <DeleteOutlined />,
                          danger: true,
                          label: "Eliminar",
                          onClick: () => { closeMore(); onDeleteEvent?.(ev); },
                        },
                      ],
                    }}
                  >
                    <div
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 8,
                        border: "1px solid var(--eh-surface-border, #cfd6e1)",
                        background: "var(--eh-surface, #fff)",
                      }}
                    >
                      ⋯
                    </div>
                  </Dropdown>
                </div>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
}
