import React from "react";
import { Spin, Empty } from "antd";
import { HistoryOutlined } from "@ant-design/icons";
import { getActionConfig, fmtDatetime } from "../helpers";

export default function ActividadTab({ actividad, loadingActividad }) {
  return (
    <div className="cd-card">
      <div className="cd-card-header">
        <div className="cd-card-icon-wrap"><HistoryOutlined /></div>
        <h2 className="cd-card-title">
          Actividad del evento
          {actividad.length > 0 && (
            <span className="cd-actividad-count">{actividad.length}</span>
          )}
        </h2>
      </div>

      {loadingActividad ? (
        <div className="cd-loading-wrap"><Spin size="large" /></div>
      ) : actividad.length === 0 ? (
        <Empty
          description="Sin actividad registrada aún"
          style={{ margin: "40px 0" }}
        />
      ) : (
        <div className="cd-actividad-list">
          {actividad.map((item, idx) => {
            const cfg = getActionConfig(item.action);
            return (
              <div key={item.id_audit_log || idx} className="cd-actividad-item">
                <div className="cd-actividad-dot-col">
                  <div
                    className="cd-actividad-dot"
                    style={{ background: cfg.color }}
                  />
                  {idx < actividad.length - 1 && (
                    <div className="cd-actividad-line" />
                  )}
                </div>
                <div className="cd-actividad-body">
                  <div className="cd-actividad-top-row">
                    <span
                      className="cd-actividad-badge"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      {cfg.label}
                    </span>
                    <span className="cd-actividad-message">{item.message}</span>
                  </div>
                  <div className="cd-actividad-bottom-row">
                    <span className="cd-actividad-time">
                      {fmtDatetime(item.datetime)}
                    </span>
                    {item.user_name && (
                      <div className="cd-actividad-user">
                        <span>{item.user_name}</span>
                        {item.user_email && (
                          <span className="cd-actividad-email">{item.user_email}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
