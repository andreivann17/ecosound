// src/components/expedientes/TribunalCards.jsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Row, Col, Tag, Button, Space, Typography, Tooltip, Divider, Table, Pagination, Segmented } from "antd";
import {
  FileTextOutlined,
  IdcardOutlined,
  ApartmentOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  EyeOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

const { Text, Title } = Typography;

export default function TribunalCards({
  items = [],
  maps = {},
  tipo,
  PAGE_SIZE,
  filteredExpedientes = [],
  currentPage,
  setCurrentPage,
}) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "tabla"

  const { ciudadesById = {}, estadosById = {} } = maps;

  const gridItems = useMemo(() => {
    if (Array.isArray(items)) return items;
    if (items && Array.isArray(items.items)) return items.items;
    return [];
  }, [items]);

  const hasCitatorio = (exp) => {
    const doc = exp.id_tribunal_documento_citatorio;
    return doc !== null && doc !== undefined && Number(doc) !== 0;
  };

  const tagCitatorio = (exp) => {
    return hasCitatorio(exp) ? (
      <Tag icon={<InfoCircleOutlined />} color="green" style={{ fontWeight: "bold" }}>
        CON CITATORIO
      </Tag>
    ) : (
      <Tag icon={<InfoCircleOutlined />} color="red" style={{ fontWeight: "bold" }}>
        SIN CITATORIO
      </Tag>
    );
  };

  const fmt = (d) => (d ? dayjs(d).isValid() ? dayjs(d).format("D [de] MMMM [del] YYYY") : "—" : "—");

  const handleView = (exp) => {
    const id = exp?.id;
    if (!id) return;

    // ✅ TRIBUNAL (no centro-conciliación)
    navigate(`/materias/laboral/tribunal/${id}`, {
      state: {
        id,
        expediente: exp.expediente,
        tipo,
      },
    });
  };

  const columns = [
    {
      title: "Trabajador vs",
      key: "vs",
      render: (_, exp) => (
        <span>
          <b>{exp.nombre_trabajador || "—"}</b> vs {exp.accion_intentada || "—"}
        </span>
      ),
    },
    {
      title: "Autoridad",
      key: "autoridad",
      render: (_, exp) => <Text>{exp.nombre_autoridad || "—"}</Text>,
    },
    {
      title: "Recepción demanda",
      key: "fecha_recepcion_demanda",
      render: (_, exp) => <Text>{fmt(exp.fecha_recepcion_demanda)}</Text>,
    },
    {
      title: "Límite contestación",
      key: "fecha_limite_contestacion",
      render: (_, exp) => <Text>{fmt(exp.fecha_limite_contestacion)}</Text>,
    },
    {
      title: "Audiencia conciliadora",
      key: "fecha_audiencia_conciliadora",
      render: (_, exp) => <Text>{fmt(exp.fecha_audiencia_conciliadora)}</Text>,
    },
    {
      title: "Citatorio",
      key: "citatorio",
      render: (_, exp) => tagCitatorio(exp),
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_, exp) => (
        <Button type="primary" size="small" icon={<EyeOutlined />} onClick={() => handleView(exp)}>
          Ver detalles
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card
        className="laboral-expedientes-card"
        title={
          <div className="exp-card-title-row">
            <Space>
              <FileTextOutlined />
              <span>Lista de expedientes</span>
            </Space>

            <Space size={8}>
              <Text type="secondary">Vista:</Text>
              <Segmented
                options={[
                  { label: "Tarjetas", value: "cards" },
                  { label: "Tabla", value: "tabla" },
                ]}
                value={viewMode}
                onChange={setViewMode}
              />
            </Space>
          </div>
        }
      >
        {viewMode === "cards" && (
          <Row gutter={[24, 24]} style={{ marginTop: 12 }}>
            {gridItems.map((exp) => {
              const idUnico = exp.expediente || exp.id || "—";

              return (
                <Col key={exp.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <Card hoverable className="exp-card" bodyStyle={{ padding: 18 }} style={{ marginInline: 6, marginTop: 40 }}>
                    <Space direction="vertical" size={10} style={{ width: "100%" }}>
                      <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
                        <Space align="center">
                          <FileTextOutlined style={{ fontSize: 18 }} />
                          <Title level={5} style={{ margin: 0 }}>
                            {exp.nombre_trabajador || "—"} vs {exp.accion_intentada || "—"}
                          </Title>
                        </Space>

                        {tagCitatorio(exp)}
                      </Space>

                      <Space direction="vertical" size={8} style={{ width: "100%" }}>
                        <Space size="small">
                          <ApartmentOutlined />
                          <Text type="secondary">{exp.nombre_autoridad || "—"}</Text>
                        </Space>

                        <Space size="small">
                          <EnvironmentOutlined />
                          <Text type="secondary">
                            {exp.nombre_estado || "—"} / {exp.nombre_ciudad || "—"}
                          </Text>
                        </Space>

                        <Space size="small">
                          <CalendarOutlined />
                          <Text type="secondary">
                            Recepción demanda: <Text>{fmt(exp.fecha_recepcion_demanda)}</Text>
                          </Text>
                        </Space>

                        <Space size="small">
                          <CalendarOutlined />
                          <Text type="secondary">
                            Límite contestación: <Text>{fmt(exp.fecha_limite_contestacion)}</Text>
                          </Text>
                        </Space>

                        <Space size="small">
                          <CalendarOutlined />
                          <Text type="secondary">
                            Audiencia conciliadora: <Text>{fmt(exp.fecha_audiencia_conciliadora)}</Text>
                          </Text>
                        </Space>

                        <Space size="small">
                          <IdcardOutlined />
                          <Tooltip title={String(idUnico)}>
                            <Text type="secondary" ellipsis style={{ maxWidth: 240 }}>
                              Núm. expediente: {String(idUnico)}
                            </Text>
                          </Tooltip>
                        </Space>
                      </Space>

                      <Divider style={{ margin: "12px 0" }} />

                      <div style={{ width: "100%" }}>
                        <Button type="primary" className="custom-button" block icon={<EyeOutlined />} onClick={() => handleView(exp)}>
                          Ver detalles
                        </Button>
                      </div>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

        {viewMode === "tabla" && (
          <div style={{ marginTop: 12 }}>
            <Table dataSource={gridItems} rowKey="id" columns={columns} size="middle" pagination={{ pageSize: 10 }} />
          </div>
        )}

        {filteredExpedientes.length > PAGE_SIZE && (
          <div style={{ marginTop: 16, textAlign: "right" }}>
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={filteredExpedientes.length}
              onChange={(page) => setCurrentPage(page)}
              size="small"
              showSizeChanger={false}
            />
          </div>
        )}

        {gridItems.length === 0 && (
          <div style={{ padding: "36px 12px", textAlign: "center", color: "rgba(0,0,0,0.55)" }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Sin información por el momento</div>
          </div>
        )}
      </Card>

      <style>{`
        .laboral-expedientes-card {
          border-radius: 14px !important;
          box-shadow: 0 4px 14px rgba(15, 34, 58, 0.08);
          border: none !important;
        }

        .exp-card-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 12px;
        }

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

        @media (max-width: 768px) {
          .exp-card-title-row {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  );
}
