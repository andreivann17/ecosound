import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import "dayjs/locale/es";
import isoWeek from "dayjs/plugin/isoWeek";
import BuscarExpedienteModal from "./buscar.jsx";
import { Button, Tooltip, Spin } from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  RightOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import { actionAgendaPost } from "../../redux/actions/agenda/agenda";

dayjs.extend(isoWeek);
dayjs.locale("es");

// ─── helpers ────────────────────────────────────────────────────────────────

const coerceItems = (slice) => {
  if (!slice) return [];
  if (Array.isArray(slice)) return slice;
  if (Array.isArray(slice.items)) return slice.items;
  if (Array.isArray(slice.data)) return slice.data;
  if (slice.data && Array.isArray(slice.data.items)) return slice.data.items;
  if (slice.payload && Array.isArray(slice.payload.items)) return slice.payload.items;
  return [];
};

const mapItem = (it) => ({
  id: it?.id ?? it?.id_agenda ?? null,
  title: it?.title || "Sin título",
  start: it?.start ?? it?.start_at ?? null,
  end: it?.end ?? it?.end_at ?? null,
  allDay: !!(it?.allDay ?? it?.all_day),
  location: it?.location || "",
  description: it?.description || "",
  color: it?.color_hex || "#2c528f",
  status: it?.status ?? null,
  canceled: it?.status === "canceled" || it?.canceled === true || it?.is_canceled === true,
});

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function getGreeting() {
  const h = dayjs().hour();
  if (h >= 6 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getFirstName(me) {
  const full =
    me?.nombre ||
    me?.first_name ||
    me?.name ||
    me?.username ||
    "";
  return full.split(" ")[0] || "";
}

// ─── componente ─────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isBuscarOpen, setIsBuscarOpen] = useState(false);

  const me = useSelector((s) => s.login?.me ?? null);
  const firstName = getFirstName(me);

  const today = useMemo(() => dayjs(), []);
  const weekStart = useMemo(() => today.startOf("isoWeek"), [today]);
  const weekEnd = useMemo(() => today.endOf("isoWeek"), [today]);

  // fetch agenda semana actual
  useEffect(() => {
    dispatch(
      actionAgendaPost({
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
        city_ids: [1, 2, 3, 4],
        event_type_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      })
    );
  }, [dispatch, weekStart.toISOString(), weekEnd.toISOString()]);

  const agendaSlice = useSelector((s) => s.agenda || {});
  const loading = agendaSlice?.loading ?? false;

  const allEvents = useMemo(() => {
    const raw = coerceItems(agendaSlice?.data ?? agendaSlice);
    return raw.map(mapItem).filter((e) => e.start);
  }, [agendaSlice]);

  const activeEvents = useMemo(() => allEvents.filter((e) => !e.canceled), [allEvents]);

  const todayEvents = useMemo(
    () => activeEvents.filter((e) => dayjs(e.start).isSame(today, "day"))
      .sort((a, b) => dayjs(a.start).diff(dayjs(b.start))),
    [activeEvents, today]
  );

  // agrupar por día lun–dom
  const byDay = useMemo(() => {
    const map = {};
    activeEvents.forEach((ev) => {
      const key = dayjs(ev.start).format("YYYY-MM-DD");
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    Object.keys(map).forEach((k) =>
      map[k].sort((a, b) => dayjs(a.start).diff(dayjs(b.start)))
    );
    return map;
  }, [activeEvents]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day")),
    [weekStart]
  );

  const upcomingWeekEvents = useMemo(
    () => activeEvents.filter((e) => !dayjs(e.start).isBefore(today, "day")),
    [activeEvents, today]
  );

  return (
    <>
      <main className="hm-main">
        <div className="hm-content">

          {/* ── BIENVENIDA ─────────────────────────────── */}
          <section className="hm-welcome">
            <div className="hm-welcome-left">
              <div className="hm-greeting">
                {getGreeting()}{firstName ? `, ${firstName}` : ""}.
              </div>
              <div className="hm-date">
                {today.format("dddd, D [de] MMMM [de] YYYY")}
              </div>
              <div className="hm-subtitle">
                {upcomingWeekEvents.length === 0
                  ? "No tienes eventos próximos esta semana."
                  : `Tienes ${upcomingWeekEvents.length} evento${upcomingWeekEvents.length !== 1 ? "s" : ""} próximo${upcomingWeekEvents.length !== 1 ? "s" : ""} esta semana.`}
              </div>
            </div>
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              onClick={() => navigate("/agenda")}
              className="hm-open-agenda-btn"
            >
              Abrir agenda
            </Button>
          </section>

          {/* ── CUERPO ─────────────────────────────────── */}
          <div className="hm-body">

            {/* ── Card HOY ──────────────────────── */}
            <div className="hm-card hm-today-card">
              <div className="hm-card-header">
                <div className="hm-card-title">
                  <span className="hm-card-dot" style={{ background: "#05060a" }} />
                  Hoy
                </div>
                <span className="hm-card-badge">
                  {today.format("D MMM")}
                </span>
              </div>

              {loading ? (
                <div className="hm-center"><Spin size="small" /></div>
              ) : todayEvents.length === 0 ? (
                <div className="hm-empty">
                  <SmileOutlined className="hm-empty-icon" />
                  <span>Sin eventos hoy</span>
                </div>
              ) : (
                <div className="hm-event-list">
                  {todayEvents.map((ev) => (
                    <TodayEventRow
                      key={ev.id}
                      ev={ev}
                      onClick={() => navigate("/agenda", { state: { focusEventId: ev.id } })}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Card SEMANA ───────────────────── */}
            <div className="hm-card hm-week-card">
              <div className="hm-card-header">
                <div className="hm-card-title">
                  <span className="hm-card-dot" style={{ background: "#05060a" }} />
                  Esta semana
                </div>
                <span className="hm-card-badge">
                  {weekStart.format("D MMM")} – {weekEnd.format("D MMM")}
                </span>
              </div>

              {loading ? (
                <div className="hm-center"><Spin size="small" /></div>
              ) : (
                <div className="hm-week-grid">
                  {weekDays.map((day) => {
                    const key = day.format("YYYY-MM-DD");
                    const events = byDay[key] || [];
                    const isToday = day.isSame(today, "day");
                    const isPast = day.isBefore(today, "day");

                    return (
                      <div
                        key={key}
                        className={[
                          "hm-day-col",
                          isToday ? "hm-day-col--today" : "",
                          isPast ? "hm-day-col--past" : "",
                        ].join(" ")}
                      >
                        <div className="hm-day-header">
                          <span className="hm-day-name">
                            {DAYS_ES[day.day()].slice(0, 3).toUpperCase()}
                          </span>
                          <span className={`hm-day-num${isToday ? " hm-day-num--today" : ""}`}>
                            {day.format("D")}
                          </span>
                          {events.length > 0 && (
                            <span className="hm-day-count">{events.length}</span>
                          )}
                        </div>

                        <div className="hm-day-events">
                          {events.length === 0 ? (
                            <div className="hm-day-empty">—</div>
                          ) : (
                            events.map((ev) => (
                              <Tooltip key={ev.id} title={`${ev.allDay ? "Todo el día" : dayjs(ev.start).format("HH:mm")} · ${ev.title}${ev.location ? ` · ${ev.location}` : ""}`} placement="top">
                                <div
                                  className="hm-chip"
                                  style={{ borderLeftColor: ev.color }}
                                  onClick={() => navigate("/agenda", { state: { focusEventId: ev.id } })}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => e.key === "Enter" && navigate("/agenda", { state: { focusEventId: ev.id } })}
                                >
                                  {!ev.allDay && (
                                    <span className="hm-chip-time">
                                      {dayjs(ev.start).format("HH:mm")}
                                    </span>
                                  )}
                                  <span className="hm-chip-title">{ev.title}</span>
                                  {ev.location && (
                                    <span className="hm-chip-loc">
                                      <EnvironmentOutlined /> {ev.location}
                                    </span>
                                  )}
                                </div>
                              </Tooltip>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{CSS}</style>

      <BuscarExpedienteModal
        open={isBuscarOpen}
        onClose={() => setIsBuscarOpen(false)}
        onSearch={(p) => console.log("Buscar:", p)}
      />
    </>
  );
}

// ── subcomponente fila evento de hoy ────────────────────────────────────────

function TodayEventRow({ ev, onClick }) {
  const startFmt = ev.allDay ? "Todo el día" : dayjs(ev.start).format("HH:mm");
  const endFmt = ev.end && !ev.allDay ? `–${dayjs(ev.end).format("HH:mm")}` : "";

  return (
    <button type="button" className="hm-today-row" onClick={onClick}>
      <div className="hm-today-color" style={{ background: ev.color }} />
      <div className="hm-today-body">
        <span className="hm-today-title">{ev.title}</span>
        <span className="hm-today-meta">
          <ClockCircleOutlined /> {startFmt}{endFmt && ` ${endFmt}`}
          {ev.location && (
            <> · <EnvironmentOutlined /> {ev.location}</>
          )}
        </span>
      </div>
      <RightOutlined className="hm-today-arrow" />
    </button>
  );
}

// ── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
/* ── layout ── */
.hm-main {
  background: #eef1f5;
  min-height: calc(100vh - 56px);
  padding: 32px 40px;
}
.hm-content {

  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ── bienvenida ── */
.hm-welcome {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(120deg, #05060a 0%, #191b24 100%);
  border-radius: 20px;
  padding: 32px 36px;
  margin-bottom:40px;
  box-shadow: 0 6px 24px rgba(37, 45, 53, 0.18);
}
.hm-greeting {
  font-size: 30px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
  letter-spacing: -0.3px;
}
.hm-date {
  font-size: 13px;
  color: #a8c0db;
  margin-top: 4px;
  text-transform: capitalize;
}
.hm-subtitle {
  font-size: 14px;
  color: #fff;
  margin-top: 10px;
  font-weight: 500;
}
.hm-open-agenda-btn {
  flex-shrink: 0;
  background: #d1d3f5 !important;
  border-color: #d1d3f5 !important;
  color: #030303 !important;
  font-weight: 600;
  border-radius: 10px !important;
  height: 40px !important;
  padding: 0 20px !important;
}
.hm-open-agenda-btn:hover {
  opacity: 0.88;
}

/* ── cuerpo: dos cards lado a lado ── */
.hm-body {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 60px;
  align-items: start;
}

/* ── card genérico ── */
.hm-card {
  background: #fff;
  border-radius: 18px;
  border: 1px solid #e4e8f0;
  box-shadow: 0 3px 14px rgba(15,34,58,0.07);
  overflow: hidden;
}
.hm-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f2f6;
}
.hm-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
  color: #102a43;
}
.hm-card-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.hm-card-badge {
  font-size: 12px;
  color: #7a7f87;
  background: #f3f5f8;
  padding: 2px 10px;
  border-radius: 999px;
}

/* ── hoy: lista de eventos ── */
.hm-event-list {
  display: flex;
  flex-direction: column;
}
.hm-today-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  width: 100%;
  border-bottom: 1px solid #f5f6f8;
  transition: background 0.13s;
}
.hm-today-row:last-child { border-bottom: none; }
.hm-today-row:hover { background: #f7f9fc; }
.hm-today-color {
  width: 4px;
  height: 36px;
  border-radius: 99px;
  flex-shrink: 0;
}
.hm-today-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.hm-today-title {
  font-size: 13px;
  font-weight: 600;
  color: #102a43;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hm-today-meta {
  font-size: 11px;
  color: #8a93a2;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.hm-today-arrow {
  color: #c4cad6;
  font-size: 11px;
  flex-shrink: 0;
}

/* ── vacío / cargando ── */
.hm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 36px 20px;
  color: #b0b8c6;
  font-size: 13px;
}
.hm-empty-icon {
  font-size: 28px;
  color: #d0d8e6;
}
.hm-center {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

/* ── semana: grid de días ── */
.hm-week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
  padding: 12px 16px 16px;
  gap: 8px;
}
.hm-day-col {
  display: flex;
  flex-direction: column;
  gap: 5px;
  border-radius: 12px;
  padding: 8px 6px;
  background: #f9fafc;
  border: 1px solid #edf0f5;
  min-height: 100px;
}
.hm-day-col--today {
  background: #eef4ff;
  border-color: #b8d0f5;
}
.hm-day-col--past {
  opacity: 0.5;
}
.hm-day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e8ecf2;
  margin-bottom: 2px;
}
.hm-day-name {
  font-size: 9px;
  font-weight: 700;
  color: #9aa2b1;
  letter-spacing: 0.6px;
}
.hm-day-num {
  font-size: 17px;
  font-weight: 700;
  color: #102a43;
  line-height: 1;
}
.hm-day-num--today {
  color: #fff;
  background: #05060a;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.hm-day-count {
  font-size: 10px;
  background: #2c528f;
  color: #fff;
  border-radius: 999px;
  padding: 0 5px;
  font-weight: 600;
}
.hm-day-events {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 300px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #d4dae8 transparent;
}
.hm-day-empty {
  text-align: center;
  color: #ccd3de;
  font-size: 14px;
  padding: 10px 0;
}

/* ── chip de evento en semana ── */
.hm-chip {
  background: #fff;
  border-left: 3px solid #2c528f;
  border-radius: 6px;
  padding: 4px 6px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(15,34,58,0.06);
  transition: box-shadow 0.12s, transform 0.12s;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.hm-chip:hover {
  box-shadow: 0 3px 10px rgba(15,34,58,0.13);
  transform: translateY(-1px);
}
.hm-chip-time {
  font-size: 10px;
  color: #7a7f87;
  font-weight: 500;
}
.hm-chip-title {
  font-size: 11px;
  font-weight: 600;
  color: #102a43;
  line-height: 1.3;
  word-break: break-word;
}
.hm-chip-loc {
  font-size: 10px;
  color: #9aa2b1;
  display: flex;
  align-items: center;
  gap: 2px;
}

/* ── responsive ── */
@media (max-width: 1100px) {
  .hm-week-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 860px) {
  .hm-body { grid-template-columns: 1fr; }
  .hm-week-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 600px) {
  .hm-main { padding: 16px; }
  .hm-welcome { padding: 24px 20px; }
  .hm-greeting { font-size: 22px; }
  .hm-week-grid { grid-template-columns: repeat(3, 1fr); }
}
`;
