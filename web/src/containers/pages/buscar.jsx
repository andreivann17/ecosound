// src/components/expedientes/BuscarExpedienteModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { Modal, Card, Row, Col, Typography, AutoComplete, Input, notification } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/img/logo.png";
import axios from "axios";
import {PATH} from "../../redux/utils"
const API_BASE = PATH;
const { Title, Text } = Typography;


const apiServiceGet = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});
const authHeader = () => {
  const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
// ===============================
// 1. Comandos estáticos (front)
// ===============================
/**
 * Estos son "destinos" fijos del sistema.
 * Puedes agregar / quitar rutas sin tocar el backend.
 */
const STATIC_COMMANDS = [
  {
    key: "laboral-centro-conciliacion",
    type: "route",
    label: "Centro de conciliación (Laboral)",
    description: "Ir al panel de Centro de conciliación",
    route: "/materias/laboral/centro-conciliacion",
    keywords: ["centro", "conciliacion", "conciliación", "laboral", "prejudicial"],
  },
  {
    key: "laboral-tribunal",
    type: "route",
    label: "Tribunal laboral",
    description: "Ir al panel de Tribunal laboral",
    route: "/materias/laboral/tribunal",
    keywords: ["tribunal", "juicio", "tri", "laboral"],
  },
  {
    key: "laboral-documentacion",
    type: "route",
    label: "Documentación laboral",
    description: "Ir al módulo de documentación",
    route: "/materias/laboral/documentacion",
    keywords: ["documentacion", "documentación", "docs", "archivos", "laboral"],
  },
];


function buildStaticOptions(query) {
  const q = (query || "").toLowerCase().trim();
  if (!q) {
    // Puedes devolver algunos comandos por defecto o dejar vacío
    return STATIC_COMMANDS.map((cmd) => ({
      value: cmd.key,
      label: (
        <div>
          <div>{cmd.label}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {cmd.description}
          </div>
        </div>
      ),
      // metadata extra que luego usamos en onSelect
      type: cmd.type,
      route: cmd.route,
    }));
  }

  return STATIC_COMMANDS.filter((cmd) => {
    const hayEnLabel = cmd.label.toLowerCase().includes(q);
    const hayEnKeywords =
      Array.isArray(cmd.keywords) &&
      cmd.keywords.some((k) => k.toLowerCase().includes(q));
    return hayEnLabel || hayEnKeywords;
  }).map((cmd) => ({
    value: cmd.key,
    label: (
      <div>
        <div>{cmd.label}</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {cmd.description}
        </div>
      </div>
    ),
    type: cmd.type,
    route: cmd.route,
  }));
}

function buildExpedienteOptions(items) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    const expedienteFormat = item.expediente_format || item.expediente || "";
    let title = expedienteFormat
    
    const trabajador = item.trabajador || item.nombre_trabajador || "";
    const empresa = item.empresa || item.nombre_empresa || "";
    if(item.type == "expediente"){
      if(item.subtype == "desvinculacion"){
        title = trabajador + " VS " +  empresa;
      }
    }

    const secondaryParts = [];
    if (trabajador) secondaryParts.push(trabajador);
    if (empresa) secondaryParts.push(empresa);
    const secondary = secondaryParts.join(" • ");

    const materia = item.materia || "laboral";
    const procedimiento = item.procedimiento || "";
    const type = item.type || "expediente";
    const key = item.key;

    let seccionLabel = "Sección no especificada";
    if (materia === "laboral" && procedimiento === "centro-conciliacion") {
      seccionLabel = "Centro de conciliación (Laboral)";
    } else if (materia === "laboral" && procedimiento === "tribunal") {
      seccionLabel = "Tribunal laboral";
    } else if (materia === "laboral" && procedimiento === "documentacion") {
      seccionLabel = "Documentación laboral";
    } else if (materia === "laboral" && procedimiento === "desvinculaciones") {
      seccionLabel = "Desvinculaciones";
    }

    return {
      value: expedienteFormat,
      label: (
        <div>
          <div>
            <strong>{title}</strong>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{seccionLabel}</div>
          {secondary && <div style={{ fontSize: 12, color: "#9ca3af" }}>{secondary}</div>}
        </div>
      ),
      // metadata
      type,           // 'conciliacion' | 'desvinculacion'
      key,            // id real
      expediente_format: expedienteFormat,
      materia,
      procedimiento,
    };
  });
}


function BuscarExpedienteModal({ open, onClose }) {
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Reset cada vez que se abre / cierra
  useEffect(() => {
    if (!open) {
      setSearchValue("");
      setOptions([]);
    } else {
      // Al abrir puedes mostrar comandos estáticos por defecto
      setOptions(buildStaticOptions(""));
    }
  }, [open]);

const fetchExpedientes = async (q) => {
  const query = (q || "").trim();
  if (!query) return [];

  try {
    setLoading(true);

    const { data } = await apiServiceGet.get("materias/search", {
      params: { q: query, limit: 10 },
      headers: authHeader(),
    });

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error al buscar:", err?.response?.status || err);
    return [];
  } finally {
    setLoading(false);
  }
};

  const handleSearch = (value) => {
    setSearchValue(value);

    const trimmed = (value || "").trim();

    // Siempre construimos primero las opciones estáticas
    const staticOpts = buildStaticOptions(trimmed);

    // Si no hay nada escrito, solo mostramos comandos estáticos
    if (!trimmed) {
      setOptions(staticOpts);
      return;
    }

    // Debounce para no pegar al backend en cada tecla
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const expedientes = await fetchExpedientes(trimmed);
      const expedienteOptions = buildExpedienteOptions(expedientes);

      // Combinamos estáticos + expedientes
      setOptions([...staticOpts, ...expedienteOptions]);
    }, 350);
  };


  const handleSelect = (value, option) => {

    const optType = option?.type;

    // 1) Navegación a secciones fijas
    if (optType === "route") {
      if (option.route) {
        console.log(option)
        navigate(option.route);
      } else {
        
        console.warn("Opción de tipo route sin 'route' definida:", option);
      }
      handleCloseInternal();
      return;
    }

    // 2) Abrir expediente
    if (optType === "expediente") {
      console.log(option)

      const materia = option.materia || "laboral";
      const procedimiento = option.procedimiento || "centro-conciliacion";

      // Aquí defines cómo se construye la ruta a detalle
      navigate(
          `/materias/${materia}/${procedimiento}/${option.key}`
      );

      handleCloseInternal();
      return;
    }

    // Si por alguna razón llega algo raro:
    console.warn("Opción seleccionada sin tipo conocido:", option);
  };

  const handleCloseInternal = () => {
    setSearchValue("");
    setOptions([]);
    if (typeof onClose === "function") onClose();
  };

  const handleCancel = () => {
    handleCloseInternal();
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={720}
      destroyOnClose
      closeIcon={
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#111827",
            lineHeight: 1,
          }}
        >
          ×
        </span>
      }
    >
      <Card
        style={{ width: "100%", borderRadius: 18, boxShadow: "none" }}
        bodyStyle={{ padding: "24px 32px 24px 32px" }}
      >
        {/* Header */}
        <Row justify="center" style={{ marginBottom: 24 }}>
          <Col span={24} style={{ textAlign: "center" }}>
            <div style={{ marginBottom: 12 }}>
              <img
                src={logo}
                alt="Logo"
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "contain",
                  borderRadius: "50%",
                  border: "1px solid #e5e7eb",
                  padding: 8,
                }}
              />
            </div>

            <Title level={3} style={{ marginBottom: 0 }}>
              Buscar sección o expediente
            </Title>
            <Text type="secondary">
             Introduce el número de expediente o términos relacionados con la sección que deseas abrir.
            </Text>
          </Col>
        </Row>

        {/* Barra de búsqueda única */}
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
                loading ? "Buscando..." : "No se encontraron resultados."
              }
              filterOption={false} // manejamos el filtrado manualmente
            >
              <Input
                size="large"
                prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
                placeholder="Ejemplo: MXLI-CI-2025-000123, centro, tribunal..."
              />
            </AutoComplete>
          </Col>
        </Row>
      </Card>
    </Modal>
  );
}

export default BuscarExpedienteModal;
