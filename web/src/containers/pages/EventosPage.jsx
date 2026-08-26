import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { actionEventosGet } from "../../redux/actions/eventos/eventos";

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
  Skeleton,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  StopOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";

import { previewEventosReportPdf, printEventosReportPdf } from "../../components/utils/printEventosReportPdf";
import "./EventosPage.css";

dayjs.locale("es");

const { RangePicker } = DatePicker;
const { Title, Text, Paragraph } = Typography;

const PAGE_SIZE = 50;

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
    const lugar = (r.lugar_evento || "").trim();
    const lugarKey = `l:${lugar.toLowerCase()}`;
    if (lugar && lugar.toLowerCase() !== "pendiente" && !seen.has(lugarKey)) {
      seen.add(lugarKey);
      pool.push({ label: lugar, type: "lugar" });
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
          {item.type === "lugar" ? <EnvironmentOutlined /> : <UserOutlined />}
        </span>
        <span className="eventos-suggest-text">{item.label}</span>
        <span className="eventos-suggest-type">
          {item.type === "lugar" ? "Lugar" : "Cliente"}
        </span>
      </div>
    ),
  }));

export default function EventosPage() {
  const dispatch = useDispatch();
  const { items = [], loading } = useSelector((state) => state.eventos);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [tipoFilter, setTipoFilter] = useState("todos");

  const [statFilter, setStatFilter] = useState("todos");
  const [activoSubFilter, setActivoSubFilter] = useState("todo");
  const [concluidoSubFilter, setConcluidoSubFilter] = useState("todo");

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
  const { perm } = usePermisos() || { perm: () => true };
  const canConsultar = perm("eventos", "consultar");
  const canInsertar  = perm("eventos", "insertar");

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
    dispatch(actionEventosGet(fetchParams));
  }, [dispatch, fetchParams]);

  const today = dayjs().startOf("day");

  const esCancelado = (r) =>
    r.cancelado === true || String(r.status || "").toLowerCase() === "cancelado";

  const esActivo = (r) =>
    !esCancelado(r) && (!r.fecha_evento || !dayjs(r.fecha_evento).isBefore(today));

  const esConcluido = (r) =>
    !esCancelado(r) && !!r.fecha_evento && dayjs(r.fecha_evento).isBefore(today);

  const filteredBase = useMemo(() => {
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
        return !d.isBefore(from) && !d.isAfter(to);
      });
    }
    return base;
  }, [items, tipoFilter, searchDebounced, dateRange]);

  const filteredItems = useMemo(() => {
    if (statFilter === "cancelados") return filteredBase.filter(esCancelado);
    if (statFilter === "activos") {
      const activos = filteredBase.filter(esActivo);
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
      const concluidos = filteredBase.filter(esConcluido);
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
    return filteredBase;
  }, [filteredBase, statFilter, activoSubFilter, concluidoSubFilter]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const counts = useMemo(() => {
    const activos = filteredBase.filter(esActivo);
    const concluidos = filteredBase.filter(esConcluido);
    return {
      activos: activos.length,
      concluidos: concluidos.length,
      cancelados: filteredBase.filter(esCancelado).length,
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
  }, [filteredBase]);

  const totales = useMemo(() => {
    const totalImporte = filteredBase.reduce((a, r) => a + parseNum(r.importe), 0);
    const totalAnticipo = filteredBase.reduce(
      (a, r) => a + parseNum(r.importe_anticipo),
      0
    );
    return { totalImporte, totalAnticipo, totalResta: totalImporte - totalAnticipo };
  }, [filteredBase]);

  const TIPO_LABEL_MAP = {
    todos: "Todos",
    1: "Bodas", 2: "XV", 3: "Graduación", 4: "Corporativo", 5: "Cumpleaños", 6: "Otro",
  };

  const handleExportNow = async () => {
    const html = await previewEventosReportPdf({
      items: filteredItems,
      periodFrom: dateRange?.[0] ? dayjs(dateRange[0]).format("YYYY-MM-DD") : undefined,
      periodTo: dateRange?.[1] ? dayjs(dateRange[1]).format("YYYY-MM-DD") : undefined,
      tipoLabel: TIPO_LABEL_MAP[tipoFilter] || "Todos",
    });
    setExportPreviewHtml(html);
    setExportPreviewOpen(true);
  };

  const handleOpenCreate = () => navigate("/app/eventos/crear");

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

        <section className="eventos-header-card">
          <div className="eventos-header-section">
            <Space direction="vertical" size={2}>
              <Title level={2} className="eventos-title">
                Eventos
              </Title>
              <Text className="eventos-subtitle">
                Gestión y seguimiento de eventos
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
                      placeholder="Buscar por cliente, código o lugar..."
                      suffix={<SearchOutlined className="eventos-input-suffix" />}
                    />
                  </AutoComplete>
                </div>
              </Col>

              <Col xs={24} lg={7}>
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
        </section>

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

          <div className="eventos-expedientes-card">
            <div className="eventos-toolbar">
              <div className="eventos-toolbar-left">
                <Title level={4} style={{ marginBottom: 0 }}>
                  Eventos ({filteredItems.length})
                </Title>
                <Text type="secondary">{filteredItems.length} encontrados</Text>
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
                    Nuevo evento
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
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <div key={`sk-${i}`} className="evento-card evento-card-skeleton">
                  <div className="evento-card-header">
                    <Skeleton active title={{ width: "60%" }} paragraph={{ rows: 1, width: "40%" }} />
                  </div>
                  <div className="evento-card-body">
                    <Skeleton active title={false} paragraph={{ rows: 5 }} />
                  </div>
                </div>
              ))}

              {!loading && paginatedItems.map((row) => {
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
                        onClick={() => canConsultar ? navigate(`/app/eventos/${row.id_evento}`) : undefined}
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

            {!loading && paginatedItems.length === 0 && (
              <div
                style={{
                  padding: "36px 12px",
                  textAlign: "center",
                  color: "var(--eh-ink-muted, rgba(0,0,0,0.55))",
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
        title="Previsualización — Reporte de Eventos"
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
                printEventosReportPdf({
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
            title="preview-eventos"
            style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
            srcDoc={exportPreviewHtml}
          />
        </div>
      </Modal>
    </main>
  );
}
