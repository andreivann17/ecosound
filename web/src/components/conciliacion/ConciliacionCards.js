// src/components/conciliacion/ConciliacionCards.js
import React, { useMemo } from "react";
import { Card, Row, Col, Tag, Button, Space, Typography, Tooltip, Divider } from "antd";
import {
  FileTextOutlined,
  IdcardOutlined,
  ApartmentOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text, Title } = Typography;

export default function ConciliacionCards({
  items = [],
  maps = {},
  tipo,
  idEstado,
  idCiudad,
}) {
  const {
    ciudadesById = {},
    estadosById = {},
    abogadosById = {},
    statusById = {},
    ambitoById = { 1: "Local", 2: "Federal" },
  } = maps;

  const navigate = useNavigate();

  const colorStatus = (idStatus) => {
    const map = { 2: "processing", 1: "success", 3: "warning", 4: "default", 5: "error" };
    return map[idStatus] || "default";
  };

  const gridItems = useMemo(() => {
    if (Array.isArray(items)) return items;
    if (items && Array.isArray(items.items)) return items.items;
    return [];
  }, [items]);

  const handleView = (exp) => {
    alert(1)
    navigate(
      `/materias/laboral/${tipo}/estado/${idEstado}/ciudad/${idCiudad}/expediente/${exp.id}`,
      { state: { expediente: exp } }
    );
  };

  return (
    <>
      <Row gutter={[24, 24]} style={{ marginTop: 12 }}>
        {gridItems.map((exp) => {
          const ciudadName =
            ciudadesById[exp.id_ciudad]?.nombre ||
            ciudadesById[exp.id_ciudad] ||
            `Ciudad #${exp.id_ciudad ?? "—"}`;

          const ambitoName = ambitoById[exp.id_ambito] || `Ámbito #${exp.id_ambito ?? "—"}`;
          const statusName = exp.status;

          const abogadoName =
            abogadosById[exp.id_abogado]?.nombre ||
            abogadosById[exp.id_abogado] ||
            `Abogado #${exp.id_abogado ?? "—"}`;

          return (
            <Col key={exp.id} xs={24} sm={12} md={12} lg={8} xl={6}>
              <Card
                hoverable
                className="exp-card"
                bodyStyle={{ padding: 18 }}
                style={{ marginInline: 6, marginTop: 40 }}
              >
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
                    <Space align="center">
                      <FileTextOutlined style={{ fontSize: 18 }} />
                      <Title level={5} style={{ margin: 0 }}>
                        {exp.expediente}
                      </Title>
                    </Space>
                    <Tag color={colorStatus(exp.id_conciliacion_status)}>{statusName}</Tag>
                  </Space>

                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Space size="small">
                      <ApartmentOutlined />
                      <Text type="secondary">{ambitoName}</Text>
                    </Space>

                    <Space size="small">
                      <EnvironmentOutlined />
                      <Text type="secondary">{ciudadName}</Text>
                    </Space>

                    <Space size="small">
                      <CalendarOutlined />
                      <Text type="secondary">
                        Expediente Creado:{" "}
                        {new Date(exp.fecha_creacion_expediente).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </Text>
                    </Space>

                    <Space size="small">
                      <IdcardOutlined />
                      <Tooltip title={abogadoName}>
                        <Text type="secondary" ellipsis style={{ maxWidth: 240 }}>
                          Abogado: {abogadoName}
                        </Text>
                      </Tooltip>
                    </Space>
                  </Space>

                  <Divider style={{ margin: "12px 0" }} />

                  <Tooltip title={exp.especifico}>
                    <Text ellipsis style={{ display: "block" }}>
                      {exp.especifico || "—"}
                    </Text>
                  </Tooltip>

                  <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                    <Button
                      type="primary"
                      icon={<EyeOutlined />}
                      onClick={() => handleView(exp)}
                    >
                      Ver detalles
                    </Button>
                  </Space>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>

      <style>{`
        .exp-card {
          border-radius: 16px;
          box-shadow: 0 8px 18px rgba(0,0,0,0.07);
          border: 1px solid #efefef;
          transition: box-shadow 180ms ease, transform 180ms ease;
        }
        .exp-card:hover {
          box-shadow: 0 14px 28px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }
      `}</style>
    </>
  );
}
