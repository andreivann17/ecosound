// src/components/empresas/detalles/DatosCard.jsx
import React, { useMemo } from "react";
import { Card, Row, Col, Descriptions, Divider, Typography, Button, Space, Tag } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { fmtDate } from "../../conciliacion/detalles/laboralExpedienteFormatters";

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
  if (v === undefined || v === null) return "—";
  const s = String(v).trim();
  return s ? s : "—";
}

export default function DatosEmpresaCard({
  detalle,
  onExportPDF,
  exportingPDF = false,
  onDeleteEmpresa,
  deleting = false,
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

  const idEmpresa = detalle?.id_empresa ?? detalle?.id ?? null;

  const tipoClienteLabel = Number(detalle?.cliente_directo) === 1 ? "Directo" : "Corresponsal";
  const tipoClienteColor = Number(detalle?.cliente_directo) === 1 ? "green" : "gold";

  const razonesList = useMemo(() => {
    const rs = detalle?.razones_sociales;

    // Puede venir como:
    // - ["razon1", "razon2"]
    // - [{id, nombre}, ...]
    // - {items:[...]}
    const arr = Array.isArray(rs) ? rs : Array.isArray(rs?.items) ? rs.items : [];

    return arr
      .map((x) => {
        if (typeof x === "string") return x.trim();
        if (x && typeof x === "object") return String(x.nombre ?? x.code ?? "").trim();
        return "";
      })
      .filter(Boolean);
  }, [detalle]);

  return (
    <div>
      {/* Header acciones */}
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <div className="laboral-exp-section-header">
          <div>
            <Text className="laboral-exp-section-title" style={{ fontSize: 18 }}>
              Datos de empresa
            </Text>
            <Text type="secondary" className="laboral-exp-section-sub">
              Información principal de la empresa
            </Text>
          </div>

          <Space>
            <Button
              type="default"
              icon={<EditOutlined />}
              onClick={() => navigate(`/empresas/${idEmpresa}/editar`)}
              disabled={!idEmpresa}
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
              onClick={() => onDeleteEmpresa?.()}
              loading={deleting}
              disabled={deleting}
            >
              Eliminar
            </Button>
          </Space>
        </div>
      </Card>

      <div style={{ width: "100%", height: 22, background: "#f3f3f3", margin: "14px 0" }} />

      {/* DATOS PRINCIPALES */}
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} lg={20}>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 1, md: 2, lg: 2 }}
              size="small"
              labelStyle={labelStyle}
              contentStyle={contentStyle}
              className="laboral-exp-descriptions laboral-exp-descriptions-main"
            >
              <Descriptions.Item label="ID">
                <Text strong>{safeText(detalle?.id_empresa ?? detalle?.id)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Código">
                <Text strong>{safeText(detalle?.code)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Nombre">
                <Text strong>{toTitleCase(detalle?.nombre)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Activo">
                {Number(detalle?.active) === 1 ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>}
              </Descriptions.Item>

              <Descriptions.Item label="Tipo de cliente">
                <Tag color={tipoClienteColor}>{tipoClienteLabel}</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Creado">
                <Text strong>{fmtDate(detalle?.created_at)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Actualizado">
                <Text strong>{fmtDate(detalle?.updated_at)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Creado por (ID)">
                <Text strong>{safeText(detalle?.id_user_created)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Actualizado por (ID)">
                <Text strong>{safeText(detalle?.id_user_updated)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Abogado externo (ID)">
                <Text strong>{safeText(detalle?.id_abogado_externo)}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      <div style={{ width: "100%", height: 22, background: "#f3f3f3", margin: "14px 0" }} />

      {/* CONTACTO (UNIFICADO) */}
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <div className="laboral-exp-section-header">
          <div>
            <Text className="laboral-exp-section-title" style={{ fontSize: 18 }}>
              Contacto
            </Text>
            <Text type="secondary" className="laboral-exp-section-sub">
              Mismo contacto para directo o corresponsal
            </Text>
          </div>
        </div>

        <Divider className="laboral-exp-section-divider" />

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={20}>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 1, md: 2, lg: 2 }}
              size="small"
              labelStyle={labelStyle}
              contentStyle={contentStyle}
              className="laboral-exp-descriptions laboral-exp-descriptions-main"
            >
              <Descriptions.Item label="Nombre contacto">
                <Text strong>{safeText(detalle?.nombre_contacto)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Correo">
                <Text strong>{safeText(detalle?.correo)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Celular">
                <Text strong>{safeText(detalle?.celular)}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      <div style={{ width: "100%", height: 22, background: "#f3f3f3", margin: "14px 0" }} />

      {/* RAZONES SOCIALES */}
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <div className="laboral-exp-section-header">
          <div>
            <Text className="laboral-exp-section-title" style={{ fontSize: 18 }}>
              Razones sociales
            </Text>
            <Text type="secondary" className="laboral-exp-section-sub">
              {razonesList.length ? `Total: ${razonesList.length}` : "Sin razones sociales registradas"}
            </Text>
          </div>
        </div>

        <Divider className="laboral-exp-section-divider" />

        {razonesList.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {razonesList.map((name, idx) => (
              <Tag key={`${name}-${idx}`} style={{ padding: "4px 10px", fontSize: 13 }}>
                {toTitleCase(name)}
              </Tag>
            ))}
          </div>
        ) : (
          <div style={{ padding: 12 }}>
            <Text strong>—</Text>
            <div style={{ marginTop: 6 }}>
              <Text type="secondary">Esta empresa no tiene razones sociales guardadas.</Text>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
