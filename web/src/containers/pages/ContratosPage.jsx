// src/containers/pages/ContratosPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  actionContratosGet,
} from "../../redux/actions/contratos/contratos";

import {
  Card,
  Button,
  Input,
  DatePicker,
  Select,
  Space,
  Typography,
  Row,
  Col,
  Pagination,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  StopOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

import ImportarExcelModal from "./utils/ImportarExcelModal.jsx";
import "./ContratosPage.css";

dayjs.locale("es");

const { RangePicker } = DatePicker;
const { Title, Text, Paragraph } = Typography;

// ──────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

const TIPO_EVENTO_MAP = {
  1: "Bodas",
  2: "XV",
  3: "Graduación",
  4: "Corporativo",
  5: "Cumpleaños",
  6: "Otro",
};

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
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

const calcResta = (row) => {
  if (!row.importe) return null;
  const total = parseNum(row.importe);
  const anticipo = parseNum(row.importe_anticipo);
  const abonos = parseNum(row.total_abonos);
  return total - anticipo - abonos;
};

const calcAnticipoTotal = (row) => {
  return parseNum(row.importe_anticipo) + parseNum(row.total_abonos);
};

const fmtFecha = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D [de] MMMM [del] YYYY") : "—";
};

const toTitleCase = (str) => {
  if (!str || typeof str !== "string") return "—";
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

// ──────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────
export default function ContratosPage() {
  const dispatch = useDispatch();
  const { items = [] } = useSelector((state) => state.contratos);

  // ── filtros de búsqueda ───────────────────────────────────
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [tipoFilter, setTipoFilter] = useState("todos");

  // ── filtro de stat card ───────────────────────────────────
  const [statFilter, setStatFilter] = useState("todos");
  const [activoSubFilter, setActivoSubFilter] = useState("todo");
  const [concluidoSubFilter, setConcluidoSubFilter] = useState("todo");

  // ── modal importar ────────────────────────────────────────
  const [importModalOpen, setImportModalOpen] = useState(false);

  // ── paginación ────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  const navigate = useNavigate();

  // ── debounce búsqueda ─────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── fetch ─────────────────────────────────────────────────
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
      limit: 500,
    }),
    [searchDebounced, dateRange, tipoFilter]
  );

  useEffect(() => {
    const key = JSON.stringify(fetchParams);
    if (lastFetchKey.current === key) return;
    lastFetchKey.current = key;
    dispatch(actionContratosGet(fetchParams));
  }, [dispatch, fetchParams]);

  // ── helpers de lógica de negocio ─────────────────────────
  const today = dayjs().startOf("day");

  const esCancelado = (r) =>
    r.cancelado === true || String(r.status || "").toLowerCase() === "cancelado";

  const esActivo = (r) =>
    !esCancelado(r) && (!r.fecha_evento || !dayjs(r.fecha_evento).isBefore(today));

  const esConcluido = (r) =>
    !esCancelado(r) && !!r.fecha_evento && dayjs(r.fecha_evento).isBefore(today);

  // ── filtro cliente-side ───────────────────────────────────
  const filteredItems = useMemo(() => {
    let base = items;

    // Filtro por tipo de evento
    if (tipoFilter !== "todos") {
      base = base.filter((r) => r.id_tipo_evento === tipoFilter);
    }

    // Filtro por búsqueda de texto
    if (searchDebounced) {
      const q = searchDebounced.toLowerCase();
      base = base.filter(
        (r) =>
          (r.cliente_nombre || "").toLowerCase().includes(q) ||
          (r.code || "").toLowerCase().includes(q) ||
          (r.lugar_evento || "").toLowerCase().includes(q)
      );
    }

    // Filtro por rango de fecha
    if (dateRange?.[0] && dateRange?.[1]) {
      const from = dayjs(dateRange[0]).startOf("day");
      const to = dayjs(dateRange[1]).endOf("day");
      base = base.filter((r) => {
        if (!r.fecha_evento) return false;
        const d = dayjs(r.fecha_evento);
        return d.isAfter(from) && d.isBefore(to);
      });
    }

    // Filtro por stat card
    if (statFilter === "cancelados") return base.filter(esCancelado);
    if (statFilter === "activos") {
      const activos = base.filter(esActivo);
      if (activoSubFilter === "pendiente_pago")
        return activos.filter((r) => {
          const resta = calcResta(r);
          return resta !== null && resta > 0 && parseNum(r.importe_anticipo) > 0;
        });
      if (activoSubFilter === "pago_completado")
        return activos.filter((r) => {
          const resta = calcResta(r);
          return resta !== null && resta <= 0;
        });
      if (activoSubFilter === "sin_anticipo")
        return activos.filter((r) => parseNum(r.importe_anticipo) === 0);
      return activos;
    }
    if (statFilter === "concluidos") {
      const concluidos = base.filter(esConcluido);
      if (concluidoSubFilter === "con_deuda")
        return concluidos.filter((r) => {
          const resta = calcResta(r);
          return resta !== null && resta > 0;
        });
      if (concluidoSubFilter === "liquidados")
        return concluidos.filter((r) => {
          const resta = calcResta(r);
          return resta !== null && resta <= 0;
        });
      return concluidos;
    }
    return base;
  }, [items, statFilter, activoSubFilter, concluidoSubFilter, tipoFilter, searchDebounced, dateRange]);

  // ── paginación cliente-side ───────────────────────────────
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  // ── conteos para stat cards ───────────────────────────────
  const counts = useMemo(() => {
    const activos = items.filter(esActivo);
    const concluidos = items.filter(esConcluido);
    return {
      activos: activos.length,
      concluidos: concluidos.length,
      cancelados: items.filter(esCancelado).length,
      activosPendientePago: activos.filter((r) => {
        const re = calcResta(r);
        return re !== null && re > 0 && parseNum(r.importe_anticipo) > 0;
      }).length,
      activosPagoCompletado: activos.filter((r) => {
        const re = calcResta(r);
        return re !== null && re <= 0;
      }).length,
      activosSinAnticipo: activos.filter((r) => parseNum(r.importe_anticipo) === 0).length,
      cluidosConDeuda: concluidos.filter((r) => {
        const re = calcResta(r);
        return re !== null && re > 0;
      }).length,
      cluidosLiquidados: concluidos.filter((r) => {
        const re = calcResta(r);
        return re !== null && re <= 0;
      }).length,
    };
  }, [items]);

  // ── totales ───────────────────────────────────────────────
  const totales = useMemo(() => {
    const totalImporte = items.reduce((a, r) => a + parseNum(r.importe), 0);
    const totalAnticipo = items.reduce(
      (a, r) => a + parseNum(r.importe_anticipo),
      0
    );
    return { totalImporte, totalAnticipo, totalResta: totalImporte - totalAnticipo };
  }, [items]);

  // ── navegación a crear / editar ──────────────────────────
  const handleOpenCreate = () => navigate("/contratos/crear");

  // ── bottom strip de la card ───────────────────────────────
  const getBottomStrip = (row) => {
    const resta = calcResta(row);
    if (resta === null || resta === undefined) {
      return { cls: "is-yellow", label: "SIN IMPORTE", amount: null };
    }
    if (resta <= 0) {
      return { cls: "is-green", label: "PAGO COMPLETADO", amount: null };
    }
    if (parseNum(row.importe_anticipo) > 0) {
      return { cls: "is-yellow", label: "SALDO PENDIENTE", amount: fmtMoney(String(resta)) };
    }
    return { cls: "is-red", label: "SIN ANTICIPO", amount: fmtMoney(String(resta)) };
  };

  // ──────────────────────────────────────────────────────────
  return (
    <main className="contratos-main">
      <div className="contratos-content">

        {/* ── HEADER ── */}
        <section className="contratos-header-section">
          <div>
            <Space direction="vertical" size={2}>
              <Title level={2} className="contratos-title">
           
                Contratos
              </Title>
              <Text className="contratos-subtitle">
                Gestión y seguimiento de contratos de eventos
              </Text>
            </Space>
          </div>
          
        </section>

        <section className="contratos-section">

          {/* ── PANEL DE FILTROS ── */}
          <div className="contratos-filters-panel">
            {/* Fila 1: Búsqueda + Fechas + Estado */}
            <Row gutter={[16, 14]}>
              <Col xs={24} lg={10}>
                <div>
                  <div className="contratos-field-label">Buscador</div>
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Buscar por cliente, código o lugar..."
                    suffix={<SearchOutlined className="contratos-input-suffix" />}
                    className="contratos-control"
                    allowClear
                  />
                </div>
              </Col>

              <Col xs={24} lg={8}>
                <div>
                  <div className="contratos-field-label">Fecha del evento</div>
                  <RangePicker
                    value={dateRange}
                    onChange={(v) => {
                      setDateRange(v);
                      setCurrentPage(1);
                    }}
                    format="DD/MM/YYYY"
                    placeholder={["Desde", "Hasta"]}
                    className="contratos-control"
                  />
                </div>
              </Col>

              <Col xs={24} lg={6}>
                <div>
                  <div className="contratos-field-label">Tipo de evento</div>
                  <Select
                    value={tipoFilter}
                    onChange={(v) => {
                      setTipoFilter(v);
                      setCurrentPage(1);
                    }}
                    className="contratos-control"
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
            </Row>

            {/* Fila 2: Limpiar */}
            <Row gutter={[16, 14]} style={{ marginTop: 14 }} align="bottom">
              <Col xs={24} lg={6}>
                <div className="contratos-actions">
                  <Button
                    className="contratos-btn-clean"
                    onClick={() => {
                      setSearch("");
                      setDateRange(null);
                      setTipoFilter("todos");
                      setStatFilter("todos");
                      setActivoSubFilter("todo");
                      setConcluidoSubFilter("todo");
                      setCurrentPage(1);
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </Col>
            </Row>
          </div>

          {/* ── STAT CARDS (clickables) ── */}
          <div className="contratos-stats-row contratos-stats-row-3">
            {/* Activos */}
            <Card
              className={`contratos-stat-card contratos-stat-activos ${
                statFilter === "activos" ? "contratos-stat-active" : ""
              }`}
              hoverable
              onClick={() => {
                const next = statFilter === "activos" ? "todos" : "activos";
                setStatFilter(next);
                setActivoSubFilter("todo");
                setCurrentPage(1);
              }}
            >
              <Space align="center" size={10}>
                <div className="contratos-stat-icon">
                  <CheckCircleOutlined />
                </div>
                <div>
                  <div className="contratos-stat-value">{counts.activos}</div>
                  <div className="contratos-stat-label">Activos</div>
                </div>
              </Space>
            </Card>

            {/* Concluidos */}
            <Card
              className={`contratos-stat-card contratos-stat-inactivos ${
                statFilter === "concluidos" ? "contratos-stat-active" : ""
              }`}
              hoverable
              onClick={() => {
                setStatFilter((p) => (p === "concluidos" ? "todos" : "concluidos"));
                setConcluidoSubFilter("todo");
                setCurrentPage(1);
              }}
            >
              <Space align="center" size={10}>
                <div className="contratos-stat-icon">
                  <StopOutlined />
                </div>
                <div>
                  <div className="contratos-stat-value">{counts.concluidos}</div>
                  <div className="contratos-stat-label">Concluidos</div>
                </div>
              </Space>
            </Card>

            {/* Cancelados */}
            <Card
              className={`contratos-stat-card contratos-stat-cancelados ${
                statFilter === "cancelados" ? "contratos-stat-active" : ""
              }`}
              hoverable
              onClick={() => {
                setStatFilter((p) => (p === "cancelados" ? "todos" : "cancelados"));
                setCurrentPage(1);
              }}
            >
              <Space align="center" size={10}>
                <div className="contratos-stat-icon">
                  <CloseCircleOutlined />
                </div>
                <div>
                  <div className="contratos-stat-value">{counts.cancelados}</div>
                  <div className="contratos-stat-label">Cancelados</div>
                </div>
              </Space>
            </Card>
          </div>

          {/* ── SUB-FILTROS DE ACTIVOS ── */}
          {statFilter === "activos" && (
            <div className="contratos-substat-row">
              {[
                {
                  key: "pendiente_pago",
                  label: "Pendiente de pago",
                  count: counts.activosPendientePago,
                  icon: <ExclamationCircleOutlined />,
                  cls: "contratos-substat-pendiente",
                },
                {
                  key: "pago_completado",
                  label: "Pago completado",
                  count: counts.activosPagoCompletado,
                  icon: <CheckCircleOutlined />,
                  cls: "contratos-substat-completado",
                },
                {
                  key: "sin_anticipo",
                  label: "Sin anticipo",
                  count: counts.activosSinAnticipo,
                  icon: <StopOutlined />,
                  cls: "contratos-substat-pendiente",
                },
                {
                  key: "todo",
                  label: "Todos",
                  count: counts.activos,
                  icon: <FileDoneOutlined />,
                  cls: "contratos-substat-todo",
                },
              ].map(({ key, label, count, icon, cls }) => (
                <Card
                  key={key}
                  hoverable
                  className={`contratos-substat-card ${cls} ${
                    activoSubFilter === key ? "contratos-substat-active" : ""
                  }`}
                  onClick={() => {
                    setActivoSubFilter(key);
                    setCurrentPage(1);
                  }}
                >
                  <Space align="center" size={8}>
                    <div className="contratos-substat-icon">{icon}</div>
                    <div>
                      <div className="contratos-substat-value">{count}</div>
                      <div className="contratos-substat-label">{label}</div>
                    </div>
                  </Space>
                </Card>
              ))}
            </div>
          )}

          {/* ── SUB-FILTROS DE CONCLUIDOS ── */}
          {statFilter === "concluidos" && (
            <div className="contratos-substat-row">
              {[
                {
                  key: "con_deuda",
                  label: "Con deuda",
                  count: counts.cluidosConDeuda,
                  icon: <ExclamationCircleOutlined />,
                  cls: "contratos-substat-pendiente",
                },
                {
                  key: "liquidados",
                  label: "Liquidados",
                  count: counts.cluidosLiquidados,
                  icon: <CheckCircleOutlined />,
                  cls: "contratos-substat-completado",
                },
                {
                  key: "todo",
                  label: "Todos",
                  count: counts.concluidos,
                  icon: <FileDoneOutlined />,
                  cls: "contratos-substat-todo",
                },
              ].map(({ key, label, count, icon, cls }) => (
                <Card
                  key={key}
                  hoverable
                  className={`contratos-substat-card ${cls} ${
                    concluidoSubFilter === key ? "contratos-substat-active" : ""
                  }`}
                  onClick={() => {
                    setConcluidoSubFilter(key);
                    setCurrentPage(1);
                  }}
                >
                  <Space align="center" size={8}>
                    <div className="contratos-substat-icon">{icon}</div>
                    <div>
                      <div className="contratos-substat-value">{count}</div>
                      <div className="contratos-substat-label">{label}</div>
                    </div>
                  </Space>
                </Card>
              ))}
            </div>
          )}

          {/* ── TOOLBAR (conteo + vista toggle + botones) ── */}
          <div className="contratos-toolbar">
            <div className="contratos-toolbar-left">
              <Title level={4} style={{ marginBottom: 0 }}>
                Contratos ({filteredItems.length})
              </Title>
              <Text type="secondary">{filteredItems.length} encontrados</Text>
            </div>
            <div className="contratos-toolbar-right">
              <Button
                icon={<UploadOutlined />}
                onClick={() => setImportModalOpen(true)}
                className="laboral-btn-import laboral-btn-create"
              >
                Importar Excel
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenCreate}
                className="laboral-btn-create custom-button"
              >
                Nuevo contrato
              </Button>
            </div>
          </div>

          {/* ── CONTENEDOR CARDS ── */}
          <div className="contratos-expedientes-card">
                <div className="contratos-grid">
                  {paginatedItems.map((row) => {
                    const strip = getBottomStrip(row);
                    const ini = row.hora_inicio
                      ? dayjs(row.hora_inicio).format("HH:mm")
                      : "—";
                    const fin = row.hora_final
                      ? dayjs(row.hora_final).format("HH:mm")
                      : "—";

                    const statusKey = esCancelado(row) ? "cancelado" : esConcluido(row) ? "concluido" : "activo";
                    const statusLabel = { activo: "Activo", concluido: "Concluido", cancelado: "Cancelado" }[statusKey];

                    return (
                      <div key={row.id_contrato} className="contrato-card">
                        {/* Cabecera */}
                        <div className="contrato-card-header">
                          <div className="contrato-card-head">
                            <Paragraph
                              className="contrato-card-name"
                              ellipsis={{ rows: 2 }}
                            >
                              {toTitleCase(row.cliente_nombre)}
                            </Paragraph>
                            <span className={`contrato-status-badge contrato-status-${statusKey}`}>
                              {statusLabel}
                            </span>
                          </div>
                          {TIPO_EVENTO_MAP[row.id_tipo_evento] && (
                            <span className="contrato-tipo-chip">
                              {TIPO_EVENTO_MAP[row.id_tipo_evento]}
                            </span>
                          )}
                        </div>

                        {/* Cuerpo */}
                        <div className="contrato-card-body">
                          <div className="contrato-info-row">
                            <EnvironmentOutlined className="contrato-info-icon" />
                            <div className="contrato-info-text">
                              <span className="contrato-info-label">Lugar</span>
                              <span className="contrato-info-value">{toTitleCase(row.lugar_evento) || "—"}</span>
                            </div>
                          </div>
                          <div className="contrato-info-row">
                            <CalendarOutlined className="contrato-info-icon" />
                            <div className="contrato-info-text">
                              <span className="contrato-info-label">Fecha</span>
                              <span className="contrato-info-value">{fmtFecha(row.fecha_evento)}</span>
                            </div>
                          </div>
                          <div className="contrato-info-row">
                            <ClockCircleOutlined className="contrato-info-icon" />
                            <div className="contrato-info-text">
                              <span className="contrato-info-label">Horario</span>
                              <span className="contrato-info-value">{ini} – {fin}</span>
                            </div>
                          </div>
                          <div className="contrato-money-grid">
                            <div className="contrato-money-item">
                              <span className="contrato-info-label">Importe</span>
                              <span className="contrato-money-value">{fmtMoney(row.importe)}</span>
                            </div>
                            <div className="contrato-money-item">
                              <span className="contrato-info-label">Anticipo</span>
                              <span className="contrato-money-value contrato-money-anticipo">
                                {calcAnticipoTotal(row) > 0
                                  ? fmtMoney(String(calcAnticipoTotal(row)))
                                  : <span className="contrato-sin-anticipo">SIN ANTICIPO</span>}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="contrato-card-footer">
                          <div className={`contrato-bottom-strip ${strip.cls}`}>
                            <span className="contrato-strip-label">{strip.label}</span>
                            {strip.amount && <span className="contrato-strip-amount">{strip.amount}</span>}
                          </div>
                          <button
                            className="contrato-btn-details"
                            onClick={() => navigate(`/contratos/${row.id_contrato}`)}
                          >
                            VER DETALLES
                            <ArrowRightOutlined />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vacío */}
                {paginatedItems.length === 0 && (
                  <div
                    style={{
                      padding: "36px 12px",
                      textAlign: "center",
                      color: "rgba(0,0,0,0.55)",
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 500 }}>
                      Sin contratos que coincidan con los filtros
                    </div>
                  </div>
                )}

            {/* Paginación */}
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

      {/* ── MODAL IMPORTAR EXCEL ── */}
      <ImportarExcelModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          lastFetchKey.current = "";
          dispatch(actionContratosGet(fetchParams));
        }}
        context={{}}
        endpoint="contratos/importar-excel"
        title="Importar contratos desde Excel"
      />
    </main>
  );
}
