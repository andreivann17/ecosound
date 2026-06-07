import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { API_URL } from "../../api";
import "../../assets/css/ContratarPage.css";

const STRIPE_PK = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";
const WHATSAPP_SUPPORT = "https://wa.me/526532091200?text=Hola%2C%20necesito%20ayuda%20con%20mi%20cuenta%20de%20HerrSoft%20Events.";
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

const PLANS = [
  {
    id: "herrsoft_events_mensual",
    nombre: "Plan Mensual",
    producto: "HerrSoft Events",
    precio: 550,
    moneda: "MXN",
    periodo: "/ mes",
    badge: "🎁 1 mes gratis al contratar",
    ahorro: null,
    trialDays: 30,
    bullets: [
      "Acceso completo a todos los módulos del sistema",
      "Soporte directo por WhatsApp y correo",
      "Sin contratos forzosos. Cancela cuando quieras.",
    ],
    features: [
      { label: "Precio",            value: "$550 MXN / mes" },
      { label: "Acceso al sistema", value: "Completo" },
      { label: "Soporte",           value: "WhatsApp y correo" },
      { label: "Usuarios",          value: "Ilimitados" },
      { label: "Reportes en PDF",   value: "Incluidos" },
    ],
  },
  {
    id: "herrsoft_events_anual",
    nombre: "Plan Anual",
    producto: "HerrSoft Events",
    precio: 5500,
    moneda: "MXN",
    periodo: "/ año",
    badge: "🎉 2 meses gratis",
    ahorro: "Ahorras $1,100 MXN al año",
    trialDays: 0,
    bullets: [
      "Acceso completo a todos los módulos del sistema",
      "Soporte directo por WhatsApp y correo",
      "Paga una vez y olvídate por todo el año",
    ],
    features: [
      { label: "Precio",            value: "$5,500 MXN / año" },
      { label: "Acceso al sistema", value: "Completo" },
      { label: "Soporte",           value: "WhatsApp y correo" },
      { label: "Usuarios",          value: "Ilimitados" },
      { label: "Reportes en PDF",   value: "Incluidos" },
    ],
  },
];

// Mantener compatibilidad con referencias a PLAN.precio en CheckoutForm
const PLAN = PLANS[0];

// ─── STEPPER ────────────────────────────────────────────────────
function StepStepper({ current }) {
  const steps = ["Cuenta", "Plan", "Pago"];
  return (
    <div className="ctp-stepper">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <React.Fragment key={i}>
            <div className={`ctp-stepper-item${active ? " ctp-stepper-active" : done ? " ctp-stepper-done" : ""}`}>
              <div className="ctp-stepper-circle">
                {done ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="3.5"
                       strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : num}
              </div>
              <span className="ctp-stepper-label">{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`ctp-stepper-line${done ? " ctp-stepper-line--done" : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── INDICADOR DE FUERZA DE CONTRASEÑA ──────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: "Débil",   color: "#ef4444", bars: 1 },
    { label: "Regular", color: "#f97316", bars: 2 },
    { label: "Buena",   color: "#eab308", bars: 3 },
    { label: "Fuerte",  color: "#22c55e", bars: 4 },
  ];
  const lvl = score <= 1 ? 0 : score <= 2 ? 1 : score <= 3 ? 2 : 3;
  const { label, color, bars } = levels[lvl];

  return (
    <div className="ctp-pwd-strength">
      <div className="ctp-pwd-bars">
        {[1, 2, 3, 4].map(b => (
          <div key={b} className="ctp-pwd-bar"
               style={{ background: b <= bars ? color : "#e5e7eb" }} />
        ))}
      </div>
      <span className="ctp-pwd-label" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── EMAIL REGEX ─────────────────────────────────────────────────
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
function isValidEmail(value) {
  const e = value.trim();
  if (!e || e.length > 254) return false;
  if (!EMAIL_REGEX.test(e)) return false;
  if (e.includes("..")) return false;
  const [local, domain] = e.split("@");
  if (local.length > 64) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.startsWith("-")) return false;
  return true;
}

// ─── HELPER: fechas de cobro (días fijos: 2 y 16) ───────────────
const MONTHS_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];
function _nextBilling() {
  const today = new Date();
  const day = today.getDate();
  return day <= 15
    ? new Date(today.getFullYear(), today.getMonth(), 16)
    : new Date(today.getFullYear(), today.getMonth() + 1, 2);
}
function firstChargeLabel() {
  const b = _nextBilling();
  return `${b.getDate()} de ${MONTHS_ES[b.getMonth()]} de ${b.getFullYear()}`;
}
function nextBillingDateISO() {
  const b = _nextBilling();
  const mm = String(b.getMonth() + 1).padStart(2, "0");
  const dd = String(b.getDate()).padStart(2, "0");
  return `${b.getFullYear()}-${mm}-${dd}`;
}

// ─── CHECKOUT FORM ───────────────────────────────────────────────
function CheckoutForm({ form, plan, stripeIds, onError, onSuccess }) {
  const intentType = stripeIds?.intentType || "payment";

  const _provisionPayload = (intent) => ({
    nombre:                    form.nombre,
    apellido:                  form.apellido,
    email:                     form.email,
    empresa:                   form.empresa || "",
    password:                  form.password,
    marketing:                 form.marketing || false,
    plan:                      (plan || PLAN).id,
    fecha_proxima_pago:        nextBillingDateISO(),
    stripe_subscription_id:    stripeIds?.subscriptionId  || null,
    stripe_customer_id:        stripeIds?.customerId      || null,
    stripe_payment_intent_id:  (typeof intent === "string" ? intent : intent?.id) || null,
    stripe_payment_method_id:  (typeof intent === "string" ? null : (intent?.payment_method || intent?.payment_method)) || null,
  });
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const _provision = async (intent) => {
    await axios.post(`${API_URL}/contratar/provision`, _provisionPayload(intent));
    onSuccess();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    if (!accepted) { onError("Debes aceptar los términos para continuar."); return; }
    setSubmitting(true);
    onError("");

    const commonParams = { billing_details: { name: form.nombre, email: form.email } };
    const returnUrl = window.location.origin + "/contratar?exito=1";

    // Trial → confirmSetup (guarda tarjeta sin cobrar)
    // Normal → confirmPayment (cobra ahora)
    const result = intentType === "setup"
      ? await stripe.confirmSetup({ elements, confirmParams: { return_url: returnUrl }, redirect: "if_required" })
      : await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl, receipt_email: form.email, payment_method_data: commonParams }, redirect: "if_required" });

    const { error } = result;
    const intent = result.setupIntent || result.paymentIntent;

    if (error) {
      const alreadyDone =
        (error.code === "payment_intent_unexpected_state" && error.payment_intent?.status === "succeeded") ||
        (error.code === "setup_intent_unexpected_state"   && error.setup_intent?.status   === "succeeded");
      if (alreadyDone) {
        try {
          await _provision(error.payment_intent || error.setup_intent);
        } catch (provErr) {
          const detail = provErr?.response?.data?.detail || "";
          onError(`Pago recibido pero error al crear cuenta${detail ? `: ${detail}` : ""}. Escríbenos a soporte.herrsoft@gmail.com.`);
        } finally { setSubmitting(false); }
        return;
      }
      setSubmitting(false);
      onError(error.message || "No se pudo procesar el pago.");
      return;
    }

    if (intent && (intent.status === "succeeded" || intent.status === "processing" || intentType === "setup")) {
      try {
        await _provision(intent);
      } catch (provErr) {
        const detail = provErr?.response?.data?.detail || "";
        onError(`Pago recibido pero error al crear cuenta${detail ? `: ${detail}` : ""}. Escríbenos a soporte.herrsoft@gmail.com.`);
      } finally { setSubmitting(false); }
    } else {
      setSubmitting(false);
    }
  };

  return (
    <form className="ctp-checkout-form" onSubmit={handleSubmit}>
      <div className="ctp-pay-icons" aria-hidden="true">
        <span className="ctp-pay-icon">VISA</span>
        <span className="ctp-pay-icon">MC</span>
        <span className="ctp-pay-icon">AMEX</span>
      </div>
      <div className="ctp-stripe-wrap">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <div className="ctp-resumen">
        <div>
          <div className="ctp-resumen-precio">
            ${(plan || PLAN).precio.toLocaleString("es-MX")}{(plan || PLAN).periodo}{" "}
            <span>( antes de impuestos )</span>
          </div>
          <div className="ctp-resumen-plan">{(plan || PLAN).nombre}</div>
        </div>
      </div>
      {(() => {
        const p = plan || PLAN;
        const trialDays = p.trialDays || 0;
        return (
          <div className="ctp-billing-notice">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {trialDays > 0 ? (
              <span>
                Tu primer cobro se realizará el <strong>{firstChargeLabel()}</strong>.
                {" "}Hoy no se te cobra nada.
              </span>
            ) : (
              <span>
                Tu primer cobro se realizará <strong>hoy</strong> al confirmar el pago.
              </span>
            )}
          </div>
        );
      })()}
      <p className="ctp-tos">
        Al marcar la casilla a continuación, aceptas nuestros{" "}
        <a href="/terminos" target="_blank" rel="noreferrer">Términos de uso</a> y{" "}
        <a href="/privacidad" target="_blank" rel="noreferrer">Política de privacidad</a>,
        y confirmas que eres mayor de 18 años. HerrSoft renovará automáticamente
        tu suscripción al término de cada período. Puedes cancelar en cualquier
        momento; sin embargo, se te cobrará el período completo contratado
        ({(plan || PLAN).nombre.toLowerCase()}) sin reembolso proporcional.
      </p>
      <label className="ctp-check">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>Estoy de acuerdo.</span>
      </label>
      <button type="submit" className="ctp-cta" disabled={!stripe || submitting}>
        {submitting ? "Procesando…" : "Iniciar membresía"}
      </button>
      <p className="ctp-protected">
        Esta página está protegida por Stripe para garantizar tu seguridad.
      </p>
    </form>
  );
}

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────
export default function ContratarPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nombre: "", apellido: "", email: "", empresa: "",
    password: "", confirmPassword: "", marketing: false,
  });
  const [errorMsg, setErrorMsg]       = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [clientSecret, setClientSecret]   = useState(null);
  const [stripeIds, setStripeIds]         = useState({ customerId: null, subscriptionId: null, intentType: "payment" });
  const [loadingIntent, setLoadingIntent]     = useState(false);
  const [submittingStep1, setSubmittingStep1] = useState(false);
  const [selectedPlan, setSelectedPlan]       = useState(PLANS[0]);

  // Verificación de correo (paso 1.5)
  const [verifyStep, setVerifyStep]           = useState(false);
  const [verifyCode, setVerifyCode]           = useState("");
  const [verifyError, setVerifyError]         = useState("");
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [resendSeconds, setResendSeconds]     = useState(0);
  const resendTimerRef = useRef(null);

  // Estado del correo en tiempo real
  const [emailStatus, setEmailStatus]   = useState(null); // null | "checking" | "ok" | "taken"
  const [emailTakenMsg, setEmailTakenMsg] = useState("");
  const emailDebounceRef = useRef(null);

  // AbortController para el payment-intent
  const abortRef            = useRef(null);
  const intentionalAbortRef = useRef(false);

  // ── Restaurar pantalla de éxito si el usuario refresca ────────
  useEffect(() => {
    const saved = sessionStorage.getItem("ctp_exito");
    if (saved) {
      try {
        const { nombre, email } = JSON.parse(saved);
        setForm(prev => ({ ...prev, nombre, email }));
        setStep(4);
      } catch {
        sessionStorage.removeItem("ctp_exito");
      }
    }
  }, []);

  // ── Verificación de correo en tiempo real ─────────────────────
  useEffect(() => {
    if (!isValidEmail(form.email)) {
      setEmailStatus(null);
      setEmailTakenMsg("");
      return;
    }
    setEmailStatus("checking");
    clearTimeout(emailDebounceRef.current);
    emailDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/contratar/check-email?email=${encodeURIComponent(form.email.trim())}`
        );
        if (data.available) {
          setEmailStatus("ok");
          setEmailTakenMsg("");
        } else {
          setEmailStatus("taken");
          setEmailTakenMsg(data.reason || "Este correo ya tiene una cuenta.");
        }
      } catch {
        setEmailStatus(null);
      }
    }, 600);
    return () => clearTimeout(emailDebounceRef.current);
  }, [form.email]);

  // ── Timer de reenvío ─────────────────────────────────────────
  useEffect(() => {
    if (resendSeconds <= 0) return;
    resendTimerRef.current = setTimeout(() => setResendSeconds(s => s - 1), 1000);
    return () => clearTimeout(resendTimerRef.current);
  }, [resendSeconds]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setForm(prev => ({ ...prev, [name]: val }));
    if (errorMsg) setErrorMsg("");
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    }
    if (name === "email") { setEmailStatus(null); setEmailTakenMsg(""); }
  };

  const validateStep1 = () => {
    const errors = {};
    if (!form.nombre.trim())               errors.nombre = "Por favor ingresa tu nombre.";
    else if (form.nombre.trim().length < 2) errors.nombre = "El nombre debe tener al menos 2 caracteres.";

    if (!form.apellido.trim())               errors.apellido = "Por favor ingresa tu apellido.";
    else if (form.apellido.trim().length < 2) errors.apellido = "El apellido debe tener al menos 2 caracteres.";

    if (!form.email.trim())          errors.email = "Por favor ingresa tu correo electrónico.";
    else if (!isValidEmail(form.email)) errors.email = "Ingresa un correo electrónico válido.";
    else if (emailStatus === "taken")    errors.email = emailTakenMsg;

    if (!form.password)              errors.password = "Por favor crea una contraseña.";
    else if (form.password.length < 8) errors.password = "La contraseña debe tener al menos 8 caracteres.";

    if (!form.confirmPassword)                     errors.confirmPassword = "Por favor confirma tu contraseña.";
    else if (form.password !== form.confirmPassword) errors.confirmPassword = "Las contraseñas no coinciden.";

    return errors;
  };

  const handleStep1Next = async () => {
    if (emailStatus === "checking") return;

    const errors = validateStep1();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) { setErrorMsg(""); return; }

    setSubmittingStep1(true);
    setErrorMsg("");

    // Verificar disponibilidad del correo si no lo tenemos aún
    if (emailStatus !== "ok") {
      try {
        const { data } = await axios.get(
          `${API_URL}/contratar/check-email?email=${encodeURIComponent(form.email.trim())}`
        );
        if (!data.available) {
          setFieldErrors(prev => ({ ...prev, email: data.reason || "Este correo ya tiene una cuenta." }));
          setEmailStatus("taken");
          setEmailTakenMsg(data.reason || "");
          setSubmittingStep1(false);
          return;
        }
        setEmailStatus("ok");
      } catch {
        // Si falla la verificación, continuar de todos modos
      }
    }

    // Enviar código de verificación al correo
    try {
      await axios.post(`${API_URL}/contratar/enviar-codigo-verificacion`, {
        email: form.email.trim(),
        nombre: form.nombre.trim(),
      });
    } catch {
      setErrorMsg("No se pudo enviar el código de verificación. Inténtalo de nuevo.");
      setSubmittingStep1(false);
      return;
    }

    setForm(prev => ({ ...prev, email: prev.email.trim() }));
    setSubmittingStep1(false);
    setVerifyCode("");
    setVerifyError("");
    setResendSeconds(60);
    setVerifyStep(true);
  };

  const handleVerifyCode = async () => {
    if (!verifyCode.trim()) { setVerifyError("Ingresa el código que te enviamos."); return; }
    if (verifyCode.trim().length !== 6) { setVerifyError("El código debe tener 6 dígitos."); return; }

    setVerifySubmitting(true);
    setVerifyError("");

    try {
      await axios.post(`${API_URL}/contratar/verificar-codigo`, {
        email: form.email,
        codigo: verifyCode.trim(),
      });
    } catch (e) {
      setVerifyError(e?.response?.data?.detail || "Código incorrecto. Inténtalo de nuevo.");
      setVerifySubmitting(false);
      return;
    }

    // Código correcto: guardar paso1 y avanzar
    try {
      await axios.post(`${API_URL}/contratar/guardar-paso1`, {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        empresa: form.empresa.trim(),
        password: form.password,
        marketing: form.marketing,
      });
    } catch {
      // No bloquear si falla
    }

    setVerifySubmitting(false);
    setVerifyStep(false);
    setStep(2);
  };

  const handleResendCode = async () => {
    if (resendSeconds > 0) return;
    try {
      await axios.post(`${API_URL}/contratar/enviar-codigo-verificacion`, {
        email: form.email,
        nombre: form.nombre.trim(),
      });
      setVerifyError("");
      setResendSeconds(60);
    } catch {
      setVerifyError("No se pudo reenviar el código. Inténtalo de nuevo.");
    }
  };

  const handleStep2Next = async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    setErrorMsg("");
    setLoadingIntent(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/contratar/payment-intent`,
        { plan: selectedPlan.id, email: form.email, nombre: form.nombre, empresa: form.empresa },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (!data?.clientSecret) throw new Error("Respuesta inválida del servidor.");
      setClientSecret(data.clientSecret);
      setStripeIds({ customerId: data.customerId || null, subscriptionId: data.subscriptionId || null, intentType: data.intentType || "payment" });
      setStep(3);
    } catch (e) {
      clearTimeout(timeoutId);
      if (axios.isCancel(e)) {
        if (!intentionalAbortRef.current)
          setErrorMsg("La solicitud tardó demasiado. Inténtalo de nuevo.");
        intentionalAbortRef.current = false;
      } else {
        setErrorMsg("No se pudo iniciar el pago. Inténtalo de nuevo en unos momentos.");
      }
    } finally {
      setLoadingIntent(false);
    }
  };

  const handleGoBackFromStep2 = () => {
    intentionalAbortRef.current = true;
    if (abortRef.current) abortRef.current.abort();
    setLoadingIntent(false);
    setErrorMsg("");
    setStep(1);
  };

  // Al regresar del paso 3 al 2, limpiar el clientSecret para que se genere
  // un nuevo PaymentIntent en el siguiente intento (evita el error "already succeeded")
  const handleGoBackFromStep3 = () => {
    setClientSecret(null);
    setStripeIds({ customerId: null, subscriptionId: null });
    setErrorMsg("");
    setStep(2);
  };

  const isStep1Loading = submittingStep1 || emailStatus === "checking";

  // Reinicia todo el flujo para contratar otra cuenta (misma o distinta)
  const handleContratarOtra = () => {
    sessionStorage.removeItem("ctp_exito");
    setForm({ nombre: "", apellido: "", email: "", empresa: "", password: "", confirmPassword: "", marketing: false });
    setClientSecret(null);
    setStripeIds({ customerId: null, subscriptionId: null, intentType: "payment" });
    setErrorMsg("");
    setFieldErrors({});
    setEmailStatus(null);
    setEmailTakenMsg("");
    setSelectedPlan(PLANS[0]);
    setVerifyStep(false);
    setVerifyCode("");
    setVerifyError("");
    setResendSeconds(0);
    setStep(1);
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="ctp-root">
      <main className="ctp-main">

        {/* ─── PASO 1: Crear cuenta ─── */}
        {step === 1 && !verifyStep && (
          <section className="ctp-section">
            <StepStepper current={1} />
            <h1 className="ctp-title">Crea tu cuenta</h1>

            <ul className="ctp-bullets">
              {PLAN.bullets.map((b, i) => (
                <li key={i}>
                  <span className="ctp-bullet-tick" aria-hidden="true">✓</span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="ctp-form">
              {/* Nombre */}
              <div className="ctp-names-row">
                <div className="ctp-field">
                  <input
                    className={`ctp-input${fieldErrors.nombre ? " ctp-input--error" : ""}`}
                    type="text" name="nombre" placeholder="Nombre(s)"
                    value={form.nombre} onChange={handleChange}
                  />
                  {fieldErrors.nombre && <span className="ctp-field-error">{fieldErrors.nombre}</span>}
                </div>
                <div className="ctp-field">
                  <input
                    className={`ctp-input${fieldErrors.apellido ? " ctp-input--error" : ""}`}
                    type="text" name="apellido" placeholder="Apellido(s)"
                    value={form.apellido} onChange={handleChange}
                  />
                  {fieldErrors.apellido && <span className="ctp-field-error">{fieldErrors.apellido}</span>}
                </div>
              </div>

              {/* Correo + indicador en tiempo real */}
              <div className="ctp-field">
                <input
                  className={`ctp-input${fieldErrors.email || emailStatus === "taken" ? " ctp-input--error" : ""}`}
                  type="email" name="email" placeholder="Correo electrónico"
                  value={form.email} onChange={handleChange}
                />
                {/* Indicador de estado debajo del input */}
                {!fieldErrors.email && emailStatus === "checking" && (
                  <div className="ctp-email-status ctp-email-status--checking">
                    <span className="ctp-email-spinner" />
                    Verificando disponibilidad…
                  </div>
                )}
                {!fieldErrors.email && emailStatus === "ok" && (
                  <div className="ctp-email-status ctp-email-status--ok">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Correo disponible
                  </div>
                )}
                {(fieldErrors.email || emailStatus === "taken") && (
                  <span className="ctp-field-error">
                    {fieldErrors.email || emailTakenMsg}
                  </span>
                )}
              </div>

              {/* Empresa */}
              <div className="ctp-field">
                <input
                  className="ctp-input" type="text" name="empresa"
                  placeholder="Nombre de tu empresa o negocio (opcional)"
                  value={form.empresa} onChange={handleChange}
                />
              </div>

              {/* Contraseña + barra de fuerza */}
              <div className="ctp-field">
                <input
                  className={`ctp-input${fieldErrors.password ? " ctp-input--error" : ""}`}
                  type="password" name="password"
                  placeholder="Contraseña (mínimo 8 caracteres)"
                  value={form.password} onChange={handleChange}
                />
                {form.password && <PasswordStrength password={form.password} />}
                {fieldErrors.password && <span className="ctp-field-error">{fieldErrors.password}</span>}
              </div>

              {/* Confirmar contraseña */}
              <div className="ctp-field">
                <input
                  className={`ctp-input${fieldErrors.confirmPassword ? " ctp-input--error" : ""}`}
                  type="password" name="confirmPassword"
                  placeholder="Confirmar contraseña"
                  value={form.confirmPassword} onChange={handleChange}
                />
                {fieldErrors.confirmPassword && (
                  <span className="ctp-field-error">{fieldErrors.confirmPassword}</span>
                )}
              </div>

              {/* Marketing opt-in (LFPDPPP) */}
              <label className="ctp-marketing">
                <input
                  type="checkbox" name="marketing"
                  checked={form.marketing} onChange={handleChange}
                />
                <span>
                  Acepto recibir novedades, actualizaciones y promociones de HerrSoft por correo electrónico.
                  Puedo cancelar en cualquier momento.
                </span>
              </label>
            </div>

            {errorMsg && <div className="ctp-error">{errorMsg}</div>}

            <button
              className="ctp-cta"
              onClick={handleStep1Next}
              disabled={isStep1Loading || emailStatus === "taken"}
            >
              {emailStatus === "checking" ? "Verificando…" : submittingStep1 ? "Guardando…" : "Próximo"}
            </button>

            <button type="button" className="ctp-link-back" onClick={() => navigate("/")}>
              ← Volver al sitio
            </button>
          </section>
        )}

        {/* ─── PASO 1.5: Verificar correo ─── */}
        {step === 1 && verifyStep && (
          <section className="ctp-section">
            <StepStepper current={1} />

            <div className="ctp-verify-icon">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                   stroke="#012770" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>

            <h1 className="ctp-title">Verifica tu correo</h1>
            <p className="ctp-verify-subtitle">
              Enviamos un código de 6 dígitos a<br />
              <strong>{form.email}</strong>
            </p>

            <div className="ctp-field" style={{ width: "100%", marginTop: "12px" }}>
              <input
                className={`ctp-input ctp-verify-code-input${verifyError ? " ctp-input--error" : ""}`}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setVerifyCode(val);
                  if (verifyError) setVerifyError("");
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleVerifyCode(); }}
                autoFocus
              />
              {verifyError && <span className="ctp-field-error">{verifyError}</span>}
            </div>

            <button
              className="ctp-cta"
              onClick={handleVerifyCode}
              disabled={verifySubmitting}
              style={{ marginTop: "8px" }}
            >
              {verifySubmitting ? "Verificando…" : "Confirmar código"}
            </button>

            <div className="ctp-verify-resend">
              {resendSeconds > 0 ? (
                <span className="ctp-verify-resend-timer">
                  Reenviar código en {resendSeconds}s
                </span>
              ) : (
                <button type="button" className="ctp-verify-resend-btn" onClick={handleResendCode}>
                  No recibí el código — Reenviar
                </button>
              )}
            </div>

            <button
              type="button"
              className="ctp-link-back"
              onClick={() => { setVerifyStep(false); setVerifyCode(""); setVerifyError(""); }}
            >
              ← Cambiar correo
            </button>
          </section>
        )}

        {/* ─── PASO 2: Elige plan ─── */}
        {step === 2 && (
          <section className="ctp-section ctp-section--wide">
            <StepStepper current={2} />
            <h1 className="ctp-title-md">Elige el plan que mejor se adapta a ti.</h1>

            <div className="ctp-plans ctp-plans--two">
              {PLANS.map((plan) => {
                const isSelected = selectedPlan.id === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`ctp-plan${isSelected ? " ctp-plan--selected" : ""}`}
                    onClick={() => setSelectedPlan(plan)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Badge promocional */}
                    {plan.badge && (
                      <div className={`ctp-plan-badge${plan.ahorro ? "" : " ctp-plan-badge--muted"}`}>
                        {plan.badge}
                      </div>
                    )}

                    <div className="ctp-plan-head">
                      <div className="ctp-plan-head-text">
                        <span className="ctp-plan-name">{plan.nombre}</span>
                        <span className="ctp-plan-prod">{plan.producto}</span>
                      </div>
                      <span className={`ctp-plan-check${isSelected ? "" : " ctp-plan-check--inactive"}`} aria-hidden="true">✓</span>
                    </div>

                    {/* Precio destacado */}
                    <div className="ctp-plan-precio-wrap">
                      <span className="ctp-plan-precio-num">
                        ${plan.precio.toLocaleString("es-MX")}
                      </span>
                      <span className="ctp-plan-precio-periodo">{plan.periodo}</span>
                    </div>

                    {/* Ahorro */}
                    {plan.ahorro && (
                      <div className="ctp-plan-ahorro">{plan.ahorro}</div>
                    )}

                    <div className="ctp-plan-body">
                      {plan.features.map((f, i) => (
                        <div key={i} className="ctp-plan-row">
                          <span className="ctp-plan-row-label">{f.label}</span>
                          <span className="ctp-plan-row-value">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {errorMsg && <div className="ctp-error">{errorMsg}</div>}

            <div className="ctp-actions-row">
              <button type="button" className="ctp-link-back" onClick={handleGoBackFromStep2}>
                ← Atrás
              </button>
              <button className="ctp-cta" onClick={handleStep2Next} disabled={loadingIntent}>
                {loadingIntent ? "Cargando…" : `Continuar con ${selectedPlan.nombre}`}
              </button>
            </div>
          </section>
        )}

        {/* ─── PASO 3: Pago ─── */}
        {step === 3 && (
          <section className="ctp-section">
            <button type="button" className="ctp-back-link" onClick={handleGoBackFromStep3}>
              ‹ Cambiar plan
            </button>
            <StepStepper current={3} />
            <h1 className="ctp-title">Configura tu tarjeta de crédito o débito.</h1>

            {!stripePromise && (
              <div className="ctp-error">
                Falta configurar la clave pública de Stripe (REACT_APP_STRIPE_PUBLISHABLE_KEY).
              </div>
            )}
            {errorMsg && <div className="ctp-error">{errorMsg}</div>}

            {stripePromise && clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: { colorPrimary: "#012770", borderRadius: "10px",
                                 fontFamily: "system-ui, -apple-system, sans-serif" },
                  },
                }}
              >
                <CheckoutForm
                  form={form}
                  plan={selectedPlan}
                  stripeIds={stripeIds}
                  onError={setErrorMsg}
                  onSuccess={() => {
                    sessionStorage.setItem("ctp_exito", JSON.stringify({
                      nombre: form.nombre,
                      email:  form.email,
                    }));
                    setStep(4);
                  }}
                />
              </Elements>
            )}
          </section>
        )}

        {/* ─── PASO 4: Bienvenida ─── */}
        {step === 4 && (
          <div className="ctw-root">
            <div className="ctw-hero">
              <div className="ctw-check">
                <svg viewBox="0 0 52 52" fill="none">
                  <circle cx="26" cy="26" r="24" stroke="#012770" strokeWidth="2.2" />
                  <path d="M14 27 l8 8 l16-18" stroke="#16a34a" strokeWidth="3"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="ctw-hero-title">
                ¡Todo listo{form.nombre ? `, ${form.nombre.split(" ")[0]}` : ""}!
              </h1>
              <p className="ctw-hero-sub">
                Tu cuenta en <strong>HerrSoft Events</strong> está activa.
                Te enviamos un correo a <strong>{form.email}</strong> con tus credenciales.
              </p>
            </div>

            <div className="ctw-divider">
              <span className="ctw-divider-label">Elige cómo acceder</span>
            </div>

            <div className="ctw-access-grid">
              <div className="ctw-access-card ctw-access-card--primary">
                <div className="ctw-card-icon ctw-card-icon--blue">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                  </svg>
                </div>
                <span className="ctw-card-tag">Recomendado</span>
                <h2 className="ctw-card-title">Acceso desde el navegador</h2>
                <p className="ctw-card-desc">
                  Entra al sistema desde cualquier navegador, en cualquier dispositivo.
                  Sin instalaciones. Siempre actualizado.
                </p>
                <a className="ctw-card-btn ctw-card-btn--primary"
                   href="https://herrsoft.com/login" target="_blank" rel="noreferrer"
                   onClick={() => sessionStorage.removeItem("ctp_exito")}>
                  Entrar al sistema
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              </div>

              <div className="ctw-access-card">
                <div className="ctw-card-icon ctw-card-icon--slate">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <span className="ctw-card-tag ctw-card-tag--gray">Opcional</span>
                <h2 className="ctw-card-title">App de escritorio</h2>
                <p className="ctw-card-desc">
                  Descarga la aplicación para Windows. Acceso directo desde tu escritorio,
                  sin abrir el navegador.
                </p>
                <a className="ctw-card-btn ctw-card-btn--outline"
                   href={`${API_URL}/contratar/descargar-app`} target="_blank" rel="noreferrer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Descargar para Windows
                </a>
              </div>
            </div>

            <div className="ctw-steps">
              <p className="ctw-steps-title">Próximos pasos</p>
              <ul className="ctw-steps-list">
                <li>
                  <span className="ctw-step-num">1</span>
                  <span>Revisa tu correo, te enviamos tus credenciales de acceso a <strong>{form.email}</strong>.</span>
                </li>
                <li>
                  <span className="ctw-step-num">2</span>
                  <span>Inicia sesión y personaliza tu perfil y configuración del sistema.</span>
                </li>
                <li>
                  <span className="ctw-step-num">3</span>
                  <span>Crea tu primer evento y empieza a gestionar tu operación desde el primer día.</span>
                </li>
              </ul>
            </div>

            <div className="ctw-support">
              <span className="ctw-support-label">¿Necesitas ayuda?</span>
              <a className="ctw-support-link" href={WHATSAPP_SUPPORT} target="_blank" rel="noreferrer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
              <a className="ctw-support-link" href="mailto:soporte.herrsoft@gmail.com">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                soporte.herrsoft@gmail.com
              </a>
            </div>

            <button type="button" className="ctp-link-back" onClick={handleContratarOtra}>
              ← Contratar otra cuenta
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
