// src/pages/materias/laboral/LaboralProcedimientoPage/LaboralProcedimientoPage.jsx

import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

import { actionConveniosCards } from "../../redux/actions/convenios/convenios.js";

// AJUSTA ESTE IMPORT A TU RUTA REAL:
import { actionEmpresasdistinct } from "../../redux/actions/empresas/empresas.js";
import ExpedienteCards from "../../components/expedientes/conveniosCards.jsx";
import {
  laboralTiposConfig,
  PAGE_SIZE,
} from "./materias/laboral/laboralProcedimiento.config.js";
import useLaboralCatalogos from "./materias/laboral/useLaboralCatalogos.js";
import useExpedientesProcedimiento from "./materias/laboral/useConveniosProcedimientos.js";

import "./materias/laboral/LaboralProcedimientoPage.css";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const collapseSpaces = (str) => String(str || "").replace(/\s+/g, " ").trim();

export default function LaboralProcedimientoPage() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
const [empresaIdMap, setEmpresaIdMap] = useState({});
const [selectedEmpresaId, setSelectedEmpresaId] = useState(null);

  const tipoConfig =
    laboralTiposConfig[tipo] || laboralTiposConfig["convenio"];

  const concSlice = useSelector((state) => state.convenios || {});

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
    

      // NUEVO: se manda al backend
      id_empresa: selectedEmpresaId  || undefined,
      nombre_solicitante: expediente || undefined,
    };
  }, [selectedEstadoId, selectedCiudadId, empresaFilter, search]);

  useEffect(() => {
    if (filtrosBusqueda) {
      dispatch(actionConveniosCards(filtrosBusqueda));
    }
  }, [dispatch, filtrosBusqueda]);

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
}, [dispatch, selectedEstadoId, selectedCiudadId]);

  const empresasFinalOptions =
    empresasOptionsDistinct.length > 0 ? empresasOptionsDistinct : empresasOptions;

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
      `/materias/laboral/convenios/crear/`,
      {
        state: {
          estado: selectedEstadoId,
          ciudad: selectedCiudadId,
        },
      }
    );
  };

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
                  Convenios · Materia laboral
                </Title>

                {estadoSeleccionado && ciudadSeleccionada ? (
                  <Text className="laboral-subtitle">
                    
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
            />
          </section>
        </div>
      </main>
    </>
  );
}
