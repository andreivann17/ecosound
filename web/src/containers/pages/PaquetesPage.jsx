import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import { actionPaquetesGet } from "../../redux/actions/paquetes/paquetes";

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
  CameraOutlined,
  SoundOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

import "./PaquetesPage.css";

const { Title, Text, Paragraph } = Typography;

const TIPO_MAP = {
  fotografia: { label: "Fotografía", icon: <CameraOutlined />, cls: "paq-tipo-foto" },
  sonido:     { label: "Sonido",     icon: <SoundOutlined />,  cls: "paq-tipo-sonido" },
};

export default function PaquetesPage() {
  const dispatch = useDispatch();
  const { items = [] } = useSelector((state) => state.paquetes);
  const navigate = useNavigate();
  const { perm } = usePermisos() || { perm: () => true };
  const canConsultar = perm("paquetes", "consultar");
  const canInsertar  = perm("paquetes", "insertar");

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");

  const lastFetchKey = useRef("");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchParams = useMemo(
    () => ({
      search: searchDebounced || undefined,
    }),
    [searchDebounced]
  );

  useEffect(() => {
    const key = JSON.stringify(fetchParams);
    if (lastFetchKey.current === key) return;
    lastFetchKey.current = key;
    dispatch(actionPaquetesGet(fetchParams));
  }, [dispatch, fetchParams]);

  const filteredItems = useMemo(() => {
    let base = items;
    if (searchDebounced) {
      const q = searchDebounced.toLowerCase();
      base = base.filter((p) => (p.nombre || "").toLowerCase().includes(q));
    }
    if (tipoFilter !== "todos") {
      const isSonido = tipoFilter === "sonido" ? 1 : 0;
      base = base.filter((p) => p.is_paquete_sonido === isSonido);
    }
    return base;
  }, [items, searchDebounced, tipoFilter]);

  const counts = useMemo(() => ({
    foto:   items.filter((p) => p.is_paquete_sonido === 0).length,
    sonido: items.filter((p) => p.is_paquete_sonido === 1).length,
  }), [items]);

  const grouped = useMemo(() => {
    const foto   = filteredItems.filter((p) => p.is_paquete_sonido === 0);
    const sonido = filteredItems.filter((p) => p.is_paquete_sonido === 1);
    const result = [];
    if (foto.length > 0)   result.push({ key: "fotografia", label: "Fotografía", items: foto });
    if (sonido.length > 0) result.push({ key: "sonido",     label: "Sonido",     items: sonido });
    return result;
  }, [filteredItems]);

  return (
    <main className="paq-main">
      <div className="paq-content">

        <section className="paq-header-section">
          <Space direction="vertical" size={2}>
            <Title level={2} className="paq-title">Paquetes</Title>
            <Text className="paq-subtitle">Catálogo de paquetes de fotografía y sonido</Text>
          </Space>
        </section>

        <section className="paq-section">

          <div className="paq-filters-panel">
            <Row gutter={[16, 14]}>
              <Col xs={24} lg={12}>
                <div className="paq-field-label">Buscador</div>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre de paquete..."
                  suffix={<SearchOutlined className="paq-input-suffix" />}
                  className="paq-control"
                  allowClear
                />
              </Col>

              <Col xs={24} lg={8}>
                <div className="paq-field-label">Tipo</div>
                <Select
                  value={tipoFilter}
                  onChange={(v) => setTipoFilter(v)}
                  className="paq-control"
                  options={[
                    { label: "Todos", value: "todos" },
                    { label: "Fotografía", value: "fotografia" },
                    { label: "Sonido", value: "sonido" },
                  ]}
                />
              </Col>
            </Row>

            <Row gutter={[16, 14]} style={{ marginTop: 14 }} align="bottom">
              <Col xs={24} lg={6}>
                <div className="paq-actions">
                  <Button
                    className="paq-btn-clean"
                    onClick={() => {
                      setSearch("");
                      setTipoFilter("todos");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </Col>
            </Row>
          </div>

          <div className="paq-stats-row">
            <div
              className={`paq-stat-card paq-stat-foto ${tipoFilter === "fotografia" ? "paq-stat-active" : ""}`}
              onClick={() => setTipoFilter((p) => (p === "fotografia" ? "todos" : "fotografia"))}
            >
              <div className="paq-stat-icon paq-stat-icon-foto"><CameraOutlined /></div>
              <div>
                <div className="paq-stat-value">{counts.foto}</div>
                <div className="paq-stat-label">Fotografía</div>
              </div>
            </div>

            <div
              className={`paq-stat-card paq-stat-sonido ${tipoFilter === "sonido" ? "paq-stat-active" : ""}`}
              onClick={() => setTipoFilter((p) => (p === "sonido" ? "todos" : "sonido"))}
            >
              <div className="paq-stat-icon paq-stat-icon-sonido"><SoundOutlined /></div>
              <div>
                <div className="paq-stat-value">{counts.sonido}</div>
                <div className="paq-stat-label">Sonido</div>
              </div>
            </div>
          </div>

          <div className="paq-toolbar">
            <div className="paq-toolbar-left">
              <Title level={4} style={{ marginBottom: 0 }}>
                Paquetes ({filteredItems.length})
              </Title>
              <Text type="secondary">{filteredItems.length} paquetes encontrados</Text>
            </div>
            <div className="paq-toolbar-right">
              {canInsertar && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/paquetes/crear")}
                  className="laboral-btn-create custom-button"
                >
                  Nuevo paquete
                </Button>
              )}
            </div>
          </div>

          {grouped.length === 0 && (
            <div className="paq-empty">
              <div style={{ fontSize: 16, fontWeight: 500 }}>Sin paquetes que coincidan con los filtros</div>
            </div>
          )}

          {grouped.map(({ key, label, items: paquetes }) => (
            <div key={key} className="paq-category-block">
              <div className="paq-category-title">
                {key === "fotografia" ? <CameraOutlined /> : <SoundOutlined />}
                {label}
                <span className="paq-category-count">{paquetes.length}</span>
              </div>
              <div className="paq-grid">
                {paquetes.map((paq) => (
                  <div key={`${paq.is_paquete_sonido}-${paq.id_paquete}`} className="paq-card">

                    <div className="paq-card-banner paq-card-banner-foto"
                      style={{ background: paq.is_paquete_sonido ? "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" : "linear-gradient(135deg, #1a1a2e 0%, #6d28d9 100%)" }}
                    >
                      <div className="paq-card-banner-icon">
                        {paq.is_paquete_sonido ? <SoundOutlined /> : <CameraOutlined />}
                      </div>
                    </div>

                    <div className="paq-card-header">
                      <div className="paq-card-head">
                        <Paragraph className="paq-card-name" ellipsis={{ rows: 2 }}>
                          {paq.nombre}
                        </Paragraph>
                        <span className={`paq-tipo-badge ${paq.is_paquete_sonido ? "paq-tipo-sonido" : "paq-tipo-foto"}`}>
                          {paq.is_paquete_sonido ? "Sonido" : "Fotografía"}
                        </span>
                      </div>
                    </div>

                    <div className="paq-card-body">
                      <div className="paq-contenidos-box">
                        <UnorderedListOutlined className="paq-info-icon" />
                        <div className="paq-info-text">
                          <span className="paq-info-label">Contenidos</span>
                          <span className="paq-info-value">
                            {paq.contenidos_count ?? 0} {paq.contenidos_count === 1 ? "elemento" : "elementos"}
                          </span>
                        </div>
                      </div>
                      <div className="paq-active-box">
                        <CheckCircleOutlined className={`paq-active-icon ${paq.active ? "paq-active-on" : "paq-active-off"}`} />
                        <span className={`paq-active-label ${paq.active ? "paq-active-on" : "paq-active-off"}`}>
                          {paq.active ? "Vigente" : "Descontinuado"}
                        </span>
                      </div>
                    </div>

                    <div className="paq-card-footer">
                      <button
                        className="paq-btn-details"
                        onClick={() =>
                          canConsultar
                            ? navigate(`/paquetes/${paq.id_paquete}?is_sonido=${paq.is_paquete_sonido}`)
                            : undefined
                        }
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
            </div>
          ))}

        </section>
      </div>
    </main>
  );
}
