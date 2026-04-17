import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Card,
  Col,
  DatePicker,
  Row,
  Space,
  Statistic,
  Table,
  Typography,
  Divider,
  Spin,
  Alert,
  Empty,
} from "antd";
import { FileTextOutlined, DollarOutlined, CalendarOutlined } from "@ant-design/icons";

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

import { actionEmpresaStats } from "../../../redux/actions/empresas/empresas";

ChartJS.register(ArcElement, Tooltip, Legend);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

function moneyMXN(n) {
  const val = Number(n || 0);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(val);
}

export default function EmpresaDashboard({ idEmpresa }) {
  const dispatch = useDispatch();

  const [range, setRange] = useState(null); // [dayjs, dayjs]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [data, setData] = useState({
    cards: { conciliaciones_count: 0, desvinculaciones_count: 0, ingreso_total: 0 },
    donut: [],
    detalle: { ingreso_convenios: 0, ingreso_desvinculaciones: 0 },
    timeline: [],
  });

  const query = useMemo(() => {
    if (!range?.[0] || !range?.[1]) return null;
    return {
      fecha_inicio: range[0].format("YYYY-MM-DD"),
      fecha_final: range[1].format("YYYY-MM-DD"),
    };
  }, [range]);

  const fetchStats = async () => {
    if (!idEmpresa || !query) return;

    setLoading(true);
    setError(null);

    try {
      const payload = await dispatch(actionEmpresaStats(idEmpresa, query));

      setData({
        cards: payload.cards || { conciliaciones_count: 0, desvinculaciones_count: 0, ingreso_total: 0 },
        donut: Array.isArray(payload.donut) ? payload.donut : [],
        detalle: payload.detalle || { ingreso_convenios: 0, ingreso_desvinculaciones: 0 },
        timeline: Array.isArray(payload.timeline) ? payload.timeline : [],
      });
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "No se pudieron cargar las estadísticas.";
      setError(msg);
      setData({
        cards: { conciliaciones_count: 0, desvincululaciones_count: 0, ingreso_total: 0 },
        donut: [],
        detalle: { ingreso_convenios: 0, ingreso_desvinculaciones: 0 },
        timeline: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // default range = mes actual (inicio a hoy)
  useEffect(() => {
    const dayjs = require("dayjs");
    setRange([dayjs().startOf("month"), dayjs()]);
  }, []);

  useEffect(() => {
    if (query) fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEmpresa, query?.fecha_inicio, query?.fecha_final]);

  const hasDonut = (data.donut || []).some((x) => Number(x.monto || 0) > 0);

  const donutChartData = useMemo(() => {
    const rows = data.donut || [];
    return {
      labels: rows.map((r) => r.tipo),
      datasets: [
        {
          data: rows.map((r) => Number(r.monto || 0)),
          borderWidth: 0,
        },
      ],
    };
  }, [data.donut]);

  const donutOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.label || "";
              const v = ctx.parsed || 0;
              return `${label}: ${moneyMXN(v)}`;
            },
          },
        },
      },
      animation: { duration: 250 },
    };
  }, []);

  const columns = [
    { title: "Fecha", dataIndex: "fecha", key: "fecha", width: 140 },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      width: 180,
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Monto",
      dataIndex: "monto",
      key: "monto",
      width: 160,
      align: "right",
      render: (v) => <Text>{moneyMXN(v)}</Text>,
    },
    {
      title: "Referencia",
      dataIndex: "referencia_id",
      key: "referencia_id",
      width: 140,
      render: (v) => <Text type="secondary">#{v}</Text>,
    },
  ];

  return (
    <div style={{ marginTop: 10 }}>
      <Card style={{ borderRadius: 14 }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col>
            <Space direction="vertical" size={2}>
              <Title level={5} style={{ margin: 0 }}>
                Dashboard
              </Title>
              <Text type="secondary">Ingresos y actividad por rango de fechas</Text>
            </Space>
          </Col>

          <Col>
            <Space align="center" size={10}>
              <CalendarOutlined />
              <RangePicker
                value={range}
                onChange={(v) => setRange(v)}
                allowClear={false}
              />
            </Space>
          </Col>
        </Row>

        <Divider style={{ margin: "14px 0" }} />

        {error ? <Alert type="error" message="Error" description={error} showIcon /> : null}

        <Spin spinning={loading}>
          <Row gutter={[16, 16]} style={{ marginTop: error ? 16 : 0 }}>
            {/* Cards */}
            <Col xs={24} md={8}>
              <Card style={{ borderRadius: 14, height: "100%" }}>
                <Statistic
                  title="Conciliaciones"
                  value={data.cards?.conciliaciones_count || 0}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card style={{ borderRadius: 14, height: "100%" }}>
                <Statistic
                  title="Desvinculaciones"
                  value={data.cards?.desvinculaciones_count || 0}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card style={{ borderRadius: 14, height: "100%" }}>
                <Statistic
                  title="Ingreso total"
                  value={moneyMXN(data.cards?.ingreso_total || 0)}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>

            {/* Donut + Detalle */}
            <Col xs={24} lg={12}>
              <Card style={{ borderRadius: 14, height: "100%" }} title="Distribución de ingresos">
                {hasDonut ? (
                  <div style={{ height: 280 }}>
                    <Doughnut data={donutChartData} options={donutOptions} />
                  </div>
                ) : (
                  <Empty description="Sin datos para graficar en este rango." />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card style={{ borderRadius: 14, height: "100%" }} title="Detalle de ingresos">
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  <Card style={{ borderRadius: 12 }}>
                    <Row justify="space-between" align="middle">
                      <Text strong>Convenios</Text>
                      <Text>{moneyMXN(data.detalle?.ingreso_convenios || 0)}</Text>
                    </Row>
                  </Card>

                  <Card style={{ borderRadius: 12 }}>
                    <Row justify="space-between" align="middle">
                      <Text strong>Desvinculaciones</Text>
                      <Text>{moneyMXN(data.detalle?.ingreso_desvinculaciones || 0)}</Text>
                    </Row>
                  </Card>

                  <Card style={{ borderRadius: 12 }}>
                    <Row justify="space-between" align="middle">
                      <Text strong>Total</Text>
                      <Text>{moneyMXN(data.cards?.ingreso_total || 0)}</Text>
                    </Row>
                  </Card>
                </Space>
              </Card>
            </Col>

            {/* Timeline */}
            <Col xs={24}>
              <Card style={{ borderRadius: 14 }} title="Timeline">
                <Table
                  rowKey={(r, idx) => `${r.fecha}-${r.tipo}-${r.referencia_id}-${idx}`}
                  columns={columns}
                  dataSource={data.timeline || []}
                  pagination={{ pageSize: 8 }}
                  size="middle"
                />
              </Card>
            </Col>
          </Row>
        </Spin>
      </Card>
    </div>
  );
}
