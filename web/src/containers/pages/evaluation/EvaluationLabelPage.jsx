import React, { useState } from "react";
import { Upload } from "antd";
import {
  InboxOutlined,
  FileZipOutlined,
  FileTextOutlined,
  CloseOutlined,
  CheckCircleFilled,
  LoadingOutlined,
} from "@ant-design/icons";
import { EVALUATION_PATH as PATH } from "../../../redux/utils";
import AppToast from "../../../components/toasts/toastDark";
import logoEvaluation from "../../../assets/img/logo_evaluation.webp";

const { Dragger } = Upload;

const MAX_ZIP_SIZE_MB = 1024;
const MAX_CSV_SIZE_MB = 100;
const ZIP_MIME_TYPES = ["application/zip", "application/x-zip-compressed", "application/x-zip", ""];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

function FileChip({ icon, file, onRemove, removeLabel }) {
  return (
    <div className="evaluation-file-chip">
      {icon}
      <div className="evaluation-file-chip-info">
        <span className="evaluation-file-chip-name" title={file.name}>
          {file.name}
        </span>
        <span className="evaluation-file-chip-meta">{formatBytes(file.size)}</span>
      </div>
      <button
        type="button"
        className="evaluation-file-chip-remove"
        onClick={onRemove}
        aria-label={removeLabel}
      >
        <CloseOutlined />
      </button>
    </div>
  );
}

export default function EvaluationLabelPage() {
  const [zipFile, setZipFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };

  const validateZip = (file) => {
    const isZip = file.name.toLowerCase().endsWith(".zip") && ZIP_MIME_TYPES.includes(file.type);
    if (!isZip) {
      toast("The dataset must be a .zip file");
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > MAX_ZIP_SIZE_MB) {
      toast(`The .zip can't exceed ${MAX_ZIP_SIZE_MB} MB`);
      return Upload.LIST_IGNORE;
    }
    setZipFile(file);
    return false;
  };

  const validateCsv = (file) => {
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      toast("Labels must be a .csv file");
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > MAX_CSV_SIZE_MB) {
      toast(`The .csv can't exceed ${MAX_CSV_SIZE_MB} MB`);
      return Upload.LIST_IGNORE;
    }
    setCsvFile(file);
    return false;
  };

  const canSubmit = !!zipFile && !!csvFile && !submitting;

  const extractErrorMessage = (data) => {
    const detail = data?.detail;
    if (!detail) return "The dataset could not be imported";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail.missing)) {
      return `${detail.message} (${detail.missing.slice(0, 5).join(", ")}${detail.missing.length > 5 ? "…" : ""})`;
    }
    if (Array.isArray(detail.errors)) {
      return `${detail.message}: ${detail.errors.slice(0, 3).join(" · ")}`;
    }
    return detail.message || "The dataset could not be imported";
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("dataset_zip", zipFile);
      formData.append("labels_csv", csvFile);

      const res = await fetch(`${PATH}/evaluation/label/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(extractErrorMessage(data));
      }

      toast(
        `Imported ${data.inserted} new records` +
          (data.skipped_count ? ` · ${data.skipped_count} already existed` : "")
      );
      setZipFile(null);
      setCsvFile(null);
    } catch (err) {
      toast(err.message || "Error importing the dataset");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="evaluation-card">
      <h1 className="evaluation-title">Label</h1>
      <p className="evaluation-subtitle">
        Upload the dataset to evaluate: the file package (.zip) and its labels (.csv).
      </p>

      <div className="evaluation-upload-grid">
        <div className="evaluation-upload-col">
          <span className="evaluation-upload-label">Dataset (.zip)</span>
          {zipFile ? (
            <FileChip
              file={zipFile}
              icon={<FileZipOutlined className="evaluation-file-chip-icon" />}
              onRemove={() => setZipFile(null)}
              removeLabel="Remove dataset"
            />
          ) : (
            <Dragger
              accept=".zip"
              multiple={false}
              showUploadList={false}
              beforeUpload={validateZip}
              disabled={submitting}
              className="evaluation-dragger"
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="evaluation-dragger-text">Drag the dataset .zip here</p>
              <p className="evaluation-dragger-hint">or click to select · up to {MAX_ZIP_SIZE_MB} MB</p>
            </Dragger>
          )}
        </div>

        <div className="evaluation-upload-col">
          <span className="evaluation-upload-label">Labels (.csv)</span>
          {csvFile ? (
            <FileChip
              file={csvFile}
              icon={<FileTextOutlined className="evaluation-file-chip-icon" />}
              onRemove={() => setCsvFile(null)}
              removeLabel="Remove labels"
            />
          ) : (
            <Dragger
              accept=".csv"
              multiple={false}
              showUploadList={false}
              beforeUpload={validateCsv}
              disabled={submitting}
              className="evaluation-dragger"
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="evaluation-dragger-text">Drag the labels .csv here</p>
              <p className="evaluation-dragger-hint">or click to select · up to {MAX_CSV_SIZE_MB} MB</p>
            </Dragger>
          )}
        </div>
      </div>

      <div className="evaluation-upload-footer">
        <span className="evaluation-upload-status">
          {canSubmit ? (
            <>
              <CheckCircleFilled style={{ color: "#22c55e" }} /> Ready to upload
            </>
          ) : (
            "Select the .zip and .csv to continue"
          )}
        </span>
        <button
          type="button"
          className="evaluation-btn"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting && <LoadingOutlined />}
          {submitting ? "Uploading…" : "Upload dataset"}
        </button>
      </div>

      <AppToast show={showToast} setShow={setShowToast} msg={toastMsg} logo={logoEvaluation} />
    </div>
  );
}
