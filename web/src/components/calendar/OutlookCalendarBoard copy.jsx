import React, { useMemo, useRef, useState, useLayoutEffect, useEffect, } from "react";
import dayjs from "dayjs";
import { SyncOutlined, DeleteOutlined } from "@ant-design/icons";
import { Dropdown, Menu, Popover,Modal } from "antd";
import EventPeek from "./EventPeek";

const pxPerHour = 36;
const DEFAULT_COLOR = "#7c20d3ff";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function timeToY(d) {
  const m = d.hour() * 60 + d.minute();
  return (m / 60) * pxPerHour;
}

function durationToH(start, end) {
  const mins = dayjs(end).diff(dayjs(start), "minute");
  return (mins / 60) * pxPerHour;
}

function normalizeHex(hex) {
  if (!hex) return DEFAULT_COLOR;
  let h = String(hex).trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  if (h.length !== 7) return DEFAULT_COLOR;
  return h.toUpperCase();
}

function hexToRgba(hex, a) {
  const h = normalizeHex(hex).slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function fmtTime(d) {
  return dayjs(d).format("HH:mm");
}

function startOfWeekLikeOutlook(base) {
  const dow = base.day();
  const diff = dow === 0 ? -6 : 1 - dow;
  return base.add(diff, "day").startOf("day");
}

function daysBetween(start, end) {
  const a = dayjs(start).startOf("day");
  const b = dayjs(end).startOf("day");
  return b.diff(a, "day");
}
const clampPeekIntoViewport = () => {
  // toma el último popover abierto (por si hay más)
  const nodes = document.querySelectorAll(".ol-peekPopover");
  const pop = nodes[nodes.length - 1];
  if (!pop) return;

  const r = pop.getBoundingClientRect();
  const pad = 8;

  let dx = 0;
  let dy = 0;

  if (r.left < pad) dx = pad - r.left;
  if (r.right > window.innerWidth - pad) dx = (window.innerWidth - pad) - r.right;

  if (r.top < pad) dy = pad - r.top;
  if (r.bottom > window.innerHeight - pad) dy = (window.innerHeight - pad) - r.bottom;

  pop.style.setProperty("--peek-dx", `${dx}px`);
  pop.style.setProperty("--peek-dy", `${dy}px`);
};

function overlaps(aStart, aEnd, bStart, bEnd) {
  const as = dayjs(aStart).valueOf();
  const ae = dayjs(aEnd).valueOf();
  const bs = dayjs(bStart).valueOf();
  const be = dayjs(bEnd).valueOf();
  return as < be && bs < ae;
}

function getEventColors(ev) {
  const idEvento = Number(ev?.id_agenda_evento);

  const baseColor = idEvento === 3 ? "#d32029" : ev?.color_hex ?? DEFAULT_COLOR;

  const accent = normalizeHex(baseColor);
  const bg = hexToRgba(accent, 0.14);
  const hoverBg = hexToRgba(accent, 0.22);

  return { accent, bg, hoverBg };
}

function useMonthCellCapacity(monthBodyRef, monthKey, view) {
  const [cap, setCap] = useState(3);

  useLayoutEffect(() => {
    if (view !== "month") return;

    const root = monthBodyRef.current;
    if (!root) return;

    let raf1 = 0;
    let raf2 = 0;

    const compute = () => {
      const cell = root.querySelector(".ol-monthCell");
      if (!cell) return;

      const cellH = cell.clientHeight || 0;

      // IMPORTANTE: si el DOM aún no tiene altura real, NO calcules (evita cap=0)
      if (cellH < 60) return;

      const dateEl = cell.querySelector(".ol-monthDate");
      const eventsEl = cell.querySelector(".ol-monthEvents");

      const dateH = dateEl ? dateEl.offsetHeight : 0;
      const topUsed = dateH + 6;
      const available = Math.max(0, cellH - topUsed - 8);

      let pillH = 24;
      if (eventsEl) {
        const pill = eventsEl.querySelector(".ol-monthEv");
        if (pill) pillH = pill.offsetHeight || 24;
      }

      const gap = 4;
      const perItem = pillH + gap;
      const maxLines = perItem > 0 ? Math.floor((available + gap) / perItem) : 0;

      setCap(clamp(maxLines, 0, 8));
    };

    const ro = new ResizeObserver(() => {
      compute();
    });

    ro.observe(root);

    const firstCell = root.querySelector(".ol-monthCell");
    if (firstCell) ro.observe(firstCell);

    // Medir cuando ya pintó bien (doble RAF)
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        compute();
      });
    });

    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      ro.disconnect();
    };
  }, [monthKey, view]);

  return cap;
}


function buildMonthMatrix(anchor) {
  const first = dayjs(anchor).startOf("month");
  const last = dayjs(anchor).endOf("month");

  const gridStart = startOfWeekLikeOutlook(first);
  const gridEnd = startOfWeekLikeOutlook(last).add(6, "day").endOf("day");

  const totalDays = daysBetween(gridStart, gridEnd) + 1;
  const weeks = Math.ceil(totalDays / 7);

  const rows = [];
  let cur = gridStart;

  for (let w = 0; w < weeks; w++) {
    const row = [];
    for (let i = 0; i < 7; i++) {
      row.push(cur);
      cur = cur.add(1, "day");
    }
    rows.push(row);
  }
  return { rows, gridStart, gridEnd };
}

function normalizeEventsForBoard(events) {
  return (events || []).map((ev) => {
    const start = dayjs(ev.start);
    let end = ev.end ? dayjs(ev.end) : null;

    if (!end || !end.isValid() || !end.isAfter(start)) {
      end = start.add(30, "minute");
    }

    const id_agenda_evento =
      ev?.id_agenda_evento != null ? Number(ev.id_agenda_evento)
      : ev?.id_evento != null ? Number(ev.id_evento)
      : null;

    return {
      ...ev,
      id_agenda_evento,
      _start: start,
      _end: end,
    };
  });
}





function sortEventsInDay(list) {
  return [...list].sort((a, b) => {
    const d = a._start.valueOf() - b._start.valueOf();
    if (d !== 0) return d;
    return a._end.valueOf() - b._end.valueOf();
  });
}

/* ==============================
   WEEK/DAY: helpers de layout
   ============================== */

function buildDaysForView(anchor, view) {
  const a = dayjs(anchor).startOf("day");

  if (view === "day") {
    return [a];
  }

  const start = startOfWeekLikeOutlook(a);
  if (view === "workweek") {
    return [0, 1, 2, 3, 4].map((i) => start.add(i, "day"));
  }

  return [0, 1, 2, 3, 4, 5, 6].map((i) => start.add(i, "day"));
}
function eventKey(ev) {
  const s = ev?._start ? dayjs(ev._start).format("YYYY-MM-DDTHH:mm:ss") : String(ev?.start || "");
  const e = ev?._end ? dayjs(ev._end).format("YYYY-MM-DDTHH:mm:ss") : String(ev?.end || "");
  return `${ev?.id ?? "noid"}-${s}-${e}`;
}



function clipEventToDay(ev, dayStart) {
  const ds = dayjs(dayStart).startOf("day");
  const de = ds.add(1, "day");

  const s = ev._start.isBefore(ds) ? ds : ev._start;
  const e = ev._end.isAfter(de) ? de : ev._end;

  return { s, e };
}

/**
 * Layout estilo Outlook:
 * - Agrupa traslapes en "clusters"
 * - Dentro de cada cluster asigna columnas por greedy
 * - Produce left/width por evento (porcentaje dentro del día)
 */
function layoutOverlapsInDay(dayEvents, dayStart) {
  const ds = dayjs(dayStart).startOf("day");
  const de = ds.add(1, "day");

  const list = (dayEvents || [])
    .filter((ev) => overlaps(ev._start, ev._end, ds, de))
    .map((ev) => {
      const clipped = clipEventToDay(ev, ds);
      return {
        ev,
        s: clipped.s,
        e: clipped.e,
        sMs: clipped.s.valueOf(),
        eMs: clipped.e.valueOf(),
      };
    })
    .sort((a, b) => a.sMs - b.sMs || a.eMs - b.eMs);

  if (!list.length) return [];

  // 1) construir clusters (componentes conectados por traslape)
  const clusters = [];
  let curCluster = [];
  let clusterEnd = -Infinity;

  for (const item of list) {
    if (!curCluster.length) {
      curCluster = [item];
      clusterEnd = item.eMs;
      continue;
    }

    if (item.sMs < clusterEnd) {
      curCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.eMs);
    } else {
      clusters.push(curCluster);
      curCluster = [item];
      clusterEnd = item.eMs;
    }
  }
  if (curCluster.length) clusters.push(curCluster);

  // 2) asignar columnas dentro de cada cluster
  const out = [];

  for (const cluster of clusters) {
    const cols = [];
    const placed = [];

    for (const it of cluster) {
      let colIdx = -1;
      for (let c = 0; c < cols.length; c++) {
        if (it.sMs >= cols[c]) {
          colIdx = c;
          break;
        }
      }
      if (colIdx === -1) {
        colIdx = cols.length;
        cols.push(it.eMs);
      } else {
        cols[colIdx] = it.eMs;
      }

      placed.push({ ...it, col: colIdx });
    }

    const colCount = Math.max(1, cols.length);

    for (const p of placed) {
      out.push({
        ev: p.ev,
        top: timeToY(p.s),
        height: Math.max(18, durationToH(p.s, p.e)),
        col: p.col,
        colCount,
      });
    }
  }

  return out;
}

function yToTime(dayStart, y) {
  const mins = Math.round((y / pxPerHour) * 60 / 15) * 15;
  const m = clamp(mins, 0, 24 * 60 - 15);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return dayjs(dayStart).hour(h).minute(mm).second(0).millisecond(0);
}

export default function OutlookCalendarBoard({
  model,
  cursorDate,
  view,
  events,
  onSelectSlot,
  onEditEvent,
  onDeleteEvent,
}) {
  const anchor = useMemo(() => dayjs(cursorDate), [cursorDate]);
const [monthMore, setMonthMore] = useState({
  open: false,
  dayKey: null,
});
const closeMonthMore = () => setMonthMore({ open: false, dayKey: null });

  const evs = useMemo(() => normalizeEventsForBoard(events), [events]);
  
useEffect(() => {
  evs.forEach((ev) => {
    if (
      ev?.id_agenda_evento === 3 || // pagos por id
      String(ev?.tipo || "").toLowerCase().includes("pago")
    ) {
      console.log("PAGO DEBUG:", {
        title: ev.title,
        id: ev.id,
        id_agenda_evento: ev.id_agenda_evento,
        tipo: ev.tipo,
        start_raw: ev.start,
        end_raw: ev.end,
        _start: ev._start?.format("YYYY-MM-DD HH:mm"),
        _end: ev._end?.format("YYYY-MM-DD HH:mm"),
      });
    }
  });
}, [evs]);

  // ======= PEEK (EventPeek) =======
  const [peek, setPeek] = useState({
    open: false,
    id: null,
    placement: "rightTop",
  });

  const closePeek = () => setPeek({ open: false, id: null, placement: "rightTop" });

  const computePlacement = (targetEl) => {
    try {
      const r = targetEl.getBoundingClientRect();
      const spaceRight = window.innerWidth - r.right;
      const spaceLeft = r.left;
      if (spaceRight < 420 && spaceLeft > spaceRight) return "leftTop";
      return "rightTop";
    } catch {
      return "rightTop";
    }
  };

  const openPeek = (ev, targetEl) => {
    const id = eventKey(ev);
    setPeek({
      open: true,
      id,
      placement: computePlacement(targetEl),
    });
  };

  const getPopupContainer = () => document.body;


  const month = useMemo(() => buildMonthMatrix(anchor), [anchor]);
  const monthKey = useMemo(() => anchor.format("YYYY-MM"), [anchor]);

  const monthBodyRef = useRef(null);
  const monthCapacity = useMonthCellCapacity(monthBodyRef, monthKey, view);


  const byDayMonth = useMemo(() => {
    const map = new Map();

    const gridStart = month.gridStart.startOf("day");
    const gridEnd = month.gridEnd.endOf("day");

    for (const ev of evs) {
      const es = ev._start;
      const ee = ev._end;

      if (!overlaps(es, ee, gridStart, gridEnd)) continue;

      const startDay = es.startOf("day");
      const endDay = ee.subtract(1, "minute").startOf("day");

      const spanDays = Math.max(0, endDay.diff(startDay, "day"));
      for (let i = 0; i <= spanDays; i++) {
        const d = startDay.add(i, "day");
        const key = d.format("YYYY-MM-DD");
        const arr = map.get(key) ?? [];
        arr.push(ev);
        map.set(key, arr);
      }
    }

    for (const [k, arr] of map.entries()) {
      map.set(k, sortEventsInDay(arr));
    }

    return map;
  }, [evs, month.gridStart, month.gridEnd, monthKey]);

  const daysForView = useMemo(() => buildDaysForView(anchor, view), [anchor, view]);

  const dayRange = useMemo(() => {
    const start = daysForView[0]?.startOf("day") ?? anchor.startOf("day");
    const end = (daysForView[daysForView.length - 1]?.startOf("day") ?? anchor.startOf("day"))
      .add(1, "day")
      .endOf("day");
    return { start, end };
  }, [daysForView, anchor]);

  const byDay = useMemo(() => {
    const map = new Map();

    const start = dayRange.start;
    const end = dayRange.end;

    for (const ev of evs) {
      const es = ev._start;
      const ee = ev._end;

      if (!overlaps(es, ee, start, end)) continue;

      const startDay = es.startOf("day");
      const endDay = ee.subtract(1, "minute").startOf("day");

      const spanDays = Math.max(0, endDay.diff(startDay, "day"));
      for (let i = 0; i <= spanDays; i++) {
        const d = startDay.add(i, "day");
        const key = d.format("YYYY-MM-DD");
        const arr = map.get(key) ?? [];
        arr.push(ev);
        map.set(key, arr);
      }
    }

    for (const [k, arr] of map.entries()) {
      map.set(k, sortEventsInDay(arr));
    }

    return map;
  }, [evs, dayRange.start.valueOf(), dayRange.end.valueOf()]);

  const daysBodyRef = useRef(null);
const selectedDayEvents = useMemo(() => {
  if (!monthMore.dayKey) return [];
  return byDayMonth.get(monthMore.dayKey) ?? [];
}, [monthMore.dayKey, byDayMonth]);
useLayoutEffect(() => {
  if (view === "month") return;
  const el = daysBodyRef.current;
  if (!el) return;

  console.log("DAYS BODY SCROLL:", {
    scrollTop: el.scrollTop,
    clientHeight: el.clientHeight,
    scrollHeight: el.scrollHeight,
  });
}, [view, cursorDate]);

if (view === "month") {
  const weekHeader = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

  return (
    <div className="ol-month" key={`${monthKey}-month`}>
      <div className="ol-monthHeader">
        {weekHeader.map((x) => (
          <div key={x} className="ol-monthHCell">{x}</div>
        ))}
      </div>

      <div className="ol-monthBody" ref={monthBodyRef}>
        {month.rows.map((row, idx) => (
          <div className="ol-monthRow" key={idx}>
            {row.map((day) => {
              const key = day.format("YYYY-MM-DD");
              const dayEvents = byDayMonth.get(key) ?? [];

              return (
                <div key={key} className="ol-monthCell">
                  <div className="ol-monthDate">{day.date()}</div>

                  <div className="ol-monthEvents">
                    {dayEvents.slice(0, monthCapacity).map((ev) => {
                      const { bg, accent, hoverBg } = getEventColors(ev);
                      const evKey = eventKey(ev);
                      const isOpen = peek.open && peek.id === evKey;

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
                        <Popover
                            key={evKey}
                            open={isOpen}
                            placement={isOpen ? peek.placement : "rightTop"}
                            overlayClassName="ol-peekPopover"
                            overlayStyle={{ width: 420, maxWidth: "calc(100vw - 24px)" }}
                            trigger="click"
                            onOpenChange={(open) => {
                              if (!open) {
                                closePeek();
                                return;
                              }
                              requestAnimationFrame(() => {
                                requestAnimationFrame(() => clampPeekIntoViewport());
                              });
                            }}

                            content={
                              <div style={{ maxHeight: "calc(100vh - 120px)", overflow: "auto" }}>
                                <EventPeek
                                  ev={ev}
                                  onEdit={(x) => onEditEvent?.(x)}
                                  onDelete={(x) => onDeleteEvent?.(x)}
                                />
                              </div>
                            }
                            getPopupContainer={getPopupContainer}
                          >
                          <Dropdown overlay={menu} trigger={["contextMenu"]}>
                            <div
                              className="ol-monthEv"
                              style={{ background: bg, borderLeftColor: accent }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openPeek(ev, e.currentTarget);
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                onEditEvent?.(ev);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = hoverBg;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = bg;
                              }}
                            >
                              {fmtTime(ev._start)} {ev.title}

                            </div>
                          </Dropdown>
                        </Popover>
                      );
                    })}

                    {dayEvents.length > monthCapacity ? (
                      <div
                        className="ol-monthMore"
                        onClick={(e) => {
                          e.stopPropagation();
                          closePeek(); // opcional: para que no se quede un peek abierto
                          setMonthMore({ open: true, dayKey: key });
                        }}
                      >
                        +{dayEvents.length - monthCapacity} más
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <Modal
        open={monthMore.open}
        onCancel={closeMonthMore}
        footer={null}
        title={
          monthMore.dayKey
            ? dayjs(monthMore.dayKey).format("dddd, D [de] MMMM YYYY")
            : "Eventos"
        }
        destroyOnClose
        width={520}
      >
        <div style={{ display: "grid", gap: 8 }}>
          {selectedDayEvents.length === 0 ? (
            <div style={{ padding: 8, color: "#667085" }}>No hay eventos.</div>
          ) : (
            selectedDayEvents.map((ev) => {
              const { bg, accent } = getEventColors(ev);
              const evKey = eventKey(ev);


              return (
                <div
                  key={evKey}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: bg,
                    borderLeft: `4px solid ${accent}`,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    closeMonthMore();
                    onEditEvent?.(ev);
                  }}
                >
                  <div style={{ minWidth: 54, fontWeight: 600 }}>
                    {fmtTime(ev.start)}
                  </div>
                  <div style={{ flex: 1 }}>{ev.title}</div>

                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        {
                          key: "edit",
                          icon: <SyncOutlined />,
                          label: "Editar",
                          onClick: () => {
                            closeMonthMore();
                            onEditEvent?.(ev);
                          },
                        },
                        {
                          key: "del",
                          icon: <DeleteOutlined />,
                          danger: true,
                          label: "Eliminar",
                          onClick: () => {
                            closeMonthMore();
                            onDeleteEvent?.(ev);
                          },
                        },
                      ],
                    }}
                  >
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 8,
                        border: "1px solid #cfd6e1",
                        background: "#fff",
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



  // ===== DAY / WEEK / WORKWEEK =====

  const headerCells = daysForView.map((d) => {
    const isOne = view === "day";
    return (
      <div key={d.format("YYYY-MM-DD")} className={`ol-dayHeaderCell ${isOne ? "one" : ""}`}>
        <div className="ol-dayHeaderTop">{d.format("DD")}</div>
        <div className="ol-dayHeaderDow">{d.format("ddd")}</div>
      </div>
    );
  });

 const HEADER_H = 44; // ya lo usas en CSS (ol-daysHeader)
 const DAY_TOP_OFFSET = HEADER_H; // esto baja lo que cae en 00:00 para que no lo tape el header


const timeCol = (
  <>
    <div className="ol-timeHeaderSpacer" />
    {Array.from({ length: 24 }).map((_, h) => (
      <div key={h} className="ol-timeCell">
        {String(h).padStart(2, "0")}:00
      </div>
    ))}
  </>
);
  const onDayClick = (dayStart, e) => {
    const body = daysBodyRef.current;
    if (!body) return;

    const dayCol = e.currentTarget;
    const rect = dayCol.getBoundingClientRect();
    const y = e.clientY - rect.top + (body.scrollTop || 0) - DAY_TOP_OFFSET;
    const tStart = yToTime(dayStart, y);

    const tEnd = tStart.add(30, "minute");

    onSelectSlot?.({
      start: tStart.toISOString(),
      end: tEnd.toISOString(),
      day: dayStart.toISOString(),
      view,
    });
  };

  return (
    <div className="ol-weekWrap">
      <div className="ol-timeCol">{timeCol}</div>

      <div className="ol-days">
        <div className="ol-daysHeader">{headerCells}</div>

        <div className="ol-daysBody" ref={daysBodyRef}>
          {daysForView.map((d) => {
            const key = d.format("YYYY-MM-DD");
            const dayEvents = byDay.get(key) ?? [];
          

            const pagosEnDayEvents = dayEvents.filter(
              (ev) => Number(ev?.id_agenda_evento) === 3
            );

            console.log("DAY CHECK:", key, {
              dayEventsCount: dayEvents.length,
              pagosCount: pagosEnDayEvents.length,
              pagos: pagosEnDayEvents.map((ev) => ({
                id: ev.id,
                title: ev.title,
                start: ev._start?.format("HH:mm"),
                end: ev._end?.format("HH:mm"),
              })),
            });

            const laid = layoutOverlapsInDay(dayEvents, d);

            const pagosEnLaid = laid.filter(
              (it) => Number(it.ev?.id_agenda_evento) === 3
            );

            console.log("LAID CHECK:", key, {
              laidCount: laid.length,
              pagosCount: pagosEnLaid.length,
              pagos: pagosEnLaid.map((it) => ({
                id: it.ev.id,
                top: it.top,
                height: it.height,
                start: it.ev._start?.format("HH:mm"),
                end: it.ev._end?.format("HH:mm"),
              })),
            });

            

            // DEBUG SOLO PAGOS (id_agenda_evento === 3)
            const pagosKeys = laid
              .filter((it) => Number(it.ev?.id_agenda_evento) === 3)
              .map((it) => eventKey(it.ev));

            if (pagosKeys.length) {
              console.log("PAGOS KEYS DAY:", key, pagosKeys);
            }


            const isOne = view === "day";
            const height = 24 * pxPerHour + DAY_TOP_OFFSET;


            return (
              <div
                key={key}
                className={`ol-dayCol ${isOne ? "one" : ""}`}
                style={{ height }}
                onClick={(e) => onDayClick(d, e)}
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="ol-slot" style={{ height: pxPerHour }} />
                ))}

                {laid.map((it) => {
                  const ev = it.ev;
                  const { bg, accent, hoverBg } = getEventColors(ev);

                  const gap = 6;
                  const leftPct = (it.col / it.colCount) * 100;
                  const widthPct = (1 / it.colCount) * 100;

                  const left = `calc(${leftPct}% + ${gap}px)`;
                  const right = `calc(${100 - (leftPct + widthPct)}% + ${gap}px)`;

                  const isCanceled =
                    Boolean(ev?.canceled) || String(ev?.status).toLowerCase() === "canceled";

                  const evKey = eventKey(ev);

                  const isOpen = peek.open && peek.id === evKey;

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
                    <Popover
                      key={evKey}
                      open={isOpen}
                      placement={isOpen ? peek.placement : "rightTop"}
                      overlayClassName="ol-peekPopover"
                      trigger="click"
                      onOpenChange={(open) => {
                        if (!open) closePeek();
                      }}
                      content={
                        <EventPeek
                          ev={ev}
                          onEdit={(x) => onEditEvent?.(x)}
                          onDelete={(x) => onDeleteEvent?.(x)}
                        />
                      }
                      getPopupContainer={getPopupContainer}
                    >
                      <Dropdown overlay={menu} trigger={["contextMenu"]}>
                        <div
                          className={`ol-ev ${isCanceled ? "cancel" : ""}`}
                          style={{
                            top: it.top + DAY_TOP_OFFSET, // evita que 00:00 se pegue al borde superior y se oculte

                            height: it.height,
                            left,
                            right,
                            background: bg,
                            borderLeftColor: accent,
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openPeek(ev, e.currentTarget);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            onEditEvent?.(ev);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = hoverBg;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = bg;
                          }}
                        >
                          <div className="ol-evTitle">
                            {fmtTime(ev.start)} {ev.title}
                          </div>
                          <div className="ol-evMeta">
                            <SyncOutlined className="ol-evIcon" />
                          </div>
                        </div>
                      </Dropdown>
                    </Popover>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
