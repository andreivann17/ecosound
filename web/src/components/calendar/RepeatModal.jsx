import React, { useEffect, useState } from "react";
import { Modal, Select, Button, DatePicker, Radio } from "antd";
import dayjs from "dayjs";

const WEEK_DAYS = [
  { key: "MO", label: "L" },
  { key: "TU", label: "M" },
  { key: "WE", label: "X" },
  { key: "TH", label: "J" },
  { key: "FR", label: "V" },
  { key: "SA", label: "S" },
  { key: "SU", label: "D" },
];

export default function RepeatModal({
  open,
  baseDate,
  value,
  onCancel,
  onSave,
  onRemove,
}) {
  const [freq, setFreq] = useState("WEEKLY");
  const [interval, setInterval] = useState(1);
  const [byweekday, setByweekday] = useState([]);
  const [until, setUntil] = useState(null);
  const [monthlyMode, setMonthlyMode] = useState("day");

  useEffect(() => {
    if (!value) return;

    setFreq(value.freq);
    setInterval(value.interval || 1);
    setByweekday(value.byweekday || []);
    setUntil(value.until ? dayjs(value.until) : null);
    setMonthlyMode(value.bysetpos ? "ordinal" : "day");
  }, [value]);

  const toggleDay = (d) => {
    setByweekday((p) =>
      p.includes(d) ? p.filter((x) => x !== d) : [...p, d]
    );
  };

  const handleSave = () => {
    const payload = {
      freq,
      interval,
      until: until ? until.format("YYYY-MM-DD") : null,
    };

    if (freq === "WEEKLY") payload.byweekday = byweekday;

    if (freq === "MONTHLY" || freq === "YEARLY") {
      if (monthlyMode === "day") {
        payload.bymonthday = baseDate.date();
      } else {
        payload.byweekday = [baseDate.format("dd").toUpperCase()];
        payload.bysetpos = Math.ceil(baseDate.date() / 7);
      }
    }

    onSave(payload);
  };

  return (
    <Modal
      open={open}
      title="Repetir"
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <div className="ol-repeatBlock">
        <div className="ol-repeatRow">
          Repetir cada{" "}
          <Select
            value={interval}
            onChange={setInterval}
            options={[1, 2, 3, 4].map((n) => ({ value: n, label: n }))}
            style={{ width: 70 }}
          />
          <Select
            value={freq}
            onChange={setFreq}
            options={[
              { value: "DAILY", label: "día" },
              { value: "WEEKLY", label: "semana" },
              { value: "MONTHLY", label: "mes" },
              { value: "YEARLY", label: "año" },
            ]}
            style={{ width: 120 }}
          />
        </div>

        {freq === "WEEKLY" && (
          <div className="ol-repeatDays">
            {WEEK_DAYS.map((d) => (
              <div
                key={d.key}
                className={`ol-dayBtn ${
                  byweekday.includes(d.key) ? "active" : ""
                }`}
                onClick={() => toggleDay(d.key)}
              >
                {d.label}
              </div>
            ))}
          </div>
        )}

        {(freq === "MONTHLY" || freq === "YEARLY") && (
          <Radio.Group
            value={monthlyMode}
            onChange={(e) => setMonthlyMode(e.target.value)}
          >
            <Radio value="day">El día {baseDate.date()}</Radio>
            <Radio value="ordinal">
              El {Math.ceil(baseDate.date() / 7)} {baseDate.format("dddd")}
            </Radio>
          </Radio.Group>
        )}

        <div className="ol-repeatUntil">
          <span>Finaliza:</span>
          <DatePicker
            value={until}
            onChange={setUntil}
            placeholder="Elegir fecha"
          />
        </div>

        <div className="ol-repeatFooter">
          <Button type="primary" onClick={handleSave}>
            Guardar
          </Button>
          <Button onClick={onCancel}>Descartar</Button>
          {value && (
            <Button danger onClick={onRemove}>
              Quitar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
