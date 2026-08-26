import React from "react";
import { Button, Spin } from "antd";
import { FilePdfOutlined, UploadOutlined, LoadingOutlined } from "@ant-design/icons";

export default function EventoPdfTab({
  loadingDocs,
  pdfInputRef,
  handleUploadPdf,
  uploadingPdf,
  mainPdf,
  getDocUrl,
}) {
  return (
    <div className="cd-card">
      <div className="cd-pagos-header">
        <div className="cd-pagos-header-left">
          <div className="cd-card-icon-wrap"><FilePdfOutlined /></div>
          <h2 className="cd-card-title">Evento PDF</h2>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {loadingDocs ? (
            <Spin indicator={<LoadingOutlined />} />
          ) : (
            <>
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => handleUploadPdf(e.target.files[0])}
              />
              <Button
                icon={<UploadOutlined />}
                loading={uploadingPdf}
                onClick={() => pdfInputRef.current?.click()}
                className="cd-btn-upload"
              >
                {mainPdf ? "Reemplazar PDF" : "Subir evento PDF"}
              </Button>
            </>
          )}
        </div>
      </div>

      {loadingDocs ? (
        <div className="cd-loading-wrap"><Spin size="large" /></div>
      ) : mainPdf ? (
        <div className="cd-pdf-viewer-wrap">
          <iframe
            src={getDocUrl(mainPdf)}
            title="Evento PDF"
            className="cd-pdf-iframe"
          />
        </div>
      ) : (
        <div className="cd-empty-doc">
          <FilePdfOutlined className="cd-empty-doc-icon" />
          <p className="cd-empty-doc-title">Sin evento PDF</p>
          <p className="cd-empty-doc-sub">
            Sube el PDF del evento para visualizarlo aquí.
          </p>
          <Button
            icon={<UploadOutlined />}
            loading={uploadingPdf}
            onClick={() => pdfInputRef.current?.click()}
            className="cd-btn-upload"
          >
            Subir evento PDF
          </Button>
        </div>
      )}
    </div>
  );
}
