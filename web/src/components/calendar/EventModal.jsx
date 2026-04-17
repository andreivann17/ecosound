import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import dayjs from "dayjs";
import {
  Modal,
  Input,
  DatePicker,
  TimePicker,
  Select,
  Switch,
  Button,
  Typography,
  notification,
  Upload
} from "antd";
import { CalendarOutlined, CloseOutlined } from "@ant-design/icons";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import RecurrenceModal from "./RecurrenceModal";
import { buildRecurrenceTextES, normalizeAllDayRange } from "./recurrenceUtils";

const { Text } = Typography;

const pxPerHour = 44;
const snapMinutes = 15;
const { Dragger } = Upload;

const allowedTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

// === Helpers de fecha/hora (UI y payload en LOCAL naive) ===
const toDayjs = (val) => (val ? dayjs(val) : dayjs());

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const minutesToTop = (mins) => (mins / 60) * pxPerHour;
const topToMinutes = (top) => Math.round((top / pxPerHour) * 60);
const fmtHM = (d) => dayjs(d).format("H:mm");

const mergeDateAndTime = (dateD, timeD) => {
  const d = dateD.startOf("day");
  return d.hour(timeD.hour()).minute(timeD.minute()).second(0).millisecond(0);
};

// ISO local con offset (solo para estado interno/UI si lo necesitas)
const asLocalIso = (d) => dayjs(d).second(0).millisecond(0).format();

// *** CLAVE: formato LOCAL NAIVE para backend (sin Z, sin offset) ***
const asLocalNaive = (d) =>
  dayjs(d).second(0).millisecond(0).format("YYYY-MM-DDTHH:mm:ss");

/**
 * Normaliza "draft" (puede venir con start/end o start_at/end_at).
 * La UI trabaja con local.start / local.end / local.allDay / local.inPerson.
 */
const minutesToReminder = (m) => {
  const n = Number(m);
  if (!Number.isFinite(n) || n <= 0) return "none";
  if (n === 5) return "5m";
  if (n === 15) return "15m";
  if (n === 30) return "30m";
  if (n === 60) return "1h";
  // fallback razonable
  if (n < 60) return `${n}m`;
  return "1h";
};

const isTrueAllDayRange = (startISO, endISO) => {
  if (!startISO || !endISO) return false;
  const s = dayjs(startISO);
  const e = dayjs(endISO);

  // "Todo el día" en tu app: 00:00 → 23:00 (mismo día)
  const isWorkAllDay =
    s.isValid() &&
    e.isValid() &&
    s.format("YYYY-MM-DD") === e.format("YYYY-MM-DD") &&
    s.hour() === 0 &&
    s.minute() === 0 &&
    e.hour() === 23 &&
    e.minute() === 0;

  // compatibilidad con eventos viejos (00:00 → 00:00 del día siguiente)
  const isMidnightAllDay =
    s.isValid() &&
    e.isValid() &&
    s.hour() === 0 &&
    s.minute() === 0 &&
    e.hour() === 0 &&
    e.minute() === 0 &&
    e.diff(s, "hour") >= 24;

  return isWorkAllDay || isMidnightAllDay;
};

const normalizeDraftForUI = (draft) => {
  if (!draft) return null;

  const startISO = draft.start || draft.start_at || draft.startAt || null;
  const endISO = draft.end || draft.end_at || draft.endAt || null;

  const baseStart = startISO ? dayjs(startISO) : dayjs();
  const baseEnd = endISO ? dayjs(endISO) : baseStart.add(30, "minute");

  // allDay viene sucio en tus logs: lo corregimos por rango real
  const rawAllDay =
    draft.allDay !== undefined
      ? !!draft.allDay
      : draft.all_day !== undefined
      ? !!draft.all_day
      : false;

  const fixedAllDay = rawAllDay ? isTrueAllDayRange(startISO, endISO) : false;

  // ciudad consistente
  const ciudadId = draft.ciudad_id ?? draft.id_ciudad ?? draft.idCiudad ?? null;

  // estado consistente (opcional, solo para filtrado)
  const estadoId = draft.estado_id ?? draft.id_estado ?? draft.idEstado ?? null;

  // recurrence consistente
  const recurrence =
    draft.recurrence ??
    draft.recurrence_rule ??
    draft.recurrenceRule ??
    null;

  // reminder consistente: soporta remindMinutes
  const reminder =
    draft.reminder ??
    (draft.remindMinutes !== undefined
      ? minutesToReminder(draft.remindMinutes)
      : null) ??
    "15m";

  // inPerson consistente
  const inPersonBool =
    draft.inPerson !== undefined
      ? !!draft.inPerson
      : draft.in_person !== undefined
      ? !!draft.in_person
      : false;

  return {
    ...draft,
    estado_id: estadoId,
    ciudad_id: ciudadId,
    inPerson: inPersonBool,
    reminder,
    recurrence,

    start: asLocalIso(baseStart),
    end: asLocalIso(baseEnd),
    allDay: fixedAllDay,
  };
};

/**
 * Normaliza events (pueden venir con start/end o start_at/end_at).
 * El mini-preview usa ev.start / ev.end / ev.allDay.
 */
const normalizeEventForPreview = (ev) => {
  const startISO = ev.start || ev.start_at || ev.startAt;
  const endISO = ev.end || ev.end_at || ev.endAt;

  const allDayBool =
    ev.allDay !== undefined
      ? !!ev.allDay
      : ev.all_day !== undefined
      ? !!ev.all_day
      : false;

  return {
    ...ev,
    start: startISO,
    end: endISO,
    allDay: allDayBool,
  };
};

export default function EventModal({
  open,
  draft,
  ciudadOptions = [],
  estadoOptions = [],
  events = [],
  onCancel,
  onSave,
}) {
  const [local, setLocal] = useState(null);
  const [rightEditDate, setRightEditDate] = useState(false);
  const [openRepeat, setOpenRepeat] = useState(false);

const onAttachChange = (info) => {
  const next = (info?.fileList || [])
    .slice(0, 1) // 1 archivo máximo (ajusta si quieres más)
    .filter((f) => {
      const raw = f?.originFileObj;
      if (!raw) return false;
      // si el navegador no trae type, lo dejamos pasar
      if (!raw.type) return true;
      return allowedTypes.has(raw.type);
    });

  setLocal((p) => ({ ...p, attachments: next }));
};

const attachProps = {
  multiple: false,
  maxCount: 1,
  fileList: local?.attachments || [],
  beforeUpload: () => false, // evita upload automático; se sube con Guardar
  onChange: onAttachChange,
  onRemove: () => {
    setLocal((p) => ({ ...p, attachments: [] }));
  },
};
  const gridRef = useRef(null);
  const dragRef = useRef({
    dragging: false,
    startY: 0,
    startTop: 0,
    durationMin: 30,
  });
  const [dragging, setDragging] = useState(false);

  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    setLocal(normalizeDraftForUI(draft));
    setRightEditDate(false);
    setOpenRepeat(false);
    setSubmitAttempted(false);
  }, [draft, open]);

  // ===== Maps/helpers para estados/ciudades (filtrado sin alterar ciudad normal)
  const ciudadById = useMemo(() => {
    const m = new Map();
    (ciudadOptions || []).forEach((c) => {
      if (c?.value != null) m.set(c.value, c);
    });
    return m;
  }, [ciudadOptions]);

  const estadoLabelById = useMemo(() => {
    const m = new Map((estadoOptions || []).map((o) => [o.value, o.label]));
    return (id) => (m.has(id) ? m.get(id) : "");
  }, [estadoOptions]);

  const ciudadLabelById = useMemo(() => {
    const m = new Map((ciudadOptions || []).map((o) => [o.value, o.label]));
    return (id) => (m.has(id) ? m.get(id) : "");
  }, [ciudadOptions]);

  const filteredCiudadOptions = useMemo(() => {
    if (!local?.estado_id) return ciudadOptions || [];
    return (ciudadOptions || []).filter((c) => c?.id_estado === local.estado_id);
  }, [ciudadOptions, local?.estado_id]);

  // ✅ Default: seleccionar primera ciudad si no hay ciudad en el draft
  // (si hay estado_id, respeta filtrado; si no, igual que antes)
  useEffect(() => {
    if (!open) return;
    if (!local) return;
    if (local.ciudad_id) return;
    if (!ciudadOptions || ciudadOptions.length === 0) return;

    const pool = local.estado_id ? filteredCiudadOptions : ciudadOptions;
    if (!pool || pool.length === 0) return;

    const first = pool[0];
    if (!first?.value) return;

    setLocal((p) => ({
      ...p,
      ciudad_id: first.value,
      estado_id: p.estado_id ?? first.id_estado ?? null,
      location: (first.label || p.location) ?? null,
    }));
  }, [open, local, ciudadOptions, filteredCiudadOptions]);

  const startD = useMemo(() => toDayjs(local?.start), [local?.start]);
  const endD = useMemo(() => toDayjs(local?.end), [local?.end]);
  const dateD = useMemo(() => startD.startOf("day"), [startD]);

  const onChangeDate = (newDate) => {
    if (!local || !newDate) return;

    if (local.allDay) {
      const { start, end } = normalizeAllDayRange(newDate); // ya viene en local naive
      setLocal((p) => ({ ...p, start, end }));
      return;
    }

    const base = newDate.startOf("day");
    const curStart = dayjs(local.start);
    const curEnd = dayjs(local.end);

    const newStart = base
      .hour(curStart.hour())
      .minute(curStart.minute())
      .second(0)
      .millisecond(0);
    const newEnd = base
      .hour(curEnd.hour())
      .minute(curEnd.minute())
      .second(0)
      .millisecond(0);

    setLocal((p) => ({
      ...p,
      start: asLocalIso(newStart),
      end: asLocalIso(newEnd),
    }));
  };

  const onChangeStartTime = (t) => {
    if (!local || !t) return;
    if (local.allDay) return;

    const curEnd = dayjs(local.end);
    const newStart = mergeDateAndTime(dateD, t);

    let newEnd = curEnd;
    if (curEnd.isBefore(newStart)) newEnd = newStart.add(30, "minute");

    setLocal((p) => ({
      ...p,
      start: asLocalIso(newStart),
      end: asLocalIso(newEnd),
    }));
  };

  const onChangeEndTime = (t) => {
    if (!local || !t) return;
    if (local.allDay) return;

    const newEnd = mergeDateAndTime(dateD, t);

    const curStart = dayjs(local.start);
    const safeEnd = newEnd.isAfter(curStart) ? newEnd : curStart.add(15, "minute");

    setLocal((p) => ({ ...p, end: asLocalIso(safeEnd) }));
  };

  // ===== Estado (solo filtrado)
  const onPickEstado = (id) => {
    if (!local) return;

    setLocal((p) => {
      const next = { ...p, estado_id: id ?? null };

      // si ya hay ciudad elegida y no pertenece al estado, la limpiamos
      if (next.ciudad_id) {
        const c = ciudadById.get(next.ciudad_id);
        if (id && c?.id_estado != null && c.id_estado !== id) {
          next.ciudad_id = null;
        }
      }

      // (opcional) no tocamos location aquí; location lo gobierna ciudad
      return next;
    });
  };

  // ===== Ciudad normal (como siempre), pero además sincroniza estado_id si existe id_estado
  const onPickCiudad = (id) => {
    if (!local) return;
    const label = ciudadLabelById(id);
    const c = ciudadById.get(id);
    setLocal((p) => ({
      ...p,
      ciudad_id: id,
      estado_id: p.estado_id ?? c?.id_estado ?? null,
      location: label || p.location,
    }));
  };

  const toggleAllDay = (v) => {
    if (!local) return;

    if (v) {
      const { start, end } = normalizeAllDayRange(dateD); // local naive
      setLocal((p) => ({
        ...p,
        allDay: true,
        start,
        end,
      }));
    } else {
      const base = dateD.startOf("day").add(9, "hour").second(0).millisecond(0);
      setLocal((p) => ({
        ...p,
        allDay: false,
        start: asLocalIso(base),
        end: asLocalIso(base.add(30, "minute")),
      }));
    }
  };

  const handleOk = () => {
    if (!local) return;

    setSubmitAttempted(true);

    const titleTrim = (local.title || "").trim();
    const ciudadOk = !!local.ciudad_id;

    // ✅ Validaciones: título y ubicación obligatorios
    if (!titleTrim) {
      notification.error({
        message: "Es obligatorio capturar el título.",
        placement: "bottomRight",
      });
      return;
    }
    if (!ciudadOk) {
      notification.error({
        message: "Es obligatorio seleccionar la ciudad (ubicación).",
        placement: "bottomRight",
      });
      return;
    }

    const payload = {
      // *** CLAVE: mandar LOCAL NAIVE para que 08:00 se guarde 08:00 ***
      start_at: asLocalNaive(local.start),
      end_at: asLocalNaive(local.end),
      title: titleTrim,
      all_day: local.allDay ? 1 : 0,
      status: "active",
      location: local.location || null,
      description: local.description || null,
      ciudad_id: local.ciudad_id || null,
      reminder: local.reminder || "15m",
      in_person: local.inPerson ? 1 : 0,
      recurrence: local.recurrence || null,
    };

    const files = (local.attachments || [])
  .map((f) => f?.originFileObj)
  .filter(Boolean);

onSave(payload, files);
  };

  const startTimeVal = useMemo(
    () => (local?.start ? dayjs(local.start) : null),
    [local?.start]
  );
  const endTimeVal = useMemo(
    () => (local?.end ? dayjs(local.end) : null),
    [local?.end]
  );

  const dayKey = useMemo(() => dateD.format("YYYY-MM-DD"), [dateD]);

  const normalizedEvents = useMemo(
    () => (events || []).map(normalizeEventForPreview),
    [events]
  );

  const dayEvents = useMemo(() => {
    const list = normalizedEvents.filter(
      (e) => e.start && dayjs(e.start).format("YYYY-MM-DD") === dayKey
    );

    const localId = local?.id ?? local?.id_agenda_evento ?? null;
    const filtered = localId
      ? list.filter((e) => (e.id ?? e.id_agenda_evento) !== localId)
      : list;

    filtered.sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf());
    return filtered;
  }, [normalizedEvents, dayKey, local?.id, local?.id_agenda_evento]);

  const localBlock = useMemo(() => {
    if (!local || local.allDay) return null;

    const s = dayjs(local.start);
    const e = dayjs(local.end);

    const startMin = s.hour() * 60 + s.minute();
    const endMin = e.hour() * 60 + e.minute();
    const durationMin = Math.max(15, endMin - startMin);

    const top = minutesToTop(startMin);
    const height = Math.max(18, minutesToTop(durationMin));

    return { top, height, startMin, durationMin };
  }, [local]);

  const localAllDay = useMemo(() => (local?.allDay ? local : null), [local]);

  const onMouseMove = useCallback(
    (e) => {
      if (!dragRef.current.dragging || !gridRef.current || !local) return;

      const dy = e.clientY - dragRef.current.startY;
      const nextTopRaw = dragRef.current.startTop + dy;

      const maxTop = minutesToTop(24 * 60 - dragRef.current.durationMin);
      const nextTop = clamp(nextTopRaw, 0, maxTop);

      const mins = topToMinutes(nextTop);
      const snapped = Math.round(mins / snapMinutes) * snapMinutes;

      const newStart = dateD
        .startOf("day")
        .add(snapped, "minute")
        .second(0)
        .millisecond(0);
      const newEnd = newStart.add(dragRef.current.durationMin, "minute");

      setLocal((p) => ({
        ...p,
        start: asLocalIso(newStart),
        end: asLocalIso(newEnd),
      }));
    },
    [dateD, local]
  );

  const onMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
    setDragging(false);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }, [onMouseMove]);

  const onMouseDownLocal = (ev) => {
    if (!local || !localBlock) return;
    const grid = gridRef.current;
    if (!grid) return;

    ev.preventDefault();
    ev.stopPropagation();

    dragRef.current.dragging = true;
    dragRef.current.startY = ev.clientY;
    dragRef.current.startTop = localBlock.top;
    dragRef.current.durationMin = localBlock.durationMin;
    setDragging(true);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const renderSmallEvent = (ev) => {
    const s = dayjs(ev.start);
    const e = dayjs(ev.end);

    if (ev.allDay) {
      return (
        <div
          key={ev.id ?? ev.id_agenda_evento}
          className="ol-miniAllDayEv ol-miniAllDayEvOther"
          title={ev.title}
        >
          <div className="ol-miniEvTitle">{ev.title}</div>
        </div>
      );
    }

    const startMin = s.hour() * 60 + s.minute();
    const endMin = e.hour() * 60 + e.minute();
    const durationMin = Math.max(15, endMin - startMin);

    const top = minutesToTop(startMin);
    const height = Math.max(18, minutesToTop(durationMin));

    return (
      <div
        key={ev.id ?? ev.id_agenda_evento}
        className="ol-miniEv ol-miniEvOther"
        style={{ top, height }}
        title={`${fmtHM(ev.start)} - ${fmtHM(ev.end)}  ${ev.title}`}
      >
        <div className="ol-miniEvTime">
          {fmtHM(ev.start)} - {fmtHM(ev.end)}
        </div>
        <div className="ol-miniEvTitle">{ev.title}</div>
      </div>
    );
  };

  const scrollDrag = useRef({ down: false, y: 0, top: 0 });

  const onMiniMouseDown = (e) => {
    const el = gridRef.current;
    if (!el) return;
    scrollDrag.current.down = true;
    scrollDrag.current.y = e.clientY;
    scrollDrag.current.top = el.scrollTop;
    el.classList.add("dragging");
  };

  const onMiniMouseMove = (e) => {
    const el = gridRef.current;
    if (!el || !scrollDrag.current.down) return;
    const dy = e.clientY - scrollDrag.current.y;
    el.scrollTop = scrollDrag.current.top - dy * 1.15;
  };

  const stopMiniDrag = () => {
    const el = gridRef.current;
    scrollDrag.current.down = false;
    if (el) el.classList.remove("dragging");
  };

  const recurrenceText = useMemo(() => {
    if (!local?.recurrence) return null;
    return buildRecurrenceTextES(local.recurrence);
  }, [local?.recurrence]);

  const titleInvalid = useMemo(() => {
    if (!submitAttempted) return false;
    return !(local?.title || "").trim();
  }, [submitAttempted, local?.title]);

  const ciudadInvalid = useMemo(() => {
    if (!submitAttempted) return false;
    return !local?.ciudad_id;
  }, [submitAttempted, local?.ciudad_id]);

  return (
    <>
      <Modal
        open={open}
        onCancel={onCancel}
        onOk={handleOk}
        width={980}
        className="ol-modal"
        okText="Guardar"
        cancelText="Cancelar"
        title="Nuevo evento"
        closeIcon={<CloseOutlined style={{ color: "#000" }} />} // ✅ X negro visible
        footer={[
          <Button key="cancel" onClick={onCancel}>
            Cancelar
          </Button>,
          <Button
            key="save"
            type="primary"
            style={{ background: "#05060a", borderColor: "#05060a" }}
            onClick={() => {
              handleOk();
            }}
          >
            Guardar
          </Button>,
        ]}
      >
        {!local ? null : (
          <div className="ol-modalBody">
            <div className="ol-modalLeft">
              <div className="ol-titleItem">
                <Input
                  placeholder="Agregar un título"
                  size="large"
                  value={local.title}
                  status={titleInvalid ? "error" : undefined}
                  onChange={(e) =>
                    setLocal((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>

              <div className="ol-dtRow">
                <div className="ol-field">
                  <div className="ol-fieldLabel">Fecha</div>
                  <DatePicker
                    value={dateD}
                    format="DD/MM/YYYY"
                    onChange={onChangeDate}
                  />
                </div>

                <div className="ol-field">
                  <div className="ol-fieldLabel">Inicio</div>
                  <TimePicker
                    value={startTimeVal}
                    format="H:mm"
                    minuteStep={15}
                    onChange={onChangeStartTime}
                    disabled={!!local.allDay}
                  />
                </div>

                <div className="ol-field">
                  <div className="ol-fieldLabel">Fin</div>
                  <TimePicker
                    value={endTimeVal}
                    format="H:mm"
                    minuteStep={15}
                    onChange={onChangeEndTime}
                    disabled={!!local.allDay}
                  />
                </div>

                <div className="ol-field ol-fieldSwitch">
                  <div className="ol-fieldLabel">Todo el día</div>
                  <Switch checked={!!local.allDay} onChange={toggleAllDay} />
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <Button
                  type="link"
                  style={{ padding: 0, fontWeight: 700 }}
                  onClick={() => setOpenRepeat(true)}
                >
                  {local.recurrence ? "Editar periódico" : "Hacer periódico"}
                </Button>

                {local.recurrence ? (
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">{recurrenceText}</Text>
                  </div>
                ) : null}
              </div>

              <div className="ol-sep" />

              {/* ===== UBICACIÓN: Ciudad ===== */}
              <div className="ol-field">
                <div className="ol-fieldLabel">Ciudad</div>
                <Select
                  placeholder="Selecciona una ciudad"
                  options={ciudadOptions}
                  value={local.ciudad_id || undefined}
                  onChange={onPickCiudad}
                  showSearch
                  optionFilterProp="label"
                  status={ciudadInvalid ? "error" : undefined}
                />
              </div>

              <div className="ol-miniControls">
                <div className="ol-field">
                  <div className="ol-fieldLabel">Recordatorio</div>
                  <Select
                    value={local.reminder || "15m"}
                    onChange={(v) => setLocal((p) => ({ ...p, reminder: v }))}
                    options={[
                      { label: "Ninguno", value: "none" },
                      { label: "5 minutos antes", value: "5m" },
                      { label: "15 minutos antes", value: "15m" },
                      { label: "30 minutos antes", value: "30m" },
                      { label: "1 hora antes", value: "1h" },
                    ]}
                  />
                </div>

                <div className="ol-field ol-fieldSwitch">
                  <div className="ol-fieldLabel">Evento presencial</div>
                  <Switch
                    checked={!!local.inPerson}
                    onChange={(v) => setLocal((p) => ({ ...p, inPerson: v }))}
                  />
                </div>
              </div>

              <div className="ol-sep" />

<div className="ol-field">
  <div className="ol-fieldLabel">Documento</div>

  <Dragger {...attachProps} style={{ padding: 10 }}>
    <p style={{ margin: 0, fontWeight: 700 }}>Arrastra un archivo o haz clic</p>
    <p style={{ margin: 0, opacity: 0.75 }}>
      PDF / imagen / Word / Excel (máx 1)
    </p>
  </Dragger>

  {local?.attachments?.length ? (
    <div style={{ marginTop: 6 }}>
      <Text type="secondary">
        Se enviará: {local.attachments[0]?.name || "archivo"}
      </Text>
    </div>
  ) : null}
</div>
              <div className="ol-descItem">
                <div className="ol-fieldLabel">Descripción</div>
                <div className="ol-quillWrap">
                  <ReactQuill
                    theme="snow"
                    value={local.description || ""}
                    onChange={(html) =>
                      setLocal((p) => ({ ...p, description: html }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="ol-modalRight">
              <div className="ol-previewHeader">
                <CalendarOutlined />
                {!rightEditDate ? (
                  <Text
                    className="ol-previewTitle"
                    onClick={() => setRightEditDate(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setRightEditDate(true);
                    }}
                    title="Cambiar fecha"
                  >
                    {dateD.format("ddd, D MMM, YYYY")}
                  </Text>
                ) : (
                  <DatePicker
                    value={dateD}
                    format="DD/MM/YYYY"
                    onChange={(d) => {
                      onChangeDate(d);
                      setRightEditDate(false);
                    }}
                    onOpenChange={(isOpen) => {
                      if (!isOpen) setRightEditDate(false);
                    }}
                    autoFocus
                    style={{ width: "100%" }}
                  />
                )}
              </div>

              <div
                className="ol-miniDayWrap"
                ref={gridRef}
                onMouseDown={onMiniMouseDown}
                onMouseMove={onMiniMouseMove}
                onMouseLeave={stopMiniDrag}
                onMouseUp={stopMiniDrag}
              >
                <div className="ol-miniAllDayLane">
                  {dayEvents.filter((e) => !!e.allDay).map(renderSmallEvent)}
                  {localAllDay ? (
                    <div
                      className="ol-miniAllDayEv ol-miniAllDayEvLocal"
                      title={localAllDay.title}
                    >
                      <div className="ol-miniEvTitle">
                        {localAllDay.title || "(Sin asunto)"}
                      </div>
                    </div>
                  ) : null}
                </div>

                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="ol-miniRow" style={{ height: pxPerHour }}>
                    <div className="ol-miniHour">{h}</div>
                    <div className="ol-miniLine" />
                  </div>
                ))}

                {dayEvents.filter((e) => !e.allDay).map(renderSmallEvent)}

                {localBlock ? (
                  <div
                    className={[
                      "ol-miniEv",
                      "ol-miniEvLocal",
                      dragging ? "dragging" : "",
                    ].join(" ")}
                    style={{ top: localBlock.top, height: localBlock.height }}
                    onMouseDown={onMouseDownLocal}
                    title="Arrastra para cambiar la hora"
                  >
                    <div className="ol-miniEvTime">
                      {fmtHM(local.start)} - {fmtHM(local.end)}
                    </div>
                    <div className="ol-miniEvTitle">
                      {local.title || "(Sin asunto)"}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <RecurrenceModal
        open={openRepeat}
        value={local?.recurrence || null}
        baseDate={dateD}
        onCancel={() => setOpenRepeat(false)}
        onChange={(r) => {
          setLocal((p) => ({
            ...p,
            recurrence: r,
          }));
          setOpenRepeat(false);
        }}
      />
    </>
  );
}
