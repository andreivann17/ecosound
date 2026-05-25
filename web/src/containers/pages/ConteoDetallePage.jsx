import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiInventarioInstance,
  authHeaderInventario,
} from "../../redux/actions/inventario/inventario";

import { Button, Spin, notification, Typography, Space, Modal, Card } from "antd";
import {
  ArrowLeftOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DownloadOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

import { previewConteoDetallePdf, printConteoDetallePdf } from "../../components/utils/printConteoDetallePdf";
import "./InventarioPage.css";

dayjs.locale("es");

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

export default function ConteoDetallePage() {
  const { idConteo } = useParams();
  const navigate = useNavigate();

  const [conteo, setConteo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [exportPreviewHtml, setExportPreviewHtml] = useState("");

  const fetchConteo = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiInventarioInstance.get(
        `/inventario/conteos/${idConteo}`,
        { headers: authHeaderInventario() }
      );
      setConteo(data);
    } catch {
      notification.error({ message: "No se pudo cargar el conteo" });
    } finally {
      setLoading(false);
    }
  }, [idConteo]);

  useEffect(() => { fetchConteo(); }, [fetchConteo]);

  const grouped = () => {
    if (!conteo?.detalles) return [];
    const map = {};
    for (const d of conteo.detalles) {
      const cat = d.nombre_categoria || "Sin categoría";
      if (!map[cat]) map[cat] = [];
      map[cat].push(d);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  };

  const detalles = conteo?.detalles || [];
  const totalEquipos = detalles.length;
  const conDifPos = detalles.filter((d) => (d.cantidad_fisica ?? 0) - (d.cantidad_sistema ?? 0) > 0).length;
  const conDifNeg = detalles.filter((d) => (d.cantidad_fisica ?? 0) - (d.cantidad_sistema ?? 0) < 0).length;
  const sinDif = detalles.filter((d) => (d.cantidad_fisica ?? 0) - (d.cantidad_sistema ?? 0) === 0).length;

  const handleExportNow = () => {
    const html = previewConteoDetallePdf(conteo);
    setExportPreviewHtml(html);
    setExportPreviewOpen(true);
  };

  if (loading) {
    return (
      <main className="conteo-main">
        <div className="conteo-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <Spin size="large" />
        </div>
      </main>
    );
  }

  if (!conteo) return null;

  const tipoLabel = TIPO_MAP[conteo.tipo] || conteo.tipo;

  return (
    <main className="conteo-main">
      <div className="conteo-content">

        {/* Header */}
        <section className="inv-header-section">
          <Space direction="vertical" size={2}>
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/app/inventario/conteos")}
              style={{ padding: 0, height: "auto", fontSize: 12, color: "#05060a" }}
            >
              Volver a Conteos
            </Button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className={`conteo-tipo-badge conteo-tipo-${conteo.tipo}`} style={{ fontSize: 12 }}>
                {tipoLabel}
              </span>
              <Title level={2} className="inv-title" style={{ marginBottom: 0 }}>
                {fmtFecha(conteo.fecha)}
              </Title>
            </div>
            {conteo.descripcion && (
              <Text className="inv-subtitle">{conteo.descripcion}</Text>
            )}
            <Text style={{ fontSize: 12, color: "#94a3b8" }}>
              <CalendarOutlined style={{ marginRight: 5 }} />
              Registrado el {fmtDatetime(conteo.datetime)}
            </Text>
          </Space>

          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportNow}
            className="inv-btn-export"
            style={{ marginTop: 4 }}
          >
            Exportar PDF
          </Button>
        </section>

        {/* Stats cards */}
        <div className="cd-stats-row">
          <Card className="cd-stat-card cd-stat-total">
            <Space align="center" size={10}>
              <div className="cd-stat-icon"><AppstoreOutlined /></div>
              <div>
                <div className="cd-stat-value">{totalEquipos}</div>
                <div className="cd-stat-label">Total equipos</div>
              </div>
            </Space>
          </Card>

          <Card className="cd-stat-card cd-stat-ok">
            <Space align="center" size={10}>
              <div className="cd-stat-icon"><CheckCircleOutlined /></div>
              <div>
                <div className="cd-stat-value">{sinDif}</div>
                <div className="cd-stat-label">Sin diferencia</div>
              </div>
            </Space>
          </Card>

          <Card className="cd-stat-card cd-stat-pos">
            <Space align="center" size={10}>
              <div className="cd-stat-icon"><ArrowUpOutlined /></div>
              <div>
                <div className="cd-stat-value">{conDifPos}</div>
                <div className="cd-stat-label">Sobrantes</div>
              </div>
            </Space>
          </Card>

          <Card className="cd-stat-card cd-stat-neg">
            <Space align="center" size={10}>
              <div className="cd-stat-icon"><ArrowDownOutlined /></div>
              <div>
                <div className="cd-stat-value">{conDifNeg}</div>
                <div className="cd-stat-label">Faltantes</div>
              </div>
            </Space>
          </Card>
        </div>

        {/* Table */}
        {grouped().length === 0 ? (
          <div className="inv-empty">
            <FileTextOutlined style={{ fontSize: 32, color: "#cbd5e1", marginBottom: 8 }} />
            <div>Sin equipos registrados en este conteo.</div>
          </div>
        ) : (
          <div className="conteo-table-wrap">
            <table className="conteo-table">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th style={{ textAlign: "right" }}>Sistema</th>
                  <th style={{ textAlign: "right" }}>Físico</th>
                  <th style={{ textAlign: "right" }}>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {grouped().map(([cat, rows]) => (
                  <React.Fragment key={cat}>
                    <tr className="conteo-categoria-row">
                      <td colSpan={4}>{cat}</td>
                    </tr>
                    {rows.map((d) => {
                      const diff = (d.cantidad_fisica ?? 0) - (d.cantidad_sistema ?? 0);
                      const diffCls =
                        diff > 0 ? "td-diferencia-pos" : diff < 0 ? "td-diferencia-neg" : "td-diferencia-zero";
                      return (
                        <tr key={d.id_conteo_detalle}>
                          <td>{d.nombre_equipo}</td>
                          <td className="td-sistema" style={{ textAlign: "right" }}>{d.cantidad_sistema ?? 0}</td>
                          <td style={{ fontWeight: 700, textAlign: "right" }}>{d.cantidad_fisica ?? 0}</td>
                          <td className={diffCls} style={{ textAlign: "right" }}>
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ fontWeight: 700 }}>Total ({totalEquipos} equipos)</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#1d4ed8" }}>
                    {detalles.reduce((a, d) => a + (d.cantidad_sistema ?? 0), 0)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>
                    {detalles.reduce((a, d) => a + (d.cantidad_fisica ?? 0), 0)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>
                    {(() => {
                      const v = detalles.reduce((a, d) => a + ((d.cantidad_fisica ?? 0) - (d.cantidad_sistema ?? 0)), 0);
                      return v > 0 ? `+${v}` : v;
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

      </div>

      {/* Export preview modal */}
      <Modal
        open={exportPreviewOpen}
        onCancel={() => setExportPreviewOpen(false)}
        title={`Previsualización — Conteo ${tipoLabel} · ${fmtFecha(conteo.fecha)}`}
        width={860}
        centered
        destroyOnClose
        footer={[
          <Button key="close" onClick={() => setExportPreviewOpen(false)}>Cerrar</Button>,
          <Button
            key="export"
            className="custom-button"
            icon={<DownloadOutlined />}
            onClick={() => printConteoDetallePdf(conteo)}
          >
            Exportar PDF
          </Button>,
        ]}
      >
        <div style={{ height: "72vh", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <iframe
            title="preview-conteo-detalle"
            style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
            srcDoc={exportPreviewHtml}
          />
        </div>
      </Modal>
    </main>
  );
}
