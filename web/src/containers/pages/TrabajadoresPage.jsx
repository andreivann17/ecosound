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
  TeamOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  DownloadOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";

import { previewTrabajadoresReportPdf, printTrabajadoresReportPdf } from "../../components/utils/printTrabajadoresReportPdf";

import "./TrabajadoresPage.css";
import { PATH as API_BASE } from "../../redux/utils";

dayjs.locale("es");

const { Title, Text, Paragraph } = Typography;

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
  items.forEach((t) => {
    const nombre = `${t.nombre || ""} ${t.apellido || ""}`.trim();
    const key = nombre.toLowerCase();
    if (nombre && !seen.has(key)) {
      seen.add(key);
      pool.push({ label: nombre });
    }
  });
  return pool;
};

const toSuggestionOptions = (pool) =>
  pool.slice(0, 5).map((item, idx) => ({
    value: item.label,
    label: (
      <div className="trab-suggest-option" style={{ "--i": idx }}>
        <span className="trab-suggest-icon"><TeamOutlined /></span>
        <span className="trab-suggest-text">{item.label}</span>
        <span className="trab-suggest-type">Trabajador</span>
      </div>
    ),
  }));

export default function TrabajadoresPage() {
  const dispatch = useDispatch();
  const { items = [], puestos = [] } = useSelector((state) => state.trabajadores);
  const navigate = useNavigate();
  const { perm } = usePermisos() || { perm: () => true };
  const canConsultar = perm("trabajadores", "consultar");
  const canInsertar  = perm("trabajadores", "insertar");

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);
  const [puestoFilter, setPuestoFilter] = useState("todos");

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
    dispatch(actionPuestosGet());
  }, [dispatch]);

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
    () => ({
      search: searchDebounced || undefined,
      id_puesto: puestoFilter !== "todos" ? puestoFilter : undefined,
    }),
    [searchDebounced, puestoFilter]
  );

  useEffect(() => {
    const key = JSON.stringify(fetchParams);
    if (lastFetchKey.current === key) return;
    lastFetchKey.current = key;
    dispatch(actionTrabajadoresGet(fetchParams));
  }, [dispatch, fetchParams]);

  // El filtrado por puesto ya lo hace el backend, considerando tanto el
  // puesto base del trabajador como los puestos que haya desempeñado
  // realmente en eventos (tabla contratos_trabajadores)
  const filteredItems = items;

  const getInitials = (nombre, apellido) => {
    const a = (nombre || " ")[0] || "";
    const b = (apellido || " ")[0] || "";
    return (a + b).toUpperCase();
  };

  const PUESTO_LABEL_MAP = puestos.reduce((acc, p) => {
    acc[p.id_puesto] = p.nombre;
    return acc;
  }, { todos: "Todos" });

  const handleExportNow = async () => {
    const html = await previewTrabajadoresReportPdf({
      items: filteredItems,
      puestoLabel: PUESTO_LABEL_MAP[puestoFilter] || "Todos",
    });
    setExportPreviewHtml(html);
    setExportPreviewOpen(true);
  };

  return (
    <main className="trab-main">
      <div className="trab-content">

        <section className="trab-header-card">
          <div className="trab-header-section">
            <Space direction="vertical" size={2}>
              <Title level={2} className="trab-title">Trabajadores</Title>
              <Text className="trab-subtitle">Personal registrado en el sistema</Text>
            </Space>
          </div>

          <div className="trab-filters-panel">
            <Row gutter={[16, 14]} align="bottom">
              <Col xs={24} lg={11}>
                <div className="trab-field-label">Buscador</div>
                <AutoComplete
                  value={search}
                  options={searchOptions}
                  onSearch={handleSearchInput}
                  onFocus={handleSearchFocus}
                  onSelect={handleSearchSelect}
                  className="trab-control"
                  popupClassName="trab-suggest-dropdown"
                  filterOption={false}
                  allowClear
                  onClear={() => setSearch("")}
                >
                  <Input
                    placeholder="Buscar por nombre o apellido..."
                    suffix={<SearchOutlined className="trab-input-suffix" />}
                  />
                </AutoComplete>
              </Col>

              <Col xs={24} lg={8}>
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

              <Col xs={24} lg={5}>
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
        </section>

        <div className="trab-expedientes-card">
          <div className="trab-toolbar">
            <div className="trab-toolbar-left">
              <Title level={4} style={{ marginBottom: 0 }}>
                Trabajadores ({filteredItems.length})
              </Title>
              <Text type="secondary">{filteredItems.length} encontrados</Text>
            </div>
            <div className="trab-toolbar-right">
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
                    {(() => {
                      const extra = (t.puestos_trabajados || "")
                        .split(",")
                        .map((p) => p.trim())
                        .filter((p) => p && p !== t.nombre_puesto);
                      return extra.length > 0 ? (
                        <span className="trab-puesto-extra" title={`También: ${extra.join(", ")}`}>
                          También: {extra.join(", ")}
                        </span>
                      ) : null;
                    })()}
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
        </div>

      </div>

      {showBackToTop && (
        <button
          type="button"
          className="trab-back-to-top"
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
        title="Previsualización — Reporte de Trabajadores"
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
                printTrabajadoresReportPdf({
                  items: filteredItems,
                  puestoLabel: PUESTO_LABEL_MAP[puestoFilter] || "Todos",
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
            title="preview-trabajadores"
            style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
            srcDoc={exportPreviewHtml}
          />
        </div>
      </Modal>
    </main>
  );
}
