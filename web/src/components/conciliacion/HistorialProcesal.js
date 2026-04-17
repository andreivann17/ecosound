// src/components/conciliacion/HistoriaProcesalCard.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Card,
  Button,
  Timeline,
  notification,
} from "antd";
import { useSelector } from "react-redux";

const { Text } = Typography;

// =========================
// Helpers
// =========================

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const mapTipoEventoToLabel = (tipoEventoRaw, tablaOrigen) => {
  const tipo = (tipoEventoRaw || "").toUpperCase();

  if (tipo === "EXPEDIENTE") return "Creación de expediente";
  if (tipo === "AUDIENCIA") return "Audiencia prejudicial";
  if (tipo === "SISTEMA") return "Movimiento en el sistema";

  // si no viene tipo_evento pero sí tabla_origen
  if (!tipo && tablaOrigen === "conciliacion") return "Movimiento del expediente";
  if (!tipo && tablaOrigen === "conciliacion_audiencia") return "Movimiento de audiencia";

  return tipo || "Actividad";
};

const getEventoColor = (tipoEventoRaw) => {
  const tipo = (tipoEventoRaw || "").toUpperCase();
  if (tipo === "EXPEDIENTE") return "green";
  if (tipo === "AUDIENCIA") return "blue";
  if (tipo === "SISTEMA") return "gray";
  return "orange";
};

// Normaliza un registro tal como viene del backend
const normalizeHistorialItem = (raw, index) => {
  const fecha =
    raw.fecha_historial || raw.created_at || raw.updated_at || null;

  const tipoLabel = mapTipoEventoToLabel(raw.tipo_evento, raw.tabla_origen);

  const descripcion = raw.descripcion || "";
  const resumen =
    descripcion.length > 90
      ? descripcion.slice(0, 90).trim() + "…"
      : descripcion;

  return {
    id: raw.id_historial ?? raw.id ?? index,
    fecha,
    titulo: raw.titulo || tipoLabel,
    tipoLabel,
    descripcion,
    resumen,
    origen: raw.tabla_origen,
    tipo_evento: raw.tipo_evento,
    raw,
  };
};

// =========================
// Componente
// =========================

const HistoriaProcesalCard = () => {
  const historialRaw = useSelector(
    (state) => state.conciliacion?.historial
  );

  // Normalizar datos del backend
  const acuerdosSource = useMemo(() => {
    if (!Array.isArray(historialRaw)) return [];
    return historialRaw.map((h, idx) => normalizeHistorialItem(h, idx));
  }, [historialRaw]);

  // Ejemplos visuales cuando no hay datos reales
  const acuerdosEjemplo = [
    {
      id: "demo-1",
      fecha: "2004-08-16",
      titulo: "En razón de que…",
      descripcion: "Ejemplo de acuerdo para visualizar el diseño de la tarjeta.",
      resumen: "En razón de que…",
      tipoLabel: "Acuerdo de ejemplo",
      tipo_evento: "DEMO",
    },
    {
      id: "demo-2",
      fecha: "2004-05-09",
      titulo: "Notifíquese…",
      descripcion:
        "Notifíquese personalmente al trabajador en el domicilio señalado.",
      resumen: "Notifíquese personalmente…",
      tipoLabel: "Notificación de ejemplo",
      tipo_evento: "DEMO",
    },
    {
      id: "demo-3",
      fecha: "2004-01-04",
      titulo: "Acuerdo…",
      descripcion:
        "Se tiene por presentado el escrito y se agregan las constancias a los autos.",
      resumen: "Acuerdo inicial…",
      tipoLabel: "Acuerdo inicial de ejemplo",
      tipo_evento: "DEMO",
    },
  ];

  const acuerdos =
    acuerdosSource && acuerdosSource.length > 0
      ? acuerdosSource
      : acuerdosEjemplo;

  const esDemoAcuerdos = acuerdosSource.length === 0;

  const [selectedAcuerdo, setSelectedAcuerdo] = useState(
    acuerdos.length > 0 ? acuerdos[0] : null
  );

  useEffect(() => {
    if (acuerdos.length > 0) {
      setSelectedAcuerdo(acuerdos[0]);
    } else {
      setSelectedAcuerdo(null);
    }
  }, [acuerdos.length]);

  return (
    <section className="laboral-exp-section">
      <Row gutter={[16, 16]} align="stretch">
        {/* Izquierda: lista / timeline de acuerdos */}
        <Col xs={24} md={10} lg={9}>
          <Card
            className="laboral-exp-timeline-card"
            title={
              <Space align="center" size={8}>
                <span>Historia procesal</span>
                {acuerdosSource.length > 0 && (
                  <Tag color="blue">{acuerdosSource.length}</Tag>
                )}
              </Space>
            }
          
          >
            {esDemoAcuerdos && (
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                * Mostrando ejemplos de acuerdos para visualizar el diseño. Con
                datos reales se listarán aquí.
              </Text>
            )}

            {!esDemoAcuerdos && acuerdos.length === 0 && (
              <Text type="secondary">
                Este expediente todavía no tiene actividades registradas en la
                historia procesal.
              </Text>
            )}

            {acuerdos.length > 0 && (
              <Timeline mode="left" className="laboral-exp-timeline">
                {acuerdos.map((a, idx) => {
                  const isActive =
                    selectedAcuerdo &&
                    (selectedAcuerdo.id === a.id || selectedAcuerdo === a);

                  return (
                    <Timeline.Item
                      key={a.id || idx}
                      color={getEventoColor(a.tipo_evento)}
                    >
                      <div
                        className={
                          "laboral-exp-acuerdo-item" +
                          (isActive
                            ? " laboral-exp-acuerdo-item-active"
                            : "")
                        }
                        onClick={() => setSelectedAcuerdo(a)}
                      >
                        <div className="laboral-exp-acuerdo-date">
                          {fmtDate(a.fecha)}
                        </div>
                        <div className="laboral-exp-acuerdo-title">
                          {a.titulo || `Acuerdo ${idx + 1}`}
                        </div>
                        {a.resumen && (
                          <div className="laboral-exp-acuerdo-resumen">
                            {a.resumen}
                          </div>
                        )}
                      </div>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            )}
          </Card>
        </Col>

        {/* Derecha: detalle del acuerdo seleccionado */}
        <Col xs={24} md={14} lg={15}>
          <Card
            className="laboral-exp-detail-card laboral-exp-acuerdo-detail"
            title="Detalle del acuerdo"
            extra={
              selectedAcuerdo ? (
                <Text type="secondary">
                  Fecha: {fmtDate(selectedAcuerdo.fecha)}
                </Text>
              ) : null
            }
          >
            {selectedAcuerdo ? (
              <Space
                direction="vertical"
                size={12}
                style={{ width: "100%" }}
              >
             

                {selectedAcuerdo.titulo && (
                  <Text strong>{selectedAcuerdo.titulo}</Text>
                )}

                {selectedAcuerdo.descripcion && (
                  <Text className="laboral-exp-acuerdo-body">
                    {selectedAcuerdo.descripcion}
                  </Text>
                )}

                {!selectedAcuerdo.descripcion && (
                  <Text type="secondary">
                    No hay descripción detallada registrada para este acuerdo.
                  </Text>
                )}

                {selectedAcuerdo.origen && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Origen: {selectedAcuerdo.origen}
                  </Text>
                )}
              </Space>
            ) : (
              <Text type="secondary">
                Selecciona un acuerdo en la lista de la izquierda para ver el
                detalle.
              </Text>
            )}
          </Card>
        </Col>
      </Row>
    </section>
  );
};

export default HistoriaProcesalCard;
