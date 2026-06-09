import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Input } from "antd";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  SearchOutlined,
  UserOutlined,
  LockOutlined,
  CreditCardOutlined,
  RightOutlined,
  LeftOutlined,
  FileTextOutlined,
  SmileOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { API_URL } from "../../api";
import "./MiCuentaPage.css";

const STRIPE_PK = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

const VINCULAR_PLANS = [
  {
    id: "herrsoft_events_mensual",
    nombre: "Plan Mensual",
    precio: "$550 MXN / mes",
    badge: "🎁 1 mes gratis",
  },
  {
    id: "herrsoft_events_anual",
    nombre: "Plan Anual",
    precio: "$5,500 MXN / año",
    badge: "🎉 2 meses gratis",
  },
];

const authHeader = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("tokenadmin");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const PLAN_LABELS = {
  herrsoft_events_mensual: "HerrSoft Events · Mensual",
  herrsoft_events_anual: "HerrSoft Events · Anual",
};

const formatPlan = (plan) => {
  if (!plan) return "HerrSoft Events";
  const label = PLAN_LABELS[plan] || plan.replaceAll("_", " ");
  return label.replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatMonto = (monto) => {
  const n = Number(monto);
  if (Number.isNaN(n)) return monto;
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
};

const formatFecha = (fecha) => {
  if (!fecha) return "—";
  try {
    return new Date(fecha).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return fecha;
  }
};

const DELETE_PHRASE = "Acepto eliminar mi cuenta";

const SECTIONS = [
  {
    title: "Cuenta",
    items: [
      {
        icon: <UserOutlined />,
        label: "Editar información personal",
        desc: "Tu nombre, teléfono, fecha de nacimiento y foto",
        path: "/app/perfil",
      },
      {
        icon: <LockOutlined />,
        label: "Cambiar contraseña",
        desc: "Actualiza tu contraseña cuando quieras",
        path: "/app/perfil",
      },
    ],
  },
  {
    title: "Pagos y suscripción",
    items: [
      {
        icon: <CreditCardOutlined />,
        label: "Métodos de pago y suscripción",
        desc: "Actualiza tu tarjeta, cambia de plan o cancela tu suscripción cuando lo necesites",
        action: "billing-portal",
      },
      {
        icon: <FileTextOutlined />,
        label: "Historial de pagos",
        desc: "Consulta los pagos que has realizado a HerrSoft",
        action: "ver-historial",
      },
    ],
  },
];

// ─── Formulario de Stripe Elements para vincular tarjeta ─────────────────────
// Debe vivir fuera del componente principal para no re-montarse en cada render.

function VincularTarjetaForm({ plan, onError, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    onError("");

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setSubmitting(false);
      onError(error.message || "No se pudo guardar la tarjeta.");
      return;
    }

    if (setupIntent?.status === "succeeded") {
      try {
        await axios.post(
          `${API_URL}/contratar/vincular-tarjeta/confirmar`,
          { setup_intent_id: setupIntent.id, plan },
          { headers: authHeader() }
        );
        onSuccess();
      } catch (err) {
        setSubmitting(false);
        onError(
          err?.response?.data?.detail ||
            "Error al activar la suscripción. Intenta de nuevo."
        );
      }
    } else {
      setSubmitting(false);
      onError("No se pudo confirmar la tarjeta. Intenta de nuevo.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mcv-notice">
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: 1 }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Tu tarjeta se guardará de forma segura. El primer cobro se realizará
        en el próximo ciclo de facturación. Hoy no se te cobra nada.
      </div>
      <div className="mcv-stripe-wrap">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <button
        type="submit"
        className="mcd-btn mcd-btn--primary"
        style={{ width: "100%", padding: "11px 20px", fontSize: 14, marginTop: 8 }}
        disabled={!stripe || submitting}
      >
        {submitting ? "Guardando tarjeta…" : "Guardar tarjeta y activar suscripción"}
      </button>
      <p className="mcv-protected">🔒 Pagos procesados de forma segura por Stripe</p>
    </form>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MiCuentaPage() {
  const navigate = useNavigate();
  const [view, setView] = useState("main"); // "main" | "historial"
  const [query, setQuery] = useState("");
  const [openingPortal, setOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState("");

  const [cuenta, setCuenta] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [loadingPagos, setLoadingPagos] = useState(true);
  const [pagosError, setPagosError] = useState("");

  // ── Estado: vincular tarjeta ─────────────────────────────────────────────
  const [vincularStep, setVincularStep] = useState(null); // null | "plan" | "card" | "done"
  const [vincularPlan, setVincularPlan] = useState("herrsoft_events_mensual");
  const [vincularClientSecret, setVincularClientSecret] = useState(null);
  const [vincularError, setVincularError] = useState("");
  const [vincularLoading, setVincularLoading] = useState(false);

  // ── Estado: borrar cuenta ────────────────────────────────────────────────
  const [deleteStep, setDeleteStep] = useState(null);
  const [deletePwd, setDeletePwd] = useState("");
  const [deletePwdConfirm, setDeletePwdConfirm] = useState("");
  const [deletePwdError, setDeletePwdError] = useState("");
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleteSending, setDeleteSending] = useState(false);
  const [deleteApiError, setDeleteApiError] = useState("");

  // ── Helpers ──────────────────────────────────────────────────────────────

  const fetchCuenta = () => {
    axios
      .get(`${API_URL}/contratar/mi-cuenta`, { headers: authHeader() })
      .then(({ data }) => setCuenta(data))
      .catch(() => {});
  };

  const resetDelete = () => {
    setDeleteStep(null);
    setDeletePwd("");
    setDeletePwdConfirm("");
    setDeletePwdError("");
    setDeletePhrase("");
    setDeleteSending(false);
    setDeleteApiError("");
  };

  const resetVincular = () => {
    setVincularStep(null);
    setVincularPlan("herrsoft_events_mensual");
    setVincularClientSecret(null);
    setVincularError("");
    setVincularLoading(false);
  };

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (localStorage.getItem("usuario_cliente") !== "1") {
      navigate("/app", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    fetchCuenta();

    axios
      .get(`${API_URL}/contratar/mis-pagos`, { headers: authHeader() })
      .then(({ data }) => {
        if (!cancelled) setPagos(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setPagosError(
            err?.response?.data?.detail ||
              "No pudimos cargar tu historial de pagos en este momento."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPagos(false);
      });

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleConfirmDelete = async () => {
    if (deleteSending) return;
    setDeleteSending(true);
    setDeleteApiError("");
    try {
      await axios.post(
        `${API_URL}/contratar/solicitar-eliminar-cuenta`,
        {},
        { headers: authHeader() }
      );
      setDeleteStep("done");
    } catch (err) {
      setDeleteApiError(
        err?.response?.data?.detail || "Error al eliminar la cuenta. Intenta de nuevo."
      );
    } finally {
      setDeleteSending(false);
    }
  };

  const handlePasswordNext = () => {
    if (!deletePwd) {
      setDeletePwdError("Por favor ingresa tu contraseña.");
      return;
    }
    if (deletePwd !== deletePwdConfirm) {
      setDeletePwdError("Las contraseñas no coinciden. Intenta de nuevo.");
      return;
    }
    setDeletePwdError("");
    setDeleteStep("phrase");
  };

  const openBillingPortal = async () => {
    if (openingPortal) return;
    setOpeningPortal(true);
    setPortalError("");
    try {
      const { data } = await axios.post(
        `${API_URL}/contratar/portal-session`,
        {},
        { headers: authHeader() }
      );
      if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setPortalError(
        err?.response?.data?.detail ||
          "No pudimos abrir el portal de facturación. Intenta de nuevo en unos minutos."
      );
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleVincularIniciar = async () => {
    setVincularLoading(true);
    setVincularError("");
    try {
      const { data } = await axios.post(
        `${API_URL}/contratar/vincular-tarjeta/iniciar`,
        { plan: vincularPlan },
        { headers: authHeader() }
      );
      setVincularClientSecret(data.clientSecret);
      setVincularStep("card");
    } catch (err) {
      setVincularError(
        err?.response?.data?.detail || "No se pudo iniciar el proceso. Intenta de nuevo."
      );
    } finally {
      setVincularLoading(false);
    }
  };

  const handleItemClick = (item) => {
    if (item.action === "billing-portal") {
      // Clientes en efectivo (sin stripe_customer_id): abrir flujo de vincular tarjeta
      if (cuenta?.tiene_metodo_pago === false) {
        setVincularStep("plan");
        return;
      }
      return openBillingPortal();
    }
    if (item.action === "ver-historial") return setView("historial");
    if (item.path) return navigate(item.path);
  };

  // ── Derivados ────────────────────────────────────────────────────────────

  const nombre = cuenta?.nombre?.trim();
  const saludo = nombre ? `¡Hola, ${nombre.split(" ")[0]}!` : "¡Hola!";

  const filtered = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.toLowerCase();
    return SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter(
        (it) =>
          it.label.toLowerCase().includes(q) ||
          (it.desc && it.desc.toLowerCase().includes(q))
      ),
    })).filter((s) => s.items.length > 0);
  }, [query]);

  const selectedVincularPlan = VINCULAR_PLANS.find((p) => p.id === vincularPlan);

  // ── Render: historial ────────────────────────────────────────────────────

  if (view === "historial") {
    return (
      <div className="mc-main">
        <div className="mc-content">
          <button type="button" className="mc-back-link" onClick={() => setView("main")}>
            <LeftOutlined /> Volver a Mi cuenta
          </button>

          <h1 className="mc-title">
            <FileTextOutlined style={{ marginRight: 10, color: "#60a5fa" }} />
            Historial de pagos
          </h1>
          <p className="mc-subtitle">
            Aquí puedes ver todos los pagos que has realizado a HerrSoft, ordenados del más reciente al más antiguo.
          </p>

          <div className="mc-list mc-pagos-card">
            {loadingPagos && <div className="mc-pagos-empty">Cargando tu historial de pagos…</div>}
            {!loadingPagos && pagosError && (
              <div className="mc-pagos-empty mc-pagos-error">{pagosError}</div>
            )}
            {!loadingPagos && !pagosError && pagos.length === 0 && (
              <div className="mc-pagos-empty">
                Todavía no tienes pagos registrados. En cuanto se procese tu primer pago, lo verás aquí. 🙂
              </div>
            )}
            {!loadingPagos && !pagosError && pagos.length > 0 && (
              <table className="mc-pagos-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id_cliente_pago}>
                      <td>{formatFecha(p.fecha_pago || p.datetime)}</td>
                      <td>{formatMonto(p.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="mc-pagos-hint">
            ¿Necesitas tu factura o un comprobante con más detalle? Desde "Métodos de pago y suscripción" puedes
            descargar tus recibos directamente desde el portal de facturación.
          </p>
        </div>
      </div>
    );
  }

  // ── Render: main ─────────────────────────────────────────────────────────

  return (
    <div className="mc-main">
      <div className="mc-content">
        <h1 className="mc-title">
          <SmileOutlined style={{ marginRight: 10, color: "#60a5fa" }} />
          Mi cuenta
        </h1>
        <p className="mc-subtitle">{saludo} Aquí puedes administrar tu cuenta y tu suscripción de HerrSoft.</p>

        <div className="mc-search-wrap">
          <SearchOutlined className="mc-search-icon" />
          <input
            className="mc-search-input"
            placeholder="Buscar opciones de cuenta o artículos de ayuda"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="mc-plan-card">
          <div>
            <div className="mc-plan-label">Tu plan</div>
            <div className="mc-plan-name">{formatPlan(cuenta?.plan)}</div>
            {cuenta?.fecha_proxima_pago && (
              <div className="mc-plan-meta">
                Tu próximo cobro es el {formatFecha(cuenta.fecha_proxima_pago)}
              </div>
            )}
          </div>
          <CreditCardOutlined style={{ fontSize: 36, color: "#3a3a3a" }} />
        </div>

        {filtered.map((section) => (
          <div className="mc-section" key={section.title}>
            <h2 className="mc-section-title">{section.title}</h2>
            <div className="mc-list">
              {section.items.map((item) => {
                const clickable = !!item.path || !!item.action;
                const loadingThis = item.action === "billing-portal" && openingPortal;
                const isCashUser =
                  item.action === "billing-portal" && cuenta?.tiene_metodo_pago === false;
                return (
                  <div
                    key={item.label}
                    className="mc-list-item"
                    onClick={() => clickable && !loadingThis && handleItemClick(item)}
                    style={{ cursor: clickable ? "pointer" : "default", opacity: loadingThis ? 0.6 : 1 }}
                  >
                    <div className="mc-item-icon">{item.icon}</div>
                    <div className="mc-item-text">
                      <div className="mc-item-label">{item.label}</div>
                      {item.desc && <div className="mc-item-desc">{item.desc}</div>}
                      {isCashUser && (
                        <div className="mc-item-desc" style={{ color: "#60a5fa", marginTop: 3 }}>
                          Vincula una tarjeta para automatizar tus cobros
                        </div>
                      )}
                      {!isCashUser && item.action === "billing-portal" && portalError && (
                        <div className="mc-item-desc" style={{ color: "#dc2626" }}>{portalError}</div>
                      )}
                    </div>
                    {item.tag && <span className="mc-item-tag">{item.tag}</span>}
                    {clickable && <RightOutlined className="mc-item-chevron" />}
                    {loadingThis && <span className="mc-item-tag">Abriendo…</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── Zona de peligro ─────────────────────────────────────── */}
        <div className="mc-section mc-danger-zone">
          <div className="mc-list">
            <div
              className="mc-list-item"
              onClick={() => setDeleteStep("confirm")}
            >
              <div
                className="mc-item-icon"
                style={{ background: "rgba(220,38,38,0.12)", color: "#f87171" }}
              >
                <DeleteOutlined />
              </div>
              <div className="mc-item-text">
                <div className="mc-item-label" style={{ color: "#f87171" }}>
                  Borrar cuenta
                </div>
                <div className="mc-item-desc">
                  Esta acción es permanente y no se puede deshacer
                </div>
              </div>
              <RightOutlined className="mc-item-chevron" />
            </div>
          </div>
        </div>

        {/* ── Overlay: Vincular tarjeta ────────────────────────────── */}
        {vincularStep !== null && (
          <div className="mcd-overlay">
            <div
              className="mcd-dialog"
              style={{ maxWidth: vincularStep === "card" ? 520 : 480 }}
            >
              {vincularStep !== "done" && (
                <button
                  type="button"
                  className="mcd-close-btn"
                  onClick={resetVincular}
                  aria-label="Cerrar"
                >
                  <CloseOutlined />
                </button>
              )}

              {/* ── Paso 1: elegir plan ── */}
              {vincularStep === "plan" && (
                <div className="mcd-body">
                  <div
                    className="mcd-icon"
                    style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}
                  >
                    <CreditCardOutlined />
                  </div>
                  <h3 className="mcd-title">Vincular tarjeta</h3>
                  <p className="mcd-text">
                    Elige el plan con el que quieres activar tu suscripción con tarjeta.
                    Hoy no se te cobra nada; el primer pago se realizará en el próximo
                    ciclo de facturación.
                  </p>

                  <div className="mcv-plans">
                    {VINCULAR_PLANS.map((p) => (
                      <div
                        key={p.id}
                        className={`mcv-plan${vincularPlan === p.id ? " mcv-plan--selected" : ""}`}
                        onClick={() => setVincularPlan(p.id)}
                      >
                        <div className="mcv-plan-radio">
                          {vincularPlan === p.id && <div className="mcv-plan-radio-dot" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="mcv-plan-name">{p.nombre}</div>
                          <div className="mcv-plan-precio">{p.precio}</div>
                        </div>
                        <div className="mcv-plan-badge">{p.badge}</div>
                      </div>
                    ))}
                  </div>

                  {vincularError && <p className="mcd-error">{vincularError}</p>}

                  <div className="mcd-actions">
                    <button
                      type="button"
                      className="mcd-btn mcd-btn--ghost"
                      onClick={resetVincular}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="mcd-btn mcd-btn--primary"
                      onClick={handleVincularIniciar}
                      disabled={vincularLoading}
                    >
                      {vincularLoading ? "Preparando…" : "Continuar"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Paso 2: ingresar tarjeta ── */}
              {vincularStep === "card" && (
                <div className="mcd-body">
                  <div
                    className="mcd-icon"
                    style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}
                  >
                    <CreditCardOutlined />
                  </div>
                  <h3 className="mcd-title">Ingresa tu tarjeta</h3>
                  <p className="mcd-text" style={{ marginBottom: 8 }}>
                    <strong style={{ color: "#ffffff" }}>{selectedVincularPlan?.nombre}</strong>
                    {" — "}
                    {selectedVincularPlan?.precio}
                  </p>

                  {vincularError && <p className="mcd-error">{vincularError}</p>}

                  {vincularClientSecret && stripePromise ? (
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret: vincularClientSecret,
                        appearance: {
                          theme: "night",
                          variables: {
                            colorPrimary: "#60a5fa",
                            borderRadius: "8px",
                            fontFamily: "system-ui, -apple-system, sans-serif",
                          },
                        },
                      }}
                    >
                      <VincularTarjetaForm
                        plan={vincularPlan}
                        onError={setVincularError}
                        onSuccess={() => setVincularStep("done")}
                      />
                    </Elements>
                  ) : (
                    <p className="mcd-error">
                      {!stripePromise
                        ? "Falta configurar la clave pública de Stripe (REACT_APP_STRIPE_PUBLISHABLE_KEY)."
                        : "No se pudo cargar el formulario de pago. Cierra e intenta de nuevo."}
                    </p>
                  )}

                  <button
                    type="button"
                    className="mcd-btn mcd-btn--ghost"
                    style={{ marginTop: 14, fontSize: 12 }}
                    onClick={() => {
                      setVincularStep("plan");
                      setVincularClientSecret(null);
                      setVincularError("");
                    }}
                  >
                    ← Cambiar plan
                  </button>
                </div>
              )}

              {/* ── Paso 3: éxito ── */}
              {vincularStep === "done" && (
                <div className="mcd-body mcd-body--center">
                  <div className="mcd-icon mcd-icon--ok">
                    <CheckCircleOutlined />
                  </div>
                  <h3 className="mcd-title">¡Tarjeta vinculada!</h3>
                  <p className="mcd-text">
                    Tu suscripción está activa. A partir del próximo ciclo de facturación,
                    los cobros se realizarán automáticamente con tu tarjeta registrada.
                  </p>
                  <div className="mcd-actions mcd-actions--center">
                    <button
                      type="button"
                      className="mcd-btn mcd-btn--primary"
                      onClick={() => {
                        resetVincular();
                        fetchCuenta();
                      }}
                    >
                      Listo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Overlay: Borrar cuenta ───────────────────────────────── */}
        {deleteStep !== null && (
          <div className="mcd-overlay">
            <div className="mcd-dialog">
              {deleteStep !== "done" && (
                <button
                  type="button"
                  className="mcd-close-btn"
                  onClick={resetDelete}
                  aria-label="Cerrar"
                >
                  <CloseOutlined />
                </button>
              )}

              {deleteStep === "confirm" && (
                <div className="mcd-body">
                  <div className="mcd-icon mcd-icon--warn">
                    <ExclamationCircleOutlined />
                  </div>
                  <h3 className="mcd-title">¿Estás seguro?</h3>
                  <p className="mcd-text">
                    Estás a punto de iniciar el proceso para{" "}
                    <strong>borrar tu cuenta</strong> de HerrSoft de forma
                    permanente. Esta acción no se puede deshacer.
                  </p>
                  <div className="mcd-actions">
                    <button
                      type="button"
                      className="mcd-btn mcd-btn--ghost"
                      onClick={resetDelete}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="mcd-btn mcd-btn--danger"
                      onClick={() => setDeleteStep("password")}
                    >
                      Sí, continuar
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === "password" && (
                <div className="mcd-body">
                  <div className="mcd-icon mcd-icon--warn">
                    <LockOutlined />
                  </div>
                  <h3 className="mcd-title">Confirma tu identidad</h3>
                  <p className="mcd-text">
                    Para continuar, ingresa tu contraseña actual y confírmala.
                  </p>
                  <div className="mcd-field">
                    <label className="mcd-label">Contraseña</label>
                    <Input.Password
                      value={deletePwd}
                      onChange={(e) => {
                        setDeletePwd(e.target.value);
                        setDeletePwdError("");
                      }}
                      placeholder="Tu contraseña actual"
                      autoFocus
                      onPressEnter={handlePasswordNext}
                    />
                  </div>
                  <div className="mcd-field">
                    <label className="mcd-label">Confirmar contraseña</label>
                    <Input.Password
                      value={deletePwdConfirm}
                      onChange={(e) => {
                        setDeletePwdConfirm(e.target.value);
                        setDeletePwdError("");
                      }}
                      placeholder="Escribe la misma contraseña"
                      onPressEnter={handlePasswordNext}
                    />
                  </div>
                  {deletePwdError && (
                    <p className="mcd-error">{deletePwdError}</p>
                  )}
                  <div className="mcd-actions">
                    <button
                      type="button"
                      className="mcd-btn mcd-btn--ghost"
                      onClick={resetDelete}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="mcd-btn mcd-btn--danger"
                      onClick={handlePasswordNext}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === "phrase" && (
                <div className="mcd-body">
                  <div className="mcd-icon mcd-icon--warn">
                    <ExclamationCircleOutlined />
                  </div>
                  <h3 className="mcd-title">Último paso</h3>
                  <p className="mcd-text">
                    Para confirmar definitivamente, escribe exactamente la
                    siguiente frase en el campo de abajo:
                  </p>
                  <p className="mcd-phrase-hint">"{DELETE_PHRASE}"</p>
                  <div className="mcd-field">
                    <Input
                      value={deletePhrase}
                      onChange={(e) => setDeletePhrase(e.target.value)}
                      placeholder="Escribe la frase aquí…"
                      autoFocus
                      onPressEnter={() =>
                        deletePhrase === DELETE_PHRASE && setDeleteStep("done")
                      }
                    />
                  </div>
                  {deleteApiError && (
                    <p className="mcd-error">{deleteApiError}</p>
                  )}
                  <div className="mcd-actions">
                    <button
                      type="button"
                      className="mcd-btn mcd-btn--ghost"
                      onClick={resetDelete}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="mcd-btn mcd-btn--danger"
                      disabled={deletePhrase !== DELETE_PHRASE || deleteSending}
                      onClick={handleConfirmDelete}
                    >
                      {deleteSending ? "Procesando…" : "Borrar mi cuenta"}
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === "done" && (
                <div className="mcd-body mcd-body--center">
                  <div className="mcd-icon mcd-icon--ok">
                    <CheckCircleOutlined />
                  </div>
                  <h3 className="mcd-title">Cuenta eliminada</h3>
                  <p className="mcd-text">
                    Tu cuenta de HerrSoft ha sido eliminada. Te enviamos un
                    correo de confirmación con los detalles.
                    <br />
                    <br />
                    Si deseas reactivar tu suscripción en el futuro, escríbenos
                    a{" "}
                    <strong style={{ color: "#93c5fd" }}>
                      soporte.herrsoft@gmail.com
                    </strong>
                    . ¡Gracias por haber sido parte de HerrSoft! 💙
                  </p>
                  <div className="mcd-actions mcd-actions--center">
                    <button
                      type="button"
                      className="mcd-btn mcd-btn--primary"
                      onClick={() => { resetDelete(); navigate("/login"); }}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
