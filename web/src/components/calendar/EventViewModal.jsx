import React, { useMemo } from "react";
import { Modal, Button, Space, Tag } from "antd";
import dayjs from "dayjs";
import { SyncOutlined } from "@ant-design/icons";

export default function EventViewModal({
  open,
  event,
  onClose,
  onEdit,
  onDelete,
}) {
  const whenText = useMemo(() => {
    if (!event) return "";
    const s = dayjs(event.start);
    const e = dayjs(event.end);

    if (event.allDay) {
      return s.format("ddd, D MMM, YYYY");
    }
    const sameDay = s.format("YYYY-MM-DD") === e.format("YYYY-MM-DD");
    if (sameDay) {
      return `${s.format("ddd, D MMM, YYYY")} · ${s.format("H:mm")} - ${e.format(
        "H:mm"
      )}`;
    }
    return `${s.format("ddd, D MMM, YYYY H:mm")} - ${e.format(
      "ddd, D MMM, YYYY H:mm"
    )}`;
  }, [event]);

  return (
    <Modal
      open={open}
      title={event?.title || "Evento"}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Cerrar</Button>
          <Button type="default" onClick={() => onEdit?.(event)} disabled={!event}>
            Editar
          </Button>
          <Button danger onClick={() => onDelete?.(event)} disabled={!event}>
            Eliminar
          </Button>
        </Space>
      }
      width={520}
    >
      {!event ? null : (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 14, color: "rgba(0,0,0,0.75)" }}>
              {whenText}
            </div>

            {event.recurring ? (
              <Tag icon={<SyncOutlined />} style={{ marginLeft: "auto" }}>
                Recurrente
              </Tag>
            ) : null}

            {event.canceled ? <Tag color="default">Cancelado</Tag> : null}
          </div>

          {event.location ? (
            <div style={{ fontSize: 13, color: "rgba(0,0,0,0.7)" }}>
              <b>Ubicación:</b> {event.location}
            </div>
          ) : null}

          {event.nombre_ciudad ? (
            <div style={{ fontSize: 13, color: "rgba(0,0,0,0.7)" }}>
              <b>Ciudad:</b> {event.nombre_ciudad}
            </div>
          ) : null}

          {event.reminder ? (
            <div style={{ fontSize: 13, color: "rgba(0,0,0,0.7)" }}>
              <b>Recordatorio:</b> {event.reminder}
            </div>
          ) : null}

          <div style={{ fontSize: 13, color: "rgba(0,0,0,0.7)" }}>
  <b>Presencial:</b> {event.inPerson ? "Sí" : "No"}
</div>

{/* ===== DOCUMENTO ===== */}
{event.documento_url ? (
  <div style={{ marginTop: 8 }}>
    <div
      style={{
        fontSize: 13,
        color: "rgba(0,0,0,0.7)",
        marginBottom: 6,
      }}
    >
      <b>Documento</b>
    </div>

    <Button
      type="primary"
      size="small"
      onClick={() =>
        window.open(
          `/api${event.documento_url}`,
          "_blank",
          "noopener,noreferrer"
        )
      }
    >
      Ver documento
    </Button>
  </div>
) : null}

          {event.description ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, color: "rgba(0,0,0,0.7)", marginBottom: 6 }}>
                <b>Descripción</b>
              </div>
              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 10,
                  padding: 12,
                  background: "#fff",
                  maxHeight: 240,
                  overflow: "auto",
                }}
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
