import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { notification, Button, Spin } from "antd";
import logo from "../../assets/img/logo.png";
import { actionLogin } from "../../redux/actions/login/login";
import { Form, FloatingLabel } from 'react-bootstrap';
import ModalOlvidar from "../../components/modals/modalOlvidarPassword";
import "../../assets/css/loginVoyager.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const passwordInput = useRef(null);
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

  const openNotification = (msg) => {
    notification.error({
      message: "Error",
      description: msg,
    });
  };

  const checkFields = () => {
    if (email.trim().length === 0 || password.trim().length === 0) {
openNotification("Please complete all fields correctly.");
      return false;
    }
    return true;
  };

  const callback = (token) => {
    navigate("/home");
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
            <img src={logo} alt="UABC logo" style={{ width: 140 }} />
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
    </div>

        </>
  );
}

export default Login;
