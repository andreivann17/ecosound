// src/components/home/HomeAgendaWeekWidget.jsx
import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useDispatch, useSelector } from "react-redux";

// ✅ Reusa tu acción POST real
import { actionAgendaPost } from "../../redux/actions/agenda/agenda";

// ✅ Reusa tu board real (misma UI/solapamientos/colores)
import OutlookCalendarBoard from "../calendar/OutlookCalendarBoard";

// ✅ Importa el CSS del calendario para que se vea igual en Home
import "../calendar/css/index.css";

dayjs.locale("es");

// ===== helpers mínimos (sin meter WS, sin modales, sin CRUD) =====
const getRangeParams = (view, cursorDate) => {
  if (view === "month") {
    const from = cursorDate.startOf("month").startOf("week");
    const to = cursorDate.endOf("month").endOf("week");
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (view === "day") {
    const from = cursorDate.startOf("day");
    const to = cursorDate.endOf("day");
    return { from: from.toISOString(), to: to.toISOString() };
  }
  const from = cursorDate.startOf("week");
  const to = cursorDate.endOf("week");
  return { from: from.toISOString(), to: to.toISOString() };
};

// Ultra-robusto: acepta array directo o payloads con items/data/items
const coerceItems = (slice) => {
  if (!slice) return [];
  if (Array.isArray(slice)) return slice;

  if (Array.isArray(slice.items)) return slice.items;
  if (Array.isArray(slice.data)) return slice.data;
  if (slice.data && Array.isArray(slice.data.items)) return slice.data.items;
  if (slice.payload && Array.isArray(slice.payload.items)) return slice.payload.items;

  return [];
};

// Home = “todos” (sin filtros avanzados)
const buildAgendaPayloadHome = ({ rangeParams }) => {
  return {
    from: rangeParams?.from || null,
    to: rangeParams?.to || null,

    status: null,
    include_inactive: false,

    // sin restringir por ciudad/tipo => backend debería devolver todo lo del rango
    city_ids: [700, 2641, 703, 2633],
    include_other_cities: true,

    event_type_ids:[1, 2, 3, 4, 5, 6, 7, 8, 9],
  };
};

const mapAgendaItemToUiEvent = (it) => {
  const canceled =
    it?.status === "canceled" || it?.canceled === true || it?.is_canceled === true;

  const id = it?.id ?? it?.id_agenda ?? null;
  const start = it?.start ?? it?.start_at ?? null;
  const end = it?.end ?? it?.end_at ?? null;
  const allDay = !!(it?.allDay ?? it?.all_day);

  return {
    id,
    title: it?.title || "",
    start,
    end,
    allDay,

    calendarId: "cal_main",
    canceled,

    location: it?.location || "",
    description: it?.description || "",

    color_hex: it?.color_hex || null,
    color: it?.color_hex || null,
    id_agenda_evento: it?.id_agenda_evento ?? it?.id_evento ?? null,
    status: it?.status ?? null,
  };
};

export default function HomeAgendaWeekWidget({
  onOpenAgenda,
  onOpenAgendaWithEvent,
}) {
  const dispatch = useDispatch();

  // fijo semanal laboral (como pediste: para evitar conflictos)
  const view = "week_work";
  const [cursorDate] = useState(dayjs());

  const rangeParams = useMemo(() => getRangeParams(view, cursorDate), [view, cursorDate]);

  // trae agenda del store
  const agendaSlice = useSelector((state) => state.agenda || {});
  const agendaItems = useMemo(
    () => coerceItems(agendaSlice?.data ?? agendaSlice),
    [agendaSlice]
  );

  // carga 1 vez por rango (Home sin WS)
  useEffect(() => {
    const payload = buildAgendaPayloadHome({ rangeParams });
    dispatch(actionAgendaPost(payload));
  }, [dispatch, rangeParams?.from, rangeParams?.to]);

  const eventsUi = useMemo(() => {
    return (agendaItems || []).map(mapAgendaItemToUiEvent).filter((e) => e?.start);
  }, [agendaItems]);

  // Para Home: no editar/eliminar aquí. Solo mandar a /agenda.
  const onEditEvent = (ev) => {
    const id = ev?.id ?? ev?.id_agenda ?? null;
    if (id != null && onOpenAgendaWithEvent) {
      onOpenAgendaWithEvent(id);
      return;
    }
    onOpenAgenda?.();
  };

  // Model mínimo compatible con tu Board (week_work => workweek)
  const boardModel = useMemo(() => {
    return {
      kind: "week",
      // el Board ya calcula internamente days/slots; con tu implementación actual,
      // le pasamos anchor/view y él usa buildDaysForView por su cuenta.
      anchor: cursorDate,
      view: "workweek",
    };
  }, [cursorDate]);

  return (
    <div
      style={{
        // compactación visual dentro del Card de Home
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #dde2eb",
        background: "#fff",
      }}
      onDoubleClick={() => onOpenAgenda?.()}
      title="Doble click para abrir Agenda"
    >
      <OutlookCalendarBoard
        model={boardModel}
        cursorDate={cursorDate}
        view={view}
        events={eventsUi}
        // Home: no crear slots, no borrar, no editar aquí
        onSelectSlot={null}
        onEditEvent={onEditEvent}
        onDeleteEvent={null}
      />
    </div>
  );
}
