import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import { actionPaquetesGet } from "../../redux/actions/paquetes/paquetes";

import {
  Button,
  Card,
  Input,
  AutoComplete,
  Select,
  Space,
  Typography,
  Row,
  Col,
  Modal,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  CameraOutlined,
  SoundOutlined,
  CrownOutlined,
  CoffeeOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  UnorderedListOutlined,
  DownloadOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";

import { previewPaquetesReportPdf, printPaquetesReportPdf } from "../../components/utils/printPaquetesReportPdf";
import "./PaquetesPage.css";

const { Title, Text, Paragraph } = Typography;

// tipo: 0=Fotografía, 1=Sonido, 2=Decoraciones, 3=Barra
const TIPO_CARD_CONFIG = {
  0: { label: "Fotografía",   icon: <CameraOutlined />, bannerBg: "linear-gradient(135deg, #1a1a2e 0%, #6d28d9 100%)", badgeCls: "paq-tipo-foto",       iconCls: "paq-stat-icon-foto" },
  1: { label: "Sonido",       icon: <SoundOutlined />,  bannerBg: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", badgeCls: "paq-tipo-sonido",     iconCls: "paq-stat-icon-sonido" },
  2: { label: "Decoraciones", icon: <CrownOutlined />,  bannerBg: "linear-gradient(135deg, #064e3b 0%, #10b981 100%)", badgeCls: "paq-tipo-decoracion", iconCls: "paq-stat-icon-decoracion" },
  3: { label: "Barra",        icon: <CoffeeOutlined />, bannerBg: "linear-gradient(135deg, #431407 0%, #b45309 100%)", badgeCls: "paq-tipo-barra",      iconCls: "paq-stat-icon-barra" },
};

const TIPO_FILTER_KEY = {
  fotografia: 0,
  sonido:     1,
  decoracion: 2,
  barra:      3,
};

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildSuggestionPool = (items) => {
  const seen = new Set();
  const pool = [];
  items.forEach((p) => {
    const nombre = (p.nombre || "").trim();
    const key = nombre.toLowerCase();
    if (nombre && !seen.has(key)) {
      seen.add(key);
      pool.push({ label: nombre, tipoNum: p.is_paquete_sonido });
    }
  });
  return pool;
};

const toSuggestionOptions = (pool) =>
  pool.slice(0, 5).map((item, idx) => {
    const cfg = TIPO_CARD_CONFIG[item.tipoNum] ?? TIPO_CARD_CONFIG[0];
    return {
      value: item.label,
      label: (
        <div className="paq-suggest-option" style={{ "--i": idx }}>
          <span className="paq-suggest-icon">{cfg.icon}</span>
          <span className="paq-suggest-text">{item.label}</span>
          <span className="paq-suggest-type">{cfg.label}</span>
        </div>
      ),
    };
  });

export default function PaquetesPage() {
  const dispatch = useDispatch();
  const { items = [] } = useSelector((state) => state.paquetes);
  const navigate = useNavigate();
  const { perm } = usePermisos() || { perm: () => true };
  const canConsultar = perm("paquetes", "consultar");
  const canInsertar  = perm("paquetes", "insertar");

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);
  const [tipoFilter, setTipoFilter] = useState("todos");

  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [exportPreviewHtml, setExportPreviewHtml] = useState("");

  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const scrollEl = document.querySelector(".content-electron") || window;
    const onScroll = () => {
      const top = scrollEl === window ? window.scrollY : scrollEl.scrollTop;
      setShowBackToTop(top > 300);
    };
    scrollEl.addEventListener("scroll", onScroll);
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, []);

  const lastFetchKey = useRef("");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const suggestionPool = useMemo(() => buildSuggestionPool(items), [items]);

  const handleSearchInput = (value) => {
    setSearch(value);
    const q = (value || "").trim().toLowerCase();
    const filtered = q
      ? suggestionPool.filter((item) => item.label.toLowerCase().includes(q))
      : shuffleArray(suggestionPool);
    setSearchOptions(toSuggestionOptions(filtered));
  };

  const handleSearchFocus = () => {
    if (!search) {
      setSearchOptions(toSuggestionOptions(shuffleArray(suggestionPool)));
    }
  };

  const handleSearchSelect = (value) => {
    setSearch(value);
    setSearchDebounced(value);
  };

  const fetchParams = useMemo(
    () => ({ search: searchDebounced || undefined }),
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
      const tipoNum = TIPO_FILTER_KEY[tipoFilter];
      base = base.filter((p) => p.is_paquete_sonido === tipoNum);
    }
    return base;
  }, [items, searchDebounced, tipoFilter]);

  const counts = useMemo(() => ({
    0: items.filter((p) => p.is_paquete_sonido === 0).length,
    1: items.filter((p) => p.is_paquete_sonido === 1).length,
    2: items.filter((p) => p.is_paquete_sonido === 2).length,
    3: items.filter((p) => p.is_paquete_sonido === 3).length,
  }), [items]);

  const grouped = useMemo(() => {
    const result = [];
    [
      { key: "fotografia", tipo: 0, label: "Fotografía" },
      { key: "sonido",     tipo: 1, label: "Sonido" },
      { key: "decoracion", tipo: 2, label: "Decoraciones" },
      { key: "barra",      tipo: 3, label: "Barra" },
    ].forEach(({ key, tipo, label }) => {
      const paquetes = filteredItems.filter((p) => p.is_paquete_sonido === tipo);
      if (paquetes.length > 0) result.push({ key, label, items: paquetes });
    });
    return result;
  }, [filteredItems]);

  const TIPO_LABEL_MAP = {
    todos: "Todos",
    fotografia: "Fotografía",
    sonido: "Sonido",
    decoracion: "Decoraciones",
    barra: "Barra",
  };

  const handleExportNow = async () => {
    const html = await previewPaquetesReportPdf({
      items: filteredItems,
      tipoLabel: TIPO_LABEL_MAP[tipoFilter] || "Todos",
    });
    setExportPreviewHtml(html);
    setExportPreviewOpen(true);
  };

  const STAT_CARDS = [
    { filterKey: "fotografia", tipoNum: 0 },
    { filterKey: "sonido",     tipoNum: 1 },
    { filterKey: "decoracion", tipoNum: 2 },
    { filterKey: "barra",      tipoNum: 3 },
  ];

  return (
    <main className="paq-main">
      <div className="paq-content">

        <section className="paq-header-card">
          <div className="paq-header-section">
            <Space direction="vertical" size={2}>
              <Title level={2} className="paq-title">Paquetes</Title>
              <Text className="paq-subtitle">Catálogo de paquetes de fotografía, sonido, decoraciones y barra</Text>
            </Space>
          </div>

          <div className="paq-filters-panel">
            <Row gutter={[16, 14]} align="bottom">
              <Col xs={24} lg={12}>
                <div className="paq-field-label">Buscador</div>
                <AutoComplete
                  value={search}
                  options={searchOptions}
                  onSearch={handleSearchInput}
                  onFocus={handleSearchFocus}
                  onSelect={handleSearchSelect}
                  className="paq-control"
                  popupClassName="paq-suggest-dropdown"
                  filterOption={false}
                  allowClear
                  onClear={() => setSearch("")}
                >
                  <Input
                    placeholder="Buscar por nombre de paquete..."
                    suffix={<SearchOutlined className="paq-input-suffix" />}
                  />
                </AutoComplete>
              </Col>

              <Col xs={24} lg={7}>
                <div className="paq-field-label">Tipo</div>
                <Select
                  value={tipoFilter}
                  onChange={(v) => setTipoFilter(v)}
                  className="paq-control"
                  options={[
                    { label: "Todos", value: "todos" },
                    { label: "Fotografía", value: "fotografia" },
                    { label: "Sonido", value: "sonido" },
                    { label: "Decoraciones", value: "decoracion" },
                    { label: "Barra", value: "barra" },
                  ]}
                />
              </Col>

              <Col xs={24} lg={5}>
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
        </section>

        <div className="paq-stats-row">
            {STAT_CARDS.map(({ filterKey, tipoNum }) => {
              const cfg = TIPO_CARD_CONFIG[tipoNum];
              const isActive = tipoFilter === filterKey;
              return (
                <Card
                  key={filterKey}
                  className={`paq-stat-card ${isActive ? "paq-stat-active" : ""}`}
                  hoverable
                  onClick={() => setTipoFilter((p) => (p === filterKey ? "todos" : filterKey))}
                >
                  <Space align="center" size={10}>
                    <div className={`paq-stat-icon ${cfg.iconCls}`}>{cfg.icon}</div>
                    <div>
                      <div className="paq-stat-value">{counts[tipoNum]}</div>
                      <div className="paq-stat-label">{cfg.label}</div>
                    </div>
                  </Space>
                </Card>
              );
            })}
        </div>

        <div className="paq-cards-container">
          <div className="paq-toolbar">
            <div className="paq-toolbar-left">
              <Title level={4} style={{ marginBottom: 0 }}>
                Paquetes ({filteredItems.length})
              </Title>
              <Text type="secondary">{filteredItems.length} paquetes encontrados</Text>
            </div>
            <div className="paq-toolbar-right">
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportNow}
                className="laboral-btn-import laboral-btn-create"
              >
                Exportar
              </Button>
              {canInsertar && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/app/paquetes/crear")}
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

          {grouped.map(({ key, items: paquetes }) => (
            <div key={key} className="paq-category-block">
              <div className="paq-grid">
                {paquetes.map((paq) => {
                  const cfg = TIPO_CARD_CONFIG[paq.is_paquete_sonido] ?? TIPO_CARD_CONFIG[0];
                  return (
                    <div key={`${paq.is_paquete_sonido}-${paq.id_paquete}`} className="paq-card">

                      <div className="paq-card-banner paq-card-banner-foto"
                        style={{ background: cfg.bannerBg }}
                      >
                        <div className="paq-card-banner-icon">{cfg.icon}</div>
                      </div>

                      <div className="paq-card-header">
                        <div className="paq-card-head">
                          <Paragraph className="paq-card-name" ellipsis={{ rows: 2 }}>
                            {paq.nombre}
                          </Paragraph>
                          <span className={`paq-tipo-badge ${cfg.badgeCls}`}>
                            {cfg.label}
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
                              ? navigate(`/app/paquetes/${paq.id_paquete}?tipo=${paq.is_paquete_sonido}`)
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
                  );
                })}
              </div>
            </div>
          ))}

        </div>{/* paq-cards-container */}
      </div>

      {showBackToTop && (
        <button
          type="button"
          className="paq-back-to-top"
          onClick={() => {
            const scrollEl = document.querySelector(".content-electron");
            if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: "smooth" });
            else window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          aria-label="Volver arriba"
        >
          <ArrowUpOutlined />
        </button>
      )}

      <Modal
        open={exportPreviewOpen}
        onCancel={() => setExportPreviewOpen(false)}
        title="Previsualización — Reporte de Paquetes"
        width={1020}
        centered
        destroyOnClose
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setExportPreviewOpen(false)}>Cerrar</Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}
              onClick={() => {
                printPaquetesReportPdf({
                  items: filteredItems,
                  tipoLabel: TIPO_LABEL_MAP[tipoFilter] || "Todos",
                });
              }}
            >
              Exportar PDF
            </Button>
          </div>
        }
      >
        <div style={{ height: "72vh", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <iframe
            title="preview-paquetes"
            style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
            srcDoc={exportPreviewHtml}
          />
        </div>
      </Modal>
    </main>
  );
}
