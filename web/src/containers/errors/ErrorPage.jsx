import React from "react";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import "../../assets/css/errorPages.css";

export default function ErrorPage({
  code,
  title,
  description,
  color,
  icon,
  primaryAction,
  secondaryAction,
}) {
  const navigate = useNavigate();

  return (
    <div className="error-page">
      <div className="error-page__card" data-code={code} style={{ color }}>
        <div className="error-page__bar" style={{ background: color }} />

        <span className="error-page__icon">{icon}</span>

        <p className="error-page__code-label" style={{ color }}>
          Error {code}
        </p>

        <h1 className="error-page__title">{title}</h1>
        <p className="error-page__desc">{description}</p>

        <div className="error-page__actions">
          {primaryAction && (
            <Button
              className="error-page__btn-primary"
              style={{ background: color }}
              onClick={() => navigate(primaryAction.path)}
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              className="error-page__btn-secondary"
              onClick={() =>
                secondaryAction.path
                  ? navigate(secondaryAction.path)
                  : window.history.back()
              }
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
