import React, { useEffect, useState } from "react";
import { Modal, Input } from "antd";

const collapseSpaces = (s) => String(s || "").replace(/\s+/g, " ").trim();

export default function AddSelectOptionModal({
  open,
  title = "Agregar nuevo elemento",
  placeholder = "Nombre del nuevo elemento...",
  onCancel,
  onSave,
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  const handleOk = () => {
    const v = collapseSpaces(name);
    if (!v) return;
    onSave(v);
  };

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Guardar"
      cancelText="Cancelar"
      centered
      destroyOnClose
    >
      <div className="oa-addopt-modal">
        <label className="oa-addopt-label">Nombre</label>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="oa-addopt-input"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleOk();
          }}
        />
        <div className="oa-addopt-hint">
          Se guardará localmente y se marcará como <b>nuevo</b> para el backend.
        </div>
      </div>
    </Modal>
  );
}
