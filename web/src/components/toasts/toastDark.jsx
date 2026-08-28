import { Toast, ToastContainer } from "react-bootstrap";
import { CheckCircleFilled, CloseCircleFilled, CloseOutlined } from "@ant-design/icons";
import defaultLogo from "../../assets/img/logo_hersoft_event.webp";
import "./toastDark.css";

function AppToastDark({ show, setShow, msg, logo = defaultLogo }) {
  const isError = /error/i.test(msg || "");

  return (
    <ToastContainer position="bottom-end" className="dt-toast-container p-3">
      <Toast
        onClose={() => setShow(false)}
        show={show}
        delay={3000}
        autohide
        className={`dt-toast ${isError ? "dt-toast-error" : "dt-toast-success"}`}
      >
        <Toast.Body className="dt-toast-body">
          <span className="dt-toast-icon">
            <img src={logo} alt="" className="dt-toast-logo" />
            <span className="dt-toast-badge">
              {isError ? <CloseCircleFilled /> : <CheckCircleFilled />}
            </span>
          </span>
          <span className="dt-toast-msg">{msg}</span>
          <button
            type="button"
            className="dt-toast-close"
            onClick={() => setShow(false)}
            aria-label="Close"
          >
            <CloseOutlined />
          </button>
          <span className="dt-toast-progress" />
        </Toast.Body>
      </Toast>
    </ToastContainer>
  );
}

export default AppToastDark;
