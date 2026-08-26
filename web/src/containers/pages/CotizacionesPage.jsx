import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { actionCotizacionesGet } from "../../redux/actions/cotizaciones/cotizaciones";

import {
  Card,
  Button,
  Input,
  AutoComplete,
  DatePicker,
  Select,
  Space,
  Typography,
  Row,
  Col,
  Pagination,
  Modal,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  UserOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

import { previewCotizacionesReportPdf, printCotizacionesReportPdf } from "../../components/utils/printCotizacionesReportPdf";
import "./EventosPage.css";
import "./CotizacionesList.css";

dayjs.locale("es");

const { RangePicker } = DatePicker;
const { Title, Text, Paragraph } = Typography;
const PAGE_SIZE = 20;

const TIPO_EVENTO_MAP = {
  1: "Bodas",
  2: "XV",
  3: "Graduación",
  4: "Corporativo",
  5: "Cumpleaños",
  6: "Otro",
};

// Paleta de colores distintos para el chip de "tipo de evento" — uno por tipo,
// para que el usuario lo reconozca de reojo por el tono. Si algún día hay más
// tipos que colores en la lista, se vuelve a empezar desde el primero pero con
// un tono distinto (filter hue-rotate/saturate) para que no se repita igual.
const TIPO_CHIP_PALETTE = [
  { bg: "#d8e2ff", text: "#0b3f9e", darkBg: "rgba(59, 130, 246, 0.22)",  darkText: "#93c5fd" }, // azul
  { bg: "#ffdad6", text: "#93000a", darkBg: "rgba(239, 68, 68, 0.22)",   darkText: "#fca5a5" }, // rojo
  { bg: "#c8f5c8", text: "#004d00", darkBg: "rgba(34, 197, 94, 0.22)",   darkText: "#86efac" }, // verde
  { bg: "#ffddb5", text: "#5c3600", darkBg: "rgba(245, 158, 11, 0.22)",  darkText: "#fbbf24" }, // ámbar
  { bg: "#ede9fe", text: "#5b21b6", darkBg: "rgba(139, 92, 246, 0.22)",  darkText: "#c4b5fd" }, // morado
  { bg: "#93f2f2", text: "#003030", darkBg: "rgba(20, 184, 166, 0.22)",  darkText: "#5eead4" }, // teal
  { bg: "#ffd6e8", text: "#9d174d", darkBg: "rgba(236, 72, 153, 0.22)",  darkText: "#f9a8d4" }, // rosa
  { bg: "#ffe4c7", text: "#7c2d12", darkBg: "rgba(249, 115, 22, 0.22)",  darkText: "#fdba74" }, // naranja
  { bg: "#e8eaed", text: "#44474e", darkBg: "rgba(148, 163, 184, 0.18)", darkText: "#cbd5e1" }, // gris
  { bg: "#e0e7ff", text: "#3730a3", darkBg: "rgba(99, 102, 241, 0.22)",  darkText: "#a5b4fc" }, // índigo
];

const getTipoChipColors = (idTipo) => {
  const n = TIPO_CHIP_PALETTE.length;
  const key = Number(idTipo) || 0;
  const idx = ((key - 1) % n + n) % n;
  const cycle = Math.floor((key - 1) / n);
  const base = TIPO_CHIP_PALETTE[idx];
  if (cycle <= 0) return base;
  const hueShift = (cycle * 37) % 360;
  const satAdj = cycle % 2 === 0 ? 1.15 : 0.85;
  return { ...base, filter: `hue-rotate(${hueShift}deg) saturate(${satAdj})` };
};

const SERVICIO_MAP = {
  1: "Sonido",
  2: "Fotografía",
  3: "Banquete",
  4: "Barra",
};

// Servicios contratados de una cotización — MISMO criterio que el detalle
// (CotizacionDetallePage): si el backend manda la lista la usa; si no,
// reconstruye desde las columnas planas que ya vienen en el listado.
const getServicios = (row) => {
  let ids = [];
  if (Array.isArray(row.servicios) && row.servicios.length) {
    ids = row.servicios.map((s) => s.id_servicio);
  } else if (row.servicios_ids != null && row.servicios_ids !== "") {
    ids = Array.isArray(row.servicios_ids)
      ? row.servicios_ids
      : String(row.servicios_ids).split(",").map((x) => parseInt(x, 10));
  } else {
    if (row.fecha_evento || row.lugar_evento) ids.push(1);
    if (row.datetime_fotografia || row.lugar_fotografia) ids.push(2);
  }
  return ids.filter((id) => SERVICIO_MAP[id]);
};

// Estados de una cotización
const ESTADOS = ["pendiente", "aceptada", "rechazada"];
const ESTADO_LABEL = { pendiente: "Pendiente", aceptada: "Aceptada", rechazada: "Rechazada" };
// statFilter (plural) → estado (singular)
const FILTRO_A_ESTADO = { pendientes: "pendiente", aceptadas: "aceptada", rechazadas: "rechazada" };

const getEstado = (r) => {
  const e = String(r.estado || "pendiente").toLowerCase();
  return ESTADOS.includes(e) ? e : "pendiente";
};

const fmtMoney = (val) => {
  if (val === null || val === undefined || val === "") return "—";
  const n = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(n)) return String(val);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
};

const parseNum = (v) => {
  const n = parseFloat(String(v || "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

const toTitleCase = (str) => {
  if (!str || typeof str !== "string") return "—";
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
  items.forEach((r) => {
    const folio = (r.folio || "").trim();
    const folioKey = `f:${folio.toLowerCase()}`;
    if (folio && !seen.has(folioKey)) {
      seen.add(folioKey);
      pool.push({ label: folio, type: "folio" });
    }
    const cliente = (r.cliente_nombre || "").trim();
    const clienteKey = `c:${cliente.toLowerCase()}`;
    if (cliente && !seen.has(clienteKey)) {
      seen.add(clienteKey);
      pool.push({ label: cliente, type: "cliente" });
    }
  });
  return pool;
};

const toSuggestionOptions = (pool) =>
  pool.slice(0, 5).map((item, idx) => ({
    value: item.label,
    label: (
      <div className="eventos-suggest-option" style={{ "--i": idx }}>
        <span className="eventos-suggest-icon">
          {item.type === "folio" ? <FileTextOutlined /> : <UserOutlined />}
        </span>
        <span className="eventos-suggest-text">{item.label}</span>
        <span className="eventos-suggest-type">
          {item.type === "folio" ? "Folio" : "Cliente"}
        </span>
      </div>
    ),
  }));

export default function CotizacionesPage() {
  const dispatch = useDispatch();
  const { items = [] } = useSelector((state) => state.cotizaciones);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [tipoFilter, setTipoFilter] = useState("todos");

  const [statFilter, setStatFilter] = useState("todos");

  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [exportPreviewHtml, setExportPreviewHtml] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
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

  const navigate = useNavigate();
  const canConsultar = true;
  const canInsertar = true;

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
      setCurrentPage(1);
    }, 350);
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
    setCurrentPage(1);
  };

  const lastFetchKey = useRef("");

  const fetchParams = useMemo(
    () => ({
      search: searchDebounced || undefined,
      date_from: dateRange?.[0]
        ? dayjs(dateRange[0]).format("YYYY-MM-DD")
        : undefined,
      date_to: dateRange?.[1]
        ? dayjs(dateRange[1]).format("YYYY-MM-DD")
        : undefined,
      id_tipo_evento: tipoFilter !== "todos" ? tipoFilter : undefined,
      active: 1,
      limit: 500,
    }),
    [searchDebounced, dateRange, tipoFilter]
  );

  useEffect(() => {
    const key = JSON.stringify(fetchParams);
    if (lastFetchKey.current === key) return;
    lastFetchKey.current = key;
    dispatch(actionCotizacionesGet(fetchParams));
  }, [dispatch, fetchParams]);

  const filteredItems = useMemo(() => {
    let base = items;

    if (tipoFilter !== "todos") {
      base = base.filter((r) => r.id_tipo_evento === tipoFilter);
    }

    if (searchDebounced) {
      const q = searchDebounced.toLowerCase();
      base = base.filter(
        (r) =>
          (r.cliente_nombre || "").toLowerCase().includes(q) ||
          (r.folio || "").toLowerCase().includes(q) ||
          (r.code || "").toLowerCase().includes(q)
      );
    }

    if (dateRange?.[0] && dateRange?.[1]) {
      const from = dayjs(dateRange[0]).startOf("day");
      const to = dayjs(dateRange[1]).endOf("day");
      base = base.filter((r) => {
        if (!r.fecha_evento) return false;
        const d = dayjs(r.fecha_evento);
        return !d.isBefore(from) && !d.isAfter(to);
      });
    }

    const estadoSel = FILTRO_A_ESTADO[statFilter];
    if (estadoSel) base = base.filter((r) => getEstado(r) === estadoSel);

    return base;
  }, [items, statFilter, tipoFilter, searchDebounced, dateRange]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const counts = useMemo(() => {
    return {
      pendientes: items.filter((r) => getEstado(r) === "pendiente").length,
      aceptadas: items.filter((r) => getEstado(r) === "aceptada").length,
      rechazadas: items.filter((r) => getEstado(r) === "rechazada").length,
    };
  }, [items]);

  const TIPO_LABEL_MAP = {
    todos: "Todos",
    1: "Bodas", 2: "XV", 3: "Graduación", 4: "Corporativo", 5: "Cumpleaños", 6: "Otro",
  };

  const handleExportNow = async () => {
    const html = await previewCotizacionesReportPdf({
      items: filteredItems,
      periodFrom: dateRange?.[0] ? dayjs(dateRange[0]).format("YYYY-MM-DD") : undefined,
      periodTo: dateRange?.[1] ? dayjs(dateRange[1]).format("YYYY-MM-DD") : undefined,
      tipoLabel: TIPO_LABEL_MAP[tipoFilter] || "Todos",
    });
    setExportPreviewHtml(html);
    setExportPreviewOpen(true);
  };

  const handleOpenCreate = () => navigate("/app/cotizaciones/crear");

  const STAT_CARDS = [
    { key: "pendientes", label: "Pendientes", count: counts.pendientes, icon: <ClockCircleOutlined />, cls: "eventos-stat-activos" },
    { key: "aceptadas", label: "Aceptadas", count: counts.aceptadas, icon: <CheckCircleOutlined />, cls: "eventos-stat-inactivos" },
    { key: "rechazadas", label: "Rechazadas", count: counts.rechazadas, icon: <CloseCircleOutlined />, cls: "eventos-stat-cancelados" },
  ];

  return (
    <main className="eventos-main cot-list-page">
      <div className="eventos-content">

        <section className="eventos-header-card">
          <div className="eventos-header-section">
            <Space direction="vertical" size={2}>
              <Title level={2} className="eventos-title">
                Cotizaciones
              </Title>
              <Text className="eventos-subtitle">
                Gestión y seguimiento de cotizaciones
              </Text>
            </Space>
          </div>

          <div className="eventos-filters-panel">
            <Row gutter={[16, 14]} align="bottom">
              <Col xs={24} lg={9}>
                <div>
                  <div className="eventos-field-label">Buscador</div>
                  <AutoComplete
                    value={search}
                    options={searchOptions}
                    onSearch={handleSearchInput}
                    onFocus={handleSearchFocus}
                    onSelect={handleSearchSelect}
                    className="eventos-control"
                    popupClassName="eventos-suggest-dropdown"
                    filterOption={false}
                    allowClear
                    onClear={() => {
                      setSearch("");
                      setCurrentPage(1);
                    }}
                  >
                    <Input
                      placeholder="Buscar por cliente o folio..."
                      suffix={<SearchOutlined className="eventos-input-suffix" />}
                    />
                  </AutoComplete>
                </div>
              </Col>

              <Col xs={24} lg={7}>
                <div>
                  <div className="eventos-field-label">Estado</div>
                  <Select
                    value={statFilter}
                    onChange={(v) => {
                      setStatFilter(v);
                      setCurrentPage(1);
                    }}
                    className="eventos-control"
                    options={[
                      { label: "Todos", value: "todos" },
                      { label: "Pendientes", value: "pendientes" },
                      { label: "Aceptadas", value: "aceptadas" },
                      { label: "Rechazadas", value: "rechazadas" },
                    ]}
                  />
                </div>
              </Col>

              <Col xs={24} lg={4}>
                <div>
                  <div className="eventos-field-label">Tipo de evento</div>
                  <Select
                    value={tipoFilter}
                    onChange={(v) => {
                      setTipoFilter(v);
                      setCurrentPage(1);
                    }}
                    className="eventos-control"
                    options={[
                      { label: "Todos", value: "todos" },
                      { label: "Bodas", value: 1 },
                      { label: "XV", value: 2 },
                      { label: "Graduación", value: 3 },
                      { label: "Corporativo", value: 4 },
                      { label: "Cumpleaños", value: 5 },
                      { label: "Otro", value: 6 },
                    ]}
                  />
                </div>
              </Col>

              <Col xs={24} lg={4}>
                <div className="eventos-actions">
                  <Button
                    className="eventos-btn-clean"
                    onClick={() => {
                      setSearch("");
                      setDateRange(null);
                      setTipoFilter("todos");
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
        </section>

        <div className="eventos-stats-row eventos-stats-row-3">
          {STAT_CARDS.map(({ key, label, count, icon, cls }) => (
            <Card
              key={key}
              className={`eventos-stat-card ${cls} ${statFilter === key ? "eventos-stat-active" : ""}`}
              hoverable
              onClick={() => {
                setStatFilter((p) => (p === key ? "todos" : key));
                setCurrentPage(1);
              }}
            >
              <Space align="center" size={10}>
                <div className="eventos-stat-icon">{icon}</div>
                <div>
                  <div className="eventos-stat-value">{count}</div>
                  <div className="eventos-stat-label">{label}</div>
                </div>
              </Space>
            </Card>
          ))}
        </div>

        <div className="eventos-expedientes-card">
          <div className="eventos-toolbar">
            <div className="eventos-toolbar-left">
              <Title level={4} style={{ marginBottom: 0 }}>
                Cotizaciones ({filteredItems.length})
              </Title>
              <Text type="secondary">{filteredItems.length} encontradas</Text>
            </div>
            <div className="eventos-toolbar-right">
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
                  onClick={handleOpenCreate}
                  className="laboral-btn-create custom-button"
                >
                  Nueva cotización
                </Button>
              )}
            </div>
          </div>

          {filteredItems.length > PAGE_SIZE && (
            <div style={{ marginBottom: 16, textAlign: "right" }}>
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

          <div className="eventos-grid">
            {paginatedItems.map((row) => {
              const estado = getEstado(row);
              const servicios = getServicios(row);
              return (
                <div key={row.id_cotizacion} className="evento-card">
                  <div className="evento-card-header">
                    <div className="evento-card-head">
                      <Paragraph className="evento-card-name" ellipsis={{ rows: 2 }}>
                        {toTitleCase(row.cliente_nombre)}
                      </Paragraph>
                      <span className={`cot-estado-badge cot-estado-${estado}`}>
                        {ESTADO_LABEL[estado]}
                      </span>
                    </div>
                    {TIPO_EVENTO_MAP[row.id_tipo_evento] && (() => {
                      const chipColor = getTipoChipColors(row.id_tipo_evento);
                      return (
                        <span
                          className="evento-tipo-chip"
                          style={{
                            "--chip-bg": chipColor.bg,
                            "--chip-text": chipColor.text,
                            "--chip-bg-dark": chipColor.darkBg,
                            "--chip-text-dark": chipColor.darkText,
                            filter: chipColor.filter,
                          }}
                        >
                          {TIPO_EVENTO_MAP[row.id_tipo_evento]}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="evento-card-body">
                    <div className="cot-folio-line">
                      <span className="evento-info-label"># Folio</span>
                      <span className="cot-folio-code">{row.folio || "—"}</span>
                    </div>

                    <div className="cot-serv-block">
                      <span className="evento-info-label">Servicios contratados</span>
                      {servicios.length === 0 ? (
                        <span className="cot-serv-empty">Sin servicios</span>
                      ) : (
                        <ul className="cot-serv-list">
                          {servicios.map((id) => (
                            <li key={id} className="cot-serv-item">
                              <CheckCircleOutlined className="cot-serv-ic" />
                              {SERVICIO_MAP[id]}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="evento-card-footer">
                    <div className="evento-bottom-strip cot-strip-neutral">
                      <span className="evento-strip-label">Importe total</span>
                      <span className="evento-strip-amount">{fmtMoney(row.importe)}</span>
                    </div>
                    <button
                      className="evento-btn-details"
                      onClick={() => (canConsultar ? navigate(`/app/cotizaciones/${row.id_cotizacion}`) : undefined)}
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
            <div
              style={{
                padding: "36px 12px",
                textAlign: "center",
                color: "var(--eh-ink-muted, rgba(0,0,0,0.55))",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                Sin cotizaciones que coincidan con los filtros
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
      </div>

      {showBackToTop && (
        <button
          type="button"
          className="eventos-back-to-top"
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
        title="Previsualización, Reporte de Cotizaciones"
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
                printCotizacionesReportPdf({
                  items: filteredItems,
                  periodFrom: dateRange?.[0] ? dayjs(dateRange[0]).format("YYYY-MM-DD") : undefined,
                  periodTo: dateRange?.[1] ? dayjs(dateRange[1]).format("YYYY-MM-DD") : undefined,
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
            title="preview-cotizaciones"
            style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
            srcDoc={exportPreviewHtml}
          />
        </div>
      </Modal>
    </main>
  );
}
