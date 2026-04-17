
import {
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Descriptions,
  Divider,
  Button,
  Breadcrumb,
  Card,
  Dropdown,
  Timeline,
  Alert,
  message,
  Collapse,
  
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
const { Title, Text } = Typography;
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
function CardInfo({
data
}) {

  return (

          <section className="laboral-exp-section">
            <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        
              {/* Título de la sección con el mismo formato que "Datos de expediente" */}
              <div className="laboral-exp-section-header">
                <div>
                  <Text className="laboral-exp-section-title">
                    Información de la empresa y relación laboral
                  </Text>
                  <Text type="secondary" className="laboral-exp-section-sub">
                    Datos del patrón, situación laboral, salarios y proceso de conciliación.
                  </Text>
                </div>
              </div>
        
              <Divider className="laboral-exp-section-divider" />
        
              {/* ===========================
                  DATOS DEL PATRÓN / EMPRESA
              ============================ */}
              <Descriptions
                title="Datos del patrón / empresa"
                bordered
                column={{ xs: 1, sm: 1, md: 2, lg: 3 }}
                size="small"
                labelStyle={{ width: 240 }}
                className="laboral-exp-descriptions laboral-exp-descriptions-main"
              >
                <Descriptions.Item label="Nombre del patrón">
                  {data.nombre_patron || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="RFC patrón">
                  {data.rfc_patron || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Razón social">
                  {data.nombre_razon_social ?? data.id_razon_social ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Empresa">
                  {data.nombre_empresa ?? data.id_empresa ?? "—"}
                </Descriptions.Item>
              </Descriptions>
        
              <Divider className="laboral-exp-section-divider" />
        
              {/* ===========================
                  SITUACIÓN LABORAL
              ============================ */}
              <Descriptions
                title="Situación laboral"
                bordered
                column={{ xs: 1, sm: 1, md: 2, lg: 3 }}
                size="small"
                labelStyle={{ width: 240 }}
                className="laboral-exp-descriptions laboral-exp-descriptions-main"
              >
                <Descriptions.Item label="Puesto">
                  {data.puesto_trabajador || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Horario">
                  {data.horario || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Día de descanso">
                  {data.dia_descanso || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Jornada semanal">
                  {data.jornada_semanal || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha ingreso">
                  {fmtDate(data.fecha_ingreso_trabajador)}
                </Descriptions.Item>
                <Descriptions.Item label="Último día laboral">
                  {fmtDate(data.ultimo_dia_laboral)}
                </Descriptions.Item>
                <Descriptions.Item label="Baja IMSS">
                  {data.baja_imss ? "Sí" : "No"}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha baja IMSS">
                  {fmtDate(data.fecha_baja_imss)}
                </Descriptions.Item>
                <Descriptions.Item label="Motivo de baja">
                  {data.motivo_baja || "—"}
                </Descriptions.Item>
              </Descriptions>
        
              <Divider className="laboral-exp-section-divider" />
        
              {/* ===========================
                  SUELDOS Y CONCEPTOS
              ============================ */}
              <Descriptions
                title="Sueldos y conceptos"
                bordered
                column={{ xs: 1, sm: 1, md: 2, lg: 3 }}
                size="small"
                labelStyle={{ width: 240 }}
                className="laboral-exp-descriptions laboral-exp-descriptions-main"
              >
                <Descriptions.Item label="Salario diario">
                  {data.ultimo_salario_diario || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Salario integrado">
                  {data.ultimo_salario_integrado || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Conceptos de salario">
                  {data.conceptos_salario || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Renuncia firmada">
                  {data.renuncia_firmada_trabajador ? "Sí" : "No"}
                </Descriptions.Item>
                <Descriptions.Item label="Finiquito firmado">
                  {data.finiquito_firmado ? "Sí" : "No"}
                </Descriptions.Item>
              </Descriptions>
        
              <Divider className="laboral-exp-section-divider" />
        
              {/* ===========================
                  PROCESO DE CONCILIACIÓN
              ============================ */}
              <Descriptions
                title="Proceso de conciliación"
                bordered
                column={{ xs: 1, sm: 1, md: 2, lg: 3 }}
                size="small"
                labelStyle={{ width: 240 }}
                className="laboral-exp-descriptions laboral-exp-descriptions-main"
              >
                <Descriptions.Item label="Específico">
                  {data.especifico || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Motivo real del trabajador">
                  {data.motivo_real_trabajdor || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Comentario">
                  {data.comentario || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Propuesta de conflicto">
                  {data.propuesta_conflicto || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Cantidad autorizada">
                  {data.cantidad_autorizada || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Cantidad autorizada (opción)">
                  {data.cantidad_autorizada_opcion || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Proporcionado por">
                  {data.proporcionado_nombre || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Puesto de quien proporciona">
                  {data.proporcionado_puesto || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha proporcionado">
                  {fmtDate(data.proporcionado_fecha)}
                </Descriptions.Item>
                <Descriptions.Item label="Código">
                  {data.code || "—"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </section>
  );
}

export default CardInfo;
