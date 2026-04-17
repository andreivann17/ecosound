import React, { useMemo, useState } from "react";
import { Button, Checkbox, Divider, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

export default function OutlookSidebar({
  cursorDate,
  onPickDate,
  calendars,
  selectedCalendars,
  onToggleCalendar,
  filters,
  setFilters,
}) {

  const [miniCursor, setMiniCursor] = useState(cursorDate.startOf("month"));

  const matrix = useMemo(() => {
    const start = miniCursor.startOf("month").startOf("week");
    const end = miniCursor.endOf("month").endOf("week");
    const days = [];
    let d = start;

    while (d.isBefore(end) || d.isSame(end, "day")) {
      days.push(d);
      d = d.add(1, "day");
    }

    const rows = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [miniCursor]);
const tipoLegend = useMemo(
  () => [
    { key: 1, label: "Bodas", sub: "Tipo de evento", swatchClass: "sw-te-1" },
    { key: 2, label: "XV", sub: "Tipo de evento", swatchClass: "sw-te-2" },
    { key: 3, label: "Graduación", sub: "Tipo de evento", swatchClass: "sw-te-3" },
    { key: 4, label: "Corporativo", sub: "Tipo de evento", swatchClass: "sw-te-4" },
    { key: 5, label: "Cumpleaños", sub: "Tipo de evento", swatchClass: "sw-te-5" },
    { key: 6, label: "Otro", sub: "Tipo de evento", swatchClass: "sw-te-6" },
  ],
  []
);

const selectedTipos = Array.isArray(filters?.tipoContratoIds) ? filters.tipoContratoIds : [];

const toggleTipo = (key) => {
  setFilters((p) => {
    const cur = new Set(Array.isArray(p?.tipoContratoIds) ? p.tipoContratoIds : []);
    if (cur.has(key)) cur.delete(key);
    else cur.add(key);
    return { ...(p || {}), tipoContratoIds: Array.from(cur) };
  });
};

const setAllTipos = () => {
  setFilters((p) => ({ ...(p || {}), tipoContratoIds: tipoLegend.map((c) => c.key) }));
};

const clearTipos = () => {
  setFilters((p) => ({ ...(p || {}), tipoContratoIds: [] }));
};

  return (
    <div className="ol-sidebar">
      <div className="ol-miniHeader">
        <Text className="ol-miniTitle">{miniCursor.format("MMMM YYYY")}</Text>
        <div className="ol-miniNav">
          <Button size="small" onClick={() => setMiniCursor((d) => d.subtract(1, "month"))}>
            ‹
          </Button>
          <Button size="small" onClick={() => setMiniCursor((d) => d.add(1, "month"))}>
            ›
          </Button>
        </div>
      </div>

      <div className="ol-miniGrid">
        <div className="ol-miniWeekdays">
          {["L", "M", "X", "J", "V", "S", "D"].map((x) => (
            <div key={x} className="ol-miniW">{x}</div>
          ))}
        </div>

        {matrix.map((row, ri) => (
          <div key={ri} className="ol-miniRow">
            {row.map((d) => {
              const isOut = d.month() !== miniCursor.month();
              const isSel = d.isSame(cursorDate, "day");
              const isToday = d.isSame(dayjs(), "day");
              return (
                <button
                  key={d.toISOString()}
                  className={[
                    "ol-miniCell",
                    isOut ? "out" : "",
                    isSel ? "sel" : "",
                    isToday ? "today" : "",
                  ].join(" ")}
                  onClick={() => onPickDate(d)}
                >
                  {d.date()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
 
<Divider className="ol-siderDivider" />
<div className="ol-legendCard">
  <div className="ol-legendHeader">
    <Text className="ol-legendTitle">Simbología</Text>
    <span className="ol-legendHint">Por tipo de evento</span>
  </div>

  <div style={{ display: "flex", gap: 8, marginTop: 10, marginBottom: 10 }}>
    <Button size="small" onClick={setAllTipos}>Todos</Button>
    <Button size="small" onClick={clearTipos}>Ninguno</Button>
  </div>

  <div className="ol-legendGrid">
    {tipoLegend.map((c) => {
      const checked = selectedTipos.includes(c.key);

      return (
        <div
          key={c.key}
          className="ol-legendChip"
          role="button"
          tabIndex={0}
          onClick={() => toggleTipo(c.key)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") toggleTipo(c.key);
          }}
          style={{
            cursor: "pointer",
            outline: "none",
            border: checked ? "1px solid rgba(5,6,10,.35)" : "1px solid rgba(0,0,0,.06)",
            background: checked ? "rgba(5,6,10,.04)" : "#fff",
          }}
        >
          <span className={`ol-swatch ${c.swatchClass}`} />
          <div className="ol-legendText" style={{ flex: 1 }}>
            <div className="ol-legendName" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{c.label}</span>
              <Checkbox checked={checked} onChange={() => toggleTipo(c.key)} onClick={(e) => e.stopPropagation()} />
            </div>
            <div className="ol-legendSub">{c.sub}</div>
          </div>
        </div>
      );
    })}
  </div>
</div>


   
    </div>
  );
}
