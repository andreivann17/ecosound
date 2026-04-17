import React, { useMemo } from "react";
import { Card, Timeline, Tag, Typography, Space } from "antd";
import { useSelector } from "react-redux";

const { Text } = Typography;

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const safeJsonParse = (v) => {
  if (!v) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const getActionMeta = (actionRaw) => {
  const a = (actionRaw || "").toUpperCase();
  if (a === "CREATE") return { color: "green", label: "Registro" };
  if (a === "UPDATE") return { color: "blue", label: "Actualización" };
  if (a === "DELETE") return { color: "red", label: "Eliminación" };
  return { color: "default", label: "Actividad" };
};

const pickCodeFromChanges = (changesObj) => {
  if (!changesObj || typeof changesObj !== "object") return null;
  if (changesObj.expediente_format) return changesObj.expediente_format;
  if (changesObj.expediente) return changesObj.expediente;
  if (changesObj.code) return changesObj.code;
  return null;
};

const normalizeAuditItem = (raw, idx) => {
  const changesObj = safeJsonParse(raw.changes);
  const extraObj = safeJsonParse(raw.extra);

  const userName = (raw.user_name || "").trim();
  const userEmail = (raw.user_email || "").trim();

  return {
    id: raw.id_audit_log ?? idx,
    when: raw.datetime || null,
    action: raw.action || "",
    message: raw.message || "",
    idKey: raw.id_key ?? null,
    idModulo: raw.id_modulo ?? null,
    userName: userName || "—",
    userEmail: userEmail || "",
    code: pickCodeFromChanges(changesObj),
    endpoint: extraObj?.endpoint || "",
    origen: extraObj?.origen || "",
  };
};

export default function ActividadExpedienteCard() {
  const auditRaw = useSelector((state) => state.conciliacion?.audit);
  const auditItems = auditRaw?.items || [];

  const items = useMemo(() => {
    return auditItems.map((it, idx) => normalizeAuditItem(it, idx));
  }, [auditItems]);

  return (
    <section className="movimientos-wrap">
      <Card
        className="movimientos-card"
        title={
          <Space size={10} align="center">
            <span>Actividad del expediente</span>
            <Tag className="movimientos-count">{items.length}</Tag>
          </Space>
        }
        bodyStyle={{ padding: 18 }}
      >
        {items.length === 0 ? (
          <Text type="secondary">No hay actividad registrada.</Text>
        ) : (
          <Timeline className="movimientos-timeline">
            {items.map((m) => {
              const meta = getActionMeta(m.action);

              return (
                <Timeline.Item
                  key={m.id}
                  color={meta.color === "default" ? "gray" : meta.color}
                >
                  <div className="mov-item">
                    <div className="mov-top">
                      <Tag color={meta.color} className="mov-tag">
                        {meta.label}
                      </Tag>

                      <div className="mov-title">
                        <Text strong className="mov-message">
                          {m.message || "—"}
                        </Text>
                      </div>
                    </div>

                    <div className="mov-sub">
                      <Text type="secondary" className="mov-date">
                        {fmtDateTime(m.when)}
                      </Text>

                      <div className="mov-userbox">
                        <Text type="secondary" className="mov-user-name">
                          {m.userName}
                        </Text>
                        {m.userEmail ? (
                          <Text type="secondary" className="mov-user-email">
                            {m.userEmail}
                          </Text>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Timeline.Item>
              );
            })}
          </Timeline>
        )}
      </Card>

      <style>{`
        .movimientos-wrap {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 12px 14px;
        }

        .movimientos-card {
          border-radius: 14px;
          overflow: hidden;
        }

        .movimientos-count {
          border-radius: 999px;
          padding: 0 10px;
          margin-left: 6px;
        }

        .movimientos-timeline {
          margin-top: 6px;
        }

        .mov-item {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 14px;
          padding: 12px 14px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }

        .mov-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.07);
        }

        .mov-top {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .mov-tag {
          margin: 0;
          border-radius: 999px;
          font-weight: 600;
        }

        .mov-title {
          flex: 1;
          min-width: 0;
        }

        .mov-message {
          display: block;
          font-size: 13px;
          line-height: 1.35;
          word-break: break-word;
        }

        .mov-sub {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 6px;
          align-items: flex-end;
        }

        .mov-date {
          font-size: 12px;
        }

        .mov-userbox {
          text-align: right;
          line-height: 1.1;
          max-width: 52%;
        }

        .mov-user-name {
          font-size: 12px;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mov-user-email {
          font-size: 11px;
          opacity: 0.75;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 520px) {
          .mov-sub {
            flex-direction: column;
            align-items: flex-start;
          }
          .mov-userbox {
            text-align: left;
            max-width: 100%;
          }
          .mov-user-name,
          .mov-user-email {
            white-space: normal;
          }
        }
      `}</style>
    </section>
  );
}
