// src/pages/materias/laboral/LaboralProcedimientoPage/LaboralProcedimientoPage.jsx

import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import dayjs from "dayjs";

import { useDispatch, useSelector } from "react-redux";

import {
  Card,
  Typography,
  Button,
  Space,
  Tag,
  Breadcrumb,
  Input,
  Select,
  DatePicker,
  Pagination,
  notification,
} from "antd";
import {
  EnvironmentOutlined,
  GoldOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  ClockCircleOutlined,
  StopOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  PlusOutlined,
} from "@ant-design/icons";

import { actionDesvinculacionesCards } from "../../redux/actions/desvinculaciones/desvinculaciones.js";

// AJUSTA ESTE IMPORT A TU RUTA REAL:
import { actionEmpresasdistinct } from "../../redux/actions/empresas/empresas.js";
import ExpedienteCards from "../../components/expedientes/desvinculacionesCards.jsx";
import {
  laboralTiposConfig,
  PAGE_SIZE,
} from "./materias/laboral/laboralProcedimiento.config.js";
import useLaboralCatalogos from "./materias/laboral/useLaboralCatalogos.js";
import useExpedientesProcedimiento from "./materias/laboral/useDesvinculacionesProcedimientos.js";

import "./materias/laboral/LaboralProcedimientoPage.css";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/* =========================
   Helpers (mismo patrón que Wizard)
   ========================= */
const coerceItems = (slice) => {
  if (!slice) return [];
  const data = slice.data ?? slice;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return [];
};

const collapseSpaces = (str) => String(str || "").replace(/\s+/g, " ").trim();

export default function LaboralProcedimientoPage() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
const [searchParams, setSearchParams] = useSearchParams();

const toIntOrNull = (v) => {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
};

const setOrDelete = (sp, key, value) => {
  if (value === null || value === undefined || value === "" || value === "todos") {
    sp.delete(key);
    return;
  }
  sp.set(key, String(value));
};

const [empresaIdMap, setEmpresaIdMap] = useState({});
const [selectedEmpresaId, setSelectedEmpresaId] = useState(null);

  const tipoConfig =
    laboralTiposConfig[tipo] || laboralTiposConfig["desvinculacion"];

  const concSlice = useSelector((state) => state.desvinculaciones || {});

  const statusById = useMemo(() => {
    const src = concSlice?.statusCatalog?.items || [];
    return src.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {});
  }, [concSlice]);


  const [selectedEstadoId, setSelectedEstadoId] = useState(null);
  const [selectedCiudadId, setSelectedCiudadId] = useState(null);


  const [empresasOptionsDistinct, setEmpresasOptionsDistinct] = useState([]);


  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [fueroFilter] = useState("todos");
  const [empresaFilter, setEmpresaFilter] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);


  const {
    estadosOptions,
    ciudadesOptions,
    empresasOptions,
    estadoSeleccionado,
    ciudadSeleccionada,
    estadosById,
    ciudadesById,
  } = useLaboralCatalogos(selectedEstadoId, selectedCiudadId);

  useEffect(() => {
    if (!selectedEstadoId && Array.isArray(estadosOptions) && estadosOptions.length) {
      const first = estadosOptions[0];
      const firstValue = first?.value ?? null;
      if (firstValue) {
        setSelectedEstadoId(firstValue);
        setSelectedCiudadId(null);
      }
    }
  }, [estadosOptions, selectedEstadoId]);

  useEffect(() => {
    if (
      selectedEstadoId &&
      !selectedCiudadId &&
      Array.isArray(ciudadesOptions) &&
      ciudadesOptions.length
    ) {
      const first = ciudadesOptions[0];
      const firstValue = first?.value ?? null;
      if (firstValue) {
        setSelectedCiudadId(firstValue);
      }
    }
  }, [selectedEstadoId, ciudadesOptions, selectedCiudadId]);
useEffect(() => {
  const estado = toIntOrNull(searchParams.get("estado"));
  const ciudad = toIntOrNull(searchParams.get("ciudad"));

  const empresa = searchParams.get("empresa"); // aquí guardamos el value del Select (en tu caso: nombre limpio)
  const q = searchParams.get("q") || "";

  const status = searchParams.get("status") || "todos";
  const page = toIntOrNull(searchParams.get("page")) || 1;

  const d1 = searchParams.get("d1"); // YYYY-MM-DD
  const d2 = searchParams.get("d2");
  const dr = d1 && d2 ? [dayjs(d1, "YYYY-MM-DD"), dayjs(d2, "YYYY-MM-DD")] : null;

  if (estado) setSelectedEstadoId(estado);
  if (ciudad) setSelectedCiudadId(ciudad);

  if (empresa) setEmpresaFilter(empresa);
  if (q) setSearch(q);

  if (status) setStatusFilter(status);
  setCurrentPage(page);

  setDateRange(dr);

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

useEffect(() => {
  const sp = new URLSearchParams(searchParams);

  setOrDelete(sp, "estado", selectedEstadoId);
  setOrDelete(sp, "ciudad", selectedCiudadId);

  setOrDelete(sp, "empresa", empresaFilter);

  const q = collapseSpaces(search);
  setOrDelete(sp, "q", q);

  setOrDelete(sp, "status", statusFilter);

  if (dateRange?.[0] && dateRange?.[1]) {
    sp.set("d1", dayjs(dateRange[0]).format("YYYY-MM-DD"));
    sp.set("d2", dayjs(dateRange[1]).format("YYYY-MM-DD"));
  } else {
    sp.delete("d1");
    sp.delete("d2");
  }

  setOrDelete(sp, "page", currentPage);

  const next = sp.toString();
  const prev = searchParams.toString();
  if (next !== prev) setSearchParams(sp, { replace: true });
}, [
  selectedEstadoId,
  selectedCiudadId,
  empresaFilter,
  search,
  statusFilter,
  dateRange,
  currentPage,
  searchParams,
  setSearchParams,
]);

  // reset autoridad cuando cambia ciudad/estado
  const handleChangeEstado = (value) => {
    const v = value || null;
    setSelectedEstadoId(v);
    setSelectedCiudadId(null);

    setEmpresaFilter(null);
    setCurrentPage(1);
  };

  const handleChangeCiudad = (value) => {
    const v = value || null;
    setSelectedCiudadId(v);

    setEmpresaFilter(null);
    setCurrentPage(1);
  };

  /* =========================
     filtros backend (mantengo tu flujo: estado+ciudad+tipo)
     AHORA: también manda empresa + expediente
     ========================= */
  const filtrosBusqueda = useMemo(() => {
    if (!selectedEstadoId || !selectedCiudadId) return null;

    const expediente = collapseSpaces(search);
    const empresa = empresaFilter ? collapseSpaces(empresaFilter) : null;
    return {
      id_estado: selectedEstadoId,
      id_ciudad: selectedCiudadId,
      tipo_desvinculacion: tipoConfig.key,

      // NUEVO: se manda al backend
      id_empresa: selectedEmpresaId  || undefined,
      nombre_solicitante: expediente || undefined,
    };
  }, [selectedEstadoId, selectedCiudadId, tipoConfig.key, empresaFilter, search]);

  useEffect(() => {
    if (filtrosBusqueda) {
      dispatch(actionDesvinculacionesCards(filtrosBusqueda));
    }
  }, [dispatch, filtrosBusqueda]);

  /* =========================
     Empresas distinct (NO Redux): NO TOCADO
     ========================= */
/* =========================
   Empresas distinct (NO Redux): NO TOCADO
   ========================= */
useEffect(() => {
  let isMounted = true;

  const loadEmpresasDistinct = async () => {
    if (!selectedEstadoId || !selectedCiudadId) {
      if (isMounted) {
        setEmpresasOptionsDistinct([]);
        setEmpresaIdMap({});
      }
      return;
    }

    const resp = await dispatch(
      actionEmpresasdistinct({
        estado: selectedEstadoId,
        ciudad: selectedCiudadId,
        tipo_desvinculacion: tipoConfig.key,
      })
    );

    if (!isMounted) return;

    if (typeof resp === "string") {
      setEmpresasOptionsDistinct([]);
      setEmpresaIdMap({});
      return;
    }

    const arr = Array.isArray(resp) ? resp : resp?.items || resp?.data || [];

    // ===== NUEVO: MAPEO nombre -> id (NO toca options)
    const map = {};

arr.forEach((name) => {
  const clean = collapseSpaces(name);

  const match = empresasOptions.find(
    (e) => collapseSpaces(e.label) === clean
  );

  if (match) {
    map[clean] = match.value; // value === id_empresa
  }
});



    setEmpresaIdMap(map);

    // ===== ESTO NO SE TOCA (tal cual lo pediste)
    const options = Array.isArray(arr)
      ? arr
          .map((x) => {
            const label =
              (typeof x === "string" ? x : x?.razon_social || x?.nombre) || "";
            const clean = collapseSpaces(label);
            if (!clean) return null;
            return { label: clean, value: clean };
          })
          .filter(Boolean)
      : [];

    setEmpresasOptionsDistinct(options);
  };

  loadEmpresasDistinct();

  return () => {
    isMounted = false;
  };
}, [dispatch, selectedEstadoId, selectedCiudadId, tipoConfig.key]);

  const empresasFinalOptions =
    empresasOptionsDistinct.length > 0 ? empresasOptionsDistinct : empresasOptions;
// =========================
// ID de empresa seleccionado (SIN tocar distinct)
// =========================

  const {
    statusCounts,
    filteredExpedientes,
    paginatedExpedientes,
    totalExp,
  } = useExpedientesProcedimiento({
    concSlice,
    search,
    statusFilter,
    fueroFilter,
    empresaFilter,
    dateRange,
    currentPage,
    pageSize: PAGE_SIZE,
    setCurrentPage,
  });


  const goBackToLaboralMenu = () => navigate("/home");

  const handleCrearExpediente = () => {
    if (!selectedEstadoId || !selectedCiudadId) {
      notification.warning({
        message: "Faltan selecciones",
        description: "Selecciona Estado y Ciudad antes de crear el expediente.",
      });
      return;
    }

    navigate(
      `/materias/laboral/desvinculaciones/crear/`,
      {
        state: {
          estado: selectedEstadoId,
          ciudad: selectedCiudadId,
        },
      }
    );
  };
useEffect(() => {
  if (!empresaFilter) {
    setSelectedEmpresaId(null);
    return;
  }
  const clean = collapseSpaces(empresaFilter);
  const id = empresaIdMap?.[clean] ?? null;
  setSelectedEmpresaId(id);
}, [empresaFilter, empresaIdMap]);

  return (
    <>
    

      <main className="laboral-main">
        <div className="laboral-content">
          {/* Header */}
          <section className="laboral-header-section">
            <div>
              <Space direction="vertical" size={2}>
                <Button
                  type="link"
                  icon={<ArrowLeftOutlined />}
                  onClick={goBackToLaboralMenu}
                  className="laboral-back-btn"
                >
                  Volver a Inicio
                </Button>

                <Title level={3} className="laboral-title">
                  Desvinculaciones & Convenios · Materia laboral
                </Title>

                {estadoSeleccionado && ciudadSeleccionada ? (
                  <Text className="laboral-subtitle">
                    Expedientes de {tipoConfig.shortLabel.toLowerCase()} en{" "}
                    <b>{estadoSeleccionado.nombre}</b> /{" "}
                    <b>{ciudadSeleccionada.nombre}</b>.
                  </Text>
                ) : (
                  <Text className="laboral-subtitle">
                    Selecciona un estado y una ciudad para ver los expedientes.
                  </Text>
                )}
              </Space>
            </div>

          </section>

          {/* EXPEDIENTES */}
          <section className="laboral-section">
            {/* Estado/Ciudad/Autoridad */}
            <div
              className="laboral-filters-row"
              style={{ marginTop: 20, marginBottom: 20 }}
            >
              <div className="laboral-filters-group">
                <span className="laboral-filters-label">Estado:</span>
                <Select
                  allowClear
                  showSearch
                  placeholder="Selecciona un estado"
                  size="small"
                  style={{ minWidth: 180 }}
                  options={estadosOptions}
                  value={selectedEstadoId}
                  onChange={handleChangeEstado}
                />

                <span className="laboral-filters-label">Ciudad:</span>
                <Select
                  allowClear
                  showSearch
                  placeholder={
                    selectedEstadoId
                      ? "Selecciona una ciudad"
                      : "Selecciona un estado primero"
                  }
                  size="small"
                  style={{ minWidth: 180 }}
                  options={ciudadesOptions}
                  value={selectedCiudadId}
                  onChange={handleChangeCiudad}
                  disabled={!selectedEstadoId}
                />

              
              </div>
            </div>

     

            {/* Empresa + fechas */}
            <div
              className="laboral-filters-row"
              style={{ marginTop: 50, marginBottom: 20 }}
            >
              <div className="laboral-filters-group">
                <span className="laboral-filters-label">Empresa:</span>
                <Select
                  allowClear
                  showSearch
                  placeholder="Todas las empresas"
                  value={empresaFilter}
                  onChange={(value) => {
                    setEmpresaFilter(value || null);
                    setSelectedEmpresaId(value ? empresaIdMap[value] ?? null : null); // ← NUEVO
                    setCurrentPage(1);
                  }}
                  options={empresasFinalOptions}
                  optionFilterProp="label"
                  style={{ minWidth: 220 }}
                  size="small"
                />

              
              </div>
            </div>

            {/* Encabezado + búsqueda + crear */}
            <div className="laboral-toolbar" style={{ marginBottom: 20 }}>
              <div className="laboral-toolbar-left">
                <Title
                  level={4}
                  className="laboral-section-title"
                  style={{ marginBottom: 0 }}
                >
                  Expedientes ({totalExp})
                </Title>
                <Text type="secondary">{totalExp} encontrados</Text>
              </div>

              <div className="laboral-toolbar-right">
                <Input
                  allowClear
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar expediente"
                  prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                  className="laboral-search-input"
                />

                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCrearExpediente}
              
                >
                  Crear Desvinculación
                </Button>
              </div>
            </div>

          <ExpedienteCards
  items={paginatedExpedientes}
  PAGE_SIZE={PAGE_SIZE}
  currentPage={currentPage}
  filteredExpedientes={filteredExpedientes}
  setCurrentPage={setCurrentPage}
  maps={{ ciudadesById, estadosById, statusById }}
  tipo={tipo}
  persistSearch={location.search} // ✅ NUEVO
/>

          </section>
        </div>
      </main>
    </>
  );
}
