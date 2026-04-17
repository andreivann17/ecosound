// src/components/calendar/OutlookCalendarBoard.jsx
import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import OutlookCalendarMonthView from "./OutlookCalendarMonthView";
import OutlookCalendarWeekDayView from "./OutlookCalendarWeekDayView";
import { eventKey, normalizeEventsForBoard } from "./boardUtils";

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

  if (view === "month") {
    return (
      <OutlookCalendarMonthView
        anchor={anchor}
        view={view}
        evs={evs}
        peek={peek}
        openPeek={openPeek}
        closePeek={closePeek}
        onEditEvent={onEditEvent}
        onDeleteEvent={onDeleteEvent}
        getPopupContainer={getPopupContainer}
      />
    );
  }

  return (
    <OutlookCalendarWeekDayView
      anchor={anchor}
      cursorDate={cursorDate}
      view={view}
      evs={evs}
      peek={peek}
      openPeek={openPeek}
      closePeek={closePeek}
      onSelectSlot={onSelectSlot}
      onEditEvent={onEditEvent}
      onDeleteEvent={onDeleteEvent}
      getPopupContainer={getPopupContainer}
    />
  );
}
