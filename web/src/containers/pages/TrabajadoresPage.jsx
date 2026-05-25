import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  actionTrabajadoresGet,
  actionPuestosGet,
} from "../../redux/actions/trabajadores/trabajadores";

import {
  Button,
  Input,
  Select,
  Space,
  Typography,
  Row,
  Col,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
} from "@ant-design/icons";

import "./TrabajadoresPage.css";
import { PATH as API_BASE } from "../../redux/utils";

dayjs.locale("es");

const { Title, Text, Paragraph } = Typography;

export default function TrabajadoresPage() {
  const dispatch = useDispatch();
  const { items = [], puestos = [] } = useSelector((state) => state.trabajadores);
  const navigate = useNavigate();
  const { perm } = usePermisos() || { perm: () => true };
  const canConsultar = perm("trabajadores", "consultar");
  const canInsertar  = perm("trabajadores", "insertar");

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [puestoFilter, setPuestoFilter] = useState("todos");

  const lastFetchKey = useRef("");

  useEffect(() => {
    dispatch(actionPuestosGet());
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchParams = useMemo(
    () => ({ search: searchDebounced || undefined }),
    [searchDebounced]
  );

  useEffect(() => {
    const key = JSON.stringify(fetchParams);
    if (lastFetchKey.current === key) return;
    lastFetchKey.current = key;
    dispatch(actionTrabajadoresGet(fetchParams));
  }, [dispatch, fetchParams]);

  const filteredItems = useMemo(() => {
    let base = items;
    if (puestoFilter !== "todos") {
      base = base.filter((t) => t.id_puesto === puestoFilter);
    }
    return base;
  }, [items, puestoFilter]);

  const getInitials = (nombre, apellido) => {
    const a = (nombre || " ")[0] || "";
    const b = (apellido || " ")[0] || "";
    return (a + b).toUpperCase();
  };

  return (
    <main className="trab-main">
      <div className="trab-content">

        <section className="trab-header-section">
          <Space direction="vertical" size={2}>
            <Title level={2} className="trab-title">Trabajadores</Title>
            <Text className="trab-subtitle">Personal registrado en el sistema</Text>
          </Space>
        </section>

        <section className="trab-section">

          <div className="trab-filters-panel">
            <Row gutter={[16, 14]}>
              <Col xs={24} lg={14}>
                <div className="trab-field-label">Buscador</div>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o apellido..."
                  suffix={<SearchOutlined className="trab-input-suffix" />}
                  className="trab-control"
                  allowClear
                />
              </Col>

              <Col xs={24} lg={10}>
                <div className="trab-field-label">Puesto</div>
                <Select
                  value={puestoFilter}
                  onChange={(v) => setPuestoFilter(v)}
                  className="trab-control"
                  options={[
                    { label: "Todos", value: "todos" },
                    ...puestos.map((p) => ({
                      label: p.nombre,
                      value: p.id_puesto,
                    })),
                  ]}
                />
              </Col>
            </Row>

            <Row gutter={[16, 14]} style={{ marginTop: 14 }} align="bottom">
              <Col xs={24} lg={6}>
                <div className="trab-actions">
                  <Button
                    className="trab-btn-clean"
                    onClick={() => {
                      setSearch("");
                      setPuestoFilter("todos");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </Col>
            </Row>
          </div>

          <div className="trab-toolbar">
            <div className="trab-toolbar-left">
              <Title level={4} style={{ marginBottom: 0 }}>
                Trabajadores ({filteredItems.length})
              </Title>
              <Text type="secondary">{filteredItems.length} encontrados</Text>
            </div>
            <div className="trab-toolbar-right">
              {canInsertar && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/app/trabajadores/crear")}
                  className="laboral-btn-create custom-button"
                >
                  Nuevo trabajador
                </Button>
              )}
            </div>
          </div>

          {filteredItems.length === 0 && (
            <div className="trab-empty">
              <div style={{ fontSize: 16, fontWeight: 500 }}>Sin trabajadores que coincidan con los filtros</div>
            </div>
          )}

          <div className="trab-grid">
            {filteredItems.map((t) => (
              <div key={t.id_trabajador} className="trab-card">
                <div className="trab-card-image">
                  {t.path ? (
                    <img
                      src={`${API_BASE}/${t.path}`}
                      alt={`${t.nombre} ${t.apellido}`}
                      className="trab-card-img"
                    />
                  ) : (
                    <div className="trab-card-no-img">
                      <span className="trab-card-no-img-icon">📷</span>
                      <span className="trab-card-no-img-text">Sin imagen</span>
                    </div>
                  )}
                </div>

                <div className="trab-card-header">
                  <div className="trab-avatar">
                    {getInitials(t.nombre, t.apellido)}
                  </div>
                  <div className="trab-card-name-wrap">
                    <Paragraph className="trab-card-name" ellipsis={{ rows: 1 }}>
                      {t.nombre} {t.apellido}
                    </Paragraph>
                    {t.nombre_puesto && (
                      <span className="trab-puesto-badge">{t.nombre_puesto}</span>
                    )}
                  </div>
                </div>

                <div className="trab-card-body">
                  {t.fecha_nacimiento && (
                    <div className="trab-info-row">
                      <CalendarOutlined className="trab-info-icon" />
                      <div className="trab-info-text">
                        <span className="trab-info-label">Fecha de nacimiento</span>
                        <span className="trab-info-value">
                          {dayjs(t.fecha_nacimiento).format("D [de] MMMM YYYY")}
                        </span>
                      </div>
                    </div>
                  )}
                  {!t.fecha_nacimiento && (
                    <div className="trab-info-row">
                      <TeamOutlined className="trab-info-icon" />
                      <div className="trab-info-text">
                        <span className="trab-info-label">Personal</span>
                        <span className="trab-info-value">—</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="trab-card-footer">
                  <button
                    className="trab-btn-details"
                    onClick={() => canConsultar ? navigate(`/app/trabajadores/${t.id_trabajador}`) : undefined}
                    style={!canConsultar ? { cursor: "not-allowed", opacity: 0.45 } : {}}
                    title={!canConsultar ? "Sin permiso de consulta" : undefined}
                  >
                    VER DETALLES
                    <ArrowRightOutlined />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </section>
      </div>
    </main>
  );
}
