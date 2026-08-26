import React from "react";
import { Button, Spin, Tooltip } from "antd";
import { FolderOpenOutlined, UploadOutlined, EyeOutlined, DeleteOutlined } from "@ant-design/icons";
import { getFileType } from "../helpers";
import { FileIcon } from "../FileIcon";

export default function DocumentosTab({
  loadingDocs,
  docInputRef,
  handleUploadDoc,
  uploadingDoc,
  documentos,
  getDocUrl,
  setViewerDoc,
  handleDeleteDoc,
}) {
  return (
    <div className="cd-card">
      <div className="cd-pagos-header">
        <div className="cd-pagos-header-left">
          <div className="cd-card-icon-wrap"><FolderOpenOutlined /></div>
          <h2 className="cd-card-title">Documentos</h2>
        </div>
        <div>
          <input
            ref={docInputRef}
            type="file"
            accept="*"
            style={{ display: "none" }}
            onChange={(e) => handleUploadDoc(e.target.files[0])}
          />
          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={uploadingDoc}
            onClick={() => docInputRef.current?.click()}
            className="cd-btn-add-pago"
          >
            Subir documento
          </Button>
        </div>
      </div>

      {loadingDocs ? (
        <div className="cd-loading-wrap"><Spin size="large" /></div>
      ) : documentos.length === 0 ? (
        <div className="cd-empty-doc">
          <FolderOpenOutlined className="cd-empty-doc-icon" />
          <p className="cd-empty-doc-title">Sin documentos</p>
          <p className="cd-empty-doc-sub">
            Sube documentos adjuntos al evento: fotos, archivos, etc.
          </p>
        </div>
      ) : (
        <div className="cd-docs-grid">
          {documentos.map((doc) => (
            <div key={doc.id} className="cd-doc-card">
              <div
                className="cd-doc-card-preview"
                onClick={() => setViewerDoc(doc)}
              >
                {getFileType(doc.filename) === "image" ? (
                  <img
                    src={getDocUrl(doc)}
                    alt={doc.filename}
                    className="cd-doc-thumb"
                  />
                ) : (
                  <div className="cd-doc-icon-wrap">
                    <FileIcon filename={doc.filename} size={40} />
                  </div>
                )}
                <div className="cd-doc-overlay">
                  <EyeOutlined />
                  <span>Ver</span>
                </div>
              </div>
              <div className="cd-doc-card-footer">
                <Tooltip title={doc.filename}>
                  <span className="cd-doc-name">{doc.filename}</span>
                </Tooltip>
                <button
                  className="cd-doc-delete-btn"
                  onClick={() => handleDeleteDoc(doc)}
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
