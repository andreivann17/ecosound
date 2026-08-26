import { Toast, ToastContainer } from "react-bootstrap";
import { CheckCircleFilled, CloseCircleFilled, CloseOutlined } from "@ant-design/icons";
import logo from "../../assets/img/logo_hersoft_event.webp";
import "./toast.css";

function AppToast({ show, setShow, msg }) {
  const isError = /error/i.test(msg || "");

  return (
    <ToastContainer position="bottom-end" className="eh-toast-container p-3">
      <Toast
        onClose={() => setShow(false)}
        show={show}
        delay={3000}
        autohide
        className={`eh-toast ${isError ? "eh-toast-error" : "eh-toast-success"}`}
      >
        <Toast.Body className="eh-toast-body">
          <span className="eh-toast-icon">
            <img src={logo} alt="" className="eh-toast-logo" />
            <span className="eh-toast-badge">
              {isError ? <CloseCircleFilled /> : <CheckCircleFilled />}
            </span>
          </span>
          <span className="eh-toast-msg">{msg}</span>
          <button
            type="button"
            className="eh-toast-close"
            onClick={() => setShow(false)}
            aria-label="Cerrar"
          >
            <CloseOutlined />
          </button>
          <span className="eh-toast-progress" />
        </Toast.Body>
      </Toast>
    </ToastContainer>
  );
}

export default AppToast;
