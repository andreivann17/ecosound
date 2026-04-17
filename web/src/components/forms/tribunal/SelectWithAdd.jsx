// src/components/tribunal/FormTribunal/SelectWithAdd.jsx
import React, { useMemo, useState } from "react";
import { Button, Divider, Input, Select } from "antd";
import { collapseSpaces, makeNewSelectValue } from "./formTribunal.helpers";

export default function SelectWithAdd({
  value,
  onChange,
  baseOptions = [],
  catalogOverrides,
  setCatalogOverrides,
  overrideKey,
  placeholder = "Agregar nuevo",
  multiple = true,
}) {
  const [draft, setDraft] = useState("");

  const asArray = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);

  const addOption = () => {
    const label = collapseSpaces(draft);
    if (!label) return;

    const newValue = makeNewSelectValue(label);

    setCatalogOverrides((prev) => ({
      ...prev,
      [overrideKey]: [...(prev[overrideKey] || []), { label, value: newValue, isNew: true }],
    }));

    if (multiple) {
      const prev = asArray(value);
      const next = prev.includes(newValue) ? prev : [...prev, newValue];
      onChange(next);
    } else {
      onChange(newValue);
    }

    setDraft("");
  };

  const finalOptions = useMemo(
    () => [...baseOptions, ...(catalogOverrides?.[overrideKey] || [])],
    [baseOptions, catalogOverrides, overrideKey]
  );

  return (
    <Select
      mode={multiple ? "multiple" : undefined}
      value={multiple ? asArray(value) : value ?? undefined}
      style={{ width: "100%" }}
      onChange={onChange}
      options={finalOptions}
      showSearch
      optionFilterProp="label"
      dropdownRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: "8px 0" }} />
          <div style={{ display: "flex", gap: 8, padding: 8 }}>
            <Input
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onPressEnter={addOption}
            />
            <Button type="primary" onClick={addOption}>
              Aceptar
            </Button>
          </div>
        </>
      )}
    />
  );
}