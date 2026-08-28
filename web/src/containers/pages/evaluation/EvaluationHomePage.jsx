import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClockCircleOutlined, CheckCircleOutlined, PictureOutlined } from "@ant-design/icons";
import { PATH } from "../../../redux/utils";
import { evaluationAuthHeader, getEvaluationEvaluator } from "../../../utils/evaluationAuth";

export default function EvaluationHomePage() {
  const evaluator = getEvaluationEvaluator();
  const firstName = (evaluator?.name || "").trim().split(/\s+/)[0] || "";

  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [imagesRes, mineRes] = await Promise.all([
          fetch(`${PATH}/evaluation/images`),
          fetch(`${PATH}/evaluation/evaluations/mine`, { headers: evaluationAuthHeader() }),
        ]);
        const imagesData = await imagesRes.json().catch(() => ({}));
        const mineData = await mineRes.json().catch(() => ({}));
        if (!cancelled) {
          setTotal(typeof imagesData.total === "number" ? imagesData.total : (imagesData.images || []).length);
          setDone(Array.isArray(mineData.evaluations) ? mineData.evaluations.length : 0);
        }
      } catch {
        // se muestran los valores por defecto (0)
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pending = Math.max(total - done, 0);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="evaluation-home">
      <div className="evaluation-home-greeting">
        <h1 className="evaluation-title">{firstName ? `Hi, ${firstName}` : "Welcome"}</h1>
        <p className="evaluation-subtitle">Here's your progress so far.</p>
      </div>

      <div className="evaluation-home-progress">
        <div className="evaluation-home-progress-label">
          <span>Overall progress</span>
          <strong>{loading ? "…" : `${percent}%`}</strong>
        </div>
        <div className="evaluation-home-progress-bar">
          <div className="evaluation-home-progress-fill" style={{ width: `${loading ? 0 : percent}%` }} />
        </div>
      </div>

      <div className="evaluation-home-stats">
        <div className="evaluation-stat-card evaluation-stat-card--pending">
          <span className="evaluation-stat-card-icon">
            <ClockCircleOutlined />
          </span>
          <span className="evaluation-stat-card-text">
            <span className="evaluation-stat-card-value">{loading ? "…" : pending}</span>
            <span className="evaluation-stat-card-label">Images pending</span>
          </span>
        </div>

        <div className="evaluation-stat-card evaluation-stat-card--done">
          <span className="evaluation-stat-card-icon">
            <CheckCircleOutlined />
          </span>
          <span className="evaluation-stat-card-text">
            <span className="evaluation-stat-card-value">{loading ? "…" : done}</span>
            <span className="evaluation-stat-card-label">Images labeled</span>
          </span>
        </div>
      </div>

      <div className="evaluation-home-actions">
        <Link to="/evaluation/evaluation" className="evaluation-btn">
          Go to evaluation
        </Link>
      </div>

      <div className="evaluation-home-total">
        <div className="evaluation-stat-card evaluation-stat-card--total">
          <span className="evaluation-stat-card-icon">
            <PictureOutlined />
          </span>
          <span className="evaluation-stat-card-text">
            <span className="evaluation-stat-card-value">{loading ? "…" : total}</span>
            <span className="evaluation-stat-card-label">Total images in dataset</span>
          </span>
        </div>
      </div>
    </div>
  );
}
