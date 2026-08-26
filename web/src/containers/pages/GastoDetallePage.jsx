import React, { useState, useEffect, useCallback } from "react";
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
  Dropdown,
  Input,
  InputNumber,
  Select,
} from "antd";
import Toast from "../../components/toasts/toast";
import SuccessOverlay from "../../components/feedback/SuccessOverlay";
import {
  EditOutlined,
  EllipsisOutlined,
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

  const [tiposGasto, setTiposGasto] = useState([]);
  const [editingCard, setEditingCard] = useState(false);
  const [editingForm, setEditingForm] = useState({});
  const [savingCard, setSavingCard] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };
  const [success, setSuccess] = useState({ show: false, title: "", subtitle: "" });

  const fetchGasto = useCallback(() =>
    apiGastosInstance
      .get(`/gastos/${idGasto}`, { headers: authHeaderGastos() })
      .then((res) => setGasto(res.data)),
  [idGasto]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchGasto()
      .catch(() => { if (!cancelled) navigate("/app/gastos"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchGasto, navigate]);

  useEffect(() => {
    apiGastosInstance
      .get("/gastos/config/tipos", { headers: authHeaderGastos() })
      .then((res) => setTiposGasto(res.data || []))
      .catch(() => setTiposGasto([]));
  }, []);

  const handleSaveCard = async () => {
    setSavingCard(true);
    try {
      await apiGastosInstance.patch(
        `/gastos/${idGasto}`,
        {
          descripcion: editingForm.descripcion,
          monto: editingForm.monto,
          fecha: editingForm.fecha,
          id_tipo_gasto: editingForm.id_tipo_gasto,
          notas: editingForm.notas,
        },
        { headers: authHeaderGastos() }
      );
      await fetchGasto();
      setEditingCard(false);
      toast("Gasto actualizado");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar");
    } finally {
      setSavingCard(false);
    }
  };

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
          setSuccess({
            show: true,
            title: "¡Gasto eliminado!",
            subtitle: `"${gasto?.descripcion || ""}" se eliminó correctamente.`,
          });
        } catch (err) {
          toast(err?.response?.data?.detail || err.message || "Error al eliminar");
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

        {/* Main card — title + buttons + all detail inside */}
        <div className="gas-section-card">

          {/* ── Card header row ─────────────────────────────── */}
          <div className="gas-detail-card-header">
            <div className="gas-detail-card-title-col">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                <span className="gas-section-icon" style={{ background: "linear-gradient(140deg,#9f1239,#f43f5e)" }}>
                  <DollarOutlined />
                </span>
                {editingCard ? (
                  <Input
                    value={editingForm.descripcion}
                    onChange={(e) => setEditingForm((f) => ({ ...f, descripcion: e.target.value }))}
                    style={{ fontSize: 16, fontWeight: 600, maxWidth: 340 }}
                    placeholder="Descripción del gasto"
                  />
                ) : (
                  <Title level={3} style={{ margin: 0, fontWeight: 700, fontSize: 20 }}>
                    {gasto.descripcion}
                  </Title>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: 12, paddingLeft: 38 }}>
                Gasto #{gasto.id_gasto}
              </Text>
            </div>
            <div className="gas-detail-card-actions">
              {canEditar && !editingCard && (
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      {
                        key: "editar", icon: <EditOutlined />, label: "Editar",
                        onClick: () => {
                          setEditingForm({
                            descripcion: gasto.descripcion || "",
                            monto: parseFloat(gasto.monto) || 0,
                            fecha: gasto.fecha?.slice(0, 10) || "",
                            id_tipo_gasto: gasto.id_tipo_gasto || null,
                            notas: gasto.notas || "",
                          });
                          setEditingCard(true);
                        },
                      },
                    ],
                  }}
                >
                  <Button type="text" icon={<EllipsisOutlined />} />
                </Dropdown>
              )}
              {canEliminar && !editingCard && (
                <Button
                  danger
                  className="gas-btn-delete"
                  icon={<DeleteOutlined />}
                  loading={deleting}
                  disabled={success.show}
                  onClick={handleDelete}
                >
                  Eliminar
                </Button>
              )}
            </div>
          </div>

          <div className="gas-detail-divider" />

          {editingCard ? (
            <div className="gas-edit-form">
              <div className="gas-edit-row">
                <div className="gas-edit-field">
                  <span className="gas-info-label">Monto ($)</span>
                  <InputNumber
                    value={editingForm.monto}
                    onChange={(v) => setEditingForm((f) => ({ ...f, monto: v }))}
                    min={0.01}
                    step={0.01}
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="gas-edit-field">
                  <span className="gas-info-label">Fecha del gasto</span>
                  <Input
                    type="date"
                    value={editingForm.fecha}
                    onChange={(e) => setEditingForm((f) => ({ ...f, fecha: e.target.value }))}
                  />
                </div>
              </div>
              <div className="gas-edit-field">
                <span className="gas-info-label">Tipo de gasto</span>
                <Select
                  value={editingForm.id_tipo_gasto}
                  onChange={(v) => setEditingForm((f) => ({ ...f, id_tipo_gasto: v }))}
                  placeholder="Selecciona el tipo de gasto"
                  options={tiposGasto.map((t) => ({ label: t.nombre, value: t.id_tipo_gasto }))}
                />
              </div>
              <div className="gas-edit-field">
                <span className="gas-info-label">Notas</span>
                <Input.TextArea
                  rows={3}
                  value={editingForm.notas}
                  onChange={(e) => setEditingForm((f) => ({ ...f, notas: e.target.value }))}
                  placeholder="Notas adicionales (opcional)"
                />
              </div>
              <div className="gas-edit-form-actions">
                <Button onClick={() => setEditingCard(false)}>Cancelar</Button>
                <Button type="primary" loading={savingCard} onClick={handleSaveCard} style={{ background: "#9f1239", borderColor: "#9f1239" }}>
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Monto prominente ── */}
              <div className="gas-monto-panel">
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
                <div className="gas-info-block gas-info-block--icon">
                  <span className="gas-info-icon-circle"><CalendarOutlined /></span>
                  <div>
                    <div className="gas-info-label">Fecha</div>
                    <div className="gas-info-value">{fmtDate(gasto.fecha)}</div>
                  </div>
                </div>

                {gasto.nombre_usuario && (
                  <div className="gas-info-block gas-info-block--icon">
                    <span className="gas-info-icon-circle"><UserOutlined /></span>
                    <div>
                      <div className="gas-info-label">Registrado por</div>
                      <div className="gas-info-value">{gasto.nombre_usuario}</div>
                    </div>
                  </div>
                )}

                <div className="gas-info-block gas-info-block--icon">
                  <span className="gas-info-icon-circle"><CalendarOutlined /></span>
                  <div>
                    <div className="gas-info-label">Fecha de registro</div>
                    <div className="gas-info-value" style={{ fontSize: 12 }}>
                      {fmtDate(gasto.datetime)}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Notas ── */}
              {gasto.notas && (
                <div className="gas-notas-block">
                  <div className="gas-info-label" style={{ marginBottom: 6 }}>
                    <FileTextOutlined style={{ marginRight: 4 }} />Notas
                  </div>
                  <Text className="gas-notas-text" style={{ fontSize: 14, whiteSpace: "pre-line" }}>
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
                    className="gas-comprobante-link"
                    style={{ fontSize: 14 }}
                  >
                    {gasto.filename}
                  </a>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
      <SuccessOverlay
        show={success.show}
        title={success.title}
        subtitle={success.subtitle}
        onDone={() => navigate("/app/gastos")}
      />
    </main>
  );
}
