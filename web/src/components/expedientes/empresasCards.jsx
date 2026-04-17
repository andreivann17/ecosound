// src/components/expedientes/ExpedienteCards.jsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Typography,
  Divider,
  Table,
  Pagination,
  Segmented,
  Tooltip,
} from "antd";
import {
  FileTextOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StopOutlined,
  NumberOutlined,
  ApartmentOutlined,
  TeamOutlined,
} from "@ant-design/icons";

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
}) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "tabla"

  const {} = maps;

  const gridItems = useMemo(() => {
    if (Array.isArray(items)) return items;
    if (items && Array.isArray(items.items)) return items.items;
    return [];
  }, [items]);

  const isActiveTag = (row) => {
    const isActive = Number(row?.active) === 1;
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

  const clienteDirectoTag = (row) => {
    const isCliente = Number(row?.cliente_directo) === 1;
    return (
      <Tag color={isCliente ? "blue" : "default"} style={{ fontWeight: 600 }}>
        {isCliente ? "Cliente directo" : "Corresponsal"}
      </Tag>
    );
  };

  const getRazones = (row) => {
    const rs = Array.isArray(row?.razones_sociales) ? row.razones_sociales : [];
    return rs.filter(Boolean);
  };

  const getRazonPrincipal = (row) => {
    const rs = getRazones(row);
    if (rs.length === 0) return "—";
    return rs[0]?.nombre || rs[0]?.code || "—";
  };

  const getRazonesCount = (row) => getRazones(row).length;

  const getRazonesTooltip = (row) => {
    const rs = getRazones(row);
    if (rs.length === 0) return null;
    const names = rs
      .map((x) => x?.nombre || x?.code)
      .filter(Boolean);
    if (names.length === 0) return null;
    return (
      <div style={{ maxWidth: 520 }}>
        {names.slice(0, 30).map((n, idx) => (
          <div key={`${idx}-${n}`}>{n}</div>
        ))}
        {names.length > 30 && (
          <div style={{ marginTop: 8, fontWeight: 600 }}>
            + {names.length - 30} más
          </div>
        )}
      </div>
    );
  };

  const handleView = (row) => {
    navigate(`/empresas/${row.id}`, {
      state: {
        id: row.id,
        code: row.code,
        tipo,
        item: row,
      },
    });
  };

  const columns = [
    {
      title: "ID",
      key: "id",
      width: 90,
      render: (_, row) => (
        <Space size="small">
          <NumberOutlined />
          <Text strong>{row.id ?? "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Empresa",
      key: "nombre",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.nombre || "—"}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Código: {row.code || "—"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Razón social principal",
      key: "razon_principal",
      render: (_, row) => {
        const tooltip = getRazonesTooltip(row);
        const principal = getRazonPrincipal(row);
        const count = getRazonesCount(row);

        if (!tooltip) return <Text>{principal}</Text>;

        return (
          <Tooltip title={tooltip} placement="topLeft">
            <Space size={6}>
              <Text>{principal}</Text>
              {count > 1 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  (+{count - 1})
                </Text>
              )}
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: "Estatus",
      key: "active",
      width: 130,
      render: (_, row) => isActiveTag(row),
    },
    {
      title: "Tipo",
      key: "cliente_directo",
      width: 160,
      render: (_, row) => clienteDirectoTag(row),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 140,
      render: (_, row) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleView(row)}
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
              <ApartmentOutlined />
              <span>Empresas</span>
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
            {gridItems.map((row) => {
              const empresa = row?.nombre || "—";
              const code = row?.code || "—";
              const rsCount = getRazonesCount(row);
              const razonPrincipal = getRazonPrincipal(row);
              const tooltip = getRazonesTooltip(row);

              return (
                <Col key={row.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <Card
                    hoverable
                    className="exp-card"
                    bodyStyle={{ padding: 18 }}
                    style={{ marginInline: 6, marginTop: 24 }}
                  >
                    <Space
                      direction="vertical"
                      size={10}
                      style={{ width: "100%" }}
                    >
                      {/* Header */}
                      <Space
                        align="center"
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                          marginBottom: 12,
                        }}
                      >
                        <Space align="center">
                          <FileTextOutlined style={{ fontSize: 18 }} />
                          <Title level={5} style={{ margin: 0 }}>
                            {empresa}
                          </Title>
                        </Space>

                        <Space size={6}>
                          {isActiveTag(row)}
                        </Space>
                      </Space>

                      {/* Body */}
                      <Space direction="vertical" size={8} style={{ width: "100%" }}>
                        <Text type="secondary">
                          Código: <Text>{code}</Text>
                        </Text>

                        <Space size={8} wrap>
                          {clienteDirectoTag(row)}
                          <Tag icon={<TeamOutlined />} color="geekblue" style={{ fontWeight: 600 }}>
                            {rsCount} razones
                          </Tag>
                        </Space>

                        <div>
                          <Text type="secondary">Razón social:</Text>{" "}
                          {tooltip ? (
                            <Tooltip title={tooltip} placement="topLeft">
                              <Text style={{ cursor: "pointer" }}>{razonPrincipal}</Text>
                            </Tooltip>
                          ) : (
                            <Text>{razonPrincipal}</Text>
                          )}
                        </div>
                      </Space>

                      <Divider style={{ margin: "12px 0" }} />

                      {/* Actions */}
                      <div style={{ width: "100%" }}>
                        <Button
                          type="primary"
                          className="custom-button"
                          block
                          icon={<EyeOutlined />}
                          onClick={() => handleView(row)}
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
