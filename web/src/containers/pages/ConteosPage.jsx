import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiInventarioInstance,
  authHeaderInventario,
} from "../../redux/actions/inventario/inventario";

import {
  Button,
  Modal,
  notification,
  Spin,
  Empty,
  Typography,
  Space,
  Input,
  DatePicker,
  Select,
  Row,
  Col,
} from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  SearchOutlined,
  DownloadOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

import { previewConteosReportPdf, printConteosReportPdf } from "../../components/utils/printConteosReportPdf";
import "./InventarioPage.css";

dayjs.locale("es");

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const TIPO_MAP = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

const fmtFecha = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D [de] MMMM [del] YYYY") : "—";
};

const fmtDatetime = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "—";
};

export default function ConteosPage() {
  const navigate = useNavigate();
  const [conteos, setConteos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [tipoFilter, setTipoFilter] = useState("todos");

  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [exportPreviewHtml, setExportPreviewHtml] = useState("");

  const fetchConteos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiInventarioInstance.get(
        "/inventario/conteos",
        { headers: authHeaderInventario() }
      );
      setConteos(Array.isArray(data) ? data : []);
    } catch {
      setConteos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConteos(); }, [fetchConteos]);

  const filteredConteos = useMemo(() => {
    let base = conteos;

    if (tipoFilter !== "todos") {
      base = base.filter((c) => c.tipo === tipoFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(
        (c) =>
          (c.descripcion || "").toLowerCase().includes(q) ||
          fmtFecha(c.fecha).toLowerCase().includes(q) ||
          (TIPO_MAP[c.tipo] || c.tipo || "").toLowerCase().includes(q)
      );
    }

    if (dateRange?.[0] && dateRange?.[1]) {
      const from = dayjs(dateRange[0]).startOf("day");
      const to = dayjs(dateRange[1]).endOf("day");
      base = base.filter((c) => {
        if (!c.fecha) return false;
        const d = dayjs(c.fecha);
        return !d.isBefore(from) && !d.isAfter(to);
      });
    }

    return base;
  }, [conteos, tipoFilter, search, dateRange]);

  const handleDelete = (c) => {
    Modal.confirm({
      title: "Eliminar conteo",
      content: `¿Eliminar el conteo del ${fmtFecha(c.fecha)}? Esta acción es irreversible.`,
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        try {
          await apiInventarioInstance.delete(
            `/inventario/conteos/${c.id_inventario_conteo}`,
            { headers: authHeaderInventario() }
          );
          notification.success({ message: "Conteo eliminado" });
          fetchConteos();
        } catch (err) {
          notification.error({
            message: "Error al eliminar",
            description: err?.response?.data?.detail || err.message,
          });
        }
      },
    });
  };

  const handleExportNow = () => {
    const html = previewConteosReportPdf({
      items: filteredConteos,
      periodFrom: dateRange?.[0] ? dayjs(dateRange[0]).format("YYYY-MM-DD") : undefined,
      periodTo: dateRange?.[1] ? dayjs(dateRange[1]).format("YYYY-MM-DD") : undefined,
      tipoLabel: tipoFilter === "todos" ? "Todos" : (TIPO_MAP[tipoFilter] || tipoFilter),
    });
    setExportPreviewHtml(html);
    setExportPreviewOpen(true);
  };

  return (
    <main className="inv-main">
      <div className="inv-content">

        <section className="inv-header-section">
          <Space direction="vertical" size={2}>
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/inventario")}
              style={{ padding: 0, height: "auto", fontSize: 12, color: "#05060a" }}
            >
              Volver a Inventario
            </Button>
            <Title level={2} className="inv-title" style={{ marginBottom: 0 }}>
              Conteos de inventario
            </Title>
            <Text className="inv-subtitle">
              Historial de conteos físicos registrados
            </Text>
          </Space>
        </section>

        <section className="inv-section">

          <div className="inv-filters-panel">
            <Row gutter={[16, 14]}>
              <Col xs={24} lg={10}>
                <div>
                  <div className="inv-field-label">Buscador</div>
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por fecha, tipo o descripción..."
                    suffix={<SearchOutlined className="inv-input-suffix" />}
                    className="inv-control"
                    allowClear
                  />
                </div>
              </Col>

              <Col xs={24} lg={8}>
                <div>
                  <div className="inv-field-label">Fecha del conteo</div>
                  <RangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    format="DD/MM/YYYY"
                    placeholder={["Desde", "Hasta"]}
                    className="inv-control"
                  />
                </div>
              </Col>

              <Col xs={24} lg={6}>
                <div>
                  <div className="inv-field-label">Tipo de conteo</div>
                  <Select
                    value={tipoFilter}
                    onChange={setTipoFilter}
                    className="inv-control"
                    options={[
                      { label: "Todos", value: "todos" },
                      { label: "Mensual", value: "mensual" },
                      { label: "Trimestral", value: "trimestral" },
                      { label: "Semestral", value: "semestral" },
                      { label: "Anual", value: "anual" },
                    ]}
                  />
                </div>
              </Col>
            </Row>

            <Row gutter={[16, 14]} style={{ marginTop: 14 }} align="bottom">
              <Col xs={24} lg={6}>
                <div className="inv-actions">
                  <Button
                    className="inv-btn-clean"
                    onClick={() => {
                      setSearch("");
                      setDateRange(null);
                      setTipoFilter("todos");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </Col>
            </Row>
          </div>

          <div className="inv-toolbar">
            <div className="inv-toolbar-left">
              <Title level={4} style={{ marginBottom: 0 }}>
                Conteos ({filteredConteos.length})
              </Title>
              <Text type="secondary">{filteredConteos.length} encontrados</Text>
            </div>
            <div className="inv-toolbar-right">
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportNow}
                className="inv-btn-export"
              >
                Exportar
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/inventario/conteos/nuevo")}
                className="laboral-btn-create custom-button"
              >
                Nuevo conteo
              </Button>
            </div>
          </div>

          {loading ? (
            <div style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Spin size="large" />
            </div>
          ) : filteredConteos.length === 0 ? (
            <div className="inv-empty">
              <Empty
                description={
                  conteos.length === 0
                    ? "Sin conteos registrados aún"
                    : "Sin resultados para los filtros aplicados"
                }
                style={{ padding: "40px 20px" }}
              />
              {conteos.length === 0 && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/inventario/conteos/nuevo")}
                  className="custom-button"
                  style={{ marginTop: 16 }}
                >
                  Crear primer conteo
                </Button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredConteos.map((c) => (
                <div key={c.id_inventario_conteo} className="conteo-list-card">
                  <div className="conteo-list-card-body">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className={`conteo-tipo-badge conteo-tipo-${c.tipo}`}>
                        {TIPO_MAP[c.tipo] || c.tipo}
                      </span>
                      <span className="conteo-fecha-title">
                        {fmtFecha(c.fecha)}
                      </span>
                    </div>
                    <div className="conteo-list-meta">
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <AppstoreOutlined /> {c.total_equipos ?? 0} equipos
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <CalendarOutlined /> Registrado: {fmtDatetime(c.datetime)}
                      </span>
                      {c.descripcion && <span>· {c.descripcion}</span>}
                    </div>
                  </div>
                  <div className="conteo-list-card-actions">
                    <button
                      className="conteo-btn-details"
                      onClick={() => navigate(`/inventario/conteos/${c.id_inventario_conteo}`)}
                    >
                      VER DETALLE
                      <ArrowRightOutlined />
                    </button>
                    <button
                      className="conteo-btn-delete"
                      onClick={() => handleDelete(c)}
                      title="Eliminar conteo"
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>
      </div>

      <Modal
        open={exportPreviewOpen}
        onCancel={() => setExportPreviewOpen(false)}
        title="Previsualización — Reporte de Conteos"
        width={1020}
        centered
        destroyOnClose
        footer={[
          <Button key="close" onClick={() => setExportPreviewOpen(false)}>Cerrar</Button>,
          <Button
            key="export"
            className="custom-button"
            icon={<DownloadOutlined />}
            onClick={() => {
              printConteosReportPdf({
                items: filteredConteos,
                periodFrom: dateRange?.[0] ? dayjs(dateRange[0]).format("YYYY-MM-DD") : undefined,
                periodTo: dateRange?.[1] ? dayjs(dateRange[1]).format("YYYY-MM-DD") : undefined,
                tipoLabel: tipoFilter === "todos" ? "Todos" : (TIPO_MAP[tipoFilter] || tipoFilter),
              });
            }}
          >
            Exportar PDF
          </Button>,
        ]}
      >
        <div style={{ height: "72vh", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <iframe
            title="preview-conteos"
            style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
            srcDoc={exportPreviewHtml}
          />
        </div>
      </Modal>
    </main>
  );
}
