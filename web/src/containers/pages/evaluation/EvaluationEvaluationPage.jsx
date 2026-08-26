import React, { useEffect, useState } from "react";
import { Select, Input, Progress, message } from "antd";
import { Link } from "react-router-dom";
import { PATH } from "../../../redux/utils";

const { TextArea } = Input;

const CLASSIFICATIONS = [
  { value: "HF", label: "HF" },
  { value: "TF", label: "TF" },
  { value: "CA", label: "CA" },
  { value: "PA", label: "PA" },
];

export default function EvaluationEvaluationPage() {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [classification, setClassification] = useState(null);
  const [notes, setNotes] = useState("");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${PATH}/evaluation/images`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "The dataset could not be loaded");
      setImages(Array.isArray(data.images) ? data.images : []);
      setCurrentIndex(0);
    } catch (err) {
      setError(err.message || "The dataset could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  useEffect(() => {
    setClassification(null);
    setNotes("");
    setImgLoaded(false);
  }, [currentIndex]);

  const total = images.length;
  const current = images[currentIndex];
  const isDone = total > 0 && currentIndex >= total;

  const handleNext = () => {
    if (!classification) {
      message.warning("Select a classification before continuing");
      return;
    }
    setCurrentIndex((i) => i + 1);
  };

  if (loading) {
    return (
      <div className="evaluation-card evaluation-eval-card">
        <p className="evaluation-subtitle">Loading dataset…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="evaluation-card evaluation-eval-card">
        <h1 className="evaluation-title">Evaluation</h1>
        <p className="evaluation-subtitle">{error}</p>
        <button type="button" className="evaluation-btn" onClick={fetchImages}>
          Retry
        </button>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="evaluation-card evaluation-eval-card">
        <h1 className="evaluation-title">Evaluation</h1>
        <p className="evaluation-subtitle">
          No images have been uploaded yet. Upload the dataset in{" "}
          <Link to="/evaluation/label">Label</Link>.
        </p>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="evaluation-card evaluation-eval-card">
        <h1 className="evaluation-title">Evaluation complete</h1>
        <p className="evaluation-subtitle">
          You evaluated all {total} images in the dataset. Thank you.
        </p>
      </div>
    );
  }

  const percent = Math.round((currentIndex / total) * 100);

  return (
    <div className="evaluation-card evaluation-eval-card">
      <div className="evaluation-eval-progress">
        <span className="evaluation-eval-progress-label">
          Progress: {currentIndex + 1} / {total}
        </span>
        <Progress
          percent={percent}
          showInfo={false}
          strokeColor="var(--eh-primary-btn, #01369e)"
          trailColor="#232b35"
          className="evaluation-progress-bar"
        />
      </div>

      <div className="evaluation-eval-body">
        <div className={`evaluation-eval-image-frame${imgLoaded ? "" : " is-loading"}`}>
          <img
            key={current.id_retinal_image}
            src={`${PATH}/uploads/evaluation/retinal_images/${current.name}`}
            alt="Retinal fundus"
            className="evaluation-eval-image"
            onLoad={() => setImgLoaded(true)}
          />
        </div>

        <div className="evaluation-eval-form">
          <div className="evaluation-form-group">
            <label className="evaluation-form-label">Classification</label>
            <Select
              className="evaluation-select"
              popupClassName="evaluation-select-dropdown"
              placeholder="Select a classification"
              options={CLASSIFICATIONS}
              value={classification}
              onChange={setClassification}
            />
          </div>

          <div className="evaluation-form-group">
            <label className="evaluation-form-label">Notes (optional)</label>
            <TextArea
              className="evaluation-textarea"
              placeholder="Observations about the image…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </div>

          <div className="evaluation-eval-actions">
            <button type="button" className="evaluation-btn" onClick={handleNext}>
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
