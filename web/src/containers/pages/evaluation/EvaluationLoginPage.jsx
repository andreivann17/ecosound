import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LoadingOutlined } from "@ant-design/icons";
import { PATH } from "../../../redux/utils";
import { setEvaluationSession } from "../../../utils/evaluationAuth";
import AppToast from "../../../components/toasts/toastDark";
import logoEvaluation from "../../../assets/img/logo_evaluation.webp";

function extractDetailMessage(data, fallback) {
  const detail = data?.detail;
  if (!detail) return fallback;
  return typeof detail === "string" ? detail : detail.message || fallback;
}

export default function EvaluationLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast("Enter your email and password");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${PATH}/evaluation/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(extractDetailMessage(data, "Could not sign in"));
      setEvaluationSession(data.access_token, data.evaluator);
      navigate("/evaluation");
    } catch (err) {
      toast(err.message || "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="evaluation-card evaluation-auth-card">
      <h1 className="evaluation-title">Sign in</h1>
      <p className="evaluation-subtitle">Access the retinal evaluation tool.</p>

      <form className="evaluation-auth-form" onSubmit={handleSubmit}>
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
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="evaluation-btn evaluation-auth-submit"
          disabled={submitting}
        >
          {submitting && <LoadingOutlined />}
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="evaluation-auth-switch">
        Don&apos;t have an account? <Link to="/evaluation/signup">Create one</Link>
      </p>

      <AppToast show={showToast} setShow={setShowToast} msg={toastMsg} logo={logoEvaluation} />
    </div>
  );
}
