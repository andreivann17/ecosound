import dayjs from "dayjs";

export function uid() {
  return "ev_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function normalizeEvent(e) {
  return {
    id: e.id,
    title: e.title ?? "(Sin asunto)",
    start: e.start,
    end: e.end,
    calendarId: e.calendarId ?? "cal_main",
    showAs: e.showAs ?? "busy",
    recurring: !!e.recurring,
    canceled: !!e.canceled,
    allDay: !!e.allDay,
    location: e.location ?? "",
    description: e.description ?? "",
    remindMinutes: e.remindMinutes ?? 15,
    teams: !!e.teams,
    isPrivate: !!e.isPrivate,
  };
}

export function buildDayHours() {
  const out = [];
  for (let h = 0; h <= 12; h++) out.push(String(h));
  // puedes extender a 24 si quieres
  return out;
}

export function buildWeekDays(cursorDate, workWeek = true) {
  const start = cursorDate.startOf("week").add(1, "day"); // lunes
  const days = [];
  const count = workWeek ? 5 : 7;
  for (let i = 0; i < count; i++) days.push(start.add(i, "day"));
  return days;
}

export function buildMonthMatrix(cursorDate) {
  const monthStart = cursorDate.startOf("month");
  const start = monthStart.startOf("week").add(1, "day"); // lunes
  const end = cursorDate.endOf("month").endOf("week").add(1, "day"); // domingo

  const days = [];
  let d = start;

  while (d.isBefore(end) || d.isSame(end, "day")) {
    days.push(d);
    d = d.add(1, "day");
  }

  const rows = [];
  for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
  return rows;
}
