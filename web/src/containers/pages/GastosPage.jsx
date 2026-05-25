import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import { actionGastosGet } from "../../redux/actions/gastos/gastos";
import {
  apiGastosInstance,
  authHeaderGastos,
} from "../../redux/actions/gastos/gastos";
import { PATH } from "../../redux/utils";
import dayjs from "dayjs";
import "dayjs/locale/es";

import {
  Button,
  Card,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Row,
  Col,
  Typography,
  Space,
  Modal,
  Form,
  notification,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  DollarOutlined,
  CalendarOutlined,
  TagOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
  PaperClipOutlined,
  UploadOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
} from "@ant-design/icons";

import { previewGastosReportPdf, printGastosReportPdf } from "../../components/utils/printGastosReportPdf";
import "./GastosPage.css";

dayjs.locale("es");

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const PERIODO_OPTIONS = [
  { value: "todos",    label: "Todos los gastos" },
  { value: "mes",      label: "Este mes" },
  { value: "quincena", label: "Esta quincena" },
  { value: "semana",   label: "Esta semana" },
  { value: "custom",   label: "Personalizado" },
];

const getDateRange = (periodo, customRange) => {
  const today = dayjs();
  if (periodo === "todos") return { fecha_desde: undefined, fecha_hasta: undefined };
  if (periodo === "semana") return {
    fecha_desde: today.startOf("week").format("YYYY-MM-DD"),
    fecha_hasta: today.endOf("week").format("YYYY-MM-DD"),
  };
  if (periodo === "quincena") {
    const day = today.date();
    return day <= 15
      ? { fecha_desde: today.startOf("month").format("YYYY-MM-DD"),        fecha_hasta: today.startOf("month").date(15).format("YYYY-MM-DD") }
      : { fecha_desde: today.startOf("month").date(16).format("YYYY-MM-DD"), fecha_hasta: today.endOf("month").format("YYYY-MM-DD") };
  }
  if (periodo === "mes") return {
    fecha_desde: today.startOf("month").format("YYYY-MM-DD"),
    fecha_hasta: today.endOf("month").format("YYYY-MM-DD"),
  };
  if (periodo === "custom" && customRange?.[0] && customRange?.[1]) return {
    fecha_desde: customRange[0].format("YYYY-MM-DD"),
    fecha_hasta: customRange[1].format("YYYY-MM-DD"),
  };
  return { fecha_desde: undefined, fecha_hasta: undefined };
};

const fmtMoney = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n ?? 0);

const fmtDate = (s) => {
  if (!s) return "—";
  const hasTime = s.length > 10;
  const d = new Date(s + (!hasTime ? "T00:00:00" : ""));
  const datePart = d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  if (!hasTime) return datePart;
  const timePart = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${datePart} ${timePart}`;
};

export default function GastosPage() {
  const dispatch    = useDispatch();
  const { items = [], loading } = useSelector((state) => state.gastos);
  const navigate    = useNavigate();
  const { perm }    = usePermisos() || { perm: () => true };
  const canConsultar = perm("gastos", "consultar");
  const canInsertar  = perm("gastos", "insertar");

  // ── Tipos de gasto ───────────────────────────────────────────────────────
  const [tiposGasto, setTiposGasto] = useState([]);

  useEffect(() => {
    apiGastosInstance.get("/gastos/config/tipos", { headers: authHeaderGastos() })
      .then((r) => setTiposGasto(r.data || []))
      .catch(() => {});
  }, []);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [search, setSearch]             = useState("");
  const [searchDebounced, setSearchDeb] = useState("");
  const [tipoFilter, setTipoFilter]     = useState(null);
  const [periodo, setPeriodo]           = useState("todos");
  const [customRange, setCustomRange]   = useState(null);

  // ── Stat filter ──────────────────────────────────────────────────────────
  const [statFilter, setStatFilter]           = useState("todos");
  const [categoriaFilter, setCategoriaFilter] = useState([]);
  const [comprobanteFilter, setComprobanteFilter] = useState("todo");

  // ── Export modal ────────────────────────────────────────────────────────
  const [exportOpen, setExportOpen]   = useState(false);
  const [exportHtml, setExportHtml]   = useState("");

  const PERIODO_LABEL_MAP = {
    todos: "Todos los gastos", mes: "Este mes",
    quincena: "Esta quincena", semana: "Esta semana", custom: "Personalizado",
  };

  const handleExport = () => {
    const html = previewGastosReportPdf({
      items: filteredItems,
      periodoLabel: PERIODO_LABEL_MAP[periodo] || "Todos los gastos",
    });
    setExportHtml(html);
    setExportOpen(true);
  };

  // ── Modal ────────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form]                      = Form.useForm();
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef                = useRef(null);

  const lastFetchKey = useRef("");

  useEffect(() => {
    const t = setTimeout(() => setSearchDeb(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const handlePeriodo = (val) => {
    setPeriodo(val);
    if (val !== "custom") setCustomRange(null);
  };

  const fetchParams = useMemo(() => {
    const { fecha_desde, fecha_hasta } = getDateRange(periodo, customRange);
    return {
      search:        searchDebounced || undefined,
      id_tipo_gasto: tipoFilter || undefined,
      fecha_desde,
      fecha_hasta,
    };
  }, [searchDebounced, tipoFilter, periodo, customRange]);

  useEffect(() => {
    if (periodo === "custom" && !customRange) return;
    const key = JSON.stringify(fetchParams);
    if (lastFetchKey.current === key) return;
    lastFetchKey.current = key;
    dispatch(actionGastosGet(fetchParams));
  }, [dispatch, fetchParams, periodo, customRange]);

  const filteredItems = useMemo(() => {
    if (!searchDebounced) return items;
    const q = searchDebounced.toLowerCase();
    return items.filter((g) => (g.descripcion || "").toLowerCase().includes(q));
  }, [items, searchDebounced]);

  const stats = useMemo(() => {
    const total = filteredItems.reduce((s, g) => s + parseFloat(g.monto || 0), 0);
    const count = filteredItems.length;

    const byTipo = {};
    filteredItems.forEach((g) => {
      const key = g.nombre_tipo_gasto || "Sin tipo";
      if (!byTipo[key]) byTipo[key] = { count: 0, total: 0 };
      byTipo[key].count++;
      byTipo[key].total += parseFloat(g.monto || 0);
    });
    const tipoEntries = Object.entries(byTipo).sort((a, b) => b[1].total - a[1].total);
    const mayor = tipoEntries[0]
      ? { nombre: tipoEntries[0][0], total: tipoEntries[0][1].total, pct: total > 0 ? (tipoEntries[0][1].total / total * 100).toFixed(1) : "0.0" }
      : null;

    const conDoc = filteredItems.filter((g) => g.filename).length;
    const sinDoc = count - conDoc;
    const pctDoc = count > 0 ? Math.round((conDoc / count) * 100) : 0;

    return { total, count, mayor, conDoc, sinDoc, pctDoc, tipoEntries };
  }, [filteredItems]);

  const displayItems = useMemo(() => {
    let base = filteredItems;
    if (categoriaFilter.length > 0) {
      base = base.filter((g) => categoriaFilter.includes(g.nombre_tipo_gasto || "Sin tipo"));
    }
    if (comprobanteFilter === "con") base = base.filter((g) => !!g.filename);
    else if (comprobanteFilter === "sin") base = base.filter((g) => !g.filename);
    return base;
  }, [filteredItems, categoriaFilter, comprobanteFilter]);

  const clearFilters = () => {
    setSearch("");
    setSearchDeb("");
    setTipoFilter(null);
    setPeriodo("todos");
    setCustomRange(null);
    setStatFilter("todos");
    setCategoriaFilter([]);
    setComprobanteFilter("todo");
  };

  // ── Modal handlers ───────────────────────────────────────────────────────
  const openModal = () => {
    form.resetFields();
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setModalOpen(true);
  };

  const handleModalSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }

    const payload = {
      descripcion:   values.descripcion?.trim(),
      monto:         values.monto,
      id_tipo_gasto: values.id_tipo_gasto || null,
      fecha:         values.fecha ? values.fecha.format("YYYY-MM-DD HH:mm:ss") : dayjs().format("YYYY-MM-DD HH:mm:ss"),
      notas:         values.notas?.trim() || null,
    };

    setSaving(true);
    try {
      const { data } = await apiGastosInstance.post("/gastos", payload, { headers: authHeaderGastos() });
      const newId = data.id_gasto;

      if (selectedFile && newId) {
        const fd = new FormData();
        fd.append("file", selectedFile);
        await apiGastosInstance.post(`/gastos/${newId}/documento`, fd, {
          headers: { ...authHeaderGastos(), "Content-Type": "multipart/form-data" },
        });
      }

      notification.success({ message: "Gasto registrado correctamente" });
      setModalOpen(false);
      setSelectedFile(null);
      lastFetchKey.current = "";
      dispatch(actionGastosGet(fetchParams));
    } catch (err) {
      notification.error({
        message: "Error al guardar",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="gas-main">
      <div className="gas-content">

        {/* Filters + Header inside card */}
        <div className="gas-filters-panel">
          <Space direction="vertical" size={2} style={{ marginBottom: 16 }}>
            <Title level={2} className="gas-title">Gastos</Title>
            <Text className="gas-subtitle">Registro y control de gastos del negocio</Text>
          </Space>

          <Row gutter={[16, 14]}>
            <Col xs={24} md={8}>
              <div className="gas-field-label">Buscador</div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por descripción..."
                suffix={<SearchOutlined className="gas-input-suffix" />}
                className="gas-control"
                allowClear
              />
            </Col>
            <Col xs={24} md={8}>
              <div className="gas-field-label">Tipo de gasto</div>
              <Select
                value={tipoFilter ?? "todos"}
                onChange={(v) => setTipoFilter(v === "todos" ? null : v)}
                className="gas-control"
                options={[
                  { label: "Todos los tipos", value: "todos" },
                  ...tiposGasto.map((t) => ({ label: t.nombre, value: t.id_tipo_gasto })),
                ]}
              />
            </Col>
            <Col xs={24} md={8}>
              <div className="gas-field-label">Período</div>
              <Select
                value={periodo}
                onChange={handlePeriodo}
                className="gas-control"
                options={PERIODO_OPTIONS}
              />
            </Col>
            {periodo === "custom" && (
              <Col xs={24} md={8}>
                <RangePicker
                  onChange={(dates) => { if (dates?.[0] && dates?.[1]) setCustomRange(dates); }}
                  format="DD/MM/YYYY"
                  placeholder={["Fecha desde", "Fecha hasta"]}
                  className="gas-control"
                />
              </Col>
            )}
          </Row>
          <Row style={{ marginTop: 14 }} align="bottom">
            <Col>
              <Button className="gas-btn-clean" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </Col>
          </Row>
        </div>

        {/* Stats */}
        <div className="gas-stats-row">

          {/* Total */}
          <Card className="gas-stat-card gas-stat-card-total">
            <Space align="center" size={10}>
              <div className="gas-stat-icon gas-stat-icon-total"><DollarOutlined /></div>
              <div>
                <div className="gas-stat-value">{fmtMoney(stats.total)}</div>
                <div className="gas-stat-label">Total de gastos</div>
              </div>
            </Space>
          </Card>

          {/* Mayor categoría — clickable, expands sub-cards */}
          <Card
            className={`gas-stat-card gas-stat-card-cat${statFilter === "categorias" ? " gas-stat-active" : ""}`}
            hoverable
            onClick={() => {
              const next = statFilter === "categorias" ? "todos" : "categorias";
              setStatFilter(next);
              setCategoriaFilter([]);
            }}
          >
            <Space align="center" size={10}>
              <div className="gas-stat-icon gas-stat-icon-cat"><BarChartOutlined /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="gas-stat-eyebrow">Mayor categoría</div>
                {stats.mayor ? (
                  <>
                    <div className="gas-stat-value gas-stat-value--md">{stats.mayor.nombre}</div>
                    <div className="gas-stat-sub">{stats.mayor.pct}% del total · {fmtMoney(stats.mayor.total)}</div>
                  </>
                ) : (
                  <div className="gas-stat-value gas-stat-value--md" style={{ color: "#cbd5e1" }}>—</div>
                )}
              </div>
            </Space>
          </Card>

          {/* Comprobante — clickable, expands sub-cards */}
          <Card
            className={`gas-stat-card gas-stat-card-doc${statFilter === "comprobante" ? " gas-stat-active" : ""}`}
            hoverable
            onClick={() => {
              const next = statFilter === "comprobante" ? "todos" : "comprobante";
              setStatFilter(next);
              setComprobanteFilter("todo");
            }}
          >
            <Space align="center" size={10}>
              <div className="gas-stat-icon gas-stat-icon-doc"><PaperClipOutlined /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="gas-stat-eyebrow">Con comprobante</div>
                <div className="gas-stat-value gas-stat-value--md">{stats.conDoc} / {stats.count}</div>
                <div className="gas-stat-sub" style={{ color: stats.pctDoc === 100 ? "#16a34a" : "#64748b" }}>
                  {stats.count === 0 ? "Sin gastos" : stats.pctDoc === 100 ? "100% documentado" : `${stats.pctDoc}% documentado`}
                </div>
              </div>
            </Space>
          </Card>

        </div>

        {/* Sub-cards: categorías (multi-select) */}
        {statFilter === "categorias" && stats.tipoEntries.length > 0 && (
          <div className="gas-substat-row">
            {stats.tipoEntries.map(([nombre, { count, total }]) => (
              <Card
                key={nombre}
                hoverable
                className={`gas-substat-card gas-substat-cat${categoriaFilter.includes(nombre) ? " gas-substat-active" : ""}`}
                onClick={() =>
                  setCategoriaFilter((prev) =>
                    prev.includes(nombre) ? prev.filter((n) => n !== nombre) : [...prev, nombre]
                  )
                }
              >
                <Space align="center" size={8}>
                  <div className="gas-substat-icon gas-substat-icon-cat"><TagOutlined /></div>
                  <div>
                    <div className="gas-substat-value">{count}</div>
                    <div className="gas-substat-label">{nombre}</div>
                    <div className="gas-substat-sub">{fmtMoney(total)}</div>
                  </div>
                </Space>
              </Card>
            ))}
          </div>
        )}

        {/* Sub-cards: comprobante */}
        {statFilter === "comprobante" && (
          <div className="gas-substat-row gas-substat-row-2">
            <Card
              hoverable
              className={`gas-substat-card gas-substat-con${comprobanteFilter === "con" ? " gas-substat-active" : ""}`}
              onClick={() => setComprobanteFilter((p) => (p === "con" ? "todo" : "con"))}
            >
              <Space align="center" size={8}>
                <div className="gas-substat-icon gas-substat-icon-con"><PaperClipOutlined /></div>
                <div>
                  <div className="gas-substat-value">{stats.conDoc}</div>
                  <div className="gas-substat-label">Con comprobante</div>
                </div>
              </Space>
            </Card>
            <Card
              hoverable
              className={`gas-substat-card gas-substat-sin${comprobanteFilter === "sin" ? " gas-substat-active" : ""}`}
              onClick={() => setComprobanteFilter((p) => (p === "sin" ? "todo" : "sin"))}
            >
              <Space align="center" size={8}>
                <div className="gas-substat-icon gas-substat-icon-sin"><CloseCircleOutlined /></div>
                <div>
                  <div className="gas-substat-value">{stats.sinDoc}</div>
                  <div className="gas-substat-label">Sin comprobante</div>
                </div>
              </Space>
            </Card>
          </div>
        )}

        {/* Toolbar */}
        <div className="gas-toolbar">
          <div className="gas-toolbar-left">
            <Title level={4} style={{ marginBottom: 0 }}>
              Gastos ({displayItems.length})
            </Title>
            <Text type="secondary">{displayItems.length} encontrados</Text>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              className="laboral-btn-import"
              style={{ flex: "none" }}
            >
              Exportar
            </Button>
            {canInsertar && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openModal}
                className="laboral-btn-create custom-button"
              >
                Agregar
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        {displayItems.length === 0 && !loading && (
          <div className="gas-empty">
            <DollarOutlined style={{ fontSize: 36, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 500 }}>Sin gastos que coincidan con los filtros</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Usa el botón "Agregar" para registrar tu primer gasto
            </div>
          </div>
        )}

        <div className="gas-list">
          {displayItems.map((gasto) => (
            <div key={gasto.id_gasto} className="gas-card">
              <div className="gas-card-accent" />
              <div className="gas-card-body">

                {/* Left: badge + title + meta */}
                <div className="gas-card-main">
                  {gasto.nombre_tipo_gasto && (
                    <span className="gas-cat-badge">{gasto.nombre_tipo_gasto}</span>
                  )}
                  <div className="gas-card-desc">{gasto.descripcion}</div>
                  <div className="gas-card-meta">
                    <span className="gas-card-meta-item">
                      <CalendarOutlined style={{ fontSize: 11 }} />
                      {fmtDate(gasto.fecha)}
                    </span>
                    {gasto.filename && (
                      <span className="gas-card-meta-item gas-card-attachment">
                        <PaperClipOutlined style={{ fontSize: 11 }} />
                        <a
                          href={`${PATH}/${gasto.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {gasto.filename}
                        </a>
                      </span>
                    )}
                    {gasto.nombre_usuario && (
                      <span className="gas-card-meta-item gas-card-meta-user">
                        {gasto.nombre_usuario}
                      </span>
                    )}
                  </div>
                  {gasto.notas && (
                    <div className="gas-card-notes">{gasto.notas}</div>
                  )}
                </div>

                {/* Right: amount + action */}
                <div className="gas-card-right">
                  <div className="gas-card-monto">{fmtMoney(gasto.monto)}</div>
                  <button
                    className="gas-btn-details"
                    onClick={() => canConsultar ? navigate(`/app/gastos/${gasto.id_gasto}`) : undefined}
                    style={!canConsultar ? { cursor: "not-allowed", opacity: 0.45 } : {}}
                  >
                    VER <ArrowRightOutlined style={{ fontSize: 11 }} />
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Modal: Exportar ───────────────────────────────────────────────── */}
      <Modal
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        title="Previsualización — Reporte de Gastos"
        width={1020}
        centered
        destroyOnClose
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button
              onClick={() => setExportOpen(false)}
              style={{ background: "#374151", borderColor: "#374151", color: "#fff" }}
            >
              Cerrar
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              style={{ background: "#01369e", borderColor: "#01369e" }}
              onClick={() => printGastosReportPdf({
                items: filteredItems,
                periodoLabel: PERIODO_LABEL_MAP[periodo] || "Todos los gastos",
              })}
            >
              Exportar PDF
            </Button>
          </div>
        }
      >
        <div style={{ height: "72vh", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <iframe
            title="preview-gastos"
            style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
            srcDoc={exportHtml}
          />
        </div>
      </Modal>

      {/* ── Modal: Nuevo Gasto ─────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "linear-gradient(140deg,#9f1239,#f43f5e)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 15,
              }}
            >
              <DollarOutlined />
            </span>
            <span style={{ fontWeight: 650, fontSize: 16 }}>Nuevo gasto</span>
          </div>
        }
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)} disabled={saving}>
            Cancelar
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={saving}
            onClick={handleModalSave}
            style={{ backgroundColor: "#01369e", borderColor: "#01369e" }}
          >
            Registrar gasto
          </Button>,
        ]}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>

          <Form.Item
            name="descripcion"
            label={<span className="gas-field-label">Nombre / Descripción</span>}
            rules={[{ required: true, message: "La descripción es requerida" }]}
          >
            <Input placeholder="Ej. Compra de trípode profesional" autoComplete="off" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="id_tipo_gasto"
                label={<span className="gas-field-label">Tipo de gasto</span>}
                rules={[{ required: true, message: "El tipo de gasto es requerido" }]}
              >
                <Select
                  style={{ width: "100%" }}
                  placeholder="Selecciona un tipo"
                  allowClear
                  options={tiposGasto.map((t) => ({ label: t.nombre, value: t.id_tipo_gasto }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="monto"
                label={<span className="gas-field-label">Monto ($)</span>}
                rules={[
                  { required: true, message: "El monto es requerido" },
                  { type: "number", min: 0.01, message: "Debe ser mayor a 0" },
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0.01}
                  precision={2}
                  placeholder="0.00"
                  prefix="$"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="fecha"
            label={<span className="gas-field-label">Fecha y hora del gasto</span>}
            rules={[{ required: true, message: "La fecha es requerida" }]}
            initialValue={dayjs()}
          >
            <DatePicker
              style={{ width: "100%" }}
              showTime={{ format: "HH:mm" }}
              format="DD/MM/YYYY HH:mm"
              placeholder="Selecciona fecha y hora"
            />
          </Form.Item>

          <Form.Item
            name="notas"
            label={<span className="gas-field-label">Notas</span>}
          >
            <TextArea
              rows={2}
              placeholder="Información adicional sobre este gasto..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          {/* ── Comprobante (un solo archivo) ── */}
          <div style={{ marginBottom: 16 }}>
            <div className="gas-field-label" style={{ marginBottom: 6 }}>Comprobante</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              style={{ display: "none" }}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            {selectedFile ? (
              <div className="gas-file-selected">
                <PaperClipOutlined style={{ color: "#9f1239" }} />
                <span className="gas-file-name">{selectedFile.name}</span>
                <button
                  type="button"
                  className="gas-file-remove"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <CloseCircleOutlined />
                </button>
              </div>
            ) : (
              <Button
                icon={<UploadOutlined />}
                onClick={() => fileInputRef.current?.click()}
                style={{ borderStyle: "dashed" }}
              >
                Adjuntar documento o imagen
              </Button>
            )}
          </div>

        </Form>
      </Modal>
    </main>
  );
}
