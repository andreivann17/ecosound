import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LoadingOutlined } from "@ant-design/icons";
import { EVALUATION_PATH as PATH } from "../../../redux/utils";
import { setEvaluationSession } from "../../../utils/evaluationAuth";
import AppToast from "../../../components/toasts/toastDark";
import logoEvaluation from "../../../assets/img/logo_evaluation.webp";

function extractDetailMessage(data, fallback) {
  const detail = data?.detail;
  if (!detail) return fallback;
  return typeof detail === "string" ? detail : detail.message || fallback;
}

export default function EvaluationSignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast("Fill in your name, email and password");
      return;
    }
    if (password.length < 6) {
      toast("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${PATH}/evaluation/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(extractDetailMessage(data, "Could not create the account"));
      setEvaluationSession(data.access_token, data.evaluator);
      navigate("/evaluation/evaluation");
    } catch (err) {
      toast(err.message || "Could not create the account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="evaluation-card evaluation-auth-card">
      <h1 className="evaluation-title">Create account</h1>
      <p className="evaluation-subtitle">Sign up to start evaluating images.</p>

      <form className="evaluation-auth-form" onSubmit={handleSubmit}>
        <div className="evaluation-form-group">
          <label className="evaluation-form-label">Full name</label>
          <input
            type="text"
            className="evaluation-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <div className="evaluation-form-group">
          <label className="evaluation-form-label">Email</label>
          <input
            type="email"
            className="evaluation-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="evaluation-form-group">
          <label className="evaluation-form-label">Password</label>
          <input
            type="password"
            className="evaluation-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="evaluation-form-group">
          <label className="evaluation-form-label">Confirm password</label>
          <input
            type="password"
            className="evaluation-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          className="evaluation-btn evaluation-auth-submit"
          disabled={submitting}
        >
          {submitting && <LoadingOutlined />}
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="evaluation-auth-switch">
        Already have an account? <Link to="/evaluation/login">Sign in</Link>
      </p>

      <AppToast show={showToast} setShow={setShowToast} msg={toastMsg} logo={logoEvaluation} />
    </div>
  );
}
