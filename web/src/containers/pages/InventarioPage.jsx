import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { actionInventarioGet, actionCategoriasGet } from "../../redux/actions/inventario/inventario";
import { PATH as API_BASE } from "../../redux/utils";

import {
  Card,
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
  ToolOutlined,
  ArrowRightOutlined,
  AppstoreOutlined,
  AlignLeftOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

import "./InventarioPage.css";

dayjs.locale("es");

const { Title, Text, Paragraph } = Typography;

const ESTADO_MAP = {
  activo: { label: "Activo", cls: "equipo-status-activo" },
  dado_de_baja: { label: "Dado de baja", cls: "equipo-status-dado_de_baja" },
  en_reparacion: { label: "En reparación", cls: "equipo-status-en_reparacion" },
};

export default function InventarioPage() {
  const dispatch = useDispatch();
  const { items = [], categorias = [] } = useSelector((state) => state.inventario);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [estadoFilter, setEstadoFilter] = useState("todos");

  const navigate = useNavigate();
  const { perm } = usePermisos() || { perm: () => true };
  const canConsultar = perm("inventario", "consultar");
  const canInsertar  = perm("inventario", "insertar");
  const lastFetchKey = useRef("");

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    dispatch(actionCategoriasGet());
  }, [dispatch]);

  const fetchParams = useMemo(
    () => ({
      search: searchDebounced || undefined,
      id_categoria: categoriaFilter !== "todas" ? categoriaFilter : undefined,
      estado: estadoFilter !== "todos" ? estadoFilter : undefined,
    }),
    [searchDebounced, categoriaFilter, estadoFilter]
  );

  useEffect(() => {
    const key = JSON.stringify(fetchParams);
    if (lastFetchKey.current === key) return;
    lastFetchKey.current = key;
    dispatch(actionInventarioGet(fetchParams));
  }, [dispatch, fetchParams]);

  const filteredItems = useMemo(() => {
    let base = items;
    if (searchDebounced) {
      const q = searchDebounced.toLowerCase();
      base = base.filter(
        (r) =>
          (r.nombre || "").toLowerCase().includes(q) ||
          (r.descripcion || "").toLowerCase().includes(q) ||
          (r.nombre_categoria || "").toLowerCase().includes(q)
      );
    }
    if (categoriaFilter !== "todas") {
      base = base.filter((r) => r.id_categoria_equipo === categoriaFilter);
    }
    if (estadoFilter !== "todos") {
      base = base.filter((r) => r.estado === estadoFilter);
    }
    return base;
  }, [items, searchDebounced, categoriaFilter, estadoFilter]);

  const counts = useMemo(() => ({
    activos: items.filter((r) => r.estado === "activo").length,
    baja: items.filter((r) => r.estado === "dado_de_baja").length,
    reparacion: items.filter((r) => r.estado === "en_reparacion").length,
  }), [items]);

  const grouped = useMemo(() => {
    const map = {};
    for (const eq of filteredItems) {
      const cat = eq.nombre_categoria || "Sin categoría";
      if (!map[cat]) map[cat] = [];
      map[cat].push(eq);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredItems]);

  return (
    <main className="inv-main">
      <div className="inv-content">

        <section className="inv-header-section">
          <Space direction="vertical" size={2}>
            <Title level={2} className="inv-title">Inventario</Title>
            <Text className="inv-subtitle">Catálogo de equipo y conteos</Text>
          </Space>
        </section>

        <section className="inv-section">

          <div className="inv-filters-panel">
            <Row gutter={[16, 14]}>
              <Col xs={24} lg={10}>
                <div className="inv-field-label">Buscador</div>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, categoría o descripción..."
                  suffix={<SearchOutlined className="inv-input-suffix" />}
                  className="inv-control"
                  allowClear
                />
              </Col>

              <Col xs={24} lg={7}>
                <div className="inv-field-label">Categoría</div>
                <Select
                  value={categoriaFilter}
                  onChange={(v) => setCategoriaFilter(v)}
                  className="inv-control"
                  options={[
                    { label: "Todas", value: "todas" },
                    ...categorias.map((c) => ({
                      label: c.nombre,
                      value: c.id_categoria_equipo,
                    })),
                  ]}
                />
              </Col>

              <Col xs={24} lg={7}>
                <div className="inv-field-label">Estado</div>
                <Select
                  value={estadoFilter}
                  onChange={(v) => setEstadoFilter(v)}
                  className="inv-control"
                  options={[
                    { label: "Todos", value: "todos" },
                    { label: "Activo", value: "activo" },
                    { label: "Dado de baja", value: "dado_de_baja" },
                    { label: "En reparación", value: "en_reparacion" },
                  ]}
                />
              </Col>
            </Row>

            <Row gutter={[16, 14]} style={{ marginTop: 14 }} align="bottom">
              <Col xs={24} lg={6}>
                <div className="inv-actions">
                  <Button
                    className="inv-btn-clean"
                    onClick={() => {
                      setSearch("");
                      setCategoriaFilter("todas");
                      setEstadoFilter("todos");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </Col>
            </Row>
          </div>

          <div className="inv-stats-row">
            <Card
              className={`inv-stat-card inv-stat-activos ${estadoFilter === "activo" ? "inv-stat-active" : ""}`}
              hoverable
              onClick={() => setEstadoFilter((p) => (p === "activo" ? "todos" : "activo"))}
            >
              <Space align="center" size={10}>
                <div className="inv-stat-icon"><CheckCircleOutlined /></div>
                <div>
                  <div className="inv-stat-value">{counts.activos}</div>
                  <div className="inv-stat-label">Activos</div>
                </div>
              </Space>
            </Card>

            <Card
              className={`inv-stat-card inv-stat-reparacion ${estadoFilter === "en_reparacion" ? "inv-stat-active" : ""}`}
              hoverable
              onClick={() => setEstadoFilter((p) => (p === "en_reparacion" ? "todos" : "en_reparacion"))}
            >
              <Space align="center" size={10}>
                <div className="inv-stat-icon"><ExclamationCircleOutlined /></div>
                <div>
                  <div className="inv-stat-value">{counts.reparacion}</div>
                  <div className="inv-stat-label">En reparación</div>
                </div>
              </Space>
            </Card>

            <Card
              className={`inv-stat-card inv-stat-baja ${estadoFilter === "dado_de_baja" ? "inv-stat-active" : ""}`}
              hoverable
              onClick={() => setEstadoFilter((p) => (p === "dado_de_baja" ? "todos" : "dado_de_baja"))}
            >
              <Space align="center" size={10}>
                <div className="inv-stat-icon"><StopOutlined /></div>
                <div>
                  <div className="inv-stat-value">{counts.baja}</div>
                  <div className="inv-stat-label">Dado de baja</div>
                </div>
              </Space>
            </Card>
          </div>

          <div className="inv-toolbar">
            <div className="inv-toolbar-left">
              <Title level={4} style={{ marginBottom: 0 }}>
                Catálogo de equipo ({filteredItems.length})
              </Title>
              <Text type="secondary">{filteredItems.length} equipos encontrados</Text>
            </div>
            <div className="inv-toolbar-right">
              <Button
                icon={<UnorderedListOutlined />}
                onClick={() => navigate("/app/inventario/conteos")}
                className="inv-btn-clean"
                style={{ height: 36, borderRadius: 10 }}
              >
                Ver conteos
              </Button>
              <Button
                icon={<AppstoreOutlined />}
                onClick={() => navigate("/app/inventario/conteos/nuevo")}
                style={{
                  height: 36,
                  borderRadius: 10,
                  fontWeight: 700,
                  background: "#1d4ed8",
                  borderColor: "#1d4ed8",
                  color: "#fff",
                }}
              >
                Nuevo conteo
              </Button>
              {canInsertar && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/app/inventario/equipo/crear")}
                  className="laboral-btn-create custom-button"
                >
                  Nuevo equipo
                </Button>
              )}
            </div>
          </div>

          {grouped.length === 0 && (
            <div className="inv-empty">
              <div style={{ fontSize: 16, fontWeight: 500 }}>Sin equipo que coincida con los filtros</div>
            </div>
          )}

          {grouped.map(([categoria, equipos]) => (
            <div key={categoria} className="inv-category-block">
              <div className="inv-category-title">
                <ToolOutlined />
                {categoria}
                <span className="inv-category-count">{equipos.length}</span>
              </div>
              <div className="inv-grid">
                {equipos.map((eq) => {
                  const estadoInfo = ESTADO_MAP[eq.estado] || { label: eq.estado, cls: "equipo-status-activo" };
                  const cantidad = parseInt(eq.cantidad_disponible ?? 0, 10);
                  const cantidadCls = cantidad === 0 ? "cero" : cantidad > 0 ? "positivo" : "cero";

                  return (
                    <div key={eq.id_equipo} className="equipo-card">
                      <div className="equipo-card-image">
                        {eq.path ? (
                          <img
                            src={`${API_BASE}/${eq.path}`}
                            alt={eq.nombre}
                            className="equipo-card-img"
                          />
                        ) : (
                          <div className="equipo-card-no-img">
                            <span className="equipo-card-no-img-icon">📷</span>
                            <span className="equipo-card-no-img-text">Sin imagen</span>
                          </div>
                        )}
                      </div>

                      <div className="equipo-card-header">
                        <div className="equipo-card-head">
                          <Paragraph className="equipo-card-name" ellipsis={{ rows: 2 }}>
                            {eq.nombre}
                          </Paragraph>
                          <span className={`equipo-status-badge ${estadoInfo.cls}`}>
                            {estadoInfo.label}
                          </span>
                        </div>
                      </div>

                      <div className="equipo-card-body">
                        {eq.descripcion && (
                          <div className="equipo-info-row">
                            <AlignLeftOutlined className="equipo-info-icon" />
                            <div className="equipo-info-text">
                              <span className="equipo-info-label">Descripción</span>
                              <span className="equipo-info-value">{eq.descripcion}</span>
                            </div>
                          </div>
                        )}
                        <div className="equipo-cantidad-box">
                          <span className="equipo-cantidad-label">Disponible</span>
                          <span className={`equipo-cantidad-value ${cantidadCls}`}>
                            {cantidad}
                          </span>
                        </div>
                      </div>

                      <div className="equipo-card-footer">
                        <button
                          className="equipo-btn-details"
                          onClick={() => canConsultar ? navigate(`/app/inventario/equipo/${eq.id_equipo}`) : undefined}
                          style={!canConsultar ? { cursor: "not-allowed", opacity: 0.45 } : {}}
                          title={!canConsultar ? "Sin permiso de consulta" : undefined}
                        >
                          VER DETALLES
                          <ArrowRightOutlined />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

        </section>
      </div>
    </main>
  );
}
