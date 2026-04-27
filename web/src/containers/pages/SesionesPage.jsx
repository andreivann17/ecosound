import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { actionSesionesFotosGet } from "../../redux/actions/sesiones_fotos/sesiones_fotos";
import dayjs from "dayjs";
import "dayjs/locale/es";

import {
  Button,
  Input,
  DatePicker,
  Typography,
  Row,
  Col,
  Pagination,
  Card,
  Space,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  CommentOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

import "./EventosPage.css";

dayjs.locale("es");

const { RangePicker } = DatePicker;
const { Title, Text, Paragraph } = Typography;

const PAGE_SIZE = 20;

const fmtFecha = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D [de] MMMM [del] YYYY") : "—";
};

const fmtHora = (v) => {
  if (!v) return null;
  const d = dayjs(v);
  return d.isValid() ? d.format("HH:mm") : null;
};

export default function SesionesFotosPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items = [], loading = false } = useSelector((state) => state.sesiones_fotos ?? {});

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [statFilter, setStatFilter] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const lastFetchKey = useRef("");

  const fetchParams = useMemo(
    () => ({
      search: searchDebounced || undefined,
      date_from: dateRange?.[0] ? dayjs(dateRange[0]).format("YYYY-MM-DD") : undefined,
      date_to: dateRange?.[1] ? dayjs(dateRange[1]).format("YYYY-MM-DD") : undefined,
      limit: 500,
    }),
    [searchDebounced, dateRange]
  );

  useEffect(() => {
    const key = JSON.stringify(fetchParams);
    if (lastFetchKey.current === key) return;
    lastFetchKey.current = key;
    dispatch(actionSesionesFotosGet(fetchParams));
  }, [dispatch, fetchParams]);

  const today = dayjs().startOf("day");

  const esProgramada = (r) => !!r.fecha_sesion && !dayjs(r.fecha_sesion).isBefore(today);
  const esRealizada  = (r) => !!r.fecha_sesion && dayjs(r.fecha_sesion).isBefore(today);

  const filteredItems = useMemo(() => {
    let base = items;

    if (searchDebounced) {
      const q = searchDebounced.toLowerCase();
      base = base.filter(
        (r) =>
          (r.nombre_cliente || "").toLowerCase().includes(q) ||
          (r.lugar || "").toLowerCase().includes(q) ||
          (r.comentarios || "").toLowerCase().includes(q)
      );
    }

    if (dateRange?.[0] && dateRange?.[1]) {
      const from = dayjs(dateRange[0]).startOf("day");
      const to   = dayjs(dateRange[1]).endOf("day");
      base = base.filter((r) => {
        if (!r.fecha_sesion) return false;
        const d = dayjs(r.fecha_sesion);
        return d.isAfter(from) && d.isBefore(to);
      });
    }

    if (statFilter === "programadas") return base.filter(esProgramada);
    if (statFilter === "realizadas")  return base.filter(esRealizada);
    return base;
  }, [items, statFilter, searchDebounced, dateRange]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const counts = useMemo(() => ({
    programadas: items.filter(esProgramada).length,
    realizadas:  items.filter(esRealizada).length,
  }), [items]);

  const getBottomStrip = (row) => {
    if (esProgramada(row)) return { cls: "is-yellow", label: "PROGRAMADA", extra: fmtHora(row.fecha_sesion) };
    if (esRealizada(row))  return { cls: "is-green",  label: "REALIZADA",  extra: null };
    return { cls: "is-red", label: "SIN FECHA", extra: null };
  };

  return (
    <main className="eventos-main">
      <div className="eventos-content">

        <section className="eventos-header-section">
          <div>
            <Space direction="vertical" size={2}>
              <Title level={2} className="eventos-title">Sesiones</Title>
              <Text className="eventos-subtitle">Gestión de sesiones fotográficas</Text>
            </Space>
          </div>
        </section>

        <section className="eventos-section">

          {/* Filtros */}
          <div className="eventos-filters-panel">
            <Row gutter={[16, 14]}>
              <Col xs={24} lg={12}>
                <div>
                  <div className="eventos-field-label">Buscador</div>
                  <Input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Buscar por cliente, lugar o comentarios..."
                    suffix={<SearchOutlined className="eventos-input-suffix" />}
                    className="eventos-control"
                    allowClear
                  />
                </div>
              </Col>

              <Col xs={24} lg={9}>
                <div>
                  <div className="eventos-field-label">Fecha de la sesión</div>
                  <RangePicker
                    value={dateRange}
                    onChange={(v) => { setDateRange(v); setCurrentPage(1); }}
                    format="DD/MM/YYYY"
                    placeholder={["Desde", "Hasta"]}
                    className="eventos-control"
                  />
                </div>
              </Col>

              <Col xs={24} lg={3}>
                <div className="eventos-actions" style={{ paddingTop: 24 }}>
                  <Button
                    className="eventos-btn-clean"
                    onClick={() => {
                      setSearch("");
                      setDateRange(null);
                      setStatFilter("todos");
                      setCurrentPage(1);
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </Col>
            </Row>
          </div>

          {/* Stats */}
          <div className="eventos-stats-row" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <Card
              className={`eventos-stat-card eventos-stat-activos ${statFilter === "programadas" ? "eventos-stat-active" : ""}`}
              hoverable
              onClick={() => { setStatFilter(p => p === "programadas" ? "todos" : "programadas"); setCurrentPage(1); }}
            >
              <Space align="center" size={10}>
                <div className="eventos-stat-icon"><CheckCircleOutlined /></div>
                <div>
                  <div className="eventos-stat-value">{counts.programadas}</div>
                  <div className="eventos-stat-label">Programadas</div>
                </div>
              </Space>
            </Card>

            <Card
              className={`eventos-stat-card eventos-stat-inactivos ${statFilter === "realizadas" ? "eventos-stat-active" : ""}`}
              hoverable
              onClick={() => { setStatFilter(p => p === "realizadas" ? "todos" : "realizadas"); setCurrentPage(1); }}
            >
              <Space align="center" size={10}>
                <div className="eventos-stat-icon"><CameraOutlined /></div>
                <div>
                  <div className="eventos-stat-value">{counts.realizadas}</div>
                  <div className="eventos-stat-label">Realizadas</div>
                </div>
              </Space>
            </Card>
          </div>

          {/* Toolbar */}
          <div className="eventos-toolbar">
            <div className="eventos-toolbar-left">
              <Title level={4} style={{ marginBottom: 0 }}>
                Sesiones ({filteredItems.length})
              </Title>
              <Text type="secondary">{filteredItems.length} encontradas</Text>
            </div>
            <div className="eventos-toolbar-right">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/sesiones/crear")}
                className="laboral-btn-create custom-button"
              >
                Nueva Sesión
              </Button>
            </div>
          </div>

          {/* Grid */}
          <div className="eventos-expedientes-card">
            <div className="eventos-grid">
              {paginatedItems.map((row) => {
                const strip = getBottomStrip(row);
                const statusKey = esProgramada(row) ? "activo" : esRealizada(row) ? "realizada" : "cancelado";
                const statusLabel = { activo: "Programada", realizada: "Realizada", cancelado: "Sin fecha" }[statusKey];

                return (
                  <div key={row.id_sesion} className="evento-card">
                    <div className="evento-card-header">
                      <div className="evento-card-head">
                        <Paragraph className="evento-card-name" ellipsis={{ rows: 2 }}>
                          {row.nombre_cliente || "—"}
                        </Paragraph>
                        <span className={`evento-status-badge evento-status-${statusKey}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    <div className="evento-card-body">
                      {row.lugar && (
                        <div className="evento-info-row">
                          <EnvironmentOutlined className="evento-info-icon" />
                          <div className="evento-info-text">
                            <span className="evento-info-label">Lugar</span>
                            <span className="evento-info-value">{row.lugar}</span>
                          </div>
                        </div>
                      )}
                      {row.fecha_sesion && (
                        <div className="evento-info-row">
                          <CalendarOutlined className="evento-info-icon" />
                          <div className="evento-info-text">
                            <span className="evento-info-label">Fecha</span>
                            <span className="evento-info-value">{fmtFecha(row.fecha_sesion)}</span>
                          </div>
                        </div>
                      )}
                      {fmtHora(row.fecha_sesion) && (
                        <div className="evento-info-row">
                          <ClockCircleOutlined className="evento-info-icon" />
                          <div className="evento-info-text">
                            <span className="evento-info-label">Hora</span>
                            <span className="evento-info-value">{fmtHora(row.fecha_sesion)}</span>
                          </div>
                        </div>
                      )}
                      {row.comentarios && (
                        <div className="evento-info-row">
                          <CommentOutlined className="evento-info-icon" />
                          <div className="evento-info-text">
                            <span className="evento-info-label">Comentarios</span>
                            <span className="evento-info-value" style={{ fontStyle: "italic", color: "#64748b" }}>
                              {row.comentarios}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="evento-card-footer">
                      <div className={`evento-bottom-strip ${strip.cls}`}>
                        <span className="evento-strip-label">{strip.label}</span>
                        {strip.extra && (
                          <span className="evento-strip-amount" style={{ fontSize: 13 }}>{strip.extra}</span>
                        )}
                      </div>
                      <button
                        className="evento-btn-details"
                        onClick={() => navigate(`/sesiones/${row.id_sesion}`)}
                      >
                        VER DETALLES
                        <ArrowRightOutlined />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {paginatedItems.length === 0 && (
              <div style={{ padding: "36px 12px", textAlign: "center", color: "rgba(0,0,0,0.55)" }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  No se encontraron sesiones de fotos
                </div>
              </div>
            )}

            {filteredItems.length > PAGE_SIZE && (
              <div style={{ marginTop: 16, textAlign: "right" }}>
                <Pagination
                  current={currentPage}
                  pageSize={PAGE_SIZE}
                  total={filteredItems.length}
                  onChange={(page) => setCurrentPage(page)}
                  size="small"
                  showSizeChanger={false}
                />
              </div>
            )}
          </div>
        </section>
      </div>

    </main>
  );
}
