import React, { useState } from "react";
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
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

const PLAN = {
  id: "herrsoft_events_basic",
  nombre: "Plan Único",
  producto: "Herrsoft Events",
  precio: 600,
  moneda: "MXN",
  bullets: [
    "Acceso completo a todos los módulos del sistema",
    "Soporte directo por WhatsApp y correo",
    "Sin contratos forzosos, cancela cuando quieras",
  ],
  features: [
    { label: "Precio mensual", value: "$600 MXN" },
    { label: "Acceso al sistema", value: "Completo" },
    { label: "Soporte", value: "WhatsApp y correo" },
    { label: "Permanencia", value: "Sin contrato" },
    { label: "Usuarios incluidos", value: "Ilimitados" },
    { label: "Reportes en PDF", value: "Incluidos" },
  ],
};

// ─── CHECKOUT FORM (dentro de Elements) ───────────────────────
function CheckoutForm({ form, onError, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    if (!accepted) {
      onError("Debes aceptar los términos para continuar.");
      return;
    }
    setSubmitting(true);
    onError("");
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/contratar?exito=1",
        receipt_email: form.email,
        payment_method_data: {
          billing_details: {
            name: form.nombre,
            email: form.email,
          },
        },
      },
      redirect: "if_required",
    });
    setSubmitting(false);
    if (error) {
      onError(error.message || "No se pudo procesar el pago.");
      return;
    }
    if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess();
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
            ${PLAN.precio}.00/mes <span>( antes de impuestos )</span>
          </div>
          <div className="ctp-resumen-plan">{PLAN.nombre}</div>
        </div>
      </div>

      <p className="ctp-tos">
        Al marcar la casilla a continuación, aceptas nuestros{" "}
        <a href="#" onClick={(e) => e.preventDefault()}>Términos de uso</a> y{" "}
        <a href="#" onClick={(e) => e.preventDefault()}>Política de privacidad</a>,
        y confirmas que eres mayor de 18 años. Herrsoft renovará automáticamente
        tu suscripción y te cobrará la cuota mensual (actualmente ${PLAN.precio}{" "}
        antes de impuestos) hasta que la canceles. Puedes cancelar en cualquier
        momento para evitar cargos futuros.
      </p>

      <label className="ctp-check">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
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

// Validación de correo: estructura local@dominio.tld con TLD de al menos 2 letras,
// sin espacios, sin puntos consecutivos y sin punto al inicio/fin de cada parte.
const EMAIL_REGEX =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

function isValidEmail(value) {
  const email = value.trim();
  if (!email || email.length > 254) return false;
  if (!EMAIL_REGEX.test(email)) return false;
  if (email.includes("..")) return false;
  const [local, domain] = email.split("@");
  if (local.length > 64) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.startsWith("-"))
    return false;
  return true;
}

// ─── PÁGINA ───────────────────────────────────────────────────
export default function ContratarPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ nombre: "", email: "", empresa: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [clientSecret, setClientSecret] = useState(null);
  const [loadingIntent, setLoadingIntent] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errorMsg) setErrorMsg("");
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateStep1 = () => {
    const errors = {};
    if (!form.nombre.trim()) {
      errors.nombre = "Por favor ingresa tu nombre completo.";
    } else if (form.nombre.trim().length < 3) {
      errors.nombre = "El nombre debe tener al menos 3 caracteres.";
    }

    if (!form.email.trim()) {
      errors.email = "Por favor ingresa tu correo electrónico.";
    } else if (!isValidEmail(form.email)) {
      errors.email = "Ingresa un correo electrónico válido (ej. nombre@dominio.com).";
    }

    return errors;
  };

  const handleStep1Next = () => {
    const errors = validateStep1();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setErrorMsg("");
      return;
    }
    setForm((prev) => ({ ...prev, email: prev.email.trim() }));
    setErrorMsg("");
    setStep(2);
  };

  const handleStep2Next = async () => {
    setErrorMsg("");
    setLoadingIntent(true);
    try {
      const { data } = await axios.post(`${API_URL}/contratar/payment-intent`, {
        plan: PLAN.id,
        email: form.email,
        nombre: form.nombre,
        empresa: form.empresa,
      });
      if (!data?.clientSecret) {
        throw new Error("Respuesta inválida del servidor.");
      }
      setClientSecret(data.clientSecret);
      setStep(3);
    } catch (e) {
      setErrorMsg(
        "No se pudo iniciar el pago. Inténtalo de nuevo en unos momentos."
      );
    } finally {
      setLoadingIntent(false);
    }
  };

  return (
    <div className="ctp-root">
      <main className="ctp-main">
        {step === 1 && (
          <section className="ctp-section">
            <div className="ctp-check-circle">
              <svg viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="24" />
                <path d="M14 27 l8 8 l16 -18" />
              </svg>
            </div>
            <span className="ctp-step-label">
              Paso <b>1</b> de 3
            </span>
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
              <div className="ctp-field">
                <input
                  className={`ctp-input${fieldErrors.nombre ? " ctp-input--error" : ""}`}
                  type="text"
                  name="nombre"
                  placeholder="Nombre completo"
                  value={form.nombre}
                  onChange={handleChange}
                  aria-invalid={!!fieldErrors.nombre}
                />
                {fieldErrors.nombre && (
                  <span className="ctp-field-error">{fieldErrors.nombre}</span>
                )}
              </div>
              <div className="ctp-field">
                <input
                  className={`ctp-input${fieldErrors.email ? " ctp-input--error" : ""}`}
                  type="email"
                  name="email"
                  placeholder="Correo electrónico"
                  value={form.email}
                  onChange={handleChange}
                  aria-invalid={!!fieldErrors.email}
                />
                {fieldErrors.email && (
                  <span className="ctp-field-error">{fieldErrors.email}</span>
                )}
              </div>
              <div className="ctp-field">
                <input
                  className="ctp-input"
                  type="text"
                  name="empresa"
                  placeholder="Nombre de tu empresa o negocio (opcional)"
                  value={form.empresa}
                  onChange={handleChange}
                />
              </div>
            </div>

            {errorMsg && <div className="ctp-error">{errorMsg}</div>}

            <button className="ctp-cta" onClick={handleStep1Next}>
              Próximo
            </button>

            <button
              type="button"
              className="ctp-link-back"
              onClick={() => navigate("/")}
            >
              ← Volver al sitio
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="ctp-section ctp-section--wide">
            <span className="ctp-step-label">
              Paso <b>2</b> de 3
            </span>
            <h1 className="ctp-title-md">
              Elige el plan que mejor se adapta a ti.
            </h1>

            <div className="ctp-plans">
              <div className="ctp-plan ctp-plan--selected">
                <div className="ctp-plan-head">
                  <div className="ctp-plan-head-text">
                    <span className="ctp-plan-name">{PLAN.nombre}</span>
                    <span className="ctp-plan-prod">{PLAN.producto}</span>
                  </div>
                  <span className="ctp-plan-check" aria-hidden="true">✓</span>
                </div>
                <div className="ctp-plan-body">
                  {PLAN.features.map((f, i) => (
                    <div key={i} className="ctp-plan-row">
                      <span className="ctp-plan-row-label">{f.label}</span>
                      <span className="ctp-plan-row-value">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {errorMsg && <div className="ctp-error">{errorMsg}</div>}

            <div className="ctp-actions-row">
              <button
                type="button"
                className="ctp-link-back"
                onClick={() => setStep(1)}
              >
                ← Atrás
              </button>
              <button
                className="ctp-cta"
                onClick={handleStep2Next}
                disabled={loadingIntent}
              >
                {loadingIntent ? "Cargando…" : "Próximo"}
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="ctp-section">
            <button
              type="button"
              className="ctp-back-link"
              onClick={() => setStep(2)}
            >
              ‹ Cambiar plan
            </button>
            <span className="ctp-step-label">
              Paso <b>3</b> de 3
            </span>
            <h1 className="ctp-title">
              Configura tu tarjeta de crédito o débito.
            </h1>

            {!stripePromise && (
              <div className="ctp-error">
                Falta configurar la clave pública de Stripe
                (REACT_APP_STRIPE_PUBLISHABLE_KEY).
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
                    variables: {
                      colorPrimary: "#012770",
                      borderRadius: "10px",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                    },
                  },
                }}
              >
                <CheckoutForm
                  form={form}
                  onError={setErrorMsg}
                  onSuccess={() => setStep(4)}
                />
              </Elements>
            )}
          </section>
        )}

        {step === 4 && (
          <section className="ctp-section">
            <div className="ctp-check-circle ctp-check-circle--big">
              <svg viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="24" />
                <path d="M14 27 l8 8 l16 -18" />
              </svg>
            </div>
            <h1 className="ctp-title">¡Bienvenido a Herrsoft!</h1>
            <p className="ctp-success-text">
              Tu suscripción está activa. Pronto recibirás un correo en{" "}
              <b>{form.email}</b> con tus credenciales para acceder al sistema.
            </p>
            <button className="ctp-cta" onClick={() => navigate("/login")}>
              Ir al acceso
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
