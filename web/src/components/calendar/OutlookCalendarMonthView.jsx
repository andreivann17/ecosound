// src/components/calendar/OutlookCalendarMonthView.jsx
import React, { useMemo, useRef, useState, useLayoutEffect } from "react";
import dayjs from "dayjs";
import { SyncOutlined, DeleteOutlined } from "@ant-design/icons";
import { Dropdown, Menu, Modal } from "antd";
import {
  buildMonthMatrix,
  clamp,
  eventKey,
  fmtTime,
  getEventColors,
  groupEventsByDay,
} from "./boardUtils";

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

    const ro = new ResizeObserver(() => compute());
    ro.observe(root);

    const firstCell = root.querySelector(".ol-monthCell");
    if (firstCell) ro.observe(firstCell);

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => compute());
    });

    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      ro.disconnect();
    };
  }, [monthKey, view]);

  return cap;
}

export default function OutlookCalendarMonthView({
  anchor,
  view,
  evs,
  peek,
  openPeek,
  closePeek,
  onEditEvent,
  onDeleteEvent,
}) {
  const month = useMemo(() => buildMonthMatrix(anchor), [anchor]);
  const monthKey = useMemo(() => anchor.format("YYYY-MM"), [anchor]);

  const monthBodyRef = useRef(null);
  const monthCapacity = useMonthCellCapacity(monthBodyRef, monthKey, view);

  const byDayMonth = useMemo(() => {
    const gridStart = month.gridStart.startOf("day");
    const gridEnd = month.gridEnd.endOf("day");
    return groupEventsByDay({ evs, rangeStart: gridStart, rangeEnd: gridEnd });
  }, [evs, month.gridStart, month.gridEnd, monthKey]);

  const [monthMore, setMonthMore] = useState({ open: false, dayKey: null });

  const closeMonthMore = () => {
    setMonthMore({ open: false, dayKey: null });
  };

  const selectedDayEvents = useMemo(() => {
    if (!monthMore.dayKey) return [];
    return byDayMonth.get(monthMore.dayKey) ?? [];
  }, [monthMore.dayKey, byDayMonth]);

  const weekHeader = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

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

              // When there is overflow, show one fewer event to guarantee
              // the "+N más" button always has room to render
              const hasOverflow = dayEvents.length > monthCapacity;
              const visibleCount = hasOverflow ? Math.max(0, monthCapacity - 1) : monthCapacity;
              const hiddenCount = dayEvents.length - visibleCount;

              return (
                <div key={key} className="ol-monthCell">
                  <div className="ol-monthDate">{day.date()}</div>

                  <div className="ol-monthEvents">
                    {dayEvents.slice(0, visibleCount).map((ev) => {
                      const { bg, accent, hoverBg } = getEventColors(ev);
                      const evKey = eventKey(ev);

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
                        <Dropdown key={evKey} overlay={menu} trigger={["contextMenu"]}>
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
                      );
                    })}

                    {hiddenCount > 0 ? (
                      <div
                        className="ol-monthMore"
                        onClick={(e) => {
                          e.stopPropagation();
                          closePeek();
                          setMonthMore({ open: true, dayKey: key });
                        }}
                      >
                        +{hiddenCount} más
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
        getContainer={false}
      >
        <div style={{ display: "grid", gap: 8 }}>
          {selectedDayEvents.length === 0 ? (
            <div style={{ padding: 8, color: "#667085" }}>No hay eventos.</div>
          ) : (
            selectedDayEvents.map((ev) => {
              const { bg, accent } = getEventColors(ev);
              const evKey = eventKey(ev);

              return (
                <Dropdown
                  key={evKey}
                  trigger={["contextMenu"]}
                  menu={{
                    items: [
                      {
                        key: "edit",
                        icon: <SyncOutlined />,
                        label: "Editar",
                        onClick: () => { closeMonthMore(); onEditEvent?.(ev); },
                      },
                      {
                        key: "del",
                        icon: <DeleteOutlined />,
                        danger: true,
                        label: "Eliminar",
                        onClick: () => { closeMonthMore(); onDeleteEvent?.(ev); },
                      },
                    ],
                  }}
                >
                  <div
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
                    onClick={(e) => openPeek(ev, e.currentTarget)}
                  >
                    <div style={{ minWidth: 54, fontWeight: 600 }}>
                      {fmtTime(ev.start)}
                    </div>
                    <div style={{ flex: 1 }}>{ev.title}</div>
                  </div>
                </Dropdown>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
}
