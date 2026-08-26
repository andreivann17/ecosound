import React from "react";
import { Modal, Button } from "antd";
import { getFileType } from "../helpers";
import { FileIcon } from "../FileIcon";

export default function ViewerDocModal({ viewerDoc, setViewerDoc, getDocUrl }) {
  return (
    <Modal
      open={!!viewerDoc}
      onCancel={() => setViewerDoc(null)}
      footer={null}
      title={viewerDoc?.filename}
      centered
      width="90vw"
      style={{ maxWidth: 1100 }}
      bodyStyle={{ padding: 0, height: "82vh" }}
      destroyOnClose
      classNames={{ content: "ev-viewer-modal" }}
    >
      {viewerDoc && (() => {
        const type = getFileType(viewerDoc.filename);
        const url = getDocUrl(viewerDoc);
        if (type === "pdf") {
          return (
            <iframe
              src={url}
              title={viewerDoc.filename}
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          );
        }
        if (type === "image") {
          return (
            <div style={{
              height: "100%", display: "flex",
              alignItems: "center", justifyContent: "center",
              background: "#111", overflow: "auto",
            }}>
              <img
                src={url}
                alt={viewerDoc.filename}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            </div>
          );
        }
        return (
          <div style={{
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 16,
          }}>
            <FileIcon filename={viewerDoc.filename} size={64} />
            <p style={{ color: "#595c5e", fontSize: 14 }}>
              Vista previa no disponible para este tipo de archivo.
            </p>
            <a href={url} download={viewerDoc.filename}>
              <Button type="primary" style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}>
                Descargar archivo
              </Button>
            </a>
          </div>
        );
      })()}
    </Modal>
  );
}
