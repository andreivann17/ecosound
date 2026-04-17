// src/components/expedientes/ExpedienteCards.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Typography,
  Tooltip,
  Divider,
  Table,
  Pagination,
  Segmented,
} from "antd";
import {
  FileTextOutlined,
  CalendarOutlined,
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  CheckCircleOutlined,
  StopOutlined,
  UserDeleteOutlined,
  NumberOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

const { Text, Title } = Typography;

export default function ExpedienteCards({
  items = [],
  maps = {},
  tipo,
  idEstado,
  idCiudad,
  PAGE_SIZE = 12,
  filteredExpedientes = [],
  currentPage = 1,
  setCurrentPage = () => {},
  persistSearch, // ✅ NUEVO
}) {

  const navigate = useNavigate();

const location = useLocation();
const qs = persistSearch ?? location.search ?? "";

  const [viewMode, setViewMode] = useState("cards"); // "cards" | "tabla"

  // Si luego metes relaciones (empresa/ciudad/usuario), aquí lo conectas.
  const {} = maps;

  const gridItems = useMemo(() => {
    if (Array.isArray(items)) return items;
    if (items && Array.isArray(items.items)) return items.items;
    return [];
  }, [items]);

  const fmtDate = (v) => {
    if (!v) return "—";
    const d = dayjs(v);
    if (!d.isValid()) return "—";
    return d.format("D [de] MMMM [del] YYYY");
  };

  const fmtDateTime = (v) => {
    if (!v) return "—";
    const d = dayjs(v);
    if (!d.isValid()) return "—";
    return d.format("D [de] MMMM [del] YYYY [a las] HH:mm");
  };

  const activoTag = (exp) => {
    const isActive = Number(exp?.active) === 1;
    return (
      <Tag
        icon={isActive ? <CheckCircleOutlined /> : <StopOutlined />}
        color={isActive ? "success" : "default"}
        style={{ fontWeight: 600 }}
      >
        {isActive ? "Activo" : "Inactivo"}
      </Tag>
    );
  };

 const handleView = (exp) => {
  navigate(`/materias/laboral/desvinculaciones/${exp.id}${qs}`, {
    state: {
      id: exp.id,
      code: exp.code,
      tipo,
      item: exp,
    },
  });
};


  const columns = [
    {
      title: "Folio",
      key: "folio",
      width: 90,
      render: (_, exp) => (
        <Space size="small">
          <NumberOutlined />
          <Text strong>{exp.code ?? exp.id ?? "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Solicitante",
      key: "nombre_solicitante",
      render: (_, exp) => (
        <Text>{exp.nombre_solicitante || "—"}</Text>
      ),
    },
    {
      title: "Fecha de encargo",
      key: "fecha_encargo",
      render: (_, exp) => <Text type="secondary">{fmtDate(exp.fecha_encargo)}</Text>,
    },
    {
      title: "Fecha de solicitud",
      key: "fecha_solicitacion",
      render: (_, exp) => <Text type="secondary">{fmtDate(exp.fecha_solicitacion)}</Text>,
    },
 
 
   
    {
      title: "Acciones",
      key: "acciones",
      width: 140,
      render: (_, exp) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleView(exp)}
        >
          Ver
        </Button>
      ),
    },
  ];

  const showPagination = filteredExpedientes.length > PAGE_SIZE;

  return (
    <>
      <Card
        className="laboral-expedientes-card"
        title={
          <div className="exp-card-title-row">
            <Space>
              <UserDeleteOutlined />
              <span>Lista de bajas</span>
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
              const folio = exp.code ?? exp.id ?? "—";
              const solicitante = exp.nombre_solicitante || "—";

              return (
                <Col key={exp.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <Card
                    hoverable
                    className="exp-card"
                    bodyStyle={{ padding: 18 }}
                    style={{ marginInline: 6, marginTop: 24 }}
                  >
                    <Space direction="vertical" size={10} style={{ width: "100%" }}>
                      {/* Header */}
                      <Space
                        align="center"
                        style={{ width: "100%", justifyContent: "space-between",marginBottom:20 }}
                      >
                        <Space align="center">
                          <FileTextOutlined style={{ fontSize: 18 }} />
                          <Title level={5} style={{ margin: 0 }}>
                            {solicitante} VS {exp.nombre_empresa}
                          </Title>
                        </Space>

                      
                      </Space>

                      {/* Body */}
                      <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    

                        <Space size="small">
                          <CalendarOutlined />
                          <Text type="secondary">
                            Encargo: <Text>{fmtDate(exp.fecha_encargo)}</Text>
                          </Text>
                        </Space>

                        <Space size="small">
                          <CalendarOutlined />
                          <Text type="secondary">
                            Solicitud: <Text>{fmtDate(exp.fecha_solicitacion)}</Text>
                          </Text>
                        </Space>

                      
                      </Space>

                      <Divider style={{ margin: "12px 0" }} />

                      {/* Actions */}
                      <div style={{ width: "100%" }}>
                        <Button
                          type="primary"
                          className="custom-button"
                          block
                          icon={<EyeOutlined />}
                          onClick={() => handleView(exp)}
                        >
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
            <Table
              dataSource={gridItems}
              rowKey="id"
              columns={columns}
              size="middle"
              pagination={{ pageSize: 10 }}
            />
          </div>
        )}

        {showPagination && (
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
  <div
    style={{
      padding: "36px 12px",
      textAlign: "center",
      color: "rgba(0,0,0,0.55)",
    }}
  >
    <div style={{ fontSize: 16, fontWeight: 500 }}>
      Sin información por el momento
    </div>
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
