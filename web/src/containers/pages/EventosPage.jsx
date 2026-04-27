import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { actionEventosGet } from "../../redux/actions/eventos/eventos";

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
import "./EventosPage.css";

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

export default function EventosPage() {
  const dispatch = useDispatch();
  const { items = [] } = useSelector((state) => state.eventos);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [tipoFilter, setTipoFilter] = useState("todos");

  const [statFilter, setStatFilter] = useState("todos");
  const [activoSubFilter, setActivoSubFilter] = useState("todo");
  const [concluidoSubFilter, setConcluidoSubFilter] = useState("todo");

  const [importModalOpen, setImportModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const navigate = useNavigate();

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
    dispatch(actionEventosGet(fetchParams));
  }, [dispatch, fetchParams]);

  const today = dayjs().startOf("day");

  const esCancelado = (r) =>
    r.cancelado === true || String(r.status || "").toLowerCase() === "cancelado";

  const esActivo = (r) =>
    !esCancelado(r) && (!r.fecha_evento || !dayjs(r.fecha_evento).isBefore(today));

  const esConcluido = (r) =>
    !esCancelado(r) && !!r.fecha_evento && dayjs(r.fecha_evento).isBefore(today);

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
          (r.code || "").toLowerCase().includes(q) ||
          (r.lugar_evento || "").toLowerCase().includes(q)
      );
    }

    if (dateRange?.[0] && dateRange?.[1]) {
      const from = dayjs(dateRange[0]).startOf("day");
      const to = dayjs(dateRange[1]).endOf("day");
      base = base.filter((r) => {
        if (!r.fecha_evento) return false;
        const d = dayjs(r.fecha_evento);
        return d.isAfter(from) && d.isBefore(to);
      });
    }

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

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

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

  const totales = useMemo(() => {
    const totalImporte = items.reduce((a, r) => a + parseNum(r.importe), 0);
    const totalAnticipo = items.reduce(
      (a, r) => a + parseNum(r.importe_anticipo),
      0
    );
    return { totalImporte, totalAnticipo, totalResta: totalImporte - totalAnticipo };
  }, [items]);

  const handleOpenCreate = () => navigate("/eventos/crear");

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

  return (
    <main className="eventos-main">
      <div className="eventos-content">

        <section className="eventos-header-section">
          <div>
            <Space direction="vertical" size={2}>
              <Title level={2} className="eventos-title">
                Eventos
              </Title>
              <Text className="eventos-subtitle">
                Gestión y seguimiento de eventos
              </Text>
            </Space>
          </div>
        </section>

        <section className="eventos-section">

          <div className="eventos-filters-panel">
            <Row gutter={[16, 14]}>
              <Col xs={24} lg={10}>
                <div>
                  <div className="eventos-field-label">Buscador</div>
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Buscar por cliente, código o lugar..."
                    suffix={<SearchOutlined className="eventos-input-suffix" />}
                    className="eventos-control"
                    allowClear
                  />
                </div>
              </Col>

              <Col xs={24} lg={8}>
                <div>
                  <div className="eventos-field-label">Fecha del evento</div>
                  <RangePicker
                    value={dateRange}
                    onChange={(v) => {
                      setDateRange(v);
                      setCurrentPage(1);
                    }}
                    format="DD/MM/YYYY"
                    placeholder={["Desde", "Hasta"]}
                    className="eventos-control"
                  />
                </div>
              </Col>

              <Col xs={24} lg={6}>
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
            </Row>

            <Row gutter={[16, 14]} style={{ marginTop: 14 }} align="bottom">
              <Col xs={24} lg={6}>
                <div className="eventos-actions">
                  <Button
                    className="eventos-btn-clean"
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

          <div className="eventos-stats-row eventos-stats-row-3">
            <Card
              className={`eventos-stat-card eventos-stat-activos ${
                statFilter === "activos" ? "eventos-stat-active" : ""
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
                <div className="eventos-stat-icon">
                  <ClockCircleOutlined />
                </div>
                <div>
                  <div className="eventos-stat-value">{counts.activos}</div>
                  <div className="eventos-stat-label">Activos</div>
                </div>
              </Space>
            </Card>

            <Card
              className={`eventos-stat-card eventos-stat-inactivos ${
                statFilter === "concluidos" ? "eventos-stat-active" : ""
              }`}
              hoverable
              onClick={() => {
                setStatFilter((p) => (p === "concluidos" ? "todos" : "concluidos"));
                setConcluidoSubFilter("todo");
                setCurrentPage(1);
              }}
            >
              <Space align="center" size={10}>
                <div className="eventos-stat-icon">
                  <CheckCircleOutlined />
                </div>
                <div>
                  <div className="eventos-stat-value">{counts.concluidos}</div>
                  <div className="eventos-stat-label">Concluidos</div>
                </div>
              </Space>
            </Card>

            <Card
              className={`eventos-stat-card eventos-stat-cancelados ${
                statFilter === "cancelados" ? "eventos-stat-active" : ""
              }`}
              hoverable
              onClick={() => {
                setStatFilter((p) => (p === "cancelados" ? "todos" : "cancelados"));
                setCurrentPage(1);
              }}
            >
              <Space align="center" size={10}>
                <div className="eventos-stat-icon">
                  <CloseCircleOutlined />
                </div>
                <div>
                  <div className="eventos-stat-value">{counts.cancelados}</div>
                  <div className="eventos-stat-label">Cancelados</div>
                </div>
              </Space>
            </Card>
          </div>

          {statFilter === "activos" && (
            <div className="eventos-substat-row">
              {[
                {
                  key: "pendiente_pago",
                  label: "Pendiente de pago",
                  count: counts.activosPendientePago,
                  icon: <ExclamationCircleOutlined />,
                  cls: "eventos-substat-pendiente",
                },
                {
                  key: "pago_completado",
                  label: "Pago completado",
                  count: counts.activosPagoCompletado,
                  icon: <CheckCircleOutlined />,
                  cls: "eventos-substat-completado",
                },
                {
                  key: "sin_anticipo",
                  label: "Sin anticipo",
                  count: counts.activosSinAnticipo,
                  icon: <StopOutlined />,
                  cls: "eventos-substat-pendiente",
                },
                {
                  key: "todo",
                  label: "Todos",
                  count: counts.activos,
                  icon: <FileDoneOutlined />,
                  cls: "eventos-substat-todo",
                },
              ].map(({ key, label, count, icon, cls }) => (
                <Card
                  key={key}
                  hoverable
                  className={`eventos-substat-card ${cls} ${
                    activoSubFilter === key ? "eventos-substat-active" : ""
                  }`}
                  onClick={() => {
                    setActivoSubFilter(key);
                    setCurrentPage(1);
                  }}
                >
                  <Space align="center" size={8}>
                    <div className="eventos-substat-icon">{icon}</div>
                    <div>
                      <div className="eventos-substat-value">{count}</div>
                      <div className="eventos-substat-label">{label}</div>
                    </div>
                  </Space>
                </Card>
              ))}
            </div>
          )}

          {statFilter === "concluidos" && (
            <div className="eventos-substat-row">
              {[
                {
                  key: "con_deuda",
                  label: "Con deuda",
                  count: counts.cluidosConDeuda,
                  icon: <ExclamationCircleOutlined />,
                  cls: "eventos-substat-pendiente",
                },
                {
                  key: "liquidados",
                  label: "Liquidados",
                  count: counts.cluidosLiquidados,
                  icon: <CheckCircleOutlined />,
                  cls: "eventos-substat-completado",
                },
                {
                  key: "todo",
                  label: "Todos",
                  count: counts.concluidos,
                  icon: <FileDoneOutlined />,
                  cls: "eventos-substat-todo",
                },
              ].map(({ key, label, count, icon, cls }) => (
                <Card
                  key={key}
                  hoverable
                  className={`eventos-substat-card ${cls} ${
                    concluidoSubFilter === key ? "eventos-substat-active" : ""
                  }`}
                  onClick={() => {
                    setConcluidoSubFilter(key);
                    setCurrentPage(1);
                  }}
                >
                  <Space align="center" size={8}>
                    <div className="eventos-substat-icon">{icon}</div>
                    <div>
                      <div className="eventos-substat-value">{count}</div>
                      <div className="eventos-substat-label">{label}</div>
                    </div>
                  </Space>
                </Card>
              ))}
            </div>
          )}

          <div className="eventos-toolbar">
            <div className="eventos-toolbar-left">
              <Title level={4} style={{ marginBottom: 0 }}>
                Eventos ({filteredItems.length})
              </Title>
              <Text type="secondary">{filteredItems.length} encontrados</Text>
            </div>
            <div className="eventos-toolbar-right">
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
                Nuevo evento
              </Button>
            </div>
          </div>

          <div className="eventos-expedientes-card">
            <div className="eventos-grid">
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
                  <div key={row.id_evento} className="evento-card">
                    <div className="evento-card-header">
                      <div className="evento-card-head">
                        <Paragraph
                          className="evento-card-name"
                          ellipsis={{ rows: 2 }}
                        >
                          {toTitleCase(row.cliente_nombre)}
                        </Paragraph>
                        <span className={`evento-status-badge evento-status-${statusKey}`}>
                          {statusLabel}
                        </span>
                      </div>
                      {TIPO_EVENTO_MAP[row.id_tipo_evento] && (
                        <span className="evento-tipo-chip">
                          {TIPO_EVENTO_MAP[row.id_tipo_evento]}
                        </span>
                      )}
                    </div>

                    <div className="evento-card-body">
                      <div className="evento-info-row">
                        <EnvironmentOutlined className="evento-info-icon" />
                        <div className="evento-info-text">
                          <span className="evento-info-label">Lugar</span>
                          <span className="evento-info-value">{toTitleCase(row.lugar_evento) || "—"}</span>
                        </div>
                      </div>
                      <div className="evento-info-row">
                        <CalendarOutlined className="evento-info-icon" />
                        <div className="evento-info-text">
                          <span className="evento-info-label">Fecha</span>
                          <span className="evento-info-value">{fmtFecha(row.fecha_evento)}</span>
                        </div>
                      </div>
                      <div className="evento-info-row">
                        <ClockCircleOutlined className="evento-info-icon" />
                        <div className="evento-info-text">
                          <span className="evento-info-label">Horario</span>
                          <span className="evento-info-value">{ini} – {fin}</span>
                        </div>
                      </div>
                      <div className="evento-money-grid">
                        <div className="evento-money-item">
                          <span className="evento-info-label">Importe</span>
                          <span className="evento-money-value">{fmtMoney(row.importe)}</span>
                        </div>
                        <div className="evento-money-item">
                          <span className="evento-info-label">Anticipo</span>
                          <span className="evento-money-value evento-money-anticipo">
                            {calcAnticipoTotal(row) > 0
                              ? fmtMoney(String(calcAnticipoTotal(row)))
                              : <span className="evento-sin-anticipo">SIN ANTICIPO</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="evento-card-footer">
                      <div className={`evento-bottom-strip ${strip.cls}`}>
                        <span className="evento-strip-label">{strip.label}</span>
                        {strip.amount && <span className="evento-strip-amount">{strip.amount}</span>}
                      </div>
                      <button
                        className="evento-btn-details"
                        onClick={() => navigate(`/eventos/${row.id_evento}`)}
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
                  color: "rgba(0,0,0,0.55)",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  Sin eventos que coincidan con los filtros
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

      <ImportarExcelModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          lastFetchKey.current = "";
          dispatch(actionEventosGet(fetchParams));
        }}
        context={{}}
        endpoint="eventos/importar-excel"
        title="Importar eventos desde Excel"
      />
    </main>
  );
}
