import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiInventarioInstance,
  authHeaderInventario,
} from "../../redux/actions/inventario/inventario";

import {
  Button,
  Select,
  Input,
  DatePicker,
  notification,
  Spin,
  Space,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";

import "./InventarioPage.css";

dayjs.locale("es");

const { Title, Text } = Typography;

const TIPO_CONTEO = [
  { label: "Mensual", value: "mensual" },
  { label: "Trimestral", value: "trimestral" },
  { label: "Semestral", value: "semestral" },
  { label: "Anual", value: "anual" },
];

export default function NuevoConteoPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conteoId, setConteoId] = useState(null);

  const [fecha, setFecha] = useState(dayjs());
  const [tipo, setTipo] = useState("mensual");
  const [descripcion, setDescripcion] = useState("");

  const [detalles, setDetalles] = useState([]);
  const [fisicaMap, setFisicaMap] = useState({});

  const initConteo = useCallback(async () => {
    setLoading(true);
    try {
      const payload = {
        fecha: fecha.format("YYYY-MM-DD"),
        tipo,
        descripcion: descripcion.trim() || null,
      };
      const { data } = await apiInventarioInstance.post(
        "/inventario/conteos",
        payload,
        { headers: authHeaderInventario() }
      );
      setConteoId(data.id_inventario_conteo);
      const rows = data.detalles || [];
      setDetalles(rows);
      const map = {};
      rows.forEach((d) => {
        map[d.id_conteo_detalle] = d.cantidad_fisica ?? 0;
      });
      setFisicaMap(map);
    } catch (err) {
      notification.error({
        message: "Error al iniciar el conteo",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const [started, setStarted] = useState(false);

  const handleStart = async () => {
    setStarted(true);
    await initConteo();
  };

  const handleFisicaChange = (id_detalle, value) => {
    const v = parseInt(value, 10);
    setFisicaMap((prev) => ({ ...prev, [id_detalle]: isNaN(v) ? 0 : v }));
  };

  const handleSave = async () => {
    if (!conteoId) return;
    setSaving(true);
    try {
      await Promise.all(
        detalles.map((d) =>
          apiInventarioInstance.patch(
            `/inventario/conteos/${conteoId}/detalles/${d.id_conteo_detalle}`,
            { cantidad_fisica: fisicaMap[d.id_conteo_detalle] ?? 0 },
            { headers: authHeaderInventario() }
          )
        )
      );
      notification.success({ message: "Conteo guardado correctamente" });
      navigate("/app/inventario/conteos");
    } catch (err) {
      notification.error({
        message: "Error al guardar conteo",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const grouped = () => {
    const map = {};
    for (const d of detalles) {
      const cat = d.nombre_categoria || "Sin categoría";
      if (!map[cat]) map[cat] = [];
      map[cat].push(d);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  };

  return (
    <main className="conteo-main">
      <div className="conteo-content">

        <section className="inv-header-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
            <Space direction="vertical" size={2}>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/app/inventario")}
                style={{ padding: 0, height: "auto", fontSize: 12, color: "#05060a" }}
              >
                Volver a Inventario
              </Button>
              <Title level={2} className="inv-title" style={{ marginBottom: 0 }}>
                Nuevo conteo de inventario
              </Title>
              <Text className="inv-subtitle">
                Registra la cantidad física de cada equipo para detectar diferencias con el sistema.
              </Text>
            </Space>

            {started && !loading && (
              <Space style={{ marginTop: 4 }}>
                <Button
                  className="inv-btn-clean"
                  onClick={() => navigate("/app/inventario")}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={handleSave}
                  style={{ backgroundColor: "#111", borderColor: "#111" }}
                >
                  Guardar conteo
                </Button>
              </Space>
            )}
          </div>
        </section>

        {!started && (
          <div className="cc-section-card" style={{ maxWidth: 520 }}>
            <div className="cc-section-header">
              <span className="cc-section-icon"><AppstoreOutlined /></span>
              Configurar conteo
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="inv-field-label" style={{ marginBottom: 6 }}>Fecha del conteo</div>
                <DatePicker
                  value={fecha}
                  onChange={(v) => setFecha(v)}
                  format="DD MMM YYYY"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <div className="inv-field-label" style={{ marginBottom: 6 }}>Tipo</div>
                <Select
                  value={tipo}
                  onChange={(v) => setTipo(v)}
                  options={TIPO_CONTEO}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <div className="inv-field-label" style={{ marginBottom: 6 }}>Descripción (opcional)</div>
                <Input.TextArea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Notas del conteo..."
                  rows={3}
                />
              </div>
              <Button
                type="primary"
                size="large"
                onClick={handleStart}
                style={{ background: "#05060a", borderColor: "#05060a", marginTop: 4 }}
              >
                Iniciar conteo
              </Button>
            </div>
          </div>
        )}

        {started && loading && (
          <div className="cd-loading-wrap" style={{ minHeight: 300 }}>
            <Spin size="large" />
          </div>
        )}

        {started && !loading && detalles.length === 0 && (
          <div className="inv-empty">
            <div style={{ fontSize: 15 }}>No hay equipo registrado en el inventario.</div>
          </div>
        )}

        {started && !loading && detalles.length > 0 && (
          <div className="conteo-table-wrap">
            <table className="conteo-table">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Sistema</th>
                  <th>Físico</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {grouped().map(([cat, rows]) => (
                  <React.Fragment key={cat}>
                    <tr className="conteo-categoria-row">
                      <td colSpan={4}>{cat}</td>
                    </tr>
                    {rows.map((d) => {
                      const fisica = fisicaMap[d.id_conteo_detalle] ?? 0;
                      const diff = fisica - (d.cantidad_sistema ?? 0);
                      const diffCls =
                        diff > 0
                          ? "td-diferencia-pos"
                          : diff < 0
                          ? "td-diferencia-neg"
                          : "td-diferencia-zero";
                      return (
                        <tr key={d.id_conteo_detalle}>
                          <td>{d.nombre_equipo}</td>
                          <td className="td-sistema">{d.cantidad_sistema ?? 0}</td>
                          <td>
                            <input
                              className="conteo-input"
                              type="number"
                              min={0}
                              value={fisica}
                              onChange={(e) =>
                                handleFisicaChange(d.id_conteo_detalle, e.target.value)
                              }
                            />
                          </td>
                          <td className={diffCls}>
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </main>
  );
}
