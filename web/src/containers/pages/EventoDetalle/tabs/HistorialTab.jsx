import React from "react";
import dayjs from "dayjs";
import { Empty } from "antd";
import { DollarOutlined, DesktopOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { fmtMoney, fmtFechaCorta } from "../helpers";
import { SERVICE_ICONS } from "../serviceIcons";

const tlIcon = (ev) => {
  if (ev.tipo === "pago") return <DollarOutlined />;
  if (ev.tipo === "servicio") return SERVICE_ICONS[ev.id_servicio] || <DesktopOutlined />;
  return <DesktopOutlined />;
};

const tlDotClass = (ev) => {
  if (ev.tipo === "pago") return "cd-tl-dot-pago";
  if (ev.tipo === "servicio") return "cd-tl-dot-servicio";
  return "cd-tl-dot-sistema";
};

const ROW_SIZE = 5;

export default function HistorialTab({ timelineEvents }) {
  const rows = [];
  for (let i = 0; i < timelineEvents.length; i += ROW_SIZE) {
    rows.push(timelineEvents.slice(i, i + ROW_SIZE));
  }

  return (
    <div className="cd-card">
      <div className="cd-card-header">
        <div className="cd-card-icon-wrap"><ClockCircleOutlined /></div>
        <h2 className="cd-card-title">Historial del evento</h2>
      </div>
      {timelineEvents.length === 0 ? (
        <Empty description="Sin eventos registrados aún" style={{ margin: "40px 0" }} />
      ) : (
        <div className="cd-timeline-h-wrap">
          {rows.map((row, rowIdx) => {
            const reversed = rowIdx % 2 === 1;
            const placeholders = ROW_SIZE - row.length;
            return (
              <React.Fragment key={rowIdx}>
                {rowIdx > 0 && (
                  <div className={`cd-tl-h-connector ${reversed ? "cd-tl-h-connector-right" : "cd-tl-h-connector-left"}`} />
                )}
                <div className={`cd-timeline-h ${reversed ? "cd-timeline-h-reverse" : ""}`}>
                  {row.map((ev, idx) => {
                    const hora = dayjs(ev.fecha).format("HH:mm");
                    return (
                      <div key={idx} className="cd-tl-h-item">
                        <div className="cd-tl-h-label">
                          <div className="cd-tl-date">{fmtFechaCorta(ev.fecha)}</div>
                          <div className="cd-tl-time">{hora !== "00:00" ? `${hora} hrs` : "-"}</div>
                        </div>
                        <div className="cd-tl-h-line-wrap">
                          {row.length > 1 && <div className="cd-tl-h-line" />}
                          <div className={`cd-tl-dot ${tlDotClass(ev)}`}>
                            {tlIcon(ev)}
                          </div>
                        </div>
                        <div className="cd-tl-h-content">
                          <div className="cd-tl-title">{ev.titulo}</div>
                          <div className="cd-tl-desc">{ev.descripcion}</div>
                          {ev.monto && (
                            <div className="cd-tl-monto">{fmtMoney(ev.monto)}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {Array.from({ length: placeholders }).map((_, i) => (
                    <div key={`ph-${i}`} className="cd-tl-h-item cd-tl-h-placeholder" />
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
