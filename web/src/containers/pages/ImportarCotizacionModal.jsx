// Modal para importar una cotización existente al formulario de "Nuevo evento".
// Sigue el patrón visual de buscar.jsx: Modal + Card + AutoComplete con debounce.
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Card,
  Row,
  Col,
  Typography,
  AutoComplete,
  Input,
  notification,
} from "antd";
import { SearchOutlined, FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiCotizacionesInstance,
  authHeaderCotizaciones,
} from "../../redux/actions/cotizaciones/cotizaciones";

dayjs.locale("es");

const { Title, Text } = Typography;

function buildOptions(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const fecha = item.fecha_evento
      ? dayjs(item.fecha_evento).format("D MMM YYYY")
      : "Sin fecha";
    return {
      value: `${item.id_cotizacion}-${item.code || ""}`,
      label: (
        <div style={{ padding: "2px 0" }}>
          <div style={{ fontSize: 13, color: "#0d1b4b" }}>
            <strong>#{item.code || "—"}</strong>
            <span style={{ color: "#6b7280", marginLeft: 8 }}>
              {item.cliente_nombre || "Sin cliente"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
            Evento: {fecha}
          </div>
        </div>
      ),
      cotizacion: item,
    };
  });
}

export default function ImportarCotizacionModal({ open, onClose, onPick }) {
  const [searchValue, setSearchValue] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Reset al abrir/cerrar
  useEffect(() => {
    if (!open) {
      setSearchValue("");
      setOptions([]);
      setImporting(false);
    }
  }, [open]);

  const fetchCotizaciones = async (q) => {
    const query = (q || "").trim();
    if (!query) return [];
    try {
      setLoading(true);
      const { data } = await apiCotizacionesInstance.get(
        "/cotizaciones/search",
        {
          params: { q: query, limit: 10 },
          headers: authHeaderCotizaciones(),
        }
      );
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Error al buscar cotizaciones:", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    const trimmed = (value || "").trim();
    if (!trimmed) {
      setOptions([]);
      return;
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(async () => {
      const items = await fetchCotizaciones(trimmed);
      setOptions(buildOptions(items));
    }, 350);
  };

  const handleSelect = async (_value, option) => {
    const cot = option?.cotizacion;
    if (!cot?.id_cotizacion) return;
    setImporting(true);
    try {
      // Pedimos el detalle completo: incluye servicios + campos del cliente y misa.
      const { data } = await apiCotizacionesInstance.get(
        `/cotizaciones/${cot.id_cotizacion}`,
        { headers: authHeaderCotizaciones() }
      );
      if (typeof onPick === "function") onPick(data);
      handleCloseInternal();
    } catch (err) {
      notification.error({
        message: "No se pudo importar la cotización",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleCloseInternal = () => {
    setSearchValue("");
    setOptions([]);
    if (typeof onClose === "function") onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleCloseInternal}
      footer={null}
      width={680}
      destroyOnClose
      closeIcon={
        <span style={{ fontSize: 20, fontWeight: 700, color: "#111827", lineHeight: 1 }}>
          ×
        </span>
      }
    >
      <Card
        style={{ width: "100%", borderRadius: 18, boxShadow: "none" }}
        bodyStyle={{ padding: "20px 32px 28px" }}
      >
        <Row justify="center" style={{ marginBottom: 22 }}>
          <Col span={24} style={{ textAlign: "center" }}>
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%)",
                  color: "#01369e",
                }}
              >
                <FileTextOutlined style={{ fontSize: 28 }} />
              </div>
            </div>
            <Title level={4} style={{ marginBottom: 4, color: "#0d1b4b" }}>
              Importar de una cotización
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Busca por folio o por nombre del cliente. Al seleccionar, los datos
              llenarán el formulario automáticamente.
            </Text>
          </Col>
        </Row>

        <Row justify="center">
          <Col xs={24}>
            <AutoComplete
              style={{ width: "100%" }}
              value={searchValue}
              options={options}
              onSearch={handleSearch}
              onSelect={handleSelect}
              allowClear
              notFoundContent={
                loading
                  ? "Buscando..."
                  : importing
                    ? "Importando..."
                    : searchValue
                      ? "No se encontraron cotizaciones."
                      : null
              }
              filterOption={false}
              disabled={importing}
            >
              <Input
                size="large"
                prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
                placeholder="Folio (ej. WKCBGAWY) o nombre del cliente"
                disabled={importing}
              />
            </AutoComplete>
          </Col>
        </Row>
      </Card>
    </Modal>
  );
}
