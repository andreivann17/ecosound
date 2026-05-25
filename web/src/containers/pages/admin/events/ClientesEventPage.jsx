import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { actionClientesEventsGet } from "../../../../redux/actions/clientes_events/clientes_events";
import { Button, Input, Typography, Row, Col, Card, Space } from "antd";
import {
  PlusOutlined, SearchOutlined, ArrowRightOutlined,
  UserOutlined, MailOutlined, PhoneOutlined, CalendarOutlined,
  CheckCircleFilled, StopOutlined,
} from "@ant-design/icons";
import "../../TrabajadoresPage.css";
import "./events-detail.css";

dayjs.locale("es");
const { Title, Text, Paragraph } = Typography;
const BLUE = "#01369e";

const getInitials = (n, a) => ((n || " ")[0] + (a || " ")[0]).toUpperCase();

export default function ClientesEventPage({ onNavigate }) {
  const dispatch = useDispatch();
  const { items = [], loading } = useSelector((s) => s.clientes_events);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statFilter, setStatFilter] = useState("todos");
  const lastKey = useRef("");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchParams = useMemo(() => ({ search: searchDebounced || undefined }), [searchDebounced]);

  useEffect(() => {
    const key = JSON.stringify(fetchParams);
    if (lastKey.current === key) return;
    lastKey.current = key;
    dispatch(actionClientesEventsGet(fetchParams));
  }, [dispatch, fetchParams]);

  const counts = useMemo(() => ({
    activos:   items.filter((c) => c.habilitar_sistema).length,
    inactivos: items.filter((c) => !c.habilitar_sistema).length,
  }), [items]);

  const filteredItems = useMemo(() => {
    if (statFilter === "activos")   return items.filter((c) => c.habilitar_sistema);
    if (statFilter === "inactivos") return items.filter((c) => !c.habilitar_sistema);
    return items;
  }, [items, statFilter]);

  return (
    <div>
      <div className="trab-filters-panel">
        <Row gutter={[16, 14]}>
          <Col xs={24} lg={16}>
            <div className="trab-field-label">Buscador</div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, correo o RFC..."
              suffix={<SearchOutlined className="trab-input-suffix" />}
              className="trab-control"
              allowClear
            />
          </Col>
          <Col xs={24} lg={8}>
            <div className="trab-field-label" style={{ opacity: 0 }}>.</div>
            <Button
              className="trab-btn-clean"
              onClick={() => { setSearch(""); setStatFilter("todos"); }}
              style={{ width: "100%" }}
            >
              Limpiar filtros
            </Button>
          </Col>
        </Row>
      </div>

      {/* Stat filter cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "16px 0" }}>
        <Card
          className={`eventos-stat-card eventos-stat-activos${statFilter === "activos" ? " eventos-stat-active" : ""}`}
          hoverable
          onClick={() => setStatFilter((p) => p === "activos" ? "todos" : "activos")}
        >
          <Space align="center" size={10}>
            <div className="eventos-stat-icon"><CheckCircleFilled /></div>
            <div>
              <div className="eventos-stat-value">{counts.activos}</div>
              <div className="eventos-stat-label">Activos</div>
            </div>
          </Space>
        </Card>

        <Card
          className={`eventos-stat-card eventos-stat-inactivos${statFilter === "inactivos" ? " eventos-stat-active" : ""}`}
          hoverable
          onClick={() => setStatFilter((p) => p === "inactivos" ? "todos" : "inactivos")}
        >
          <Space align="center" size={10}>
            <div className="eventos-stat-icon"><StopOutlined /></div>
            <div>
              <div className="eventos-stat-value">{counts.inactivos}</div>
              <div className="eventos-stat-label">Inactivos</div>
            </div>
          </Space>
        </Card>
      </div>

      <div className="trab-toolbar">
        <div className="trab-toolbar-left">
          <Title level={4} style={{ marginBottom: 0 }}>Clientes ({filteredItems.length})</Title>
          <Text type="secondary">{filteredItems.length} encontrados</Text>
        </div>
        <div className="trab-toolbar-right">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => onNavigate({ type: "crear" })}
            style={{ background: BLUE, borderColor: BLUE }}
          >
            Nuevo cliente
          </Button>
        </div>
      </div>

      {filteredItems.length === 0 && !loading && (
        <div className="trab-empty">
          <div style={{ fontSize: 16, fontWeight: 500 }}>Sin clientes registrados</div>
        </div>
      )}

      <div className="trab-grid events-clients">
        {filteredItems.map((c) => (
          <div key={c.id_cliente} className="trab-card">
            <div className="trab-card-header">
              <div className="trab-avatar" style={{ background: BLUE }}>
                {getInitials(c.nombre_cliente, c.apellido_cliente)}
              </div>
              <div className="trab-card-name-wrap">
                <Paragraph className="trab-card-name" ellipsis={{ rows: 1 }}>
                  {c.nombre_cliente} {c.apellido_cliente}
                </Paragraph>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                  background: c.habilitar_sistema ? "#dcfce7" : "#fee2e2",
                  color: c.habilitar_sistema ? "#15803d" : "#b91c1c",
                }}>
                  {c.habilitar_sistema ? <><CheckCircleFilled /> Activo</> : <><StopOutlined /> Inactivo</>}
                </span>
              </div>
            </div>

            <div className="trab-card-body">
              {c.correo && (
                <div className="trab-info-row">
                  <MailOutlined className="trab-info-icon" />
                  <div className="trab-info-text">
                    <span className="trab-info-label">Correo</span>
                    <span className="trab-info-value" style={{ fontSize: 11 }}>{c.correo}</span>
                  </div>
                </div>
              )}
              {c.celular && (
                <div className="trab-info-row">
                  <PhoneOutlined className="trab-info-icon" />
                  <div className="trab-info-text">
                    <span className="trab-info-label">Celular</span>
                    <span className="trab-info-value">{c.celular}</span>
                  </div>
                </div>
              )}
              {c.fecha_proxima_pago && (
                <div className="trab-info-row">
                  <CalendarOutlined className="trab-info-icon" />
                  <div className="trab-info-text">
                    <span className="trab-info-label">Próximo pago</span>
                    <span className="trab-info-value">{dayjs(c.fecha_proxima_pago).format("D MMM YYYY")}</span>
                  </div>
                </div>
              )}
              {!c.correo && !c.celular && !c.fecha_proxima_pago && (
                <div className="trab-info-row">
                  <UserOutlined className="trab-info-icon" />
                  <div className="trab-info-text">
                    <span className="trab-info-label">RFC</span>
                    <span className="trab-info-value">{c.rfc || "—"}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="trab-card-footer">
              <button
                className="trab-btn-details"
                style={{ background: BLUE }}
                onClick={() => onNavigate({ type: "detalle", id: c.id_cliente })}
              >
                VER DETALLES <ArrowRightOutlined />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
