// src/components/calendar/boardUtils.js
import dayjs from "dayjs";

export const pxPerHour = 36;
export const DEFAULT_COLOR = "#7c20d3ff";

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function normalizeHex(hex) {
  if (!hex) return DEFAULT_COLOR;
  let h = String(hex).trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  if (h.length !== 7) return DEFAULT_COLOR;
  return h.toUpperCase();
}

export function hexToRgba(hex, a) {
  const h = normalizeHex(hex).slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function fmtTime(d) {
  return dayjs(d).format("HH:mm");
}

export function getEventColors(ev) {
  const idEvento = Number(ev?.id_agenda_evento);
  const baseColor = idEvento === 3 ? "#d32029" : ev?.color_hex ?? DEFAULT_COLOR;

  const accent = normalizeHex(baseColor);
  const bg = hexToRgba(accent, 0.14);
  const hoverBg = hexToRgba(accent, 0.22);

  return { accent, bg, hoverBg };
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  const as = dayjs(aStart).valueOf();
  const ae = dayjs(aEnd).valueOf();
  const bs = dayjs(bStart).valueOf();
  const be = dayjs(bEnd).valueOf();
  return as < be && bs < ae;
}

export function startOfWeekLikeOutlook(base) {
  const dow = base.day();
  const diff = dow === 0 ? -6 : 1 - dow;
  return base.add(diff, "day").startOf("day");
}

export function daysBetween(start, end) {
  const a = dayjs(start).startOf("day");
  const b = dayjs(end).startOf("day");
  return b.diff(a, "day");
}

export function buildMonthMatrix(anchor) {
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

export function buildDaysForView(anchor, view) {
  const a = dayjs(anchor).startOf("day");

  if (view === "day") return [a];

  const start = startOfWeekLikeOutlook(a);

  // tu app usa "week_work"
  if (view === "week_work") {
    return [0, 1, 2, 3, 4].map((i) => start.add(i, "day"));
  }

  return [0, 1, 2, 3, 4, 5, 6].map((i) => start.add(i, "day"));
}

export function normalizeEventsForBoard(events) {
  return (events || []).map((ev) => {
    const start = dayjs(ev.start);
    let end = ev.end ? dayjs(ev.end) : null;

    if (!end || !end.isValid() || !end.isAfter(start)) {
      end = start.add(30, "minute");
    }

    return { ...ev, _start: start, _end: end };
  });
}

export function sortEventsInDay(list) {
  return [...list].sort((a, b) => {
    const d = a._start.valueOf() - b._start.valueOf();
    if (d !== 0) return d;
    return a._end.valueOf() - b._end.valueOf();
  });
}

export function eventKey(ev) {
  const s = ev?._start ? dayjs(ev._start).format("YYYY-MM-DDTHH:mm:ss") : String(ev?.start || "");
  const e = ev?._end ? dayjs(ev._end).format("YYYY-MM-DDTHH:mm:ss") : String(ev?.end || "");
  return `${ev?.id ?? "noid"}-${s}-${e}`;
}

export function timeToY(d) {
  const m = d.hour() * 60 + d.minute();
  return (m / 60) * pxPerHour;
}

export function durationToH(start, end) {
  const mins = dayjs(end).diff(dayjs(start), "minute");
  return (mins / 60) * pxPerHour;
}

export function clipEventToDay(ev, dayStart) {
  const ds = dayjs(dayStart).startOf("day");
  const de = ds.add(1, "day");

  const s = ev._start.isBefore(ds) ? ds : ev._start;
  const e = ev._end.isAfter(de) ? de : ev._end;

  return { s, e };
}

export function layoutOverlapsInDay(dayEvents, dayStart) {
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

export function yToTime(dayStart, y) {
  const mins = Math.round((y / pxPerHour) * 60 / 15) * 15;
  const m = clamp(mins, 0, 24 * 60 - 15);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return dayjs(dayStart).hour(h).minute(mm).second(0).millisecond(0);
}

export function clampPeekIntoViewport() {
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
}

export function groupEventsByDay({ evs, rangeStart, rangeEnd }) {
  const map = new Map();

  for (const ev of evs) {
    const es = ev._start;
    const ee = ev._end;

    if (!overlaps(es, ee, rangeStart, rangeEnd)) continue;

    const startDay = es.startOf("day");
    // Only span across days if the event is ≥24h; short events that cross midnight stay on start day
    const durationHours = ee.diff(es, "hour", true);
    const endDay = durationHours >= 24
      ? ee.subtract(1, "minute").startOf("day")
      : startDay;

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
}
