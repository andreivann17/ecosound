import React from "react";
import { Button, Divider, Empty } from "antd";
import { DollarOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { fmtMoney, fmtFechaCorta, parseNum } from "../helpers";

export default function PagosTab({
  evento,
  pagos,
  totalPagosAdicionales,
  resta,
  setPagoModalOpen,
  handleDeleteAbono,
}) {
  return (
    <div className="cd-card">
      <div className="cd-pagos-header">
        <div className="cd-pagos-header-left">
          <div className="cd-card-icon-wrap"><DollarOutlined /></div>
          <h2 className="cd-card-title">Abonos y pagos</h2>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="cd-btn-add-pago"
          onClick={() => setPagoModalOpen(true)}
        >
          Agregar abono
        </Button>
      </div>
      <div className="cd-pagos-summary">
        <div className="cd-pagos-summary-item">
          <span className="cd-field-label">Importe total</span>
          <span className="cd-pagos-summary-val">{fmtMoney(evento.importe)}</span>
        </div>
        <div className="cd-pagos-summary-item">
          <span className="cd-field-label">Abono recibido</span>
          <span className="cd-pagos-summary-val">
            {fmtMoney(evento.importe_anticipo)}
          </span>
        </div>
        {totalPagosAdicionales > 0 && (
          <div className="cd-pagos-summary-item">
            <span className="cd-field-label">Abonos adicionales</span>
            <span className="cd-pagos-summary-val">
              {fmtMoney(String(totalPagosAdicionales))}
            </span>
          </div>
        )}
        <div className="cd-pagos-summary-item">
          <span className="cd-field-label">Saldo pendiente</span>
          <span className={`cd-pagos-summary-val ${
            resta === null ? "" : resta > 0 ? "cd-financial-error" : "cd-financial-ok"
          }`}>
            {resta !== null ? fmtMoney(String(resta)) : "—"}
          </span>
        </div>
      </div>
      <Divider style={{ margin: "4px 0 16px" }} />
      <div className="cd-pagos-list">
        <div className="cd-pagos-list-header">
          <span>Concepto</span>
          <span>Fecha</span>
          <span>Monto</span>
          <span />
        </div>
        {parseNum(evento.importe_anticipo) > 0 && (
          <div className="cd-pagos-row cd-pagos-row-anticipo">
            <span>
              <DollarOutlined style={{ marginRight: 6, color: "#595c5e" }} />
              Abono recibido
            </span>
            <span>{fmtFechaCorta(evento.fecha_anticipo)}</span>
            <span className="cd-pagos-monto">
              {fmtMoney(evento.importe_anticipo)}
            </span>
            <span />
          </div>
        )}
        {pagos.map((p) => (
          <div key={p.id || p.id_pago} className="cd-pagos-row">
            <span>
              <DollarOutlined style={{ marginRight: 6, color: "#595c5e" }} />
              {p.descripcion || "Abono"}
            </span>
            <span>{fmtFechaCorta(p.fecha)}</span>
            <span className="cd-pagos-monto">{fmtMoney(p.monto)}</span>
            <button
              className="cd-doc-delete-btn"
              onClick={() => handleDeleteAbono(p)}
              title="Eliminar abono"
            >
              <DeleteOutlined />
            </button>
          </div>
        ))}
        {pagos.length === 0 && parseNum(evento.importe_anticipo) === 0 && (
          <Empty description="Sin pagos registrados" style={{ margin: "32px 0" }} />
        )}
      </div>
    </div>
  );
}
