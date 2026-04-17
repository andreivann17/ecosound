// src/pages/materias/laboral/LaboralProcedimientoPage/LaboralProcedimientoPage.jsx

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { printLaboralReportPdf, previewLaboralReportPdf } from "../../components/utils/printLaboralReportPdf";
import { useDispatch, useSelector } from "react-redux";
import ImportarExcelModal from "./utils/ImportarExcelModal.jsx";

import {
  Card,
  Typography,
  Button,
  Space,
  DatePicker,
  notification,
  Input,
  Select,
  AutoComplete,
  Row,
  Col,
  Modal,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  ClockCircleOutlined,
  StopOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";

import axios from "axios";

import { actionAutoridadesGet } from "../../redux/actions/autoridades/autoridades";
import { actionConciliacionGet } from "../../redux/actions/conciliacion/conciliacion";

// AJUSTA ESTE IMPORT A TU RUTA REAL:
import { actionEmpresasdistinct } from "../../redux/actions/empresas/empresas";
import ExpedienteCards from "../../components/expedientes/ExpedienteCards";
import { laboralTiposConfig, PAGE_SIZE } from "./materias/laboral/laboralProcedimiento.config.js";
import useLaboralCatalogos from "./materias/laboral/useLaboralCatalogos";
import useExpedientesProcedimiento from "./materias/laboral/useExpedientesProcedimiento";
import "./materias/laboral/LaboralProcedimientoPage.css";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const ALL = "__all__";

const API_BASE = `/api`;
const apiServiceGet = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

const authHeader = () => {
  const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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
;

const pickCompanyName = (it) =>
  it?.nombre ??
  it?.nombre_cliente ??
  it?.empresa ??
  it?.name ??
  it?.razon_social ??
  it?.empresa_nombre ??
  "";

export default function LaboralProcedimientoPage() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();

  const getParam = (k) => {
    const v = searchParams.get(k);
    return v === null ? null : v;
  };

  const toIntOrNull = (v) => {
    if (v === null || v === undefined) return null;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
  };
const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
const [exportPreviewHtml, setExportPreviewHtml] = useState("");
  const tipoConfig = laboralTiposConfig[tipo] || laboralTiposConfig["centro-conciliacion"];

  const concSlice = useSelector((state) => state.conciliacion || {});

  const autoridadesSlice = useSelector((state) => state.autoridades || {});
const [importModalOpen, setImportModalOpen] = useState(false);

  const statusById = useMemo(() => {
    const src = concSlice?.statusCatalog?.items || [];
    return src.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {});
  }, [concSlice]);

  // empresas distinct (NO Redux)
  const [empresasOptionsDistinct, setEmpresasOptionsDistinct] = useState([]);

  // ======= leer estado inicial desde URL =======
  const initialEstadoId = toIntOrNull(getParam("estado"));
  const initialCiudadId = toIntOrNull(getParam("ciudad"));
  const initialAutoridadId = toIntOrNull(getParam("autoridad"));
  const initialEmpresa = getParam("empresa"); // puede ser id o nombre
  const initialSearch = getParam("q") || "";
  const initialStatus = getParam("status") || "todos";
  const initialPage = toIntOrNull(getParam("page")) || 1;

  const d1 = getParam("d1"); // YYYY-MM-DD
  const d2 = getParam("d2"); // YYYY-MM-DD
  const initialDateRange = d1 && d2 ? [dayjs(d1, "YYYY-MM-DD"), dayjs(d2, "YYYY-MM-DD")] : null;

  // ======= states =======
  const [selectedEstadoId, setSelectedEstadoId] = useState(initialEstadoId ?? ALL);
const [selectedCiudadId, setSelectedCiudadId] = useState(initialCiudadId ?? ALL);
const [selectedAutoridadId, setSelectedAutoridadId] = useState(initialAutoridadId ?? ALL);

  const [selectedAutoridadData, setSelectedAutoridadData] = useState(null);

  const [search, setSearch] = useState(initialSearch);
const [searchDebounced, setSearchDebounced] = useState(initialSearch);

useEffect(() => {
  const t = setTimeout(() => {
    setSearchDebounced(search);
  }, 350); // 250-400ms funciona bien

  return () => clearTimeout(t);
}, [search]);


// subfiltros por sección
const initialSubAct = getParam("sub_act") || "todos";
const initialSubConv = getParam("sub_conv") || "todos";
const initialSubConc = getParam("sub_conc") || "todos";

const [statusFilter, setStatusFilter] = useState(initialStatus);

const [activosSubFilter, setActivosSubFilter] = useState(initialSubAct);
const [conveniosSubFilter, setConveniosSubFilter] = useState(initialSubConv);
const [concluidosSubFilter, setConcluidosSubFilter] = useState(initialSubConc);

  const [fueroFilter] = useState("todos");
  const [empresaFilter, setEmpresaFilter] = useState(initialEmpresa);
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [currentPage, setCurrentPage] = useState(initialPage);

  // catálogos (estados/ciudades/empresas)
  const estadoIdForCatalogos = selectedEstadoId === ALL ? null : selectedEstadoId;
const ciudadIdForCatalogos = selectedCiudadId === ALL ? null : selectedCiudadId;

const {
  estadosOptions,
  ciudadesOptions,
  empresasOptions,
  estadoSeleccionado,
  ciudadSeleccionada,
  estadosById,
  ciudadesById,
} = useLaboralCatalogos(estadoIdForCatalogos, ciudadIdForCatalogos);


  useEffect(() => {
    dispatch(actionAutoridadesGet({}));
  }, [dispatch]);
const handleExportNow = () => {
  const list = Array.isArray(filteredExpedientes) ? filteredExpedientes : [];

  const now = new Date();
  const y = now.getFullYear();

  const periodFrom = dateRange?.[0]
    ? dayjs(dateRange[0]).format("YYYY-MM-DD")
    : `${y}-01-01`;

  const periodTo = dateRange?.[1]
    ? dayjs(dateRange[1]).format("YYYY-MM-DD")
    : `${y}-12-31`;

  const ciudadesLabel =
    selectedCiudadId === ALL ? "Todas" : (ciudadSeleccionada?.nombre || "—");

const nombreEmpresa = collapseSpaces(search) || "Todas";  // ✅ oxxo, etc.

const html = previewLaboralReportPdf({
  items: list,
  periodFrom,
  periodTo,
  ciudadesLabel,
  nombreEmpresa,
});

setExportPreviewHtml(html);
setExportPreviewOpen(true);
}

  const autoridadesItems = useMemo(() => coerceItems(autoridadesSlice), [autoridadesSlice]);

  // Set de ciudades que SI tienen autoridades (para filtrar solo en centro-conciliación)
  const ciudadIdsConAutoridad = useMemo(() => {
    const s = new Set();
    (autoridadesItems || []).forEach((au) => {
      const idc = au?.id_ciudad;
      if (idc !== undefined && idc !== null && String(idc) !== "") {
        s.add(Number(idc));
      }
    });
    return s;
  }, [autoridadesItems]);

  // ✅ Set de estados que SI tienen al menos una ciudad con autoridad (para filtrar solo en centro-conciliación)
  const estadoIdsConAutoridad = useMemo(() => {
    const s = new Set();
    if (tipoConfig.key !== "centro-conciliacion") return s;

    ciudadIdsConAutoridad.forEach((idCiudad) => {
      const c = ciudadesById?.[String(idCiudad)] || ciudadesById?.[Number(idCiudad)];
      const idEstado = c?.id_estado ?? c?.idEstado ?? null;
      if (idEstado !== undefined && idEstado !== null && String(idEstado) !== "") {
        s.add(Number(idEstado));
      }
    });

    return s;
  }, [tipoConfig.key, ciudadIdsConAutoridad, ciudadesById]);

  // ✅ FILTRO de estados SOLO para Centro de Conciliación

const estadosOptionsFinal = useMemo(() => {
  const base = Array.isArray(estadosOptions) ? estadosOptions : [];

  const filtered =
    tipoConfig.key === "centro-conciliacion"
      ? base.filter((o) => estadoIdsConAutoridad.has(Number(o.value)))
      : base;

  return [{ label: "Todos los estados", value: ALL }, ...filtered];
}, [estadosOptions, tipoConfig.key, estadoIdsConAutoridad]);
  // ✅ FILTRO de ciudades SOLO para Centro de Conciliación
const ciudadesOptionsFinal = useMemo(() => {
  const base = Array.isArray(ciudadesOptions) ? ciudadesOptions : [];

  // Estado = ALL -> todas
  if (selectedEstadoId === ALL) {
    return [{ label: "Todas las ciudades", value: ALL }, ...base];
  }

  // 1) Filtra por estado seleccionado (blindado)
  const byEstado = base.filter((o) => {
    const city = ciudadesById?.[String(o.value)] || ciudadesById?.[Number(o.value)];
    const idEstado = city?.id_estado ?? city?.idEstado ?? null;
    return Number(idEstado) === Number(selectedEstadoId);
  });

  // 2) Si es centro-conciliacion, además filtra a ciudades con autoridad
  const filtered =
    tipoConfig.key === "centro-conciliacion"
      ? byEstado.filter((o) => ciudadIdsConAutoridad.has(Number(o.value)))
      : byEstado;

  return [{ label: "Todas las ciudades", value: ALL }, ...filtered];
}, [
  ciudadesOptions,
  ciudadesById,
  tipoConfig.key,
  ciudadIdsConAutoridad,
  selectedEstadoId,
]);
const autoridadOptions = useMemo(() => {
  // Si no hay ciudad elegida, o ciudad = ALL -> ÚNICA opción
  if (!selectedCiudadId || selectedCiudadId === ALL) {
    return [{ label: "Todas las autoridades", value: ALL, data: null }];
  }

  const base = (autoridadesItems || [])
    .filter((au) => Number(au?.id_ciudad || 0) === Number(selectedCiudadId))
    .map((au) => ({
      label: collapseSpaces(au?.nombre || ""),
      value: au?.id,
      data: au,
    }))
    .filter((o) => o.label);

  return [{ label: "Todas las autoridades", value: ALL, data: null }, ...base];
}, [autoridadesItems, selectedCiudadId]);


useEffect(() => {
  if (tipoConfig.key !== "centro-conciliacion") return;
  if (selectedEstadoId === ALL) return;
  if (!selectedEstadoId) return;

  // 🔒 si aún no hay datos “confiables”, NO resetees
  if (!estadoIdsConAutoridad || estadoIdsConAutoridad.size === 0) return;

  if (!estadoIdsConAutoridad.has(Number(selectedEstadoId))) {
    setSelectedEstadoId(ALL);
    setSelectedCiudadId(ALL);
    setSelectedAutoridadId(ALL);
    setSelectedAutoridadData(null);
    setEmpresaFilter(null);
    setCurrentPage(1);
  }
}, [tipoConfig.key, selectedEstadoId, estadoIdsConAutoridad]);

useEffect(() => {
  if (tipoConfig.key !== "centro-conciliacion") return;
  if (selectedCiudadId === ALL) return;
  if (!selectedCiudadId) return;

  // 🔒 igual aquí
  if (!ciudadIdsConAutoridad || ciudadIdsConAutoridad.size === 0) return;

  if (!ciudadIdsConAutoridad.has(Number(selectedCiudadId))) {
    setSelectedCiudadId(ALL);
    setSelectedAutoridadId(ALL);
    setSelectedAutoridadData(null);
    setEmpresaFilter(null);
    setCurrentPage(1);
  }
}, [tipoConfig.key, selectedCiudadId, ciudadIdsConAutoridad]);

  /* =========================
     DEFAULTS: Estado/Ciudad (primero) + Autoridad SOLO si hay 1
     ========================= */
useEffect(() => {
  if (selectedEstadoId == null) {
    setSelectedEstadoId(ALL);
    setSelectedCiudadId(ALL);
    setSelectedAutoridadId(ALL);
    setSelectedAutoridadData(null);
  }
}, [selectedEstadoId]);




useEffect(() => {
  const disponibles = Array.isArray(autoridadOptions) ? autoridadOptions : [];
  if (!disponibles.length) return;

  // Si ya es válido, no toques nada
  const exists = disponibles.some((o) => String(o.value) === String(selectedAutoridadId));
  if (exists) return;

  // Si NO existe, fuerza ALL (no “la primera”) para evitar brincos raros
  setSelectedAutoridadId(ALL);
  setSelectedAutoridadData(null);
}, [autoridadOptions, selectedAutoridadId]);


const handleChangeEstado = (value) => {
  const v = value ?? ALL;

  setSelectedEstadoId(v);

  // si cambias estado -> ciudad a ALL por defecto
  setSelectedCiudadId(ALL);

  // autoridad siempre seleccionada
  setSelectedAutoridadId(ALL);
  setSelectedAutoridadData(null);

  setEmpresaFilter(null);
  setCurrentPage(1);
};

  const handleChangeCiudad = (value) => {
  const v = value ?? ALL;

  setSelectedCiudadId(v);

  // autoridad se define en el effect de abajo (primera opción)
  setSelectedAutoridadId(ALL);
  setSelectedAutoridadData(null);

  setEmpresaFilter(null);
  setCurrentPage(1);
};


  /* =========================
     filtros backend (mantengo tu flujo: estado+ciudad+tipo)
     AHORA: también manda empresa + expediente
     ========================= */
const filtrosBusqueda = useMemo(() => {
  const term = collapseSpaces(searchDebounced);

  const isNumericLike = (v) => {
    if (v === null || v === undefined) return false;
    const s = String(v).trim();
    return s !== "" && !Number.isNaN(Number(s));
  };

  const empresaName =
    empresaFilter && !isNumericLike(empresaFilter) ? collapseSpaces(empresaFilter) : null;

  const id_empresa =
    empresaFilter && isNumericLike(empresaFilter) ? Number(empresaFilter) : undefined;

  const date_from =
    dateRange?.[0] ? dayjs(dateRange[0]).format("YYYY-MM-DD") : undefined;

  const date_to =
    dateRange?.[1] ? dayjs(dateRange[1]).format("YYYY-MM-DD") : undefined;

  return {
    tipo_conciliacion: tipoConfig.key,

    estado: selectedEstadoId !== ALL ? selectedEstadoId : undefined,
    ciudad: selectedCiudadId !== ALL ? selectedCiudadId : undefined,
    autoridad: selectedAutoridadId !== ALL ? selectedAutoridadId : undefined,

    id_empresa,
    empresa: empresaName || undefined,

    search: term || undefined,

    // ✅ NUEVO: backend
    date_from,
    date_to,
  };
}, [
  selectedEstadoId,
  selectedCiudadId,
  selectedAutoridadId,
  tipoConfig.key,
  empresaFilter,
  searchDebounced,
  dateRange,
]);

// --- deja esto arriba como ya lo tienes ---
const lastFetchKeyRef = useRef("");
const tPageRef = useRef(performance.now());

useEffect(() => {
  if (!filtrosBusqueda) return;

  // clave estable: evita re-fetch por renders
  const fetchKey = JSON.stringify(filtrosBusqueda);
  if (lastFetchKeyRef.current === fetchKey) return;
  lastFetchKeyRef.current = fetchKey;

  // (opcional) quita mediciones si no las necesitas
  const t0 = performance.now();
 

  console.log("[LP] dispatch actionConciliacionGet filtrosBusqueda:", filtrosBusqueda);
const p = dispatch(actionConciliacionGet(filtrosBusqueda));

  Promise.resolve(p)
    .then(() => {
      console.timeEnd("[LP] actionConciliacionGet");
      console.log(
        `[LP] conciliacion resolved in ${(performance.now() - t0).toFixed(0)}ms | since mount ${(performance.now() - tPageRef.current).toFixed(0)}ms`
      );
    })
    .catch(() => {
      console.timeEnd("[LP] actionConciliacionGet");
      console.log(
        `[LP] conciliacion ERROR after ${(performance.now() - t0).toFixed(0)}ms | since mount ${(performance.now() - tPageRef.current).toFixed(0)}ms`
      );
    });
}, [dispatch, filtrosBusqueda]);


  /* =========================
     Empresas distinct (NO Redux): NO TOCADO
     ========================= */
useEffect(() => {
  let isMounted = true;

  const loadEmpresasDistinct = async () => {
    // ✅ si no hay selección real, no pidas distinct
    if (!selectedEstadoId || !selectedCiudadId) {
      if (isMounted) setEmpresasOptionsDistinct([]);
      return;
    }

    // ✅ si está en ALL/ALL, NO tiene sentido pedir distinct (y suele ser query pesada)
    if (selectedEstadoId === ALL || selectedCiudadId === ALL) {
      if (isMounted) setEmpresasOptionsDistinct([]);
      return;
    }

    const resp = await dispatch(
      actionEmpresasdistinct({
        estado: selectedEstadoId,
        ciudad: selectedCiudadId,
        autoridad: selectedAutoridadId !== ALL ? selectedAutoridadId : undefined,
        tipo_conciliacion: tipoConfig.key,
      })
    );

    if (!isMounted) return;

    if (typeof resp === "string") {
      setEmpresasOptionsDistinct([]);
      return;
    }

    const arr = Array.isArray(resp) ? resp : resp?.items || resp?.data || [];
    const options = Array.isArray(arr)
      ? arr
          .map((x) => {
            const label =
              (typeof x === "string" ? x : x?.razon_social || x?.nombre) || "";
            const clean = collapseSpaces(label);
            if (!clean) return null;

            const id =
              typeof x === "object"
                ? x?.id ?? x?.id_empresa ?? x?.empresa_id ?? null
                : null;

            return { label: clean, value: id ?? clean };
          })
          .filter(Boolean)
      : [];

    setEmpresasOptionsDistinct(options);
  };

  loadEmpresasDistinct();

  return () => {
    isMounted = false;
  };
}, [dispatch, selectedEstadoId, selectedCiudadId, selectedAutoridadId, tipoConfig.key]);

const exportCities = useMemo(() => {
  const base = Array.isArray(ciudadesOptions) ? ciudadesOptions : [];
  // ciudadesOptions: [{label, value}]
  return base
    .filter(x => x?.value !== ALL)
    .map(x => ({ id: Number(x.value), name: String(x.label) }));
}, [ciudadesOptions]);


const empresasFinalOptions =
  empresasOptionsDistinct.length > 0 ? empresasOptionsDistinct : empresasOptions;

const exportCompanies = useMemo(() => {
  const base = Array.isArray(empresasFinalOptions) ? empresasFinalOptions : [];
  return base
    .filter(x => x?.value !== ALL && x?.value != null)
    .map(x => ({ id: Number(x.value), name: String(x.label) }));
}, [empresasFinalOptions]);



  /* =========================
     NUEVO: Empresa/Corresponsal (AutoComplete tipo FormDesvinculaciones)
     - sin razón social
     ========================= */
  const [empresaSearchValue, setEmpresaSearchValue] = useState("");
  const [empresaSearchOptions, setEmpresaSearchOptions] = useState([]);
  const [empresaSearching, setEmpresaSearching] = useState(false);
  const empresaSearchTimeoutRef = useRef(null);

  const [empresaDisabledNombre, setEmpresaDisabledNombre] = useState("");
  const [corresponsalDisabledNombre, setCorresponsalDisabledNombre] = useState("");

  const isNumericLike = (v) => {
    if (v === null || v === undefined) return false;
    const s = String(v).trim();
    return s !== "" && !Number.isNaN(Number(s));
  };

  const resetEmpresaSelection = () => {
    setEmpresaFilter(null);
    setEmpresaSearchValue("");
    setEmpresaSearchOptions([]);
    setEmpresaDisabledNombre("");
    setCorresponsalDisabledNombre("");
    setCurrentPage(1);
  };

  const fetchEmpresas = async (q) => {
    const query = (q || "").trim();
    if (!query) return [];

    try {
      setEmpresaSearching(true);
      const { data } = await apiServiceGet.get("empresas/search", {
        params: { q: query, limit: 10 },
        headers: authHeader(),
      });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Error /empresas/search:", err?.response?.status || err);
      return [];
    } finally {
      setEmpresaSearching(false);
    }
  };

  const buildEmpresaOptions = (hits) => {
    const opts = [];
    const seen = new Set();
    const MAX = 10;

    for (const it of hits || []) {
      if (opts.length >= MAX) break;

      const empresaNombre = collapseSpaces(pickCompanyName(it) || it?.nombre || "");
      if (!empresaNombre) continue;

      const nCorr = collapseSpaces(
        it?.nombre_corresponsal ||
          it?.corresponsal_nombre ||
          it?.nombre_contacto ||
          it?.contacto_nombre ||
          ""
      );

      const correo = collapseSpaces(it?.correo_corresponsal || it?.corresponsal_correo || it?.email_corresponsal || "");
      const celular = collapseSpaces(it?.celular_corresponsal || it?.corresponsal_celular || it?.telefono_corresponsal || "");

      const key = empresaNombre.toLowerCase() + "|" + (nCorr || "-").toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const empresaId = it?.id_empresa ?? it?.id ?? it?.empresa_id ?? null;

      const optionValue = empresaId != null ? String(empresaId) : empresaNombre;

      opts.push({
        value: optionValue,
        label: (
          <div>
            <div style={{ fontWeight: 600 }}>{empresaNombre}</div>

            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Corresponsal: {nCorr || "—"}
            </div>

            {correo || celular ? (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                {correo || ""}
                {correo && celular ? " • " : ""}
                {celular || ""}
              </div>
            ) : null}
          </div>
        ),
        empresa_id: empresaId,
        empresa_nombre: empresaNombre,
        corresponsal_nombre: nCorr || "",
      });
    }

    return opts;
  };

  const handleEmpresaSearch = (value) => {
    setEmpresaSearchValue(value);

    const q = (value || "").trim();
    if (!q) {
      setEmpresaSearchOptions([]);
      setEmpresaDisabledNombre("");
      setCorresponsalDisabledNombre("");
      return;
    }

    if (empresaSearchTimeoutRef.current) clearTimeout(empresaSearchTimeoutRef.current);

    empresaSearchTimeoutRef.current = setTimeout(async () => {
      const hits = await fetchEmpresas(q);
      const opts = buildEmpresaOptions(hits);
      setEmpresaSearchOptions(opts);
    }, 300);
  };

  const handleEmpresaSelect = (value, option) => {
    // value puede ser ID (string num) o nombre
    const v = value || null;

    setEmpresaFilter(v);
    setCurrentPage(1);

    setEmpresaDisabledNombre(option?.empresa_nombre || "");
    setCorresponsalDisabledNombre(option?.corresponsal_nombre || "");

    // en el input mostramos el nombre (no el id)
    setEmpresaSearchValue(option?.empresa_nombre || (isNumericLike(v) ? "" : String(v || "")));
  };

  const handleEmpresaChange = (val) => {
    const v = String(val ?? "");
    setEmpresaSearchValue(v);

    if (!v.trim()) {
      resetEmpresaSelection();
      return;
    }
  };

  // ✅ cuando entra por URL con empresa=id o empresa=nombre, reflejar en el UI (simple)
  useEffect(() => {
    if (empresaFilter == null || empresaFilter === "") {
      setEmpresaSearchValue("");
      setEmpresaDisabledNombre("");
      setCorresponsalDisabledNombre("");
      return;
    }

    // si es nombre, lo pongo directo; si es id, dejo el id como filtro pero el input vacío (hasta que seleccione)
    if (!isNumericLike(empresaFilter)) {
      setEmpresaSearchValue(String(empresaFilter));
      setEmpresaDisabledNombre(String(empresaFilter));
      // corresponsal no lo sabemos aquí
    }
  }, [empresaFilter]);

const {
  statusCounts,
  filteredExpedientes,
  paginatedExpedientes,
  totalExp,
} = useExpedientesProcedimiento({
  concSlice,
  search: searchDebounced,
  statusFilter,

  activosSubFilter,
  conveniosSubFilter,
  concluidosSubFilter,

  fueroFilter,
  empresaFilter,
  dateRange,
  currentPage,
  pageSize: PAGE_SIZE,
  setCurrentPage,
});


  const goBackToLaboralMenu = () => navigate("/home");

  const handleCrearExpediente = () => {
    if (!selectedEstadoId || !selectedCiudadId || !selectedAutoridadId) {
      notification.warning({
        message: "Faltan selecciones",
        description: "Selecciona Estado, Ciudad y Autoridad antes de crear el expediente.",
      });
      return;
    }

    const nombreIdent = selectedAutoridadData?.nombre_identificacion_ciudad || "";


    navigate(`/materias/laboral/centro-conciliacion/crear`, {
      state: {
        estado: selectedEstadoId,
        ciudad: selectedCiudadId,
        idAutoridad: selectedAutoridadId,
        nombreIdentificacionCiudad: nombreIdent || null,
      },
    });
  };

  const setOrDelete = (sp, key, value) => {
    if (value === null || value === undefined || value === "" || value === "todos") {
      sp.delete(key);
      return;
    }
    sp.set(key, String(value));
  };

  useEffect(() => {
    const sp = new URLSearchParams(searchParams);

    setOrDelete(sp, "estado", selectedEstadoId);
    setOrDelete(sp, "ciudad", selectedCiudadId);
    setOrDelete(sp, "autoridad", selectedAutoridadId);

    // empresa puede ser id o nombre
    setOrDelete(sp, "empresa", empresaFilter);

    // búsqueda
    setOrDelete(sp, "q", collapseSpaces(search));

    // status + substatus
    setOrDelete(sp, "status", statusFilter);
    setOrDelete(sp, "sub", concluidosSubFilter);

    // fechas
    if (dateRange?.[0] && dateRange?.[1]) {
      sp.set("d1", dayjs(dateRange[0]).format("YYYY-MM-DD"));
      sp.set("d2", dayjs(dateRange[1]).format("YYYY-MM-DD"));
    } else {
      sp.delete("d1");
      sp.delete("d2");
    }

    // paginación
    setOrDelete(sp, "page", currentPage);

    const next = sp.toString();
    const prev = searchParams.toString();
    if (next !== prev) setSearchParams(sp, { replace: true });
  }, [
    selectedEstadoId,
    selectedCiudadId,
    selectedAutoridadId,
    empresaFilter,
    search,
    statusFilter,
    concluidosSubFilter,
    dateRange,
    currentPage,
    setSearchParams,
    searchParams,
  ]);
const totalEncontrados = Array.isArray(filteredExpedientes) ? filteredExpedientes.length : 0;
const mapsMemo = useMemo(() => {
  return { ciudadesById, estadosById, statusById };
}, [ciudadesById, estadosById, statusById]);

  return (
    <>
      <main className="laboral-main">
        <Modal
  open={exportPreviewOpen}
  onCancel={() => setExportPreviewOpen(false)}
  title="Previsualización"
  width={980}
  centered
  destroyOnClose
  footer={[
    <Button key="close" onClick={() => setExportPreviewOpen(false)}>Cerrar</Button>,
    <Button
      key="export"
      type="primary"
      onClick={() => {
  const list = Array.isArray(filteredExpedientes) ? filteredExpedientes : [];

  const now = new Date();
  const y = now.getFullYear();

  const periodFrom = dateRange?.[0]
    ? dayjs(dateRange[0]).format("YYYY-MM-DD")
    : `${y}-01-01`;

  const periodTo = dateRange?.[1]
    ? dayjs(dateRange[1]).format("YYYY-MM-DD")
    : `${y}-12-31`;

  const ciudadesLabel =
    selectedCiudadId === ALL ? "Todas" : (ciudadSeleccionada?.nombre || "—");

  const nombreEmpresa = collapseSpaces(search) || "Todas";

  printLaboralReportPdf({
    items: list,
    periodFrom,
    periodTo,
    ciudadesLabel,
    nombreEmpresa,
  });
}}
    >
      Exportar PDF
    </Button>
    ,
  ]}
>
  <div style={{ height: "72vh", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
    <iframe
      title="preview"
      style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
      srcDoc={exportPreviewHtml}
    />
  </div>
</Modal>
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

                <Title level={2} className="laboral-title">
                  {tipoConfig.title} · Materia laboral
                </Title>

                {estadoSeleccionado && ciudadSeleccionada ? (
                  <Text className="laboral-subtitle">
                    Expedientes de {tipoConfig.shortLabel.toLowerCase()} en <b>{estadoSeleccionado.nombre}</b> /{" "}
                    <b>{ciudadSeleccionada.nombre}</b>.
                  </Text>
                ) : (
                  <Text className="laboral-subtitle">Selecciona un estado y una ciudad para ver los expedientes.</Text>
                )}
              </Space>
            </div>
          </section>

          {/* EXPEDIENTES */}
          <section className="laboral-section">
            {/* PANEL FILTROS (como imagen 1) */}

<div className="laboral-filters-panel">
  {/* Fila 1: Estado / Ciudad / Autoridad */}
  <Row gutter={[16, 14]}>
    <Col xs={24} md={8}>
      <div className="laboral-field">
        <div className="laboral-field-label">ESTADO</div>
        <Select
     
          showSearch
          placeholder="Selecciona un estado"
          options={estadosOptionsFinal}
          value={selectedEstadoId}
          onChange={handleChangeEstado}
          className="laboral-control"
        />
      </div>
    </Col>

    <Col xs={24} md={8}>
      <div className="laboral-field">
        <div className="laboral-field-label">CIUDAD</div>
        <Select
    
          showSearch
          placeholder={selectedEstadoId ? "Selecciona una ciudad" : "Selecciona un estado primero"}
          options={ciudadesOptionsFinal}
          value={selectedCiudadId}
          onChange={handleChangeCiudad}
          disabled={!selectedEstadoId}
          className="laboral-control"
        />
      </div>
    </Col>

    <Col xs={24} md={8}>
      <div className="laboral-field">
        <div className="laboral-field-label">AUTORIDAD</div>
        <Select

          showSearch
          optionFilterProp="label"
          placeholder={selectedCiudadId ? "Escribe o selecciona la autoridad" : "Selecciona una ciudad primero"}
          options={autoridadOptions}
          value={selectedAutoridadId}
          onChange={(value, option) => {
  const v = value ?? ALL;
  setSelectedAutoridadId(v);
  setSelectedAutoridadData(option?.data || null);
  setCurrentPage(1);
}}
          disabled={!selectedCiudadId}
          className="laboral-control"
        />
      </div>
    </Col>
  </Row>

  {/* Fila 2: Buscador (izq, ancho) + Fecha (centro, fija) + Botones (der) */}
  <Row gutter={[16, 14]} className="laboral-filter-row-2" align="bottom">
    {/* Buscador ancho */}
    <Col xs={24} lg={12} xl={11}>
      <div className="laboral-field">
        <div className="laboral-field-label">BUSCADOR</div>

        {/* Mantengo tu lógica de empresaFilter pero NO lo muestro como fila extra.
            Si quieres seguir usando empresa (sin romper layout),
            úsalo como autocomplete “oculto” para seleccionar empresa por keyboard/pegado,
            o deja solo el buscador general como en el HTML.
        */}

        <Input
  value={search}
  onChange={(e) => {
    const v = e.target.value;
    setSearch(v);              // ✅ solo buscador general
    setCurrentPage(1);
  }}
  placeholder="Buscar por expediente, empresa o corresponsal..."
  suffix={<SearchOutlined className="laboral-input-suffix" />}
  className="laboral-control"
/>
      </div>
    </Col>

    {/* Fecha fija tipo “Inicio - Fin” */}
    <Col xs={24} lg={7} xl={7}>
      <div className="laboral-field">
        <div className="laboral-field-label">FECHA DE EMISIÓN EXPEDIENTE</div>

        <RangePicker
          value={dateRange}
          onChange={(values) => {
            setDateRange(values);
            setCurrentPage(1);
          }}
          format="YYYY-MM-DD"
     
          className="laboral-control laboral-range-like-html"
        />
      </div>
    </Col>

    {/* Botones */}
    <Col xs={24} lg={5} xl={6}>
      <div className="laboral-field">
        <div className="laboral-field-label">&nbsp;</div>

        <div className="laboral-actions">
          <Button
            onClick={() => {
              resetEmpresaSelection();
              setSearch("");
              setDateRange(null);
              setStatusFilter("todos");
              setConcluidosSubFilter("todos");
              setCurrentPage(1);
            }}
            className="laboral-btn-clean"
          >
            Limpiar
          </Button>

        
        </div>
      </div>
    </Col>
  </Row>

  {/* (Opcional) si NO quieres perder empresa/corresponsal, déjalos fuera del layout visible.
      NO rompo tu lógica: solo lo oculto.
  */}
  <div style={{ display: "none" }}>
    <AutoComplete
      value={empresaSearchValue}
      options={empresaSearchOptions}
      onSearch={handleEmpresaSearch}
      onSelect={handleEmpresaSelect}
      onChange={handleEmpresaChange}

      filterOption={false}
    />
    <Input disabled value={corresponsalDisabledNombre || ""} />
  </div>
</div>


            {/* Cards estadísticos */}
            <div className="laboral-stats-row">
              <Card
                className={`laboral-stat-card laboral-stat-activos ${statusFilter === "activos" ? "laboral-stat-active" : ""}`}
                hoverable
                onClick={() => {
  setStatusFilter((prev) => (prev === "activos" ? "todos" : "activos"));
  setActivosSubFilter("todos");
  setConveniosSubFilter("todos");
  setConcluidosSubFilter("todos");
  setCurrentPage(1);
}}
              >
                <Space align="center" size={10}>
                  <div className="laboral-stat-icon">
                    <CheckCircleOutlined />
                  </div>
                  <div>
                    <div className="laboral-stat-value">{statusCounts.activos}</div>
                    <div className="laboral-stat-label">Activos</div>
                  </div>
                </Space>
              </Card>

          

              <Card
                className={`laboral-stat-card laboral-stat-convenios ${statusFilter === "convenios" ? "laboral-stat-active" : ""}`}
                hoverable
                onClick={() => {
  const next = statusFilter === "convenios" ? "todos" : "convenios";
  setStatusFilter(next);

  // reset de otros subfiltros
  setActivosSubFilter("todos");
  setConcluidosSubFilter("todos");

  // si abres convenios, deja “todo” seleccionado; si cierras, resetea igual
  setConveniosSubFilter("todos");
  setCurrentPage(1);
}}
              >
                <Space align="center" size={10}>
                  <div className="laboral-stat-icon">
                    <FileDoneOutlined />
                  </div>
                  <div>
                    <div className="laboral-stat-value">{statusCounts.convenios}</div>
                    <div className="laboral-stat-label">Convenios</div>
                  </div>
                </Space>
              </Card>

              <Card
                className={`laboral-stat-card laboral-stat-concluidos ${statusFilter === "concluidos" ? "laboral-stat-active" : ""}`}
                hoverable
                onClick={() => {
  setStatusFilter((prev) => (prev === "concluidos" ? "todos" : "concluidos"));
  setActivosSubFilter("todos");
  setConveniosSubFilter("todos");
  setConcluidosSubFilter("todos");
  setCurrentPage(1);
}}
              >
                <Space align="center" size={10}>
                  <div className="laboral-stat-icon">
                    <StopOutlined />
                  </div>
                  <div>
                    <div className="laboral-stat-value">{statusCounts.concluidos}</div>
                    <div className="laboral-stat-label">Concluidos</div>
                  </div>
                </Space>
              </Card>
              <Card
  className={`laboral-stat-card laboral-stat-vencidos ${statusFilter === "vencidos" ? "laboral-stat-active" : ""}`}
  hoverable
  onClick={() => {
    setStatusFilter((prev) => (prev === "vencidos" ? "todos" : "vencidos"));
    setConcluidosSubFilter("todos");
    setCurrentPage(1);
  }}
>
  <Space align="center" size={10}>
<div className="laboral-stat-icon laboral-stat-icon-vencidos">
      <CloseCircleOutlined />
    </div>
    <div>
      <div className="laboral-stat-value">{statusCounts?.vencidos ?? 0}</div>
      <div className="laboral-stat-label">Vencidos</div>
    </div>
  </Space>
</Card>
            </div>
{/* Subfiltros de Activos */}
<div className={`laboral-substats-wrap ${statusFilter === "activos" ? "is-open" : ""}`}>
  <div className="laboral-stats-row laboral-substats-row">
    <Card
      className={`laboral-stat-card ${activosSubFilter === "primera" ? "laboral-stat-active" : ""}`}
      hoverable
      onClick={() => {
        setActivosSubFilter((prev) => (prev === "primera" ? "todos" : "primera"));
        setCurrentPage(1);
      }}
    >
      <Space align="center" size={10}>
        <div className="laboral-stat-icon">
          <CheckCircleOutlined />
        </div>
        <div>
          <div className="laboral-stat-value">{statusCounts?.activosPrimera ?? 0}</div>
          <div className="laboral-stat-label">Primera audiencia</div>
        </div>
      </Space>
    </Card>

    <Card
      className={`laboral-stat-card ${activosSubFilter === "subsecuente" ? "laboral-stat-active" : ""}`}
      hoverable
      onClick={() => {
        setActivosSubFilter((prev) => (prev === "subsecuente" ? "todos" : "subsecuente"));
        setCurrentPage(1);
      }}
    >
      <Space align="center" size={10}>
        <div className="laboral-stat-icon">
          <CheckCircleOutlined />
        </div>
        <div>
          <div className="laboral-stat-value">{statusCounts?.activosSubsecuente ?? 0}</div>
          <div className="laboral-stat-label">Subsecuente</div>
        </div>
      </Space>
    </Card>

    <Card
      className={`laboral-stat-card ${activosSubFilter === "todos" ? "laboral-stat-active" : ""}`}
      hoverable
      onClick={() => {
        setActivosSubFilter("todos");
        setCurrentPage(1);
      }}
    >
      <Space align="center" size={10}>
        <div className="laboral-stat-icon">
          <CheckCircleOutlined />
        </div>
        <div>
          <div className="laboral-stat-value">{statusCounts?.activos ?? 0}</div>
          <div className="laboral-stat-label">Todo</div>
        </div>
      </Space>
    </Card>
  </div>
</div>
{/* Subfiltros de Convenios */}
<div className={`laboral-substats-wrap ${statusFilter === "convenios" ? "is-open" : ""}`}>
  <div className="laboral-stats-row laboral-substats-row">

    <Card
      className={`laboral-stat-card ${conveniosSubFilter === "convenio" ? "laboral-stat-active" : ""}`}
      hoverable
      onClick={() => {
        setConveniosSubFilter((prev) => (prev === "convenio" ? "todos" : "convenio"));
        setCurrentPage(1);
      }}
    >
      <Space align="center" size={10}>
        <div className="laboral-stat-icon">
          <FileDoneOutlined />
        </div>
        <div>
          <div className="laboral-stat-value">{statusCounts?.conveniosOnly ?? 0}</div>
          <div className="laboral-stat-label">Convenios</div>
        </div>
      </Space>
    </Card>

    <Card
      className={`laboral-stat-card ${conveniosSubFilter === "constancia" ? "laboral-stat-active" : ""}`}
      hoverable
      onClick={() => {
        setConveniosSubFilter((prev) => (prev === "constancia" ? "todos" : "constancia"));
        setCurrentPage(1);
      }}
    >
      <Space align="center" size={10}>
        <div className="laboral-stat-icon">
          <CloseCircleOutlined />
        </div>
        <div>
          <div className="laboral-stat-value">{statusCounts?.constanciasOnly ?? 0}</div>
          <div className="laboral-stat-label">Cumplimientos</div>
        </div>
      </Space>
    </Card>

    <Card
      className={`laboral-stat-card ${conveniosSubFilter === "todos" ? "laboral-stat-active" : ""}`}
      hoverable
      onClick={() => {
        setConveniosSubFilter("todos");
        setCurrentPage(1);
      }}
    >
      <Space align="center" size={10}>
        <div className="laboral-stat-icon">
          <FileDoneOutlined />
        </div>
        <div>
          <div className="laboral-stat-value">{statusCounts?.convenios ?? 0}</div>
          <div className="laboral-stat-label">Todo</div>
        </div>
      </Space>
    </Card>

  </div>
</div>
            {/* Subfiltros de Concluidos */}
            <div className={`laboral-substats-wrap ${statusFilter === "concluidos" ? "is-open" : ""}`}>
              <div className="laboral-stats-row laboral-substats-row">
           

                <Card
                  className={`laboral-stat-card ${concluidosSubFilter === "archivo_patron" ? "laboral-stat-active" : ""}`}
                  hoverable
                  onClick={() => {
                    setConcluidosSubFilter((prev) => (prev === "archivo_patron" ? "todos" : "archivo_patron"));
                    setCurrentPage(1);
                  }}
                >
                  <Space align="center" size={10}>
                    <div className="laboral-stat-icon">
                      <StopOutlined />
                    </div>
                    <div>
                      <div className="laboral-stat-value">{statusCounts?.archivoPatron ?? 0}</div>
                      <div className="laboral-stat-label">Archivo por incomparecencia (patrón)</div>
                    </div>
                  </Space>
                </Card>

                <Card
                  className={`laboral-stat-card ${concluidosSubFilter === "archivo_trabajador" ? "laboral-stat-active" : ""}`}
                  hoverable
                  onClick={() => {
                    setConcluidosSubFilter((prev) => (prev === "archivo_trabajador" ? "todos" : "archivo_trabajador"));
                    setCurrentPage(1);
                  }}
                >
                  <Space align="center" size={10}>
                    <div className="laboral-stat-icon">
                      <StopOutlined />
                    </div>
                    <div>
                      <div className="laboral-stat-value">{statusCounts?.archivoTrabajador ?? 0}</div>
                      <div className="laboral-stat-label">Archivo por incomparecencia (trabajador)</div>
                    </div>
                  </Space>
                </Card>

                <Card
                  className={`laboral-stat-card ${
                    concluidosSubFilter === "constancia_no_conciliacion" ? "laboral-stat-active" : ""
                  }`}
                  hoverable
                  onClick={() => {
                    setConcluidosSubFilter((prev) =>
                      prev === "constancia_no_conciliacion" ? "todos" : "constancia_no_conciliacion"
                    );
                    setCurrentPage(1);
                  }}
                >
                  <Space align="center" size={10}>
                    <div className="laboral-stat-icon">
                      <CloseCircleOutlined />
                    </div>
                    <div>
                      <div className="laboral-stat-value">{statusCounts?.constanciaNoConciliacion ?? 0}</div>
                      <div className="laboral-stat-label">Constancia de no conciliación</div>
                    </div>
                  </Space>
                </Card>
              </div>
            </div>

            {/* Encabezado (se queda, pero ya sin buscador ni empresa aquí) */}
            <div className="laboral-toolbar" style={{ marginTop: 18, marginBottom: 20 }}>
              <div className="laboral-toolbar-left">
                <Title level={4} className="laboral-section-title" style={{ marginBottom: 0 }}>
  Expedientes ({totalEncontrados})
</Title>
<Text type="secondary">{totalEncontrados} encontrados</Text>

              </div>
              <div className="laboral-toolbar-right">
          <Button
  type="secondary"
  style={{ minWidth: 160 }}
  icon={<PlusOutlined />}
  onClick={handleExportNow}
  disabled={!selectedAutoridadId}
  className="laboral-btn-create"
>
  Exportar
</Button>
<Button
  icon={<UploadOutlined />}
  onClick={() => setImportModalOpen(true)}
  className="laboral-btn-import"
>
  Importar Excel
</Button>

                <Button
            type="primary"
            style={{minWidth:160}}
            icon={<PlusOutlined />}
            onClick={handleCrearExpediente}
            disabled={!selectedAutoridadId}
            className="laboral-btn-create custom-button"
          >
            Crear
          </Button>
          </div>
            </div>

<ImportarExcelModal
  open={importModalOpen}
  onClose={() => setImportModalOpen(false)}
  onSuccess={() => dispatch(actionConciliacionGet(filtrosBusqueda))}
  context={{
    estado:            selectedEstadoId !== ALL ? selectedEstadoId : undefined,
    ciudad:            selectedCiudadId !== ALL ? selectedCiudadId : undefined,
    autoridad:         selectedAutoridadId !== ALL ? selectedAutoridadId : undefined,
    tipo_conciliacion: tipoConfig.key,
  }}
/>
            <ExpedienteCards
              items={paginatedExpedientes}
              PAGE_SIZE={PAGE_SIZE}
              currentPage={currentPage}
              filteredExpedientes={filteredExpedientes}
              setCurrentPage={setCurrentPage}
              maps={mapsMemo}
              tipo={tipo}
              persistSearch={location.search} // ✅ NUEVO
            />
          </section>
        </div>

       
      </main>
    </>
  );
}
