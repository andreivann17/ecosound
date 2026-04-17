// src/components/desvinculaciones/detalles/DatosExpedienteCard.jsx
import React, { useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Descriptions,
  Divider,
  Typography,
  Button,
  Space,
  Tag,
  Image,
} from "antd";
import { FilePdfOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { fmtDate,fmtDateTime } from "../../conciliacion/detalles/laboralExpedienteFormatters";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {PATH} from "../../../redux/utils"
const API_BASE = PATH;
const { Text } = Typography;


function toTitleCase(str) {
  if (!str || typeof str !== "string") return "—";
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function safeText(v) {
  // IMPORTANTE: aquí sí mostramos "—" aunque venga null
  if (v === undefined || v === null) return "—";
  const s = String(v).trim();
  return s ? s : "—";
}
const getFechaBajaColor = (v) => {
  if (!v) return undefined;
  const d = dayjs(v);
  if (!d.isValid()) return undefined;

  // si la fecha/hora es después de ahora → Verde
  return d.isAfter(dayjs()) ? "#16a34a" : "#dc2626"; // red-600 / green-600
};


export default function DatosExpedienteCard({
  detalle,
  onExportPDF,
  exportingPDF = false,
      onDeleteExpediente, 
  deletingExp = false,
}) {
  const navigate = useNavigate();

  const labelStyle = {
    width: 210,
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#8c8c8c",
  };

  const contentStyle = {
    fontSize: 14,
    fontWeight: 500,
    color: "#1f1f1f",
    whiteSpace: "normal",
    wordBreak: "break-word",
  };

  const documentosActivos = useMemo(() => {
    const items = detalle?.documentos?.items;
    if (!Array.isArray(items)) return [];
    return items
      .filter((d) => Number(d?.active) === 1)
      .sort((a, b) =>
        String(b?.created_at || "").localeCompare(String(a?.created_at || ""))
      );
  }, [detalle]);

  const primaryDoc = documentosActivos[0] || null;

  const primaryPreviewUrl = useMemo(() => {
    const p0 = primaryDoc?.previews?.[0]?.url;
    if (!p0) return null;
    return `${API_BASE}${p0}`;
  }, [primaryDoc]);

  const primaryPdfUrl = useMemo(() => {
    const u = primaryDoc?.url;
    if (!u) return null;
    return `${API_BASE}${u}`;
  }, [primaryDoc]);

  // ✅ Empleados (amigable)
  const empleadosList = useMemo(() => {
    const arr = Array.isArray(detalle?.empleados) ? detalle.empleados : [];
    return arr
      .map((e) => String(e?.nombre_completo ?? e?.nombre_empleado ?? "").trim())
      .filter(Boolean);
  }, [detalle]);

  const empleadosCount = empleadosList.length;

  // ✅ Directo / Corresponsal (siempre mostrar aunque venga null)
  const esDirecto = useMemo(() => {
    const n = detalle?.nombre_corresponsal;
    const c = detalle?.correo_corresponsal;
    const t = detalle?.celular_corresponsal;
    // si cualquier dato de corresponsal existe => NO directo
    const hasCorresponsal =
      (n != null && String(n).trim() !== "") ||
      (c != null && String(c).trim() !== "") ||
      (t != null && String(t).trim() !== "");
    return !hasCorresponsal;
  }, [detalle]);

  const tipoClienteLabel = esDirecto ? "Directo" : "Corresponsal";
  const tipoClienteColor = esDirecto ? "green" : "gold";

  return (
    <div>
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <div className="laboral-exp-section-header">
          <div>
            <Text className="laboral-exp-section-title" style={{ fontSize: 18 }}>
              Datos de desvinculación
            </Text>
            <Text type="secondary" className="laboral-exp-section-sub">
              Información principal de la desvinculación
            </Text>
          </div>
      <Space>
 <Button
              type="default"
              icon={<EditOutlined />}
              onClick={() =>
                navigate(`/materias/laboral/desvinculaciones/${detalle.id}/editar`, {
                  state: {
                    idAutoridad: detalle.id_autoridad,
                    nombreIdentificacionCiudad: detalle.nombre_identificador,
                  },
                })
              }
            >
              Editar
            </Button>

            <Button onClick={onExportPDF} loading={exportingPDF} disabled={exportingPDF}>
              Exportar PDF
            </Button>
  <Button
    danger
    type="primary"
    icon={<DeleteOutlined />}
    onClick={() => onDeleteExpediente?.()}
    loading={deletingExp}
    disabled={deletingExp}
  >
    Eliminar
  </Button>
</Space>
        
        </div>
      </Card>

      <div
        style={{
          width: "100%",
          height: 22,
          background: "#f3f3f3",
          margin: "14px 0",
        }}
      />

      {/* =======================
          CARD: DATOS PRINCIPALES
         ======================= */}
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} lg={20}>
            <Descriptions
              title={null}
              bordered
              column={{ xs: 1, sm: 1, md: 2, lg: 2 }}
              size="small"
              labelStyle={labelStyle}
              contentStyle={contentStyle}
              className="laboral-exp-descriptions laboral-exp-descriptions-main"
            >
              <Descriptions.Item label="Código">
                <Text strong>{safeText(detalle.code)}</Text>
              </Descriptions.Item>

              {/* ✅ OMITIDO: Solicitante */}

              <Descriptions.Item label="Empresa">
                <Text strong>{toTitleCase(detalle.nombre_empresa)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Razón social">
                <Text strong>{toTitleCase(detalle.nombre_razon_social)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Fecha de solicitud">
                <Text strong>{fmtDate(detalle.fecha_encargo)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Fecha de la baja">
  <Text strong style={{ color: getFechaBajaColor(detalle.fecha_solicitacion) }}>
    {fmtDateTime(detalle.fecha_solicitacion)}
  </Text>
</Descriptions.Item>


              <Descriptions.Item label="Ciudad">
                <Text strong>{toTitleCase(detalle.nombre_ciudad)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Estado">
                <Text strong>{toTitleCase(detalle.nombre_estado)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Vía">
                {Number(detalle.is_privado) === 1 ? (
                  <Tag color="red">Privado</Tag>
                ) : (
                  <Tag color="green">Ante el Centro de Conciliación</Tag>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Notas">
                <Text strong>{safeText(detalle.notas)}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      <div
        style={{
          width: "100%",
          height: 22,
          background: "#f3f3f3",
          margin: "14px 0",
        }}
      />

      {/* =======================
          CARD: TIPO CLIENTE / CORRESPONSAL (SIEMPRE MOSTRAR)
         ======================= */}
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <div className="laboral-exp-section-header">
          <div>
            <Text className="laboral-exp-section-title" style={{ fontSize: 18 }}>
              Cliente y corresponsal
            </Text>
            <Text type="secondary" className="laboral-exp-section-sub">
              Información de contacto (aunque venga vacía)
            </Text>
          </div>
        </div>

        <Divider className="laboral-exp-section-divider" />

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={20}>
            <Descriptions
              title={null}
              bordered
              column={{ xs: 1, sm: 1, md: 2, lg: 2 }}
              size="small"
              labelStyle={labelStyle}
              contentStyle={contentStyle}
              className="laboral-exp-descriptions laboral-exp-descriptions-main"
            >
              <Descriptions.Item label="Tipo de cliente">
                <Tag color={tipoClienteColor}>{tipoClienteLabel}</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Corresponsal (nombre)">
                <Text strong>{safeText(detalle.nombre_corresponsal)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Corresponsal (correo)">
                <Text strong>{safeText(detalle.correo_corresponsal)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Corresponsal (celular)">
                <Text strong>{safeText(detalle.celular_corresponsal)}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      <div
        style={{
          width: "100%",
          height: 22,
          background: "#f3f3f3",
          margin: "14px 0",
        }}
      />

      {/* =======================
          CARD: EMPLEADOS
         ======================= */}
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <div className="laboral-exp-section-header">
          <div>
            <Text className="laboral-exp-section-title" style={{ fontSize: 18 }}>
              Empleados
            </Text>
            <Text type="secondary" className="laboral-exp-section-sub">
              {empleadosCount ? `Total: ${empleadosCount}` : "Sin empleados registrados"}
            </Text>
          </div>
        </div>

        <Divider className="laboral-exp-section-divider" />

        {empleadosCount ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {empleadosList.map((name, idx) => (
              <Tag key={`${name}-${idx}`} style={{ padding: "4px 10px", fontSize: 13 }}>
                {toTitleCase(name)}
              </Tag>
            ))}
          </div>
        ) : (
          <div style={{ padding: 12 }}>
            <Text strong>—</Text>
            <div style={{ marginTop: 6 }}>
              <Text type="secondary">
                Esta desvinculación no tiene empleados guardados en la base de datos.
              </Text>
            </div>
          </div>
        )}
      </Card>

      <div
        style={{
          width: "100%",
          height: 22,
          background: "#f3f3f3",
          margin: "14px 0",
        }}
      />

      {/* =======================
          CARD: DOCUMENTO
         ======================= */}
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <div className="laboral-exp-section-header">
          <div>
            <Text className="laboral-exp-section-title" style={{ fontSize: 18 }}>
              Documento
            </Text>
            <Text type="secondary" className="laboral-exp-section-sub">
              Vista previa del documento asociado a la desvinculación
            </Text>
          </div>
        </div>

        <Divider className="laboral-exp-section-divider" />

        <div className="laboral-exp-checklist-preview">
          <div className="laboral-exp-pdf-preview-wrapper laboral-exp-pdf-preview-wrapper--compact">
            {primaryDoc && primaryPreviewUrl ? (
              <div className="laboral-exp-pdf-preview-card">
                <div className="laboral-exp-pdf-preview-inner">
                  <Image.PreviewGroup>
                    <Image
                      className="laboral-exp-pdf-thumbnail"
                      src={primaryPreviewUrl}
                      alt="Vista previa del documento de desvinculación"
                      preview={{
                        maskClassName: "laboral-exp-pdf-mask",
                        mask: (
                          <span className="laboral-exp-pdf-mask-text">
                            <FilePdfOutlined style={{ marginRight: 8 }} />
                            Ver documento completo
                          </span>
                        ),
                      }}
                    />

                    {Array.isArray(primaryDoc?.previews) &&
                      primaryDoc.previews.slice(1).map((p) => (
                        <Image
                          key={`desv-page-${p.page ?? p.url}`}
                          src={`${API_BASE}${p.url}`}
                          alt={`Documento - página ${p.page}`}
                          style={{ display: "none" }}
                        />
                      ))}
                  </Image.PreviewGroup>

                  {/* si quieres el link al pdf (ya lo tenías calculado) */}
                  {/* {primaryPdfUrl ? (
                    <div style={{ marginTop: 10 }}>
                      <a href={primaryPdfUrl} target="_blank" rel="noreferrer">
                        Abrir PDF
                      </a>
                    </div>
                  ) : null} */}
                </div>
              </div>
            ) : (
              <div className="laboral-exp-checklist-summary" style={{ padding: 12 }}>
                <Text strong>Sin vista previa</Text>
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary">
                    No hay documento activo o no hay previews generados para esta desvinculación.
                  </Text>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
