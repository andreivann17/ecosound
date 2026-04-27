// src/components/calendar/OutlookCalendarBoard.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import OutlookCalendarMonthView from "./OutlookCalendarMonthView";
import OutlookCalendarWeekDayView from "./OutlookCalendarWeekDayView";
import EventPeek from "./EventPeek";
import { eventKey, normalizeEventsForBoard } from "./boardUtils";

const POPUP_W = 420;

// Overlay con position:fixed — nunca se corta por overflow:hidden de los contenedores
function PeekOverlay({ peek, onClose, onEdit, onDelete }) {
  const ref = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!peek.open) return;
    const handleDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handleDown), 80);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleDown);
    };
  }, [peek.open, onClose]);

  // Cerrar con Escape
  useEffect(() => {
    if (!peek.open) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [peek.open, onClose]);

  if (!peek.open || !peek.ev) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let x = peek.x;
  let y = peek.y;
  x = Math.max(8, Math.min(x, vw - POPUP_W - 8));
  y = Math.max(8, Math.min(y, vh - 260));

  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: y,
        left: x,
        width: POPUP_W,
        maxWidth: "calc(100vw - 16px)",
        maxHeight: `calc(100vh - ${y + 8}px)`,
        overflowY: "auto",
        zIndex: 10000,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 8px 40px rgba(0,0,0,0.20), 0 2px 10px rgba(0,0,0,0.10)",
        padding: 12,
      }}
    >
      <EventPeek
        ev={peek.ev}
        onEdit={(ev) => { onClose(); onEdit?.(ev); }}
        onDelete={(ev) => { onClose(); onDelete?.(ev); }}
      />
    </div>,
    document.body
  );
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
  const evs = useMemo(() => normalizeEventsForBoard(events), [events]);

  const [peek, setPeek] = useState({ open: false, ev: null, x: 0, y: 0 });
  const closePeek = useCallback(() => setPeek({ open: false, ev: null, x: 0, y: 0 }), []);

  const openPeek = useCallback((ev, targetEl) => {
    const r = targetEl.getBoundingClientRect();
    const spaceRight = window.innerWidth - r.right;
    // Preferir lado derecho; si no hay espacio, ir a la izquierda
    const x = spaceRight >= POPUP_W + 16 ? r.right + 8 : r.left - POPUP_W - 8;
    const y = r.top;
    setPeek({ open: true, ev, x, y });
  }, []);

  const sharedProps = {
    evs,
    peek,
    openPeek,
    closePeek,
    onEditEvent,
    onDeleteEvent,
  };

  const overlay = (
    <PeekOverlay
      peek={peek}
      onClose={closePeek}
      onEdit={onEditEvent}
      onDelete={onDeleteEvent}
    />
  );

  if (view === "month") {
    return (
      <>
        <OutlookCalendarMonthView anchor={anchor} view={view} {...sharedProps} />
        {overlay}
      </>
    );
  }

  return (
    <>
      <OutlookCalendarWeekDayView
        anchor={anchor}
        cursorDate={cursorDate}
        view={view}
        onSelectSlot={onSelectSlot}
        {...sharedProps}
      />
      {overlay}
    </>
  );
}
