import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { Layout, Modal, notification } from "antd";

import { useDispatch, useSelector } from "react-redux";
import {
  actionAgendaPost,
  actionAgendaCreate,
  actionAgendaUpdate,
  actionAgendaDelete,
  actionAgendaGetById,
  actionAgendaGetBySource,
} from "../../redux/actions/agenda/agenda";
import { actionSesionesFotosGet } from "../../redux/actions/sesiones_fotos/sesiones_fotos";

import { actionCiudadesGet } from "../../redux/actions/ciudades/ciudades.js";
import { actionEstadosGet } from "../../redux/actions/estados/estados.js";
import OutlookRibbon from "../../components/calendar/OutlookRibbon";
import OutlookCalendarBoard from "../../components/calendar/OutlookCalendarBoard";
import EventModal from "../../components/calendar/EventModal";
import EventViewModal from "../../components/calendar/EventViewModal";
import PrintModal from "../../components/calendar/PrintModal";
import AgendaSearchModal from "../../components/calendar/AgendaSearchModal";

import {
  buildMonthMatrix,
  buildWeekDays,
  buildDayHours,
  normalizeEvent,
} from "../../components/calendar/calendarUtils";

import "../../components/calendar/css/index.css";

dayjs.locale("es");

const { Content } = Layout;
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

const coerceItems = (slice) => {
  if (!slice) return [];
  if (Array.isArray(slice)) return slice;
  if (Array.isArray(slice.items)) return slice.items;
  if (Array.isArray(slice.data)) return slice.data;
  if (slice.data && Array.isArray(slice.data.items)) return slice.data.items;
  if (slice.payload && Array.isArray(slice.payload.items)) return slice.payload.items;
  return [];
};

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
  1:  "#be123c",  // Bodas
  2:  "#7c3aed",  // XV
  3:  "#1d4ed8",  // Graduación
  4:  "#0f766e",  // Corporativo
  5:  "#ea580c",  // Cumpleaños
  6:  "#0891b2",  // Citas
  7:  "#4f46e5",  // Reunion Zoom
  8:  "#d97706",  // Pendiente
  10: "#c026d3",  // Fotografía
};

const SESION_COLOR = "#e91e8c";

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

  const source_table = it?.source_table || "";
  const source = source_table === "sesiones_fotos" ? "sesiones_fotos" : source_table;

  const tipo_id = it?.contrato_tipo_id ?? it?.id_agenda_evento ?? null;

  return {
    ...base,
    ciudad_id,
    nombre_ciudad,
    reminder,
    inPerson,
    recurrence,
    url,
    documento_url,
    documento_filename,
    contrato_tipo_id: tipo_id,
    source_table,
    source,
    color_hex: source_table === "sesiones_fotos"
      ? SESION_COLOR
      : (TIPO_CONTRATO_COLORS[tipo_id] || it?.color_hex || null),
    color: source_table === "sesiones_fotos"
      ? SESION_COLOR
      : (TIPO_CONTRATO_COLORS[tipo_id] || it?.color_hex || null),
    id_agenda_evento: it?.id_agenda_evento ?? it?.id_evento ?? null,
    is_recurring: it?.is_recurring ?? null,
  };
};

export default function OutlookCalendarPage() {
  const dispatch = useDispatch();

  const [view, setView] = useState("month");
  const [cursorDate, setCursorDate] = useState(dayjs());

  const lastNotifAtRef = useRef(0);
  const pendingNotifRef = useRef(null);
  const notifyAgendaUpdate = useCallback((text) => {
    const now = Date.now();
    const cooldownMs = 1500;

    if (now - lastNotifAtRef.current < cooldownMs) {
      if (pendingNotifRef.current) clearTimeout(pendingNotifRef.current);
      pendingNotifRef.current = setTimeout(() => {
        lastNotifAtRef.current = Date.now();
        notification.info({
          message: "Agenda actualizada",
          description: text || "Se detectaron cambios en la agenda.",
          key: "agenda_update",
        });
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

  const [filters, setFilters] = useState({
    tipoContratoIds: [],
    cityIds: [],
    showSesiones: true,
  });

  const rangeParams = useMemo(() => getRangeParams(view, cursorDate), [view, cursorDate]);

  const wsRef = useRef(null);
  const rangeRef = useRef(rangeParams);
  const lastPayloadRef = useRef(null);

  useEffect(() => {
    rangeRef.current = rangeParams;
  }, [rangeParams]);

  const connectWS = useCallback(() => {
    const url = "ws://localhost:8000/ws/agenda";
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "HELLO", page: "agenda" }));
    };

    ws.onclose = () => {
      setTimeout(() => connectWS(), 1000);
    };

    ws.onerror = () => {
      try { ws.close(); } catch {}
    };

    ws.onmessage = (ev) => {
      let msg = ev.data;
      try { msg = JSON.parse(ev.data); } catch {}

      if (msg?.type === "AGENDA_INVALIDATE" || msg?.type === "AGENDA_REFRESH_RANGE") {
        notifyAgendaUpdate("Hubo una actualización. Refrescando vista…");
        const baseRange = rangeRef.current;
        const payload = lastPayloadRef.current
          ? { ...lastPayloadRef.current, from: baseRange.from, to: baseRange.to }
          : null;
        if (payload) dispatch(actionAgendaPost(payload));
      }
    };
  }, [dispatch, notifyAgendaUpdate]);

  useEffect(() => {
    connectWS();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWS]);

  // ===== AGENDA =====
  const agendaSlice = useSelector((state) => state.agenda || {});
  const agendaItems = useMemo(
    () => coerceItems(agendaSlice?.data ?? agendaSlice),
    [agendaSlice]
  );

  // ===== SESIONES DE FOTOS =====
  const sesionesItems = useSelector((state) => state.sesiones_fotos?.items || []);

  // ===== CIUDADES =====
  const ciudadesSlice = useSelector((state) => state.ciudades || {});
  const ciudadesItems = useMemo(() => coerceItems(ciudadesSlice), [ciudadesSlice]);

  const ciudadOptions = useMemo(() => {
    return ciudadesItems
      .map((c) => ({
        label: c?.nombre || `Ciudad ${c?.id_ciudad}`,
        value: c?.id_ciudad,
        id_estado: c?.id_estado ?? null,
      }))
      .filter((o) => o.label && o.value != null);
  }, [ciudadesItems]);

  const estadosSlice = useSelector((state) => state.estados || {});
  const estadosItems = useMemo(() => coerceItems(estadosSlice), [estadosSlice]);

  const estadoOptions = useMemo(() => {
    return estadosItems.map((c) => ({
      label: c.nombre || c.code || `estado ${c.id}`,
      value: c.id,
    }));
  }, [estadosItems]);

  const [draft, setDraft] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewEvent, setViewEvent] = useState(null);

  useEffect(() => {
    dispatch(actionCiudadesGet({}));
    dispatch(actionEstadosGet({}));
  }, [dispatch]);

  const eventsUi = useMemo(() => {
    const agendaEvents = (agendaItems || []).map(mapAgendaItemToUiEvent);

    const sesionEvents = (sesionesItems || []).map((s) => {
      const start = s.fecha_sesion;
      const end = dayjs(s.fecha_sesion).add(1, "hour").toISOString();
      const base = normalizeEvent({
        id: `sesion_${s.id_sesion}`,
        title: s.nombre_cliente || "Sesión de fotos",
        start,
        end,
        allDay: false,
        calendarId: "cal_main",
        showAs: "busy",
        recurring: false,
        canceled: false,
        location: s.lugar || "",
        description: s.comentarios || "",
      });
      return {
        ...base,
        color: SESION_COLOR,
        color_hex: SESION_COLOR,
        source: "sesiones_fotos",
        source_id: s.id_sesion,
      };
    });

    return [...agendaEvents, ...sesionEvents];
  }, [agendaItems, sesionesItems]);

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
    return eventsUiInRange.filter((e) => {
      if (e.color_hex === SESION_COLOR && !filters.showSesiones) return false;
      return true;
    });
  }, [eventsUiInRange, filters.showSesiones]);

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
          ? { documento: files[0] }
          : null;

      if (isUpdate) {
        await dispatch(actionAgendaUpdate(draft.id, payload, {}, () => {}, filesMap));
      } else {
        await dispatch(actionAgendaCreate(payload, {}, () => {}, filesMap));
      }

      // Refresca con los filtros activos (ciudad, tipo contrato, rango)
      const refreshPayload = lastPayloadRef.current ?? buildAgendaPayload({ rangeParams, filters });
      dispatch(actionAgendaPost(refreshPayload));

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
      notification.error({ message: msg });
    }
  };

  const onViewEvent = (ev) => {
    setViewEvent(ev);
    setViewOpen(true);
  };

  const onEditEvent = async (ev) => {
    if (ev?.source === "sesiones_fotos") {
      const sesionId = ev?.source_id ?? ev?.id_sesion;
      // Buscar si ya existe un evento de agenda para esta sesión
      try {
        const existing = await dispatch(actionAgendaGetBySource("sesiones_fotos", sesionId));
        const existingId = existing?.id ?? existing?.id_agenda;
        if (existingId) {
          // Ya existe → editarlo directamente
          const full = await dispatch(actionAgendaGetById(existingId));
          setDraft({ ...full, id: full?.id ?? full?.id_agenda ?? existingId });
          setModalOpen(true);
          return;
        }
      } catch {}
      // No existe → abrir modal para crear uno nuevo, vinculado a la sesión
      setDraft({
        id: null,
        title: ev?.title || "",
        start: ev?.start || null,
        end: ev?.end || null,
        allDay: ev?.allDay ?? false,
        ciudad_id: ev?.ciudad_id ?? null,
        location: ev?.location || "",
        description: ev?.description || "",
        calendarId: "cal_main",
        showAs: "busy",
        recurring: false,
        canceled: false,
        reminder: "15m",
        inPerson: false,
        id_agenda_evento: null,
        source_table: "sesiones_fotos",
        source_id: sesionId,
        recurrence: null,
      });
      setModalOpen(true);
      return;
    }
    const id = ev?.id ?? ev?.id_agenda;
    const full = await dispatch(actionAgendaGetById(id));
    setDraft({ ...full, id: full?.id ?? full?.id_agenda ?? id });
    setModalOpen(true);
  };

  const onDeleteEvent = async (data) => {
    try {
      await dispatch(actionAgendaDelete(data.id, {}));
      const refreshPayload = lastPayloadRef.current ?? buildAgendaPayload({ rangeParams, filters });
      dispatch(actionAgendaPost(refreshPayload));
      notification.info({
        message: "Evento eliminado",
        description: "",
        key: "agenda_eliminado",
      });
    } catch (e) {
      const msg =
        e?.response?.data?.detail || e?.message || "No se pudo eliminar el evento";
      notification.info({
        message: msg,
        description: "",
        key: "agenda_no_eliminado",
      });
    }
  };

  const onSave = async (payload, files) => {
    await onSaveEvent(payload, files);
  };

  const onSelectSearchEvent = (rawItem) => {
    const rawStart = rawItem?.start_at || rawItem?.start || null;
    const startDate = rawStart ? dayjs(rawStart) : null;
    if (startDate && startDate.isValid()) {
      setCursorDate(startDate);
    }
    setSearchOpen(false);
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
    dispatch(actionSesionesFotosGet({ from: rangeParams.from, to: rangeParams.to }));
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
          onOpenPrint={() => setPrintOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />
      </div>

      <Layout className="ol-shell">
        <Layout className="ol-main">
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
              onEditEvent={onEditEvent}
              onDeleteEvent={onDeleteEvent}
              onPrev={onPrev}
              onNext={onNext}
              onPickDate={setCursorDate}
              filters={filters}
              setFilters={setFilters}
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

      <PrintModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        view={view}
        cursorDate={cursorDate}
        events={visibleEvents}
      />

      <AgendaSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectEvent={onSelectSearchEvent}
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
              await onDeleteEvent(ev);
            },
          });
        }}
      />
    </Layout>
  );
}
