import React, { useEffect, useRef, useState } from "react";
import { Select, Input, Progress } from "antd";
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  RotateRightOutlined,
  SwapOutlined,
  UndoOutlined,
  DownloadOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { EVALUATION_PATH as PATH } from "../../../redux/utils";
import AppToast from "../../../components/toasts/toastDark";
import logoEvaluation from "../../../assets/img/logo_evaluation.webp";
import { clearEvaluationSession, evaluationAuthHeader } from "../../../utils/evaluationAuth";

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

const { TextArea } = Input;

const CLASSIFICATIONS = [
  { value: "", label: "Select an option" },
  { value: "NF", label: "Normal Fundus" },
  { value: "TF", label: "Tessellated Fundus" },
  { value: "CA", label: "Choroidal Diffuse Atrophy" },
  { value: "PA", label: "Patchy Atrophy" },
];

export default function EvaluationEvaluationPage() {
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [classification, setClassification] = useState("");
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState({});
  const [imgLoaded, setImgLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [saving, setSaving] = useState(false);

  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [imagesRes, minesRes] = await Promise.all([
        fetch(`${PATH}/evaluation/images`),
        fetch(`${PATH}/evaluation/evaluations/mine`, { headers: evaluationAuthHeader() }),
      ]);

      if (minesRes.status === 401) {
        clearEvaluationSession();
        navigate("/evaluation/login");
        return;
      }

      const imagesData = await imagesRes.json().catch(() => ({}));
      if (!imagesRes.ok) throw new Error(imagesData?.detail || "The dataset could not be loaded");
      const loadedImages = Array.isArray(imagesData.images) ? imagesData.images : [];

      const minesData = await minesRes.json().catch(() => ({}));
      const previousAnswers = {};
      if (minesRes.ok && Array.isArray(minesData.evaluations)) {
        minesData.evaluations.forEach((ev) => {
          previousAnswers[ev.id_retinal_image] = {
            classification: ev.classification,
            notes: ev.notes,
          };
        });
      }

      const resumeIndex = loadedImages.findIndex((img) => !previousAnswers[img.id_retinal_image]);

      setImages(loadedImages);
      setAnswers(previousAnswers);
      setCurrentIndex(resumeIndex === -1 ? loadedImages.length : resumeIndex);
    } catch (err) {
      setError(err.message || "The dataset could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const img = images[currentIndex];
    const saved = img ? answers[img.id_retinal_image] : undefined;
    setClassification(saved ? saved.classification : "");
    setNotes(saved ? saved.notes : "");
    setImgLoaded(false);
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setPan({ x: 0, y: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, images]);

  const total = images.length;
  const current = images[currentIndex];
  const isDone = total > 0 && currentIndex >= total;

  const saveCurrentAnswer = () => {
    if (!current) return;
    setAnswers((prev) => ({
      ...prev,
      [current.id_retinal_image]: { classification, notes },
    }));
  };

  const handleNext = async () => {
    if (!classification) {
      toast("Select a classification before continuing");
      return;
    }
    if (!current || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${PATH}/evaluation/evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...evaluationAuthHeader() },
        body: JSON.stringify({
          id_retinal_image: current.id_retinal_image,
          classification,
          notes,
        }),
      });
      if (res.status === 401) {
        clearEvaluationSession();
        navigate("/evaluation/login");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.detail === "string" ? data.detail : "Could not save your answer");
      }
      saveCurrentAnswer();
      setCurrentIndex((i) => i + 1);
    } catch (err) {
      toast(err.message || "Could not save your answer");
    } finally {
      setSaving(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex === 0) return;
    saveCurrentAnswer();
    setCurrentIndex((i) => i - 1);
  };

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () =>
    setZoom((z) => {
      const next = Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2));
      if (next === ZOOM_MIN) setPan({ x: 0, y: 0 });
      return next;
    });
  const rotate = () => setRotation((r) => (r + 90) % 360);
  const toggleFlip = () => setFlipH((f) => !f);
  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setPan({ x: 0, y: 0 });
  };

  const handleImageMouseDown = (e) => {
    if (zoom <= ZOOM_MIN) return;
    setDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const handleImageMouseMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({ x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy });
  };
  const handleImageMouseUp = () => setDragging(false);

  const handleDownload = async () => {
    const url = `${PATH}/uploads/evaluation/retinal_images/${current.name}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = current.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="evaluation-card">
        <p className="evaluation-subtitle">Loading dataset…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="evaluation-card">
        <h1 className="evaluation-title">Evaluation</h1>
        <p className="evaluation-subtitle">{error}</p>
        <button type="button" className="evaluation-btn" onClick={loadData}>
          Retry
        </button>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="evaluation-card">
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
      <div className="evaluation-card">
        <h1 className="evaluation-title">Evaluation complete</h1>
        <p className="evaluation-subtitle">
          You evaluated all {total} images in the dataset. Thank you.
        </p>
        <button
          type="button"
          className="evaluation-btn evaluation-btn-secondary"
          onClick={() => setCurrentIndex(total - 1)}
        >
          ← Back
        </button>
      </div>
    );
  }

  const percent = Math.round((currentIndex / total) * 100);

  return (
    <div className="evaluation-eval-screen">
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
          <div className="evaluation-eval-toolbar">
            <button type="button" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} title="Zoom out">
              <ZoomOutOutlined />
            </button>
            <span className="evaluation-eval-zoom-label">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} title="Zoom in">
              <ZoomInOutlined />
            </button>
            <span className="evaluation-eval-toolbar-sep" />
            <button type="button" onClick={rotate} title="Rotate 90°">
              <RotateRightOutlined />
            </button>
            <button
              type="button"
              className={flipH ? "is-active" : undefined}
              onClick={toggleFlip}
              title="Flip horizontal"
            >
              <SwapOutlined />
            </button>
            <span className="evaluation-eval-toolbar-sep" />
            <button type="button" onClick={resetView} title="Reset view">
              <UndoOutlined />
            </button>
            <button type="button" onClick={handleDownload} title="Download image">
              <DownloadOutlined />
            </button>
          </div>

          <div
            className="evaluation-eval-image-stage"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              cursor: zoom > ZOOM_MIN ? (dragging ? "grabbing" : "grab") : "default",
            }}
            onMouseDown={handleImageMouseDown}
            onMouseMove={handleImageMouseMove}
            onMouseUp={handleImageMouseUp}
            onMouseLeave={handleImageMouseUp}
          >
            <img
              key={current.id_retinal_image}
              src={`${PATH}/uploads/evaluation/retinal_images/${current.name}`}
              alt="Retinal fundus"
              className="evaluation-eval-image"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onLoad={() => setImgLoaded(true)}
              style={{ transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})` }}
            />
          </div>
        </div>

        <div className="evaluation-eval-form">
          <div className="evaluation-form-group">
            <label className="evaluation-form-label">Classification</label>
            <Select
              className="evaluation-select"
              popupClassName="evaluation-select-dropdown"
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
            <button
              type="button"
              className="evaluation-btn evaluation-btn-secondary"
              onClick={handlePrevious}
              disabled={currentIndex === 0 || saving}
            >
              ← Back
            </button>
            <button type="button" className="evaluation-btn" onClick={handleNext} disabled={saving}>
              {saving && <LoadingOutlined />}
              {saving ? "Saving…" : "Next →"}
            </button>
          </div>
        </div>
      </div>

      <AppToast show={showToast} setShow={setShowToast} msg={toastMsg} logo={logoEvaluation} />
    </div>
  );
}
