import React, { useState, useEffect, useCallback } from "react";
import {
  apiClientesEventsInstance,
  authHeaderClientesEvents,
} from "../../../../redux/actions/clientes_events/clientes_events";
import {
  Button, Upload, Spin, notification, Tooltip, Progress, Tabs, Empty, Modal,
} from "antd";
import {
  ArrowLeftOutlined, UploadOutlined, DeleteOutlined, DownloadOutlined,
  FileTextOutlined, FileImageOutlined, FolderOutlined, FileOutlined,
  CloudOutlined, ReloadOutlined,
} from "@ant-design/icons";
import "../../TrabajadoresPage.css";
import "./events-detail.css";

const ID_APP = 1;

const TIPO_PALETTE = [
  { color: "#1d4ed8", bg: "#dbeafe" },
  { color: "#15803d", bg: "#dcfce7" },
  { color: "#9333ea", bg: "#f3e8ff" },
  { color: "#b45309", bg: "#fef3c7" },
  { color: "#0891b2", bg: "#cffafe" },
  { color: "#be123c", bg: "#ffe4e6" },
];

const TIPO_ICONS = {
  contratos:   <FileTextOutlined />,
  imagenes:    <FileImageOutlined />,
  documentos:  <FolderOutlined />,
  eventos:     <FolderOutlined />,
  perfil:      <FileImageOutlined />,
};

const tipoMeta = (key, idx) => ({
  key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
  icon: TIPO_ICONS[key] || <FileOutlined />,
  ...(TIPO_PALETTE[idx % TIPO_PALETTE.length]),
});

const fmtBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getInitials = (n, a) => ((n || " ")[0] + (a || " ")[0]).toUpperCase();

const BLUE = "#01369e";

// ── File Manager (detail for one client) ──────────────────────────────────────
function FileManager({ cliente, onBack }) {
  const tipos = Object.keys(cliente.por_tipo || {});
  const [activeTab, setActiveTab] = useState(tipos[0] || "contratos");
  const [files, setFiles] = useState({});
  const [loadingTab, setLoadingTab] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingFile, setDeletingFile] = useState(null);

  const fetchFiles = useCallback(async (tipo) => {
    setLoadingTab(true);
    try {
      const res = await apiClientesEventsInstance.get(
        `/clientes/${cliente.id_cliente}/storage/archivos`,
        { headers: authHeaderClientesEvents(), params: { id_app: ID_APP, tipo } }
      );
      setFiles((prev) => ({ ...prev, [tipo]: Array.isArray(res.data) ? res.data : [] }));
    } catch {
      setFiles((prev) => ({ ...prev, [tipo]: [] }));
    } finally {
      setLoadingTab(false);
    }
  }, [cliente.id_cliente]);

  useEffect(() => { fetchFiles(activeTab); }, [activeTab, fetchFiles]);

  const handleUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await apiClientesEventsInstance.post(
        `/clientes/${cliente.id_cliente}/storage/upload`,
        formData,
        {
          headers: { ...authHeaderClientesEvents(), "Content-Type": "multipart/form-data" },
          params: { id_app: ID_APP, tipo: activeTab },
        }
      );
      notification.success({ message: "Archivo subido correctamente" });
      onSuccess(null, file);
      fetchFiles(activeTab);
    } catch (err) {
      notification.error({ message: "Error al subir archivo", description: err?.response?.data?.detail || err.message });
      onError(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (nombre) => {
    setDeletingFile(nombre);
    try {
      await apiClientesEventsInstance.delete(
        `/clientes/${cliente.id_cliente}/storage/archivos/${encodeURIComponent(nombre)}`,
        { headers: authHeaderClientesEvents(), params: { id_app: ID_APP, tipo: activeTab } }
      );
      notification.success({ message: "Archivo eliminado" });
      fetchFiles(activeTab);
    } catch {
      notification.error({ message: "Error al eliminar archivo" });
    } finally {
      setDeletingFile(null);
    }
  };

  const currentFiles = files[activeTab] || [];
  const cfg = tipoMeta(activeTab, tipos.indexOf(activeTab));

  return (
    <div>
      <Button
        type="link" icon={<ArrowLeftOutlined />} onClick={onBack}
        style={{ padding: 0, fontSize: 12, color: "#05060a", marginBottom: 16 }}
      >
        Volver al almacenamiento
      </Button>

      {/* Client header */}
      <div className="cd-header-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="trab-avatar" style={{ width: 48, height: 48, fontSize: 18, minWidth: 48, background: BLUE }}>
            {getInitials(cliente.nombre_cliente, cliente.apellido_cliente)}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, textTransform: "capitalize" }}>
              {cliente.nombre_cliente} {cliente.apellido_cliente}
            </h2>
            <span style={{ fontSize: 13, color: "#6b7280" }}>
              Total: <strong>{fmtBytes(cliente.total_bytes)}</strong>
            </span>
          </div>
        </div>

        {/* Mini breakdown */}
        <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          {tipos.map((key, idx) => {
            const t = tipoMeta(key, idx);
            return (
              <div
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: activeTab === key ? t.bg : "#f8fafc",
                  color: activeTab === key ? t.color : "#6b7280",
                  border: `1.5px solid ${activeTab === key ? t.color + "55" : "#e5e7eb"}`,
                  padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                  fontSize: 13, fontWeight: 600, transition: "all .15s",
                }}
              >
                {t.icon}
                {t.label}
                <span style={{ fontSize: 11, opacity: 0.8 }}>
                  {fmtBytes(cliente.por_tipo?.[key] || 0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* File list */}
      <div className="cd-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: cfg.bg, color: cfg.color,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
            }}>{cfg.icon}</div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              {cfg.label}
              <span style={{ marginLeft: 8, fontSize: 12, color: "#9ca3af", fontWeight: 400 }}>
                {currentFiles.length} archivo{currentFiles.length !== 1 ? "s" : ""}
              </span>
            </h3>
          </div>
          <Upload customRequest={handleUpload} showUploadList={false}>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading}
              style={{ background: BLUE, borderColor: BLUE }}
            >
              Subir archivo
            </Button>
          </Upload>
        </div>

        {loadingTab ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spin /></div>
        ) : currentFiles.length === 0 ? (
          <Empty description="Sin archivos en esta carpeta" style={{ margin: "30px 0" }} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                  {["Nombre", "Tamaño", "Fecha", "Acciones"].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 3 ? "center" : "left",
                      padding: "8px 12px", fontWeight: 600, color: "#64748b",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentFiles.map((f) => (
                  <tr key={f.nombre} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "9px 12px", fontWeight: 500, maxWidth: 300 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: cfg.color, fontSize: 16 }}>{cfg.icon}</span>
                        <span style={{ wordBreak: "break-all" }}>{f.nombre}</span>
                      </div>
                    </td>
                    <td style={{ padding: "9px 12px", color: "#64748b", whiteSpace: "nowrap" }}>
                      {fmtBytes(f.size_bytes)}
                    </td>
                    <td style={{ padding: "9px 12px", color: "#64748b", whiteSpace: "nowrap", fontSize: 12 }}>
                      {new Date(f.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                        <Tooltip title="Descargar">
                          <a href={`${window.location.protocol}//${window.location.hostname}:8000/${f.url}`} target="_blank" rel="noreferrer" download>
                            <Button size="small" icon={<DownloadOutlined />} />
                          </a>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <Button
                            size="small" danger icon={<DeleteOutlined />}
                            loading={deletingFile === f.nombre}
                            onClick={() => Modal.confirm({
                              title: "¿Eliminar archivo?",
                              content: f.nombre,
                              okText: "Eliminar", okButtonProps: { danger: true },
                              cancelText: "Cancelar",
                              onOk: () => handleDelete(f.nombre),
                            })}
                          />
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Storage Overview ──────────────────────────────────────────────────────────
export default function AlmacenamientoEventPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState(null);

  const fetchResumen = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClientesEventsInstance.get(
        "/clientes/storage/resumen",
        { headers: authHeaderClientesEvents(), params: { id_app: ID_APP } }
      );
      setData(res.data);
    } catch {
      notification.error({ message: "Error al cargar almacenamiento" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchResumen(); }, [fetchResumen]);

  if (selectedCliente) {
    return (
      <FileManager
        cliente={selectedCliente}
        onBack={() => { setSelectedCliente(null); fetchResumen(); }}
      />
    );
  }

  const clientes = data?.clientes || [];
  const totalGlobal = data?.total_bytes || 0;
  const allTipos = [...new Set(clientes.flatMap((c) => Object.keys(c.por_tipo || {})))];

  return (
    <div>
      {/* Header stats */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#05060a" }}>Almacenamiento</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>
            Archivos organizados por cliente
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchResumen} loading={loading}>
          Actualizar
        </Button>
      </div>

      {/* Global total card */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "16px 24px",
        boxShadow: "0 2px 8px rgba(1,54,158,.08)", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 16,
        border: "1px solid #e5e7eb",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "#eff6ff", color: BLUE,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
        }}>
          <CloudOutlined />
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#05060a", lineHeight: 1.1 }}>
            {fmtBytes(totalGlobal)}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            Uso total — {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 16, flexWrap: "wrap" }}>
          {allTipos.map((key, idx) => {
            const t = tipoMeta(key, idx);
            const total = clientes.reduce((s, c) => s + (c.por_tipo?.[key] || 0), 0);
            return (
              <div key={key} style={{ textAlign: "center", minWidth: 70 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: t.bg, color: t.color, margin: "0 auto 4px",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                }}>{t.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{fmtBytes(total)}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spin size="large" /></div>
      ) : clientes.length === 0 ? (
        <Empty description="Sin clientes registrados" style={{ margin: "60px 0" }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {clientes.map((c) => {
            const pct = totalGlobal > 0 ? Math.round((c.total_bytes / totalGlobal) * 100) : 0;

            return (
              <div
                key={c.id_cliente}
                style={{
                  background: "#fff", borderRadius: 12, padding: "16px 20px",
                  boxShadow: "0 1px 4px rgba(0,0,0,.06)", border: "1px solid #e5e7eb",
                  display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                }}
              >
                {/* Avatar */}
                <div className="trab-avatar" style={{ width: 44, height: 44, fontSize: 16, minWidth: 44, background: BLUE }}>
                  {getInitials(c.nombre_cliente, c.apellido_cliente)}
                </div>

                {/* Name + progress */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", textTransform: "capitalize" }}>
                    {c.nombre_cliente} {c.apellido_cliente}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                    {fmtBytes(c.total_bytes)} · {pct}% del total
                  </div>
                  <Progress
                    percent={pct}
                    showInfo={false}
                    strokeColor={BLUE}
                    trailColor="#e5e7eb"
                    size="small"
                    style={{ margin: 0 }}
                  />
                </div>

                {/* Per-type breakdown */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {Object.entries(c.por_tipo || {}).map(([key, sz], idx) => {
                    const t = tipoMeta(key, idx);
                    return (
                      <div key={key} style={{
                        display: "flex", alignItems: "center", gap: 5,
                        background: sz > 0 ? t.bg : "#f9fafb",
                        color: sz > 0 ? t.color : "#9ca3af",
                        padding: "4px 10px", borderRadius: 16,
                        fontSize: 12, fontWeight: 600,
                        border: `1px solid ${sz > 0 ? t.color + "33" : "#e5e7eb"}`,
                      }}>
                        {t.icon}
                        <span>{t.label}</span>
                        <span style={{ fontWeight: 400, opacity: 0.8 }}>{fmtBytes(sz)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Action */}
                <Button
                  type="primary"
                  icon={<FolderOutlined />}
                  onClick={() => setSelectedCliente(c)}
                  style={{ background: BLUE, borderColor: BLUE, whiteSpace: "nowrap" }}
                >
                  Ver archivos
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
