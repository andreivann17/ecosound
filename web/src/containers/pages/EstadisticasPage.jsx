// src/containers/pages/EstadisticasPage.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { Spin, Empty, Select, DatePicker, Pagination } from "antd";
import {
  DollarOutlined,
  FileTextOutlined,
  RiseOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  apiContratosInstance,
  authHeaderContratos,
} from "../../redux/actions/contratos/contratos";
import "./EstadisticasPage.css";

dayjs.locale("es");

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const { RangePicker } = DatePicker;

const DONUT_COLORS = [
  "#6366f1", "#10b981", "#f97316", "#f59e0b",
  "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6",
];

const PERIODO_OPTIONS = [
  { value: "semana",   label: "Esta semana" },
  { value: "quincena", label: "Esta quincena" },
  { value: "mes",      label: "Este mes" },
  { value: "custom",   label: "Personalizado" },
];

const PAGE_SIZE = 10;

const fmtMoney = (val) => {
  const n = parseFloat(String(val ?? 0));
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
};

const fmtFechaCorta = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D MMM YYYY") : "—";
};

const fmtFechaMed = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D [de] MMMM [del] YYYY") : "—";
};

function periodLabel(tipo, dateFrom, dateTo) {
  if (!dateFrom) return "";
  const df = dayjs(dateFrom);
  const dt = dayjs(dateTo);
  if (tipo === "semana") return `Semana del ${df.format("D")} al ${dt.format("D [de] MMMM YYYY")}`;
  if (tipo === "quincena") return `Quincena del ${df.format("D")} al ${dt.format("D [de] MMMM YYYY")}`;
  if (tipo === "mes") return df.format("MMMM YYYY").replace(/^\w/, c => c.toUpperCase());
  if (tipo === "custom") return `${df.format("D MMM YYYY")} — ${dt.format("D MMM YYYY")}`;
  return "";
}

export default function EstadisticasPage() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState("mes");
  const [customRange, setCustomRange] = useState(null); // [dayjs, dayjs] | null
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchStats = useCallback(async (p, range) => {
    setLoading(true);
    try {
      const params = { periodo: p };
      if (p === "custom" && range) {
        params.date_from = range[0].format("YYYY-MM-DD");
        params.date_to   = range[1].format("YYYY-MM-DD");
      }
      const { data: res } = await apiContratosInstance.get("/estadisticas", {
        headers: authHeaderContratos(),
        params,
      });
      setData(res);
      setPage(1);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (periodo === "custom" && !customRange) return; // wait for range
    fetchStats(periodo, customRange);
  }, [periodo, customRange, fetchStats]);

  const handlePeriodo = (val) => {
    setPeriodo(val);
    if (val !== "custom") setCustomRange(null);
  };

  const handleRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) {
      setCustomRange(dates);
    }
  };

  // ── Paginación contratos del periodo ────────────────────────────────────
  const contratosPaginados = useMemo(() => {
    if (!data?.contratos_del_periodo) return [];
    const start = (page - 1) * PAGE_SIZE;
    return data.contratos_del_periodo.slice(start, start + PAGE_SIZE);
  }, [data, page]);

  const totalImporte = useMemo(() =>
    (data?.contratos_del_periodo ?? []).reduce((s, c) => s + (c.importe || 0), 0),
  [data]);

  const totalSaldoPendiente = useMemo(() =>
    (data?.contratos_del_periodo ?? []).reduce((s, c) => s + (c.saldo_pendiente || 0), 0),
  [data]);

  const totalSaldoCobranza = useMemo(() =>
    (data?.cobranza?.contratos_pendientes ?? []).reduce((s, c) => s + (c.saldo || 0), 0),
  [data]);

  // ── Chart: bar ──────────────────────────────────────────────────────────
  const barData = data ? {
    labels: data.ingresos_por_mes.map((m) => m.mes),
    datasets: [
      {
        label: "Cobrado",
        data: data.ingresos_por_mes.map((m) => m.cobrado),
        backgroundColor: "#10b981",
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: "Pendiente",
        data: data.ingresos_por_mes.map((m) => m.pendiente),
        backgroundColor: "#cbd5e1",
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  } : null;

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { font: { size: 12 }, padding: 16, usePointStyle: true },
      },
      tooltip: {
        callbacks: { label: (ctx) => ` ${fmtMoney(ctx.raw)}` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        grid: { color: "#f1f5f9" },
        ticks: {
          font: { size: 11 },
          callback: (v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`,
        },
      },
    },
  };

  // ── Chart: donut ────────────────────────────────────────────────────────
  const donutData = data?.por_tipo_evento?.length ? {
    labels: data.por_tipo_evento.map((t) => t.tipo),
    datasets: [{
      data: data.por_tipo_evento.map((t) => t.cantidad),
      backgroundColor: DONUT_COLORS.slice(0, data.por_tipo_evento.length),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  } : null;

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "right",
        labels: { font: { size: 12 }, padding: 12, usePointStyle: true },
      },
      tooltip: {
        callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} contratos` },
      },
    },
  };

  const periodoDescripcion = data
    ? periodLabel(data.periodo.tipo, data.periodo.date_from, data.periodo.date_to)
    : "";

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="est-main">
      <div className="est-content">

        {/* ── TITLE ── */}
        <div className="est-page-header">
          <div>
            <h1 className="est-page-title">Estadísticas</h1>
          </div>
        </div>

        {/* ── RESUMEN ── */}
        <div className="est-section-card">

          {/* Header con selector */}
          <div className="est-section-header">
            <div className="est-header-left">
              <span className="est-section-label">RESUMEN DEL PERIODO</span>
              {periodoDescripcion && (
                <span className="est-period-display">{periodoDescripcion}</span>
              )}
            </div>
            <div className="est-period-selector">
              <Select
                value={periodo}
                onChange={handlePeriodo}
                options={PERIODO_OPTIONS}
                style={{ width: 160 }}
                size="middle"
                className="est-select"
              />
              {periodo === "custom" && (
                <RangePicker
                  onChange={handleRangeChange}
                  format="DD/MM/YYYY"
                  placeholder={["Desde", "Hasta"]}
                  style={{ marginLeft: 8 }}
                />
              )}
            </div>
          </div>

          {loading ? (
            <div className="est-loading-wrap">
              <Spin size="large" />
            </div>
          ) : !data ? (
            <Empty description="No se pudieron cargar las estadísticas" style={{ margin: "40px 0" }} />
          ) : (
            <>
              {/* KPIs */}
              <div className="est-kpi-grid">
                <div className="est-kpi-card">
                  <span className="est-kpi-icon-wrap est-kpi-icon-green">
                    <DollarOutlined />
                  </span>
                  <span className="est-kpi-label">INGRESOS COBRADOS</span>
                  <p className="est-kpi-value est-kpi-green">
                    {fmtMoney(data.kpis.ingresos_cobrados)}
                  </p>
                  <span className="est-kpi-sub">en el período</span>
                </div>

                <div className="est-kpi-card">
                  <span className="est-kpi-icon-wrap est-kpi-icon-red">
                    <ExclamationIcon />
                  </span>
                  <span className="est-kpi-label">SALDO PENDIENTE</span>
                  <p className="est-kpi-value est-kpi-red">
                    {fmtMoney(data.kpis.saldo_pendiente_total)}
                  </p>
                  <span className="est-kpi-sub">pendiente en el período</span>
                </div>

                <div className="est-kpi-card">
                  <span className="est-kpi-icon-wrap est-kpi-icon-blue">
                    <FileTextOutlined />
                  </span>
                  <span className="est-kpi-label">CONTRATOS</span>
                  <p className="est-kpi-value">{data.kpis.contratos_count}</p>
                  <span className="est-kpi-sub">con evento en el período</span>
                </div>

                <div className="est-kpi-card">
                  <span className="est-kpi-icon-wrap est-kpi-icon-amber">
                    <RiseOutlined />
                  </span>
                  <span className="est-kpi-label">VALOR PROMEDIO</span>
                  <p className="est-kpi-value">{fmtMoney(data.kpis.ticket_promedio)}</p>
                  <span className="est-kpi-sub">ingreso esperado por contrato</span>
                </div>
              </div>

              {/* Charts */}
              <div className="est-charts-wrap">
                <div className="est-chart-main">
                  <p className="est-chart-title">Ingresos cobrados por mes</p>
                  <div className="est-bar-wrap">
                    <Bar data={barData} options={barOptions} />
                  </div>
                </div>
                <div className="est-chart-side">
                  <p className="est-chart-title">Contratos por tipo de evento</p>
                  <div className="est-donut-wrap">
                    {donutData ? (
                      <Doughnut data={donutData} options={donutOptions} />
                    ) : (
                      <Empty description="Sin contratos en el período" style={{ margin: "32px 0" }} />
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── BOTTOM ROW ── */}
        {!loading && data && (
          <div className="est-bottom-row">

            {/* Contratos pendientes en el período */}
            <div className="est-section-card">
              <div className="est-section-header est-section-header-sm">
                <div className="est-header-left">
                  <span className="est-section-label">SALDO PENDIENTE</span>
                  <span className="est-period-display">{periodoDescripcion}</span>
                </div>
              </div>

              {data.cobranza.contratos_pendientes.length > 0 ? (
                <>
                  <p className="est-list-heading">
                    Contratos con saldo por cobrar en el período
                  </p>
                  <div className="est-vencidos-list">
                    {data.cobranza.contratos_pendientes.map((c) => {
                      const vencido = c.dias_diff > 0;
                      return (
                        <div
                          key={c.id_contrato}
                          className="est-vencido-row"
                          onClick={() => navigate(`/contratos/${c.id_contrato}`)}
                        >
                          <div className="est-vencido-left">
                            <span className={`est-dot ${
                              vencido && c.dias_diff > 30
                                ? "est-dot-red"
                                : vencido
                                ? "est-dot-orange"
                                : "est-dot-green"
                            }`} />
                            <div>
                              <p className="est-vencido-nombre">{c.cliente_nombre}</p>
                              <p className="est-vencido-sub">
                                {c.tipo_evento} · {fmtFechaCorta(c.fecha_evento)}
                              </p>
                            </div>
                          </div>
                          <div className="est-vencido-right">
                            <span className="est-vencido-monto">{fmtMoney(c.saldo)}</span>
                            {vencido ? (
                              <span className={`est-badge-tag ${
                                c.dias_diff > 30 ? "est-badge-red" : "est-badge-orange"
                              }`}>
                                {c.dias_diff} días vencido
                              </span>
                            ) : (
                              <span className="est-badge-tag est-badge-green">Pendiente</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Total cobranza */}
                  <div className="est-cobranza-total-row">
                    <span className="est-total-label">
                      Total por cobrar ({data.cobranza.contratos_pendientes.length} contratos)
                    </span>
                    <span className="est-cobranza-total-monto">{fmtMoney(totalSaldoCobranza)}</span>
                  </div>
                </>
              ) : (
                <Empty description="Sin contratos con saldo pendiente en este período" style={{ margin: "32px 0" }} />
              )}
            </div>

            {/* Contratos del período */}
            <div className="est-section-card">
              <div className="est-section-header est-section-header-sm">
                <div className="est-header-left">
                  <span className="est-section-label">CONTRATOS DEL PERÍODO</span>
                  <span className="est-period-display">{periodoDescripcion}</span>
                </div>
                <span className="est-count-badge">
                  {data.contratos_del_periodo.length} contratos
                </span>
              </div>

              {data.contratos_del_periodo.length > 0 ? (
                <>
                  {/* Encabezado tabla */}
                  <div className="est-contratos-head">
                    <span>Cliente</span>
                    <span>Tipo</span>
                    <span>Evento</span>
                    <span style={{ textAlign: "right" }}>Importe</span>
                    <span style={{ textAlign: "right" }}>Pendiente</span>
                  </div>

                  {/* Lista paginada */}
                  <div className="est-contratos-list">
                    {contratosPaginados.map((c) => (
                      <div
                        key={c.id_contrato}
                        className="est-contrato-row"
                        onClick={() => navigate(`/contratos/${c.id_contrato}`)}
                      >
                        <div className="est-contrato-nombre">
                          <span className="est-dot est-dot-blue" style={{ flexShrink: 0 }} />
                          <span>{c.cliente_nombre}</span>
                        </div>
                        <span className="est-contrato-tipo">{c.tipo_evento}</span>
                        <span className="est-contrato-fecha">
                          {fmtFechaCorta(c.fecha_evento)}
                        </span>
                        <span className="est-contrato-importe">
                          {fmtMoney(c.importe)}
                        </span>
                        <span className={`est-contrato-saldo ${c.saldo_pendiente > 0 ? "est-saldo-pending" : "est-saldo-ok"}`}>
                          {c.saldo_pendiente > 0 ? fmtMoney(c.saldo_pendiente) : "Liquidado"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Fila de totales */}
                  <div className="est-contratos-total-row">
                    <span className="est-total-label">Total ({data.contratos_del_periodo.length} contratos)</span>
                    <span />
                    <span />
                    <span className="est-total-importe">{fmtMoney(totalImporte)}</span>
                    <span className="est-total-saldo">{totalSaldoPendiente > 0 ? fmtMoney(totalSaldoPendiente) : "Liquidado"}</span>
                  </div>

                  {data.contratos_del_periodo.length > PAGE_SIZE && (
                    <div className="est-pagination">
                      <Pagination
                        current={page}
                        pageSize={PAGE_SIZE}
                        total={data.contratos_del_periodo.length}
                        onChange={setPage}
                        size="small"
                        showSizeChanger={false}
                      />
                    </div>
                  )}
                </>
              ) : (
                <Empty description="Sin contratos en este período" style={{ margin: "32px 0" }} />
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// Icono inline para no importar más íconos
function ExclamationIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
  );
}
