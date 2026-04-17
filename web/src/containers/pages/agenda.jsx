import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { Layout, message, Modal, notification } from "antd";

import { useDispatch, useSelector } from "react-redux";
import {
  actionAgendaPost, // ✅ CAMBIO: POST con payload completo
  actionAgendaCreate,
  actionAgendaUpdate,
  actionAgendaDelete,
  actionAgendaGetById,
} from "../../redux/actions/agenda/agenda";

import { actionCiudadesGet } from "../../redux/actions/ciudades/ciudades.js";
import { actionEstadosGet } from "../../redux/actions/estados/estados.js";
import OutlookRibbon from "../../components/calendar/OutlookRibbon";
import OutlookDateBar from "../../components/calendar/OutlookDateBar";
import OutlookSidebar from "../../components/calendar/OutlookSidebar";
import OutlookCalendarBoard from "../../components/calendar/OutlookCalendarBoard";
import EventModal from "../../components/calendar/EventModal";
import EventViewModal from "../../components/calendar/EventViewModal";

import {
  buildMonthMatrix,
  buildWeekDays,
  buildDayHours,
  normalizeEvent,
} from "../../components/calendar/calendarUtils";

import "../../components/calendar/css/index.css";

dayjs.locale("es");

const { Sider, Content } = Layout;
const toLocalISO = (d) => dayjs(d).format("YYYY-MM-DDTHH:mm:ss");

const getRangeParams = (view, cursorDate) => {
  if (view === "month") {
    const from = cursorDate.startOf("month").startOf("week");
    const to = cursorDate.endOf("month").endOf("week");
    return { from: toLocalISO(from), to: toLocalISO(to) };
  }

  if (view === "day") {
    const from = cursorDate.startOf("day");
    const to = cursorDate.endOf("day");
    return { from: toLocalISO(from), to: toLocalISO(to) };
  }

  const from = cursorDate.startOf("week");
  const to = cursorDate.endOf("week");
  return { from: toLocalISO(from), to: toLocalISO(to) };
};


// Ultra-robusto: acepta array directo o payloads con items/data/items
const coerceItems = (slice) => {
  if (!slice) return [];
  if (Array.isArray(slice)) return slice;

  // casos típicos redux
  if (Array.isArray(slice.items)) return slice.items;
  if (Array.isArray(slice.data)) return slice.data;
  if (slice.data && Array.isArray(slice.data.items)) return slice.data.items;

  // axios: { data: { items } }
  if (slice.payload && Array.isArray(slice.payload.items)) return slice.payload.items;

  return [];
};

// construir payload POST completo
const buildAgendaPayload = ({ rangeParams, filters }) => {
  const cityIds = Array.isArray(filters?.cityIds)
    ? filters.cityIds.map(Number)
    : [];
  const tipoContratoIds = Array.isArray(filters?.tipoContratoIds)
    ? filters.tipoContratoIds
    : [];

  return {
    from: rangeParams?.from || null,
    to: rangeParams?.to || null,
    status: null,
    include_inactive: false,
    city_ids: cityIds,
    include_other_cities: false,
    event_type_ids: [],
    contrato_tipo_ids: tipoContratoIds,
  };
};

const TIPO_CONTRATO_COLORS = {
  1: "#be123c",  // Bodas
  2: "#7c3aed",  // XV
  3: "#1d4ed8",  // Graduación
  4: "#0f766e",  // Corporativo
  5: "#ea580c",  // Cumpleaños
  6: "#6b7280",  // Otro
};

// backend -> UI event
const mapAgendaItemToUiEvent = (it) => {
  const canceled =
    it?.status === "canceled" || it?.canceled === true || it?.is_canceled === true;

  const id = it?.id ?? it?.id_agenda ?? null;
  const start = it?.start ?? it?.start_at ?? null;
  const end = it?.end ?? it?.end_at ?? null;
  const allDay = !!(it?.allDay ?? it?.all_day);

  const ciudad_id = it?.ciudad_id ?? it?.id_ciudad ?? null;
  const nombre_ciudad = it?.nombre_ciudad || "";
  const url = it?.url ?? it?.path ?? it?.link ?? null;

  const reminder = it?.reminder || "15m";
  const inPerson = !!(it?.inPerson ?? it?.in_person);

  const recurrence =
    it?.recurrence ??
    it?.recurrence_rule ??
    it?.recurrenceRule ??
    null;

  // ✅ NUEVO: documento (viene del backend en snake_case)
  const documento_url = it?.documento_url ?? null;
  const documento_filename = it?.documento_filename ?? null;

  const base = normalizeEvent({
    id,
    title: it?.title || "",
    start,
    end,
    allDay,

    calendarId: "cal_main",
    showAs: "busy",
    recurring: !!(it?.is_recurring ?? recurrence),
    canceled,

    location: it?.location || "",
    description: it?.description || "",
  });

  return {
    ...base,

    ciudad_id,
    nombre_ciudad,
    reminder,
    inPerson,
    recurrence,
    url,

    // ✅ REINYECTA documento para EventViewModal
    documento_url,
    documento_filename,

    color_hex: TIPO_CONTRATO_COLORS[it?.contrato_tipo_id] || it?.color_hex || null,
    color: TIPO_CONTRATO_COLORS[it?.contrato_tipo_id] || it?.color_hex || null,
    id_agenda_evento: it?.id_agenda_evento ?? it?.id_evento ?? null,

    is_recurring: it?.is_recurring ?? null,
  };
};

export default function OutlookCalendarPage() {
  const dispatch = useDispatch();

  const [view, setView] = useState("month");
  const [cursorDate, setCursorDate] = useState(dayjs());
  const [selectedCalendars, setSelectedCalendars] = useState({ cal_main: true });

  const lastNotifAtRef = useRef(0);
  const pendingNotifRef = useRef(null);
  const notifyAgendaUpdate = useCallback((text) => {
    const now = Date.now();
    const cooldownMs = 1500;

    
    if (now - lastNotifAtRef.current < cooldownMs) {
      if (pendingNotifRef.current) clearTimeout(pendingNotifRef.current);
      pendingNotifRef.current = setTimeout(() => {
        lastNotifAtRef.current = Date.now();
        
        pendingNotifRef.current = null;
      }, cooldownMs);
      return;
    }

    lastNotifAtRef.current = now;
    notification.info({
      message: "Agenda actualizada",
      description: text || "Se detectaron cambios en la agenda.",
      key: "agenda_update",
    });
  }, []);

  useEffect(() => {
    notification.config({
      placement: "topRight",
      maxCount: 3,
      duration: 3,
    });
  }, []);

  // ✅ CAMBIO: filtros nuevos (OutlookRibbon los inicializa a "todos")
  const [filters, setFilters] = useState({
    tipoContratoIds: null,
    cityIds: null,
  });

  const rangeParams = useMemo(() => getRangeParams(view, cursorDate), [view, cursorDate]);


  const wsRef = useRef(null);
  const rangeRef = useRef(rangeParams);

  // ✅ NUEVO: guardar el último payload para refrescos WS
  const lastPayloadRef = useRef(null);

  useEffect(() => {
    rangeRef.current = rangeParams;
  }, [rangeParams]);

  const connectWS = useCallback(() => {
    const url = "ws://localhost:8000/ws/agenda"; // en prod: wss://tu-dominio/ws/agenda
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      // opcional: handshake
      ws.send(JSON.stringify({ type: "HELLO", page: "agenda" }));
    };

    ws.onclose = () => {
      // reconexión simple
      setTimeout(() => connectWS(), 1000);
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
    };
    

    // ✅ CAMBIO: WS refresca con POST respetando filtros
    ws.onmessage = (ev) => {
      let msg = ev.data;
      try {
        msg = JSON.parse(ev.data);
      } catch {}

      if (msg?.type === "AGENDA_INVALIDATE") {
        notifyAgendaUpdate("Hubo una actualización. Refrescando vista…");

        const baseRange = rangeRef.current;
        const payload = lastPayloadRef.current
          ? { ...lastPayloadRef.current, from: baseRange.from, to: baseRange.to }
          : null;

        if (payload) dispatch(actionAgendaPost(payload));
        return;
      }

      if (msg?.type === "AGENDA_REFRESH_RANGE") {
        notifyAgendaUpdate("Se actualizó el rango actual. Refrescando…");

        const baseRange = rangeRef.current;
        const payload = lastPayloadRef.current
          ? { ...lastPayloadRef.current, from: baseRange.from, to: baseRange.to }
          : null;

        if (payload) dispatch(actionAgendaPost(payload));
        return;
      }
    };
  }, [dispatch, notifyAgendaUpdate]);

  useEffect(() => {
    connectWS();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWS]);

  // ===== AGENDA: LEE BIEN items =====
  const agendaSlice = useSelector((state) => state.agenda || {});
  const agendaItems = useMemo(
    () => coerceItems(agendaSlice?.data ?? agendaSlice),
    [agendaSlice]
  );

  // ===== CIUDADES =====
  const ciudadesSlice = useSelector((state) => state.ciudades || {});
  const ciudadesItems = useMemo(() => coerceItems(ciudadesSlice), [ciudadesSlice]);

const ciudadOptions = useMemo(() => {
  return ciudadesItems
    .map((c) => ({
      label: c?.nombre || c?.code || `Ciudad ${c?.id}`,
      value: c?.id,
      id_estado: c?.id_estado, // 🔥 CLAVE PARA FILTRAR
    }))
    .filter((o) => o.label && o.value != null && o.id_estado != null);
}, [ciudadesItems]);

const estadosSlice = useSelector((state) => state.estados || {});
  const estadosItems = useMemo(() => coerceItems(estadosSlice), [estadosSlice]);

  const estadoOptions = useMemo(() => {
    return estadosItems.map((c) => ({
      label: c.nombre || c.code || `estado ${c.id}`,
      value: c.id,
    }));
  }, [estadosItems]);
  const agendaById = useMemo(() => {
    const m = new Map();
    (agendaItems || []).forEach((it) => {
      const id = it.id ?? it.id_agenda;
      if (id != null) m.set(id, it);
    });
    return m;
  }, [agendaItems]);

  const [draft, setDraft] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // ===== NUEVO: modal de VISTA (click) =====
  const [viewOpen, setViewOpen] = useState(false);
  const [viewEvent, setViewEvent] = useState(null);


 

  useEffect(() => {
    dispatch(actionCiudadesGet({}));
    dispatch(actionEstadosGet({}));
  }, [dispatch]);

  const eventsUi = useMemo(() => {
    return (agendaItems || []).map(mapAgendaItemToUiEvent);
  }, [agendaItems]);

  const withinRange = (ev, fromISO, toISO) => {
    const from = dayjs(fromISO);
    const to = dayjs(toISO);
    const start = dayjs(ev.start);
    const end = dayjs(ev.end || ev.start);

    return start.isBefore(to) && end.isAfter(from);
  };

  const eventsUiInRange = useMemo(() => {
    return (eventsUi || []).filter((ev) =>
      withinRange(ev, rangeParams.from, rangeParams.to)
    );
  }, [eventsUi, rangeParams]);

  const visibleEvents = useMemo(() => {
    const enabledIds = Object.keys(selectedCalendars).filter(
      (k) => selectedCalendars[k]
    );

    return eventsUiInRange.filter((e) =>
      enabledIds.includes(e.calendarId)
    );
  }, [eventsUiInRange, selectedCalendars]);

  const rangeLabel = useMemo(() => {
    if (view === "month") return cursorDate.format("MMMM YYYY");
    if (view === "day") return cursorDate.format("D MMMM, YYYY");

    const weekDays = buildWeekDays(cursorDate, view === "week_work");
    const start = weekDays[0];
    const end = weekDays[weekDays.length - 1];
    return `${start.format("DD")}–${end.format("DD")} de ${start.format(
      "MMMM"
    )} de ${start.format("YYYY")}`;
  }, [cursorDate, view]);

  const onToday = () => setCursorDate(dayjs());

  const onPrev = () => {
    if (view === "day") setCursorDate((d) => d.subtract(1, "day"));
    else if (view === "month") setCursorDate((d) => d.subtract(1, "month"));
    else setCursorDate((d) => d.subtract(1, "week"));
  };

  const onNext = () => {
    if (view === "day") setCursorDate((d) => d.add(1, "day"));
    else if (view === "month") setCursorDate((d) => d.add(1, "month"));
    else setCursorDate((d) => d.add(1, "week"));
  };

  const onPickMonthYear = (monthDayjs) => {
    const currentDay = cursorDate.date();
    const target = monthDayjs.date(1);
    const daysInTarget = target.daysInMonth();
    const safeDay = Math.min(currentDay, daysInTarget);
    setCursorDate(target.date(safeDay));
  };

  const openNewEvent = (base) => {
    setDraft({
      id: null,
      title: "",
      start: base?.start || cursorDate.hour(8).minute(0).second(0).toISOString(),
      end: base?.end || cursorDate.hour(8).minute(30).second(0).toISOString(),
      allDay: false,

      ciudad_id: null,
      location: "",

      calendarId: "cal_main",
      showAs: "busy",
      recurring: false,
      canceled: false,
      description: "",
      reminder: "15m",
      inPerson: false,

      id_agenda_evento: null,
      source_table: null,
      source_id: null,

      recurrence: null,
    });

    setModalOpen(true);
  };

  const onSelectSlot = ({ start, end }) => openNewEvent({ start, end });

const onSaveEvent = async (payload, files = []) => {
  try {
    if (!payload) throw new Error("payload vacío");

    const isUpdate = !!draft?.id;

    const filesMap =
      Array.isArray(files) && files.length
        ? { documento: files[0] } // 👈 igual que desvinculaciones: filesMap.documento
        : null;

    if (isUpdate) {
      await dispatch(actionAgendaUpdate(draft.id, payload, rangeParams, () => {}, filesMap));
    } else {
      await dispatch(actionAgendaCreate(payload, rangeParams, () => {}, filesMap));
    }

    setModalOpen(false);
    setDraft(null);

    notification.info({
      message: "Evento guardado",
      description: "",
      key: "agenda_creado",
    });
  } catch (e) {
    const msg =
      e?.response?.data?.detail || e?.message || "No se pudo guardar el evento";
    message.error(msg);
  }
};

  // ===== CLICK = VISTA =====
  const onViewEvent = (ev) => {
      console.log("VIEW EVENT =>", ev); // debe traer documento_url

    setViewEvent(ev);
    setViewOpen(true);
  };

  // ===== DOBLE CLICK / EDITAR =====
  const onEditEvent = async (ev) => {
    const id = ev?.id ?? ev?.id_agenda;
    const full = await dispatch(actionAgendaGetById(id)); // que retorne el objeto completo
    setDraft(full);
    setModalOpen(true);
  };

  const onDeleteEvent = async (data) => {
    try {
      await dispatch(actionAgendaDelete(data.id, rangeParams));
      notification.info({
      message: "Evento eliminado",
      description:  "",
      key: "agenda_elimnado",
    });
    } catch (e) {
      const msg =
        e?.response?.data?.detail || e?.message || "No se pudo eliminar el evento";
        notification.info({
      message: msg,
      description:  "",
      key: "agenda_no_elimnado",
    });

    }
  };

  const onSave = async (payload, files) => {
  await onSaveEvent(payload, files);
};

  const boardModel = useMemo(() => {
    if (view === "month") return { kind: "month", matrix: buildMonthMatrix(cursorDate) };
    if (view === "day") {
      return { kind: "day", day: cursorDate.startOf("day"), hours: buildDayHours() };
    }
    return {
      kind: "week",
      days: buildWeekDays(cursorDate, view === "week_work"),
      hours: buildDayHours(),
      workWeek: view === "week_work",
    };
  }, [cursorDate, view]);
  useEffect(() => {
  if (!Array.isArray(filters?.tipoContratoIds)) return;
  if (!Array.isArray(filters?.cityIds)) return;
  const payload = buildAgendaPayload({ rangeParams, filters });
  lastPayloadRef.current = payload;
  dispatch(actionAgendaPost(payload));
}, [dispatch, rangeParams, filters]);



  return (
    <Layout className="ol-root">
      <div className="ol-ribbonWrap">
        <OutlookRibbon
          view={view}
          setView={setView}
          filters={filters}
          setFilters={setFilters}
          onCreateEvent={() => openNewEvent()}
        />
      </div>

      <Layout className="ol-shell">
        <Sider width={280} className="ol-sider" theme="light">
         <OutlookSidebar
  cursorDate={cursorDate}
  onPickDate={setCursorDate}
  calendars={[{ id: "cal_main", name: "Calendario", color: "#2b78d6" }]}
  selectedCalendars={selectedCalendars}
  onToggleCalendar={(id, val) =>
    setSelectedCalendars((p) => ({ ...p, [id]: val }))
  }
  filters={filters}
  setFilters={setFilters}
/>

        </Sider>

        <Layout className="ol-main">
          <div className="ol-datebarWrap">
            <OutlookDateBar
              view={view}
              rangeLabel={rangeLabel}
              cursorDate={cursorDate}
              onPickMonthYear={onPickMonthYear}
              onToday={onToday}
              onPrev={onPrev}
              onNext={onNext}
            />
          </div>

          <Content className="ol-content">
            <OutlookCalendarBoard
              model={{
                ...boardModel,
                anchor: cursorDate,
                view: view === "week_work" ? "workweek" : view,
              }}
              cursorDate={cursorDate}
              view={view}
              events={visibleEvents}
              onSelectSlot={onSelectSlot}
              onViewEvent={onViewEvent}
              onEditEvent={onEditEvent}
              onDeleteEvent={onDeleteEvent}
            />
          </Content>
        </Layout>
      </Layout>

      <EventModal
        open={modalOpen}
        draft={draft}
        ciudadOptions={ciudadOptions}
        estadoOptions={estadoOptions}
        events={visibleEvents}
        onCancel={() => {
          setModalOpen(false);
          setDraft(null);
        }}
        onSave={onSave}
      />

      <EventViewModal
        open={viewOpen}
        event={viewEvent}
        onClose={() => {
          setViewOpen(false);
          setViewEvent(null);
        }}
        onEdit={(ev) => {
          setViewOpen(false);
          setViewEvent(null);
          onEditEvent(ev);
        }}
        onDelete={(ev) => {
          Modal.confirm({
            title: "Eliminar evento",
            content: `Se eliminará: "${ev?.title || ""}"`,
            okText: "Eliminar",
            okButtonProps: { danger: true },
            cancelText: "Cancelar",
            onOk: async () => {
              setViewOpen(false);
              setViewEvent(null);
              await onDeleteEvent(ev.id);
            },
          });
        }}
      />
    </Layout>
  );
}
