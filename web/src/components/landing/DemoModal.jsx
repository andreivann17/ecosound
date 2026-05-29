import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { API_URL } from "../../api";

const WHATSAPP_NUMBER = "521XXXXXXXXXX"; // 👈 actualiza
const EMPTY = { negocio: "", responsable: "", correo: "", celular: "" };

export default function DemoModal({ open, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  // success: null | { via: "correo" | "whatsapp" }
  const [success, setSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg("");
  };

  const validate = () => {
    const { negocio, responsable, correo, celular } = form;
    if (!negocio.trim() || !responsable.trim() || !correo.trim() || !celular.trim()) {
      setErrorMsg("Por favor completa todos los campos.");
      return false;
    }
    return true;
  };

  const saveContacto = async (via) => {
    const { negocio, responsable, correo, celular } = form;
    await axios.post(`${API_URL}/contacto/demo`, {
      responsable,
      empresa: negocio,
      correo,
      celular,
      mensaje: "",
      zona: "",
      via,
    });
  };

  const handleClose = () => {
    // Reset todo al cerrar para que la próxima apertura inicie limpia.
    setForm(EMPTY);
    setSuccess(null);
    setErrorMsg("");
    setSending(false);
    onClose();
  };

  const handleSendWhatsapp = async () => {
    if (!validate() || sending) return;
    setSending(true);
    setErrorMsg("");
    try {
      await saveContacto("whatsapp");
      const { negocio, responsable, correo, celular } = form;
      const msg = [
        "Hola, quiero solicitar una demo.",
        "",
        `Negocio: ${negocio}`,
        `Responsable: ${responsable}`,
        `Correo: ${correo}`,
        `Celular: ${celular}`,
      ].join("\n");
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
      setSuccess({ via: "whatsapp" });
    } catch (_) {
      setErrorMsg("No se pudo enviar la solicitud. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };

  const handleSendEmail = async () => {
    if (!validate() || sending) return;
    setSending(true);
    setErrorMsg("");
    try {
      await saveContacto("correo");
      setSuccess({ via: "correo" });
    } catch (_) {
      setErrorMsg("No se pudo enviar la solicitud. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className="demo-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="demo-modal">
        <button className="demo-close" onClick={handleClose} aria-label="Cerrar">✕</button>

        {success ? (
          <div className="demo-success">
            <div className="demo-success-icon" aria-hidden="true">
              <svg viewBox="0 0 52 52" width="64" height="64">
                <circle className="demo-success-circle" cx="26" cy="26" r="24" />
                <path className="demo-success-check" d="M14 27 l8 8 l16 -18" />
              </svg>
            </div>
            <h2 className="demo-success-title">
              {success.via === "whatsapp"
                ? "¡Solicitud enviada!"
                : "¡Solicitud enviada con éxito!"}
            </h2>
            <p className="demo-success-subtitle">
              Recibimos tu información correctamente. Un miembro de nuestro equipo
              de soporte se pondrá en contacto contigo muy pronto.
            </p>
            <p className="demo-success-hint">
              {success.via === "whatsapp"
                ? "Te abrimos una conversación de WhatsApp en otra pestaña — ahí también podrás darnos seguimiento."
                : "Mientras tanto, revisa tu bandeja de entrada por si necesitamos más detalles."}
            </p>
            <button className="demo-btn-success" onClick={handleClose}>
              Listo
            </button>
          </div>
        ) : (
          <>
            <h2 className="demo-title">Solicita tu demo gratuita</h2>
            <p className="demo-subtitle">Te contactamos por WhatsApp o correo para mostrarte todo.</p>
            <div className="demo-form">
              <div className="demo-field">
                <label className="demo-label">Nombre de tu negocio o salón</label>
                <input className="demo-input" type="text" name="negocio" placeholder="Ej: Salón Las Palmas" value={form.negocio} onChange={handleChange} disabled={sending} />
              </div>
              <div className="demo-field">
                <label className="demo-label">Responsable</label>
                <input className="demo-input" type="text" name="responsable" placeholder="Nombre del responsable" value={form.responsable} onChange={handleChange} disabled={sending} />
              </div>
              <div className="demo-field">
                <label className="demo-label">Correo Electrónico</label>
                <input className="demo-input" type="email" name="correo" placeholder="tu@email.com" value={form.correo} onChange={handleChange} disabled={sending} />
              </div>
              <div className="demo-field">
                <label className="demo-label">Celular</label>
                <input className="demo-input" type="tel" name="celular" placeholder="(55) 1234-5678" value={form.celular} onChange={handleChange} disabled={sending} />
              </div>
            </div>

            {errorMsg && <div className="demo-error">{errorMsg}</div>}

            <button className="demo-btn-email" onClick={handleSendEmail} disabled={sending}>
              {sending ? (
                <>
                  <span className="demo-spinner" aria-hidden="true" />
                  Enviando…
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Enviar solicitud por correo
                </>
              )}
            </button>
            <button className="demo-btn-whatsapp" onClick={handleSendWhatsapp} disabled={sending}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Enviar solicitud por WhatsApp
            </button>
            <p className="demo-privacy">Al enviar este formulario, aceptas nuestra política de privacidad.</p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
