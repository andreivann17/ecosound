import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import {
  apiGastosInstance,
  authHeaderGastos,
} from "../../redux/actions/gastos/gastos";
import { PATH } from "../../redux/utils";

import {
  Button,
  Typography,
  Spin,
  Modal,
  notification,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  CalendarOutlined,
  TagOutlined,
  UserOutlined,
  FileTextOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";

import "./GastosPage.css";

const { Title, Text } = Typography;

const fmtMoney = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n ?? 0);

const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s + (s.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
};

export default function GastoDetallePage() {
  const { idGasto } = useParams();
  const navigate    = useNavigate();
  const { perm }    = usePermisos() || { perm: () => true };
  const canEditar   = perm("gastos", "editar");
  const canEliminar = perm("gastos", "eliminar");

  const [gasto,    setGasto]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGastosInstance
      .get(`/gastos/${idGasto}`, { headers: authHeaderGastos() })
      .then((res) => { if (!cancelled) setGasto(res.data); })
      .catch(() => { if (!cancelled) navigate("/app/gastos"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [idGasto, navigate]);

  const handleDelete = () => {
    Modal.confirm({
      title:      "Eliminar gasto",
      content:    `¿Estás seguro de eliminar "${gasto?.descripcion}"? Esta acción no se puede deshacer.`,
      okText:     "Eliminar",
      okType:     "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        setDeleting(true);
        try {
          await apiGastosInstance.delete(`/gastos/${idGasto}`, { headers: authHeaderGastos() });
          notification.success({ message: "Gasto eliminado correctamente" });
          navigate("/app/gastos");
        } catch (err) {
          notification.error({
            message:     "Error al eliminar",
            description: err?.response?.data?.detail || err.message,
          });
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <main className="gas-main" style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <Spin size="large" />
      </main>
    );
  }

  if (!gasto) return null;

  return (
    <main className="gas-main">
      <div className="gas-content">

        {/* Back link */}
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/app/gastos")}
          style={{ padding: 0, height: "auto", fontSize: 12, color: "#05060a", marginBottom: 14 }}
        >
          Volver a Gastos
        </Button>

        {/* Main card — title + buttons + all detail inside */}
        <div className="gas-section-card">

          {/* ── Card header row ─────────────────────────────── */}
          <div className="gas-detail-card-header">
            <div className="gas-detail-card-title-col">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                <span className="gas-section-icon" style={{ background: "linear-gradient(140deg,#9f1239,#f43f5e)" }}>
                  <DollarOutlined />
                </span>
                <Title level={3} style={{ margin: 0, fontWeight: 700, fontSize: 20 }}>
                  {gasto.descripcion}
                </Title>
              </div>
              <Text type="secondary" style={{ fontSize: 12, paddingLeft: 38 }}>
                Gasto #{gasto.id_gasto}
              </Text>
            </div>
            <div className="gas-detail-card-actions">
              {canEditar && (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => navigate("/app/gastos/crear", { state: { gasto } })}
                >
                  Editar
                </Button>
              )}
              {canEliminar && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleting}
                  onClick={handleDelete}
                >
                  Eliminar
                </Button>
              )}
            </div>
          </div>

          <div className="gas-detail-divider" />

          {/* ── Monto prominente ── */}
          <div className="gas-detail-monto-row">
            <div>
              <div className="gas-info-label">Monto total</div>
              <div className="gas-info-monto">{fmtMoney(gasto.monto)}</div>
            </div>
            {gasto.nombre_tipo_gasto && (
              <span className="gas-cat-badge gas-cat-badge--lg">
                <TagOutlined style={{ marginRight: 4 }} />
                {gasto.nombre_tipo_gasto}
              </span>
            )}
          </div>

          {/* ── Info grid ── */}
          <div className="gas-detail-info-grid">
            <div className="gas-info-block">
              <div className="gas-info-label">
                <CalendarOutlined style={{ marginRight: 4 }} />Fecha
              </div>
              <div className="gas-info-value">{fmtDate(gasto.fecha)}</div>
            </div>

            {gasto.nombre_usuario && (
              <div className="gas-info-block">
                <div className="gas-info-label">
                  <UserOutlined style={{ marginRight: 4 }} />Registrado por
                </div>
                <div className="gas-info-value">{gasto.nombre_usuario}</div>
              </div>
            )}

            <div className="gas-info-block">
              <div className="gas-info-label">Fecha de registro</div>
              <div className="gas-info-value" style={{ fontSize: 12 }}>
                {fmtDate(gasto.datetime)}
              </div>
            </div>
          </div>

          {/* ── Notas ── */}
          {gasto.notas && (
            <div className="gas-notas-block">
              <div className="gas-info-label" style={{ marginBottom: 6 }}>
                <FileTextOutlined style={{ marginRight: 4 }} />Notas
              </div>
              <Text style={{ fontSize: 14, color: "#334155", whiteSpace: "pre-line" }}>
                {gasto.notas}
              </Text>
            </div>
          )}

          {/* ── Comprobante ── */}
          {gasto.filename && (
            <div className="gas-notas-block" style={{ marginTop: 10 }}>
              <div className="gas-info-label" style={{ marginBottom: 6 }}>
                <PaperClipOutlined style={{ marginRight: 4 }} />Comprobante
              </div>
              <a
                href={`${PATH}/${gasto.path}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#9f1239", fontSize: 14 }}
              >
                {gasto.filename}
              </a>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
