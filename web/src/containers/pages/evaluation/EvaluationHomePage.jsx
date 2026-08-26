import React from "react";
import { Link } from "react-router-dom";

export default function EvaluationHomePage() {
  return (
    <div className="evaluation-card">
      <h1 className="evaluation-title">Evaluation</h1>
      <p className="evaluation-subtitle">Get started in Label.</p>
      <Link to="/evaluation/label" className="evaluation-btn">
        Go to Label
      </Link>
    </div>
  );
}
