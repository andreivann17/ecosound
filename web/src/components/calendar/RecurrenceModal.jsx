import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Modal,
  DatePicker,
  Select,
  Button,
  Typography,
  Space,
  Radio,
} from "antd";
import { buildRecurrenceTextES, DOW_SHORT } from "./recurrenceUtils";

const { Text } = Typography;

const FREQ_OPTIONS = [
  { label: "Día", value: "DAILY" },
  { label: "Semana", value: "WEEKLY" },
  { label: "Mes", value: "MONTHLY" },
  { label: "Año", value: "YEARLY" },
];

const WEEK_DAYS = [
  { code: "MO", label: DOW_SHORT.MO },
  { code: "TU", label: DOW_SHORT.TU },
  { code: "WE", label: DOW_SHORT.WE },
  { code: "TH", label: DOW_SHORT.TH },
  { code: "FR", label: DOW_SHORT.FR },
  { code: "SA", label: DOW_SHORT.SA },
  { code: "SU", label: DOW_SHORT.SU },
];

const nthLabelES = (n) => {
  if (n === 1) return "primer";
  if (n === 2) return "segundo";
  if (n === 3) return "tercer";
  if (n === 4) return "cuarto";
  return "último";
};

export default function RecurrenceModal({
  open,
  value,
  baseDate,
  onCancel,
  onChange,
}) {
  const base = useMemo(() => dayjs(baseDate || dayjs()), [baseDate]);

  const [local, setLocal] = useState(null);

  useEffect(() => {
    // defaults estilo Outlook
    const d = base;
    const defaultWeeklyDow = ["MO", "TU", "WE", "TH", "FR"].includes(d.format("dd").toUpperCase())
      ? []
      : [];

    const v = value || {
      freq: "DAILY",
      interval: 1,
      // weekly:
      byweekday: [toDow(d)],
      // monthly/yearly:
      mode: "BYMONTHDAY",
      bymonthday: d.date(),
      bymonth: d.month() + 1,
      // bysetpos mode:
      bysetpos: 1,
      // end:
      until: null,
    };

    // normaliza si viene incompleto
    const normalized = {
      freq: v.freq || "DAILY",
      interval: Number(v.interval || 1),
      byweekday: Array.isArray(v.byweekday) ? v.byweekday : [toDow(d)],
      mode: v.mode || "BYMONTHDAY",
      bymonthday: Number(v.bymonthday || d.date()),
      bymonth: Number(v.bymonth || (d.month() + 1)),
      bysetpos: Number(v.bysetpos || 1),
      until: v.until || null,
    };

    setLocal(normalized);
  }, [open, value, base]);

  const toSummary = useMemo(() => buildRecurrenceTextES(local), [local]);

  function toDow(d) {
    // dayjs: 0=Sunday ... 6=Saturday
    const idx = dayjs(d).day();
    return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][idx];
  }

  const toggleWeekday = (code) => {
    setLocal((p) => {
      const set = new Set(p.byweekday || []);
      if (set.has(code)) set.delete(code);
      else set.add(code);
      const next = Array.from(set);

      // no permitas vacío en semanal (para evitar reglas inválidas)
      if (p.freq === "WEEKLY" && next.length === 0) return p;

      return { ...p, byweekday: next };
    });
  };

  const handleSave = () => {
    if (!local) return;

    // Ajustes por freq
    let out = { ...local };

    if (out.freq === "DAILY") {
      out.byweekday = [];
      out.mode = null;
      out.bymonthday = null;
      out.bymonth = null;
      out.bysetpos = null;
    }

    if (out.freq === "WEEKLY") {
      out.mode = null;
      out.bymonthday = null;
      out.bymonth = null;
      out.bysetpos = null;

      if (!out.byweekday || out.byweekday.length === 0) {
        out.byweekday = [toDow(base)];
      }
    }

    if (out.freq === "MONTHLY") {
      out.bymonth = null; // mensual no necesita mes fijo
      if (out.mode === "BYMONTHDAY") {
        out.bysetpos = null;
        out.byweekday = null;
      } else {
        // BYSETPOS: requiere bysetpos + byweekday[0]
        out.bymonthday = null;
        out.byweekday = [toDow(base)];
      }
    }

    if (out.freq === "YEARLY") {
      out.bymonth = base.month() + 1;
      if (out.mode === "BYMONTHDAY") {
        out.bysetpos = null;
        out.byweekday = null;
        out.bymonthday = base.date();
      } else {
        out.bymonthday = null;
        out.byweekday = [toDow(base)];
      }
    }

    onChange(out);
  };

  const handleRemove = () => onChange(null);

  const monthLabel = useMemo(() => base.format("MMMM"), [base]);

  const monthlyOptionLabel1 = `El día ${base.date()}`;
  const monthlyOptionLabel2 = `El ${nthLabelES(3)} ${dowNameES(toDow(base))}`;
  const yearlyOptionLabel1 = `El ${base.date()} de ${monthLabel}`;
  const yearlyOptionLabel2 = `El ${nthLabelES(3)} ${dowNameES(toDow(base))} de ${monthLabel}`;

  function dowNameES(code) {
    const map = { MO: "lunes", TU: "martes", WE: "miércoles", TH: "jueves", FR: "viernes", SA: "sábado", SU: "domingo" };
    return map[code] || "";
  }

  if (!local) return null;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title="Repetir"
      width={520}
      footer={null}
      className="ol-recurModal"
      maskClosable={false}
      destroyOnClose
      // IMPORTANTE: que se vea bien (no “transparente”)
      maskStyle={{ backgroundColor: "rgba(0,0,0,0.35)" }}
      styles={{ content: { background: "#fff" } }}
    >
      <div className="ol-recurBody">
        <div className="ol-recurRow">
          <div className="ol-recurLabel">Iniciar</div>
          <DatePicker
            value={base}
            format="DD/MM/YYYY"
            disabled
            style={{ width: 220 }}
          />
        </div>

        <div className="ol-recurRow">
          <div className="ol-recurLabel">Repetir cada</div>
          <Space>
            <Select
              value={local.interval}
              onChange={(v) => setLocal((p) => ({ ...p, interval: v }))}
              style={{ width: 90 }}
              options={Array.from({ length: 30 }).map((_, i) => ({
                label: String(i + 1),
                value: i + 1,
              }))}
            />
            <Select
              value={local.freq}
              onChange={(v) => setLocal((p) => ({ ...p, freq: v }))}
              style={{ width: 160 }}
              options={FREQ_OPTIONS}
            />
          </Space>
        </div>

        {/* WEEKLY: botones días */}
        {local.freq === "WEEKLY" ? (
          <div className="ol-recurWeek">
            {WEEK_DAYS.map((d) => {
              const active = (local.byweekday || []).includes(d.code);
              return (
                <button
                  key={d.code}
                  type="button"
                  className={["ol-dowBtn", active ? "active" : ""].join(" ")}
                  onClick={() => toggleWeekday(d.code)}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* MONTHLY: 2 opciones */}
        {local.freq === "MONTHLY" ? (
          <div className="ol-recurRadio">
            <Radio.Group
              value={local.mode}
              onChange={(e) => setLocal((p) => ({ ...p, mode: e.target.value }))}
            >
              <Space direction="vertical">
                <Radio value="BYMONTHDAY">{monthlyOptionLabel1}</Radio>
                <Radio value="BYSETPOS">{monthlyOptionLabel2}</Radio>
              </Space>
            </Radio.Group>
          </div>
        ) : null}

        {/* YEARLY: 2 opciones */}
        {local.freq === "YEARLY" ? (
          <div className="ol-recurRadio">
            <Radio.Group
              value={local.mode}
              onChange={(e) => setLocal((p) => ({ ...p, mode: e.target.value }))}
            >
              <Space direction="vertical">
                <Radio value="BYMONTHDAY">{yearlyOptionLabel1}</Radio>
                <Radio value="BYSETPOS">{yearlyOptionLabel2}</Radio>
              </Space>
            </Radio.Group>
          </div>
        ) : null}

        {/* UNTIL */}
        <div className="ol-recurUntil">
          {!local.until ? (
            <Button
              onClick={() =>
                setLocal((p) => ({
                  ...p,
                  until: base.add(3, "month").endOf("day").toISOString(),
                }))
              }
            >
              Agregar fecha de finalización
            </Button>
          ) : (
            <div className="ol-recurUntilRow">
              <Text type="secondary">
                {toSummary}
              </Text>
              <Space>
                <DatePicker
                  value={dayjs(local.until)}
                  format="DD/MM/YYYY"
                  onChange={(d) => {
                    if (!d) return;
                    setLocal((p) => ({ ...p, until: d.endOf("day").toISOString() }));
                  }}
                />
                <Button type="link" onClick={() => setLocal((p) => ({ ...p, until: null }))}>
                  Quitar fecha de finalización
                </Button>
              </Space>
            </div>
          )}
        </div>

        {/* Footer botones estilo Outlook */}
        <div className="ol-recurFooter">
          <Button danger onClick={handleRemove}>
            Quitar
          </Button>
          <div style={{ flex: 1 }} />
          <Button onClick={onCancel}>Descartar</Button>
          <Button type="primary" onClick={handleSave}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
