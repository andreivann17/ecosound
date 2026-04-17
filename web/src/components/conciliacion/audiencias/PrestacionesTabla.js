// src/components/laboral/PrestacionesTabla.jsx
import React, { useState } from "react";
import { Button, InputNumber, Input } from "antd";
import {
  prestacionesLista,
  prestacionesLabels,
  handlePressEnter,
} from "./audienciaHelpers";

// Mapa inverso: label -> key base
const labelToKey = Object.entries(prestacionesLabels).reduce(
  (acc, [key, label]) => {
    acc[label] = key;
    return acc;
  },
  {}
);

// =========================
// Helpers: CENTAVOS (sin floats)
// =========================
const toCents = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
};
const fromCents = (c) => {
  const num = Number(c);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num) / 100;
};

// =========================
// Parser / Formatter (UX amigable)
// - NO fuerza ".00" mientras escribes
// - Acepta comas como miles (se ignoran al parsear)
// - Punto como decimal
// =========================
const montoParser = (value) => {
  if (value === undefined || value === null || value === "") return 0;

  let cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "");

  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    const intPart = cleaned.slice(0, firstDot).replace(/\./g, "");
    const decPart = cleaned.slice(firstDot + 1).replace(/\./g, "");
    cleaned = decPart !== "" ? `${intPart}.${decPart}` : `${intPart}.`;
  } else {
    cleaned = cleaned.replace(/\./g, "");
  }

  // si termina con ".", parseFloat la rompe; en ese caso, toma solo int
  if (cleaned.endsWith(".")) {
    const onlyInt = cleaned.slice(0, -1);
    const n = parseInt(onlyInt || "0", 10);
    return Number.isNaN(n) ? 0 : n;
  }

  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
};

const montoFormatter = (value) => {
  if (value === undefined || value === null || value === "") return "";

  // value puede venir como string (stringMode) o number
  const raw = String(value);

  // deja que el usuario escriba "8." sin que se convierta en "8.00"
  const endsWithDot = raw.endsWith(".");
  const cleaned = raw.replace(/,/g, "").replace(/[^\d.]/g, "");

  if (!cleaned) return "";

  const dotIndex = cleaned.indexOf(".");
  let intPart = dotIndex === -1 ? cleaned : cleaned.slice(0, dotIndex);
  let decPart = dotIndex === -1 ? "" : cleaned.slice(dotIndex + 1);

  // evita puntos extra en intPart
  intPart = intPart.replace(/\./g, "");
  decPart = decPart.replace(/\./g, "");

  const intWithCommas = (intPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (dotIndex !== -1) {
    // si el usuario escribió ".", respétalo
    if (endsWithDot) return `${intWithCommas}.`;
    // respeta lo que lleva escrito en decimales (máx 2 por UX)
    const decLimited = decPart.slice(0, 2);
    return `${intWithCommas}.${decLimited}`;
  }

  return intWithCommas;
};

// =========================
// Normalizadores de estado (stringMode)
// =========================
const toValueStr = (v) => {
  if (v === undefined || v === null) return "0";
  // AntD puede mandar "" en algunos casos
  if (v === "") return "0";
  return String(v);
};

const toNumber2 = (v) => {
  // convierte a número y lo deja en 2 decimales reales (para guardar/sumar)
  const n = montoParser(v);
  return fromCents(toCents(n));
};

function PrestacionesTabla({ form }) {
  // =========================
  // Estado inicial · BASE (guardamos string para no romper el typing)
  // =========================
  const [data, setData] = useState(() => {
    const initial = {};
    prestacionesLista.forEach((p) => {
      initial[p.key] = { monto: "0" };
    });

    const fromMontos = form.getFieldValue("prestaciones_montos");
    const fromArray = form.getFieldValue("prestaciones");

    // 1) Nuevo formato: prestaciones_montos como objeto
    if (
      fromMontos &&
      typeof fromMontos === "object" &&
      !Array.isArray(fromMontos)
    ) {
      prestacionesLista.forEach((p) => {
        const row = fromMontos[p.key];
        if (row) {
          initial[p.key] = { monto: toValueStr(row.monto || 0) };
        }
      });
      return initial;
    }

    // 2) Formato viejo: prestaciones como array [{prestacion, monto}]
    if (Array.isArray(fromArray)) {
      prestacionesLista.forEach((p) => {
        const labelBase = prestacionesLabels[p.key] || p.label || p.key;
        const item = fromArray.find(
          (it) => (it.prestacion || "").trim() === labelBase
        );
        if (item) {
          initial[p.key] = { monto: toValueStr(item.monto || 0) };
        }
      });
    }

    return initial;
  });

  // =========================
  // Estado inicial · EXTRAS (string)
  // =========================
  const [extraRows, setExtraRows] = useState(() => {
    const fromMontos = form.getFieldValue("prestaciones_montos");
    const fromArray = form.getFieldValue("prestaciones");

    const extras = [];

    // 1) Nuevo formato: prestaciones_montos como objeto
    if (
      fromMontos &&
      typeof fromMontos === "object" &&
      !Array.isArray(fromMontos)
    ) {
      Object.entries(fromMontos).forEach(([key, val]) => {
        const isBase = prestacionesLista.some((p) => p.key === key);
        if (!isBase) {
          extras.push({
            id: key,
            label: val.label || "",
            monto: toValueStr(val.monto || 0),
          });
        }
      });
      return extras;
    }

    // 2) Formato viejo: prestaciones como array [{prestacion, monto}]
    if (Array.isArray(fromArray)) {
      fromArray.forEach((item, idx) => {
        const label = (item.prestacion || "").trim();
        const keyBase = labelToKey[label];
        if (!keyBase) {
          extras.push({
            id: `extra_${idx}`,
            label,
            monto: toValueStr(item.monto || 0),
          });
        }
      });
    }

    return extras;
  });

  // =========================
  // Cálculo de total (EN CENTAVOS, usando parser)
  // =========================
  const calcularTotal = (vals, extras) => {
    let totalCents = 0;

    prestacionesLista.forEach((p) => {
      totalCents += toCents(montoParser(vals[p.key]?.monto || "0"));
    });

    extras.forEach((r) => {
      totalCents += toCents(montoParser(r.monto || "0"));
    });

    return fromCents(totalCents);
  };

  // =========================
  // Sincronizar con el Form (guardamos NUMÉRICO limpio en payload)
  // =========================
  const syncForm = (baseData, extraRowsState) => {
    const payload = {};

    prestacionesLista.forEach((p) => {
      const row = baseData[p.key];
      payload[p.key] = {
        label: prestacionesLabels[p.key] || p.key,
        monto: toNumber2(row?.monto || "0"),
      };
    });

    extraRowsState.forEach((r, idx) => {
      const key = r.id || `extra_${idx + 1}`;
      payload[key] = {
        label: r.label || "",
        monto: toNumber2(r.monto || "0"),
      };
    });

    form.setFieldsValue({
      prestaciones_montos: payload,
      prestaciones_montos_total: calcularTotal(baseData, extraRowsState),
    });
  };

  // =========================
  // Handlers
  // =========================
  const handleBaseChange = (key, changes) => {
    const updated = {
      ...data,
      [key]: { ...data[key], ...changes },
    };
    setData(updated);
    syncForm(updated, extraRows);
  };

  const handleExtraChange = (id, changes) => {
    const updated = extraRows.map((r) =>
      r.id === id ? { ...r, ...changes } : r
    );
    setExtraRows(updated);
    syncForm(data, updated);
  };

  const handleAddExtra = () => {
    const newId = `extra_${Date.now()}`;
    const updated = [...extraRows, { id: newId, label: "", monto: "0" }];
    setExtraRows(updated);
    syncForm(data, updated);
  };

  const handleRemoveExtra = (id) => {
    const updated = extraRows.filter((r) => r.id !== id);
    setExtraRows(updated);
    syncForm(data, updated);
  };

  const total = calcularTotal(data, extraRows);

  // =========================
  // Render
  // =========================
  return (
    <div style={{ marginTop: 8 }}>
      <table className="audiencia-table">
        <thead>
          <tr>
            <th>
              <div className="justify-content-between d-flex">
                Prestación
                <div style={{ textAlign: "left" }}>
                  <Button type="primary" size="small" onClick={handleAddExtra}>
                    <i className="fas fa-plus" style={{ marginRight: 5 }} />
                    Agregar prestación
                  </Button>
                </div>
              </div>
            </th>
            <th style={{ width: "180px" }}>Monto estimado (MXN)</th>
            <th style={{ width: "40px" }}></th>
          </tr>
        </thead>

        <tbody>
          {/* Prestaciones base */}
          {prestacionesLista.map((p) => {
            const row = data[p.key] || { monto: "0" };
            return (
              <tr key={p.key}>
                <td>{p.label}</td>
                <td>
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    step={0.01}
                    value={row.monto}
                    placeholder="Ej. 15,000.00"
                    controls={false}
                    stringMode
                    changeOnBlur
                    formatter={montoFormatter}
                    parser={montoParser}
                    onChange={(val) =>
                      handleBaseChange(p.key, { monto: toValueStr(val) })
                    }
                    onPressEnter={handlePressEnter}
                  />
                </td>
                <td></td>
              </tr>
            );
          })}

          {/* Prestaciones extra */}
          {extraRows.map((r) => (
            <tr key={r.id}>
              <td>
                <Input
                  placeholder="Nombre de la prestación"
                  value={r.label}
                  onChange={(e) =>
                    handleExtraChange(r.id, { label: e.target.value })
                  }
                  onPressEnter={handlePressEnter}
                />
              </td>
              <td>
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                  value={r.monto}
                  placeholder="Ej. 5,000.00"
                  controls={false}
                  stringMode
                  changeOnBlur
                  formatter={montoFormatter}
                  parser={montoParser}
                  onChange={(val) =>
                    handleExtraChange(r.id, { monto: toValueStr(val) })
                  }
                  onPressEnter={handlePressEnter}
                />
              </td>
              <td style={{ textAlign: "center" }}>
                <Button
                  type="text"
                  danger
                  size="small"
                  onClick={() => handleRemoveExtra(r.id)}
                >
                  ✕
                </Button>
              </td>
            </tr>
          ))}

          <tr>
            <td style={{ textAlign: "right", fontWeight: 600 }}>
              Total estimado
            </td>
            <td>
              <InputNumber
                style={{ width: "100%" }}
                value={String(total)}
                readOnly
                controls={false}
                stringMode
                formatter={montoFormatter}
                parser={montoParser}
              />
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default PrestacionesTabla;
