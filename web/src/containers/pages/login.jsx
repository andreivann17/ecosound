import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Button, Spin } from "antd";
import axios from "axios";
import logo from "../../assets/img/logo_hersom_event_2.webp";
import { logoUrlFromPath, readClaveCache, writeClaveCache } from "../../context/TemaContext";
import { PATH } from "../../redux/utils";
import { actionLogin } from "../../redux/actions/login/login";
import { Form, FloatingLabel } from 'react-bootstrap';
import ModalOlvidar from "../../components/modals/modalOlvidarPassword";
import { markShowChangeModal } from "../../components/modals/PostLoginChangeModal";
import Toast from "../../components/toasts/toast";
import "../../assets/css/loginVoyager.css";

function applyClaveVars(claveTema) {
  const root = document.documentElement;
  if (claveTema?.primary_button_color) {
    root.style.setProperty("--eh-primary-btn", claveTema.primary_button_color);
  }
  if (claveTema?.background_image) {
    root.style.setProperty(
      "--eh-login-bg-image",
      `url(${logoUrlFromPath(claveTema.background_image)})`
    );
  }
}

function clearClaveVars() {
  const root = document.documentElement;
  // --eh-login-bg-image es exclusiva de esta pantalla, siempre se limpia.
  root.style.removeProperty("--eh-login-bg-image");
  // --eh-primary-btn también la usa TemaContext para la app autenticada.
  // Si ya hay una sesión (login recién exitoso), NO la borres — TemaContext
  // ya la tomó/está por tomarla; borrarla aquí la dejaba en fábrica hasta
  // el próximo refresh.
  if (!localStorage.getItem("token")) {
    root.style.removeProperty("--eh-primary-btn");
  }
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const passwordInput = useRef(null);
  const { clave } = useParams();

  // /login es SIEMPRE de fábrica. Solo /:clave/login busca la marca de ese
  // cliente (colores, logo, imagen de fondo). Para que nunca se vea un
  // parpadeo "fábrica -> mi diseño" mientras responde el fetch, el estado
  // inicial ya arranca con lo último cacheado para esta clave (si existe) y
  // aplica las variables CSS de forma síncrona, antes del primer paint —
  // igual que se hace para la app autenticada.
  const [claveTema, setClaveTema] = useState(() => {
    const cached = readClaveCache(clave);
    if (cached?.plan_deluxe === 1) applyClaveVars(cached);
    return cached;
  });

  useEffect(() => {
    // Si no hay clave (o cambiamos de /:clave/login a /login sin recargar
    // la página), regresamos a fábrica de inmediato.
    if (!clave) {
      setClaveTema(null);
      return;
    }
    let cancelled = false;
    axios
      .get(`${PATH}/clientes/tema/publico/${encodeURIComponent(clave)}`)
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.plan_deluxe === 1) {
          setClaveTema(data);
          writeClaveCache(clave, data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [clave]);

  useEffect(() => {
    if (!claveTema) return;
    applyClaveVars(claveTema);
    return clearClaveVars;
  }, [claveTema]);

  const loginLogo = claveTema?.logo_login ? logoUrlFromPath(claveTema.logo_login) : logo;
const [showEmailOptions, setShowEmailOptions] = useState(false);

  const [show, setShow] = useState(false);
 const [email, setEmail] = useState("");
const [emailOptions, setEmailOptions] = useState([]);

useEffect(() => {
  try {
    const saved = JSON.parse(localStorage.getItem("email_history") || "[]");
    if (Array.isArray(saved)) setEmailOptions(saved);
  } catch {
    setEmailOptions([]);
  }
}, []);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [token,setToken]  = useState(localStorage.getItem("token"))
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };

  const openNotification = (msg) => {
    toast(msg);
  };

  const checkFields = () => {
    if (email.trim().length === 0 || password.trim().length === 0) {
openNotification("Please complete all fields correctly.");
      return false;
    }
    return true;
  };

  const callback = ({ mensaje_show } = {}) => {
    if (!mensaje_show) markShowChangeModal();
    navigate("/app/home");
  };

  const callbackError = (value) => {
    setLoading(false);
    openNotification(value);
  };

  const acceptButtonHandler = () => {
    if (!checkFields()) return;
    setLoading(true);
    const parametros = { email, password };
    dispatch(actionLogin(parametros, callback, callbackError));
  };

  const handleKeyDownemail = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      passwordInput.current?.focus();
    }
  };

  const handleKeyDownPassword = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      acceptButtonHandler();
    }
  };

  return (
    <>
    

    <div className="login-wrapper fade-in">
      <div className="login-container">
        <div className="login-left">
          <div className="text-center">
            <img src={loginLogo} alt="HerrSoft Events logo" style={{ width: 140 }} />
           <h2 className="login-title">Iniciar sesión</h2>
<p className="login-subtitle">Professional Management System</p>

          </div>

          <form className="login-form" noValidate >
  <FloatingLabel controlId="floatingInput" label="Email" className="mb-3">
<Form.Control
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  type="email"
  name="email"
  placeholder="user@ontiverosyasociados.com.mx"
  onKeyDown={handleKeyDownemail}
  aria-label="Email"
  onFocus={() => setShowEmailOptions(true)}
  onBlur={() => setTimeout(() => setShowEmailOptions(false), 120)}
/>



 {showEmailOptions && emailOptions.length > 0 && (
  <div className="email-options-box">
    {emailOptions
      .filter(opt =>
        opt.toLowerCase().includes(email.toLowerCase())
      )
      .map(opt => (
        <div
          key={opt}
          className="email-option-item"
          onMouseDown={() => {
            setEmail(opt);
            passwordInput.current?.focus();
          }}
        >
          {opt}
        </div>
      ))}
  </div>
)}



  </FloatingLabel>

  <FloatingLabel controlId="floatingPassword" label="Contraseña">
    <Form.Control
      onChange={(e) => setPassword(e.target.value)}
      type="password"
      name="password"
      placeholder="Contraseña"
      ref={passwordInput}
      onKeyDown={handleKeyDownPassword}
      aria-label="Password"
    />
  </FloatingLabel>

  <Button
    type="primary"
    block
    className="custom-button mt-3"
    onClick={acceptButtonHandler}
    disabled={loading}
  >
    {loading ? <Spin size="small" /> : "Iniciar sesión"}
  </Button>

  <div className="forgot-password-link">
    <span className="link-pointer" onClick={() => setShow(true)}>
    ¿Olvidaste tu contraseña?
    </span>
  </div>
</form>


        
        </div>

        <div className="login-right" role="presentation" />
      </div>

      <ModalOlvidar show={show} setShow={setShow} />

      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
    </div>

        </>
  );
}

export default Login;
