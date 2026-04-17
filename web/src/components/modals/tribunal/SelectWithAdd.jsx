import React, { useMemo, useState } from "react";
import { Select, Divider, Input } from "antd";

export default function SelectAddNew({
  value,
  options = [],
  placeholder = "Seleccione un tipo...",
  onChange,
  onAddNew,
  disabled = false,
  dropdownIcon = "expand_more",
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = String(search || "").toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => String(o.label || "").toLowerCase().includes(q));
  }, [options, search]);

  return (
    <div className="oa-dd-wrap">
      <Select
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        className="oa-dd-select"
        popupClassName="oa-dd-popup"
        dropdownRender={(menu) => (
          <div className="oa-dd">
            <div className="oa-dd-search">
              <span className="material-symbols-outlined oa-dd-search-ico">search</span>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="oa-dd-search-input"
              />
            </div>

            <div className="oa-dd-list">
              <Select
                open
                value={value}
                options={filtered}
                onChange={onChange}
                className="oa-dd-inner"
                dropdownRender={(m) => m}
              />
            </div>

            <Divider className="oa-dd-divider" />

            <button type="button" className="oa-dd-addbtn" onClick={onAddNew}>
              <span className="material-symbols-outlined oa-dd-addico">add_circle</span>
              Agregar nuevo elemento
            </button>
          </div>
        )}
        options={filtered}
        showSearch={false}
        suffixIcon={
          <span className="material-symbols-outlined oa-dd-chevron">{dropdownIcon}</span>
        }
        onChange={onChange}
      />
    </div>
  );
}
