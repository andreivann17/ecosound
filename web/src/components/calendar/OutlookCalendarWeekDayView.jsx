// src/components/calendar/OutlookCalendarWeekDayView.jsx
import React, { useMemo, useRef, useLayoutEffect } from "react";
import dayjs from "dayjs";
import { SyncOutlined, DeleteOutlined } from "@ant-design/icons";
import { Dropdown, Menu } from "antd";
import {
  pxPerHour,
  buildDaysForView,
  eventKey,
  fmtTime,
  getEventColors,
  groupEventsByDay,
  layoutOverlapsInDay,
  yToTime,
} from "./boardUtils";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const VIEW_START_H = 0;   // 00:00
const VIEW_END_H = 23;    // 23:00 (fin)
const VIEW_HOURS = VIEW_END_H - VIEW_START_H; // 23 horas visibles
const VIEW_OFFSET_PX = VIEW_START_H * pxPerHour;

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
}) {
  const daysForView = useMemo(() => buildDaysForView(anchor, view), [anchor, view]);

  const dayRange = useMemo(() => {
    const start = daysForView[0]?.startOf("day") ?? anchor.startOf("day");
    const end = (daysForView[daysForView.length - 1]?.startOf("day") ?? anchor.startOf("day"))
      .add(1, "day")
      .endOf("day");
    return { start, end };
  }, [daysForView, anchor]);

  const byDay = useMemo(() => {
    return groupEventsByDay({ evs, rangeStart: dayRange.start, rangeEnd: dayRange.end });
  }, [evs, dayRange.start.valueOf(), dayRange.end.valueOf()]);

const daysScrollRef = useRef(null);

useLayoutEffect(() => {
  const el = daysScrollRef.current;
  if (!el) return;

  el.scrollTop = 0;
}, [view, cursorDate]);

const timeBodyRef = useRef(null);

useLayoutEffect(() => {
  const days = daysScrollRef.current;   // ✅ aquí
  const time = timeBodyRef.current;
  if (!days || !time) return;

  const sync = () => {
    time.scrollTop = days.scrollTop;
  };

  days.addEventListener("scroll", sync);
  return () => days.removeEventListener("scroll", sync);
}, []);


  const headerCells = daysForView.map((d) => {
    const isOne = view === "day";
    return (
      <div key={d.format("YYYY-MM-DD")} className={`ol-dayHeaderCell ${isOne ? "one" : ""}`}>
        <div className="ol-dayHeaderTop">{d.format("DD")}</div>
        <div className="ol-dayHeaderDow">{d.format("dddd")}</div>
      </div>
    );
  });

  const timeCol = (
    <>
      <div className="ol-timeHeaderSpacer" />
      {Array.from({ length: VIEW_HOURS + 1 }).map((_, i) => {
  const h = VIEW_START_H + i;
  return (
    <div key={h} className="ol-timeCell">
      {String(h).padStart(2, "0")}:00
    </div>
  );
})}

    </>
  );

  const HEADER_H = 44;
  const DAY_TOP_OFFSET = HEADER_H;

 const onDayClick = (dayStart, e) => {
  const scrollEl = daysScrollRef.current;   // ✅ scroll real
  if (!scrollEl) return;

  const dayCol = e.currentTarget;
  const rect = dayCol.getBoundingClientRect();
  const y = e.clientY - rect.top + (scrollEl.scrollTop || 0) - DAY_TOP_OFFSET;

  // base = 00:00 del día
  const base = dayStart.startOf("day").add(VIEW_START_H, "hour");

  // convierte y(px) a minutos
  const minutes = Math.max(0, Math.min(VIEW_HOURS * 60, (y / pxPerHour) * 60));
  const tStart = base.add(minutes, "minute");

  // snap 30 min
  const snapped = tStart.minute(Math.floor(tStart.minute() / 30) * 30).second(0);

  const tEnd = snapped.add(30, "minute");

  onSelectSlot?.({
    start: snapped.toISOString(),
    end: tEnd.toISOString(),
    day: dayStart.toISOString(),
    view,
  });
};


  return (

    <div className="ol-weekWrap">
  {/* TIME COLUMN */}
  <div className="ol-timeCol">
    <div className="ol-timeHeaderSpacer" />
    <div className="ol-timeBody" ref={timeBodyRef}>
      {Array.from({ length: VIEW_HOURS + 1 }).map((_, i) => {
  const h = VIEW_START_H + i;
  return (
    <div key={h} className="ol-timeCell">
      {String(h).padStart(2, "0")}:00
    </div>
  );
})}

    </div>
  </div>

  {/* DAYS */}
  <div className="ol-days">
    <div className="ol-daysHeader">{headerCells}</div>
<div className="ol-daysScroll" ref={daysScrollRef}>
    <div className="ol-daysBody">
          {daysForView.map((d) => {
            const key = d.format("YYYY-MM-DD");
            const dayEvents = byDay.get(key) ?? [];
            const laid = layoutOverlapsInDay(dayEvents, d);

            const isOne = view === "day";
            const height = VIEW_HOURS * pxPerHour + DAY_TOP_OFFSET;


            return (
              <div
                key={key}
                className={`ol-dayCol ${isOne ? "one" : ""}`}
                style={{ height }}
                onClick={(e) => onDayClick(d, e)}
              >
                {Array.from({ length: VIEW_HOURS }).map((_, i) => (
  <div key={i} className="ol-slot" style={{ height: pxPerHour }} />
))}


                {laid.map((it) => {
  const ev = it.ev;
  const { bg, accent, hoverBg } = getEventColors(ev);

  // ===== RECORTE / OFFSET (05:00 -> 22:00) =====
  const viewStart = d.startOf("day").add(VIEW_START_H, "hour");
  const viewEnd = d.startOf("day").add(VIEW_END_H, "hour");

  const evStart = dayjs(ev.start);
const evEnd = dayjs(ev.end);

// fuera del rango -> no render (Dayjs sin plugins)
if (!evEnd.isAfter(viewStart) || !evStart.isBefore(viewEnd)) {
  return null;
}


  // offset top para que 05:00 sea y=0
  // ✅ Calcula la posición vertical desde la hora real del evento (relativo a 05:00)
// ✅ diff en UTC para evitar +1h por DST/offset
const startMin = Math.max(0, evStart.utc().diff(viewStart.utc(), "minute"));
const endMin = Math.min(VIEW_HOURS * 60, evEnd.utc().diff(viewStart.utc(), "minute"));

let topPx = (startMin / 60) * pxPerHour;
console.log(startMin)
console.log(endMin)
console.log(pxPerHour)
console.log(topPx)
let heightPx = Math.max(8, ((endMin - startMin) / 60) * pxPerHour);
const GRID_TOP_SHIFT_PX = pxPerHour; // ✅ 1 hora exacta (36px)


  // ===== LAYOUT OVERLAPS =====
  const gap = 6;
  const leftPct = (it.col / it.colCount) * 100;
  const widthPct = (1 / it.colCount) * 100;

  const left = `calc(${leftPct}% + ${gap}px)`;
  const right = `calc(${100 - (leftPct + widthPct)}% + ${gap}px)`;

  const isCanceled =
    Boolean(ev?.canceled) || String(ev?.status).toLowerCase() === "canceled";

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
        className={`ol-ev ${isCanceled ? "cancel" : ""}`}
        style={{
          top: topPx + DAY_TOP_OFFSET - GRID_TOP_SHIFT_PX,
          height: heightPx,
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
  );
})}

              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}
