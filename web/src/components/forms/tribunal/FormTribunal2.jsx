import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AddCatalogOptionModal from "../../modals/tribunal/AddCatalogOptionModal";
import { actionConciliacionSearchExpedientes } from "../../../redux/actions/conciliacion/conciliacion";

import { actionAutoridadesTribunalGet } from "../../../redux/actions/autoridades/autoridades";
import useLaboralCatalogos from "../../../containers/pages/materias/laboral/useLaboralCatalogos";
import { actionEmpresasGet } from "../../../redux/actions/empresas/empresas";
import { message, notification, Select, Divider, Input, Button, Spin, AutoComplete, Checkbox, Tag,Switch } from "antd";
import axios from "axios";
import { PATH } from "../../../redux/utils";
import { useNavigate } from "react-router-dom";
import "../tribunal/FormTribunal.css";
import "../../modals/tribunal/selectAddNew.css";

const collapseSpaces = (s) => String(s || "").replace(/\s+/g, " ").trim();
const toArray = (v) => {
  if (Array.isArray(v)) return v.filter((x) => x != null && String(x).trim() !== "");
  if (v == null || String(v).trim() === "") return [];
  return [v];
};

const buildExpedienteOptionLabel = (it) => {
  // ✅ Conciliación
  const exp = collapseSpaces(it?.expediente || it?.expediente_format || "");
  const trabajador = collapseSpaces(it?.nombre_trabajador || it?.trabajador_nombre || it?.nombre_parte_actora || "");
  const empresa = collapseSpaces(it?.nombre_empresa || it?.empresa_nombre || it?.empresa || "");

  // ✅ fallback por si algún endpoint manda otros nombres
  const titulo = exp || collapseSpaces(it?.num_unico || it?.numero_unico || it?.identificador || "") || "Expediente";
  const linea2 = `${trabajador || "—"} vs ${empresa || "—"}`;

  return (
    <div>
      <div style={{ fontWeight: 600 }}>{titulo}</div>
      <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "normal" }}>{linea2}</div>
      <div style={{ fontSize: 12, color: "#9ca3af" }}>
        {exp ? `Expediente: ${exp}` : ""}
      </div>
    </div>
  );
};
export default function FormTribunal({
  isEdit,
  idCiudad,
  idExpediente,
  initialValues,
  idAutoridad,
  nombreIdentificacionCiudad,
  onCancel,
  onSubmit,
}) {
  /* =========================
   * Estado base (inputs)
   * ========================= */
  
  const [newEmpresaNombre, setNewEmpresaNombre] = useState("");
  const [newRazonSocialNombre, setNewRazonSocialNombre] = useState("");
  const [api, contextHolder] = notification.useNotification();
const [catalogOverrides, setCatalogOverrides] = useState({}); 

  const defaults = useMemo(
    () => ({
      // DATOS GENERALES

      // (6,9) nuevo orden/renombre
      numero_expediente: "",
      // (8,9) nuevo
      nombre_parte_actora: "",

      // (2,3) ahora ES MULTI y renombrado a DEMANDA/NOTIFICACION en UI (en estado queda citatorio)
      citatorio: [],

      // ✅ Empresa / razón social / corresponsal
      empresa_id: null,
      empresa_nombre: "",
      empresa_razon_social_ids: [],

      // (9) luego estado/ciudad/autoridad
      estado: null,
      ciudad: null,
      autoridad: null,

      // (4,7,9) fecha notificación demanda
      fecha_notificacion_demanda: "",

      // (5,9) fecha presentación demanda
      fecha_presentacion_demanda: "",

      // (9) corresponsal
      corresponsal_nombre: "No hay corresponsal",

      // (9) núm único al final del bloque general
      num_unico: "",

      // ETAPAS PROCESALES
      fecha_limite_contestacion: "",
      // (1) ya NO obligatoria, la dejamos opcional
      fecha_audiencia_conciliatoria: "",
      observaciones_etapa_actual: "",

      // ACCIONES Y PRESTACIONES
      // (10) eliminado trabajador_nombre
      accion_intentada: "",
      // (13) eliminado fecha_recepcion_demanda

      prestaciones: {
        indemnizacion_const: false,
        prima_antiguedad: false,
        salarios_caidos: false,
        vacaciones: false,
        prima_vacacional: false,
        aguinaldo: false,
        reparto_utilidades: false,
        horas_extras: false,

        // (12) nuevas opciones
        dias_90_salario: false,
        dias_20_salario: false,
        reinstalacion: false,
      },
      otras_prestaciones: "",

      // HECHOS
      responsable_despido: "",
      jefes_inmediatos: "",
      hechos: "",

      // (14) cambia solo el título en UI; el objeto se queda
      // CONDICIONES GENERALES
      fecha_ingreso: "",
      // (15) nuevo
      fecha_ultimo_dia_laborado: "",
      puesto: "",
      salario_diario: "",
      salario_diario_integrado: "",
      jornada: "",
      dia_descanso: "",
      lugar_servicio: "",

      // (16) eliminar vista demandada => dejamos solo actora
      pruebas_tab: "actora",
      pruebas_checklist: {
        actora: {
          confesional: false,
          testimonial: false,
          documental_publica: false,
          documental_privada: false,
          pericial: false,
          instrumental_actuaciones: true,     // ✅ como UI
          presuncional_legal_humana: true,    // ✅ como UI
          inspeccion_ocular: false,
          medios_electronicos: false,         // ✅ NUEVO
        },
      },
      pruebas_detalle: {
        actora: {
          confesional: {
            general_de: ["actora"],
            modalidad: ["general"],
            tipo: ["expresa"],
            absolvente: "",
            fecha_audiencia: "",
          },
          testimonial: {
            tipo: ["grupo"],
            draft_nombre: "",
            testigos: [],
          },
          documental_publica: {
            tipo: ["actuaciones_judiciales"],
            descripcion: "",
          },
          documental_privada: {
            tipo: ["contrato_individual"],
            descripcion: "",
          },
          pericial: {
            tipo: ["grafoscopia"],
            perito: "",
            objeto: "",
          },
          inspeccion_ocular: {
            objeto: "",
            lugar: "",
          },
          medios_electronicos: {
            tipos: [],
            descripcion: "",
          },
        },
      },


      evidencias_actora: [],
      // (16) ya no usar evidencias demandada si no habrá pestaña
      // evidencias_demandada: [],
    }),
    []
  );

// ===== Helpers (ponlos arriba del return, dentro del componente) =====
const MEDIOS_OPTS = [
  { value: "fotografias", label: "Fotografías" },
  { value: "video", label: "Video (CCTV / celular)" },
  { value: "audio", label: "Audio" },
  { value: "mensajes", label: "Mensajes (WhatsApp / SMS)" },
  { value: "emails", label: "Correos electrónicos" },
  { value: "biometricos", label: "Registros biométricos" },
  { value: "geolocalizacion", label: "Geolocalización (GPS)" },
  { value: "web_redes", label: "Web / Redes sociales" },
];
const [expedienteSearchValue, setExpedienteSearchValue] = useState("");
const [expedienteOptions, setExpedienteOptions] = useState([]);
const [expedienteSearching, setExpedienteSearching] = useState(false);

const expedienteTimeoutRef = useRef(null);
const expedienteHitsMapRef = useRef(new Map());

const loadExpedientes = async (q) => {
  setExpedienteSearching(true);

  try {
    // ✅ usa tu action nuevo (debe RETORNAR items)
    const hits = await dispatch(actionConciliacionSearchExpedientes({ q, limit: 6 }));

    const safeHits = Array.isArray(hits) ? hits : (Array.isArray(hits?.items) ? hits.items : []);

    const map = new Map();
    safeHits.forEach((it) => {
      const id = String(it?.id_expediente ?? it?.id_tribunal ?? it?.id ?? "");
      if (id) map.set(id, it);
    });
    expedienteHitsMapRef.current = map;

    const opts = safeHits.slice(0, 6).map((it) => {
      const id = String(it?.id_expediente ?? it?.id_tribunal ?? it?.id ?? "");
      const numUnico = collapseSpaces(it?.num_unico || it?.numero_unico || it?.identificador || "");
      const numeroExp = collapseSpaces(it?.numero_expediente || it?.expediente || "");

      const value = numUnico || numeroExp || id;

      return {
        value,
        key: id || value,
        _raw: it,
        label: buildExpedienteOptionLabel(it),
      };
    });

    setExpedienteOptions(opts);
  } catch (err) {
    console.error("Error buscando expedientes (conciliación):", err?.response?.status || err);
    setExpedienteOptions([]);
  } finally {
    setExpedienteSearching(false);
  }
};

const handleExpedienteFocus = () => {
  // click/focus => abre con 6 (sin escribir nada)
  if (!expedienteOptions.length) loadExpedientes("");
};

const handleExpedienteSearch = (value) => {
  const v = String(value ?? "");
  setExpedienteSearchValue(v);

  if (expedienteTimeoutRef.current) clearTimeout(expedienteTimeoutRef.current);
  expedienteTimeoutRef.current = setTimeout(() => {
    loadExpedientes(v);
  }, 250);
};

const handleExpedienteChange = (value) => {
  const v = String(value ?? "");
  setExpedienteSearchValue(v);

  // mantiene sincronizado el campo real
  setField("num_unico", v);

  // si limpian, limpia sugerencias visuales (opcional)
  if (!v.trim()) setExpedienteOptions([]);
};
const handleExpedienteSelect = (value, option) => {
  const it = option?._raw || null;

  // 1) input principal: num_unico (aquí realmente es expediente)
  const exp = collapseSpaces(it?.expediente || it?.expediente_format || String(value ?? ""));
  setExpedienteSearchValue(exp);
  setField("num_unico", exp);

  if (!it) return;

  // 2) ✅ Nombre parte actora = nombre_trabajador
  const trabajador = collapseSpaces(it?.nombre_trabajador || "");
  if (trabajador) setField("nombre_parte_actora", trabajador);

  // 3) ✅ Estado/Ciudad (SIN tocar autoridad)
  const idCiudad = it?.id_ciudad != null ? Number(it.id_ciudad) : null;
  if (idCiudad != null && !Number.isNaN(idCiudad)) {
    setSelectedCiudadId(idCiudad);
    setField("ciudad", idCiudad);

    const c = ciudadesById?.[String(idCiudad)] || ciudadesById?.[idCiudad];
    const idEstado = c?.id_estado ?? c?.idEstado ?? null;
    if (idEstado != null && String(idEstado).trim() !== "") {
      const eid = Number(idEstado);
      setSelectedEstadoId(eid);
      setField("estado", eid);
    }
  }

  // 4) ✅ Empresa
  const empresaNombre = collapseSpaces(it?.nombre_empresa || "");
  if (empresaNombre) setField("empresa_nombre", empresaNombre);

  const empresaId = it?.id_empresa != null ? Number(it.id_empresa) : null;
  if (empresaId != null && !Number.isNaN(empresaId)) setField("empresa_id", empresaId);

  // 5) ✅ Razón social (si viene)
  // 5) ✅ Razón social (si viene)
// 5) ✅ Razón social (si viene)
const rsArr = Array.isArray(it?.razones_sociales) ? it.razones_sociales : [];
if (rsArr.length) {
  const empresaNombreLocal = collapseSpaces(it?.nombre_empresa || "");
  const bucket = empresaNombreLocal ? empresasIndex.get(empresaNombreLocal) : null;
  const opciones = Array.isArray(bucket?.razones) ? bucket.razones : [];

  const findOptionValue = (r) => {
    const label = collapseSpaces(r?.razon_social || "");
    const cands = [
      r?.id_empresa_razon_social,
      r?.id,
      r?.id_razon_social,
    ]
      .filter((x) => x != null && String(x).trim() !== "")
      .map((x) => String(x));

    // 1) match por id contra value del option
    for (const cid of cands) {
      const hit = opciones.find((o) => String(o.value) === cid);
      if (hit) return String(hit.value);
    }

    // 2) match por label (por si el option usa label como value)
    if (label) {
      const hit = opciones.find((o) => collapseSpaces(o.label || "").toLowerCase() === label.toLowerCase());
      if (hit) return String(hit.value == null ? hit.label : hit.value);
      return label; // fallback final: label como value
    }

    return null;
  };

  const rsValues = rsArr
    .map(findOptionValue)
    .filter((v) => v != null && String(v).trim() !== "")
    .map((v) => String(v));

  if (rsValues.length) {
    setField("empresa_razon_social_ids", rsValues);
  }
}
  // 6) ✅ Corresponsal (si viene). Si no viene, NO fuerces nada.
  const contacto = collapseSpaces(it?.nombre_contacto || "");
  if (contacto) {
    setField("corresponsal_nombre", contacto);
    setField("cliente_directo", 0);
  }
  // NO tocamos: numero_expediente, autoridad
};
const getMediosTipos = () =>
  Array.isArray(form?.pruebas_detalle?.actora?.medios_electronicos?.tipos)
    ? form.pruebas_detalle.actora.medios_electronicos.tipos
    : [];

const setMediosElectronicosTipos = (tipos) => {
  const next = Array.isArray(tipos) ? tipos : [];
  setPruebasDetalle("medios_electronicos", {
    ...form?.pruebas_detalle?.actora?.medios_electronicos,
    tipos: next,
  });
};

const handleMediosTiposChange = (checkedValues) => {
  // checkedValues ya viene como array desde Checkbox.Group
  setMediosElectronicosTipos(checkedValues);
};

  const [form, setForm] = useState(() => {
    const iv = initialValues || {};
    const merged = {
      ...defaults,
      ...iv,
      prestaciones: {
        ...defaults.prestaciones,
        ...(iv.prestaciones || {}),
      },
      pruebas_checklist: {
        ...defaults.pruebas_checklist,
        ...(iv.pruebas_checklist || {}),
      },
      pruebas_detalle: {
        ...defaults.pruebas_detalle,
        ...(iv.pruebas_detalle || {}),
        actora: {
          ...defaults.pruebas_detalle.actora,
          ...(iv?.pruebas_detalle?.actora || {}),
        },
      },

      evidencias_actora: Array.isArray(iv.evidencias_actora)
        ? iv.evidencias_actora
        : defaults.evidencias_actora,

    };
    return merged;
  });
  const dispatch = useDispatch();
  const coerceEmpresasArray = (slice) => {
    if (Array.isArray(slice)) return slice;
    if (Array.isArray(slice?.items)) return slice.items;
    if (Array.isArray(slice?.data)) return slice.data;
    if (Array.isArray(slice?.list)) return slice.list;
    if (Array.isArray(slice?.data?.items)) return slice.data.items;
    return [];
  };

  const pickCompanyName = (it) =>
    it?.nombre ??
    it?.nombre_cliente ??
    it?.empresa ??
    it?.name ??
    it?.razon_social ??
    "";

  const pickCompanyId = (it) => it?.id_empresa ?? it?.id ?? null;

  const buildRSOption = ({ label, value, empresa_id }) => ({
    label: collapseSpaces(label || ""),
    value: value ?? collapseSpaces(label || ""),
    empresa_id: empresa_id ?? null,
  });

  const normLabel = (txt) => collapseSpaces(txt || "").trim().toLowerCase();

  const dedupRazones = (arr = []) => {
    const map = new Map();
    for (const r of arr) {
      const key = `${normLabel(r.label)}|${r.empresa_id ?? "null"}`;
      const existing = map.get(key);
      if (!existing) map.set(key, r);
      else if (existing.value == null && r.value != null) map.set(key, r);
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
  };

  const buildEmpresasIndex = (items = []) => {
    const byName = new Map();
    if (!Array.isArray(items)) return byName;

    items.forEach((it) => {
      const name = collapseSpaces(pickCompanyName(it));
      if (!name) return;

      const idEmpresa = pickCompanyId(it);
      if (!byName.has(name)) byName.set(name, { empresaIds: new Set(), razones: [] });
      const bucket = byName.get(name);

      if (idEmpresa != null) bucket.empresaIds.add(idEmpresa);

      const rsArr = Array.isArray(it?.razones_sociales) ? it.razones_sociales : [];
      rsArr.forEach((rs) => {
        const label = rs?.nombre ?? rs?.razon_social ?? rs?.name ?? "";
        const value = rs?.id_empresa_razon_social ?? rs?.id ?? null;
        const empresa_id = rs?.id_empresa ?? idEmpresa ?? null;
        if (!label) return;
        bucket.razones.push(buildRSOption({ label, value, empresa_id }));
      });

      const plainRS =
        it?.razon_social && String(it.razon_social).trim() !== ""
          ? String(it.razon_social)
          : null;

      if (plainRS) {
        bucket.razones.push(buildRSOption({ label: plainRS, value: null, empresa_id: idEmpresa }));
      }
    });

    for (const [name, bucket] of byName.entries()) {
      bucket.razones = dedupRazones(bucket.razones);
      byName.set(name, bucket);
    }
    return byName;
  };

  const coerceItems = (slice) => {
    // intenta soportar {data:{items:[]}} o {items:[]}
    const a = slice?.data?.items;
    if (Array.isArray(a)) return a;
    const b = slice?.items;
    if (Array.isArray(b)) return b;
    return [];
  };



  // autoridades slice
  const autoridadesSlice = useSelector((state) => state?.autoridades ?? {});
  const navigate = useNavigate();
  // En CREATE arranca null. En EDIT usa props si llegan.
  const [selectedEstadoId, setSelectedEstadoId] = useState(null);
  const [selectedCiudadId, setSelectedCiudadId] = useState(null);
  const [selectedAutoridadId, setSelectedAutoridadId] = useState(null);
  const [selectedAutoridadData, setSelectedAutoridadData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // catálogos estados/ciudade
  const { estadosOptions, ciudadesOptions, estadosById, ciudadesById } = useLaboralCatalogos(
    selectedEstadoId,
    selectedCiudadId
  );

  // cargar autoridades una vez
  useEffect(() => {
    dispatch(actionAutoridadesTribunalGet({}));
  }, [dispatch]);
  // ===============================
  // ✅ EMPRESAS: slice + fetch
  // ===============================
  const empresasSlice = useSelector((state) => state?.empresas ?? {});
  const empresasItems = useMemo(() => coerceEmpresasArray(empresasSlice), [empresasSlice]);
  const empresasIndex = useMemo(() => buildEmpresasIndex(empresasItems), [empresasItems]);
const [addCatalog, setAddCatalog] = useState({
  open: false,
  type: null, // "empresa" | "razon_social"
});

const openAddEmpresa = () => setAddCatalog({ open: true, type: "empresa" });

const openAddRazonSocial = () => {
  const empresaNombre = collapseSpaces(form?.empresa_nombre || "");
  if (!empresaNombre) {
    api.error({
      message: "Falta información",
      description: "Primero selecciona una empresa.",
      placement: "bottomRight",
    });
    return;
  }
  setAddCatalog({ open: true, type: "razon_social" });
};

const closeAddCatalog = () => setAddCatalog({ open: false, type: null });
  useEffect(() => {
    dispatch(actionEmpresasGet());
  }, [dispatch]);

  // ===============================
  // ✅ Options empresa + razón social
  // ===============================
  const empresaNombreOptions = useMemo(() => {
    const names = Array.from(empresasIndex.keys());
    return names
      .map((n) => ({ label: n, value: n }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [empresasIndex]);

  const razonSocialOptions = useMemo(() => {
    const empresaNombre = form?.empresa_nombre || "";
    if (!empresaNombre) return [];
    const bucket = empresasIndex.get(empresaNombre);
    if (!bucket) return [];
    return bucket.razones || [];
  }, [form?.empresa_nombre, empresasIndex]);

  const handleChangeEmpresaNombre = (value) => {
    const v = collapseSpaces(value || "");
    setField("empresa_nombre", v);

    // ✅ reset multi
    setField("empresa_razon_social_ids", []);
    setField("empresa_id", null);

    setField("cliente_directo", 1);
    setField("corresponsal_nombre", "No hay corresponsal");
    setField("corresponsal_celular", "");
    setField("corresponsal_correo", "");
  };

  const handleChangeRazonSocial = (values) => {
    const arr = Array.isArray(values) ? values : [];
    setField("empresa_razon_social_ids", arr);

    const empresaNombre = form?.empresa_nombre || "";
    if (!empresaNombre) return;

    const bucket = empresasIndex.get(empresaNombre);
    if (!bucket) return;

    // ✅ fija empresa_id (si hay)
    // toma la primera razón seleccionada para inferir empresa_id
    const first = arr[0];
    const chosen = (bucket.razones || []).find((o) => String(o.value == null ? o.label : o.value) === String(first));

    let empresaId = null;
    if (chosen?.empresa_id != null) empresaId = chosen.empresa_id;
    else if (bucket.empresaIds?.size >= 1) empresaId = Array.from(bucket.empresaIds)[0];

    if (empresaId != null) setField("empresa_id", empresaId);
  };

  useEffect(() => {
    const empresaNombre = form?.empresa_nombre || "";
    if (!empresaNombre) return;

    const nombreNormalizado = collapseSpaces(empresaNombre);
    const empresaMatch = (empresasItems || []).find((e) => {
      const n = collapseSpaces(pickCompanyName(e));
      return n.toLowerCase() === nombreNormalizado.toLowerCase();
    });

    if (!empresaMatch) {
      setField("corresponsal_nombre", "No hay corresponsal");
      return;
    }

    const contacto = collapseSpaces(empresaMatch.nombre_contacto || "");
    setField("corresponsal_nombre", contacto || "No hay corresponsal");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.empresa_nombre, empresasItems]);

  // ✅ solo tribunales (id_tipo_autoridad = 2)
  const autoridadesItems = useMemo(() => {
    const items = coerceItems(autoridadesSlice);
    return (items || []).filter((au) => Number(au?.id_tipo_autoridad) === 2);
  }, [autoridadesSlice]);

  // Set de ciudades con autoridad (para filtrar)
  const ciudadIdsConAutoridad = useMemo(() => {
    const s = new Set();
    (autoridadesItems || []).forEach((au) => {
      const idc = au?.id_ciudad;
      if (idc !== undefined && idc !== null && String(idc) !== "") s.add(Number(idc));
    });
    return s;
  }, [autoridadesItems]);

  // Set de estados con al menos 1 ciudad con autoridad
  const estadoIdsConAutoridad = useMemo(() => {
    const s = new Set();
    ciudadIdsConAutoridad.forEach((idCiudadX) => {
      const c = ciudadesById?.[String(idCiudadX)] || ciudadesById?.[Number(idCiudadX)];
      const idEstado = c?.id_estado ?? c?.idEstado ?? null;
      if (idEstado !== undefined && idEstado !== null && String(idEstado) !== "") s.add(Number(idEstado));
    });
    return s;
  }, [ciudadIdsConAutoridad, ciudadesById]);
  const estadosOptionsFinal = useMemo(() => {
    const base = Array.isArray(estadosOptions) ? estadosOptions : [];

    // si aún no hay data suficiente, no filtres (evita [])
    const autoridadesReady = Array.isArray(autoridadesItems) && autoridadesItems.length > 0;
    const ciudadesReady = ciudadesById && Object.keys(ciudadesById).length > 0;

    if (!autoridadesReady || !ciudadesReady) return base;

    return base.filter((o) => estadoIdsConAutoridad.has(Number(o.value)));
  }, [estadosOptions, estadoIdsConAutoridad, autoridadesItems, ciudadesById]);

  const ciudadesOptionsFinal = useMemo(() => {
    const base = Array.isArray(ciudadesOptions) ? ciudadesOptions : [];
    if (!selectedEstadoId) return [];

    const autoridadesReady = Array.isArray(autoridadesItems) && autoridadesItems.length > 0;
    const ciudadesReady = ciudadesById && Object.keys(ciudadesById).length > 0;

    if (!autoridadesReady || !ciudadesReady) return base;

    return base.filter((o) => ciudadIdsConAutoridad.has(Number(o.value)));
  }, [ciudadesOptions, ciudadIdsConAutoridad, selectedEstadoId, autoridadesItems, ciudadesById]);

  const autoridadOptions = useMemo(() => {
    return (autoridadesItems || [])
      .filter((au) => String(au?.id_ciudad || "") === String(selectedCiudadId || ""))
      .map((au) => ({
        label: collapseSpaces(au?.nombre || ""),
        value: String(au?.id ?? ""),
        data: au,
      }))
      .filter((o) => o.label && o.value);
  }, [autoridadesItems, selectedCiudadId]);


  // ✅ Precarga en EDIT (y si vienes con props)
  useEffect(() => {
    if (idCiudad != null && String(idCiudad).trim() !== "") {
      const idc = Number(idCiudad);
      setSelectedCiudadId(idc);

      const c = ciudadesById?.[String(idc)] || ciudadesById?.[Number(idc)];
      const idEstadoFromCiudad = c?.id_estado ?? c?.idEstado ?? null;
      if (idEstadoFromCiudad != null) setSelectedEstadoId(Number(idEstadoFromCiudad));
    } else if (!isEdit) {
      setSelectedEstadoId(null);
      setSelectedCiudadId(null);
      setSelectedAutoridadId(null);
      setSelectedAutoridadData(null);
    }
  }, [idCiudad, ciudadesById, isEdit]);
  useEffect(() => {
    // si ya hay un estado seleccionado, sincroniza form.estado
    if (selectedEstadoId != null) setField("estado", selectedEstadoId);
    if (selectedCiudadId != null) setField("ciudad", selectedCiudadId);
    if (selectedAutoridadId != null) setField("autoridad", selectedAutoridadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEstadoId, selectedCiudadId, selectedAutoridadId]);

  useEffect(() => {
    if (idAutoridad != null && String(idAutoridad).trim() !== "") {
      const ida = Number(idAutoridad);
      console.log(ida)
      setSelectedAutoridadId(ida);

      const found = (autoridadesItems || []).find((x) => Number(x?.id) === ida);
      setSelectedAutoridadData(found || null);
    } else if (!isEdit) {
      setSelectedAutoridadId(null);
      setSelectedAutoridadData(null);
    }
  }, [idAutoridad, autoridadesItems, isEdit]);

  const handleChangeEstado = (value) => {
    const v = value ?? null;
    setSelectedEstadoId(v);
    setSelectedCiudadId(null);
    setSelectedAutoridadId(null);
    setSelectedAutoridadData(null);

    // ✅ sincroniza form (para tu payload actual)
    setField("estado", v);
    setField("ciudad", null);
    setField("autoridad", null);

  };

  const handleChangeCiudad = (value) => {
    const v = value ?? null;
    setSelectedCiudadId(v);
    setSelectedAutoridadId(null);
    setSelectedAutoridadData(null);

    setField("ciudad", v);
    setField("autoridad", null);

  };

  const handleChangeAutoridad = (value) => {
    const v = value ?? "";
    console.log(v)
    setSelectedAutoridadId(v);
    setField("autoridad", v);

    setErrors((e) => {
      if (!e.autoridad) return e;
      const c = { ...e };
      delete c.autoridad;
      return c;
    });
  };
  console.log(initialValues)

useEffect(() => {
  if (!initialValues) return;

  const iv = initialValues || {};

  // 1) hidrata el form
  setForm({
    ...defaults,
    ...iv,

    prestaciones: {
      ...defaults.prestaciones,
      ...(iv.prestaciones || {}),
    },

    pruebas_checklist: {
      ...defaults.pruebas_checklist,
      ...(iv.pruebas_checklist || {}),
    },

    pruebas_detalle: {
      ...defaults.pruebas_detalle,
      ...(iv.pruebas_detalle || {}),
      actora: {
        ...defaults.pruebas_detalle.actora,
        ...(iv?.pruebas_detalle?.actora || {}),
      },
    },

    pruebas_tab:
      iv.pruebas_tab === "demandada" || iv.pruebas_tab === "actora"
        ? iv.pruebas_tab
        : defaults.pruebas_tab,

    evidencias_actora: Array.isArray(iv.evidencias_actora)
      ? iv.evidencias_actora
      : defaults.evidencias_actora,

    citatorio: Array.isArray(iv.citatorio) ? iv.citatorio : defaults.citatorio,
  });

  // 2) sincroniza selects controlados (CLAVE)
  if (iv.estado != null && String(iv.estado).trim() !== "") setSelectedEstadoId(Number(iv.estado));
  if (iv.ciudad != null && String(iv.ciudad).trim() !== "") setSelectedCiudadId(Number(iv.ciudad));
  if (iv.autoridad != null && String(iv.autoridad).trim() !== "") setSelectedAutoridadId(String(iv.autoridad));

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initialValues, defaults, isEdit]);


  const [errors, setErrors] = useState({});
  const setField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((e) => {
      if (!e[name]) return e;
      const copy = { ...e };
      delete copy[name];
      return copy;
    });
  };
const setPruebaChecklist = (key, checked) => {
  setForm((p) => ({
    ...p,
    pruebas_checklist: {
      ...(p.pruebas_checklist || {}),
      actora: {
        ...((p.pruebas_checklist && p.pruebas_checklist.actora) || {}),
        [key]: !!checked,
      },
    },
  }));
};

  const setPrestacion = (key, checked) => {
    setForm((p) => ({
      ...p,
      prestaciones: { ...p.prestaciones, [key]: checked },
    }));
    setErrors((e) => {
      if (!e.prestaciones) return e;
      const copy = { ...e };
      delete copy.prestaciones;
      return copy;
    });
  };
  const setPruebasDetalle = (key, valueObj) => {
    setForm((p) => ({
      ...p,
      pruebas_detalle: {
        ...(p.pruebas_detalle || {}),
        actora: {
          ...((p.pruebas_detalle && p.pruebas_detalle.actora) || {}),
          [key]: valueObj,
        },
      },
    }));
  };

  const addTestigo = () => {
    const draft = collapseSpaces(form?.pruebas_detalle?.actora?.testimonial?.draft_nombre || "");
    if (!draft) return;

    const prev = form?.pruebas_detalle?.actora?.testimonial?.testigos || [];
    const next = [...prev, { id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, nombre: draft }];

    setPruebasDetalle("testimonial", {
      ...(form?.pruebas_detalle?.actora?.testimonial || {}),
      draft_nombre: "",
      testigos: next,
    });
  };

  const removeTestigo = (id) => {
    const prev = form?.pruebas_detalle?.actora?.testimonial?.testigos || [];
    const next = prev.filter((t) => t.id !== id);

    setPruebasDetalle("testimonial", {
      ...(form?.pruebas_detalle?.actora?.testimonial || {}),
      testigos: next,
    });
  };


  const isEmpty = (v) => {
    if (v === null || v === undefined) return true;
    if (typeof v === "string") return collapseSpaces(v) === "";
    return false;
  };

  const isValidISODate = (s) => {
    if (!s || typeof s !== "string") return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + "T00:00:00");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  };

  const toNum = (v) => {
    if (v === null || v === undefined) return NaN;
    const s = String(v).trim();
    if (s === "") return NaN;
    return Number(s);
  };

  const validate = useCallback(() => {
    const e = {};

    // =========================
    // helpers locales
    // =========================
    const req = (key, msg = "Requerido") => {
      if (e[key]) return;
      e[key] = msg;
    };

    const reqText = (key, msg = "Requerido") => {
      if (isEmpty(form?.[key])) req(key, msg);
    };

    const reqDate = (key) => {
      const v = form?.[key];
      if (isEmpty(v)) req(key, "Fecha requerida");
      else if (!isValidISODate(v)) req(key, "Fecha inválida");
    };

    const anyTrue = (obj) => {
      if (!obj || typeof obj !== "object") return false;
      return Object.values(obj).some((v) => v === true);
    };

    // =========================
    // 1) SELECTS (usa los selected*)
    // =========================
    if (selectedEstadoId == null || String(selectedEstadoId).trim() === "") req("estado");
    if (selectedCiudadId == null || String(selectedCiudadId).trim() === "") req("ciudad");
    if (selectedAutoridadId == null || String(selectedAutoridadId).trim() === "") req("autoridad");

    // =========================
    // 2) FECHAS requeridas
    // =========================
    reqDate("fecha_limite_contestacion");

    reqDate("fecha_ingreso");
    reqDate("fecha_ultimo_dia_laborado");
    reqDate("fecha_notificacion_demanda");
    reqDate("fecha_presentacion_demanda");



    // =========================
    // 3) DATOS GENERALES requeridos
    // =========================
    reqText("num_unico", "Requerido");

    reqText("numero_expediente", "Requerido");
    reqText("nombre_parte_actora", "Requerido");

    reqText("empresa_nombre", "Requerido");

    if (!Array.isArray(form?.empresa_razon_social_ids) || form.empresa_razon_social_ids.length === 0) {
      req("empresa_razon_social_ids", "Requerido");
    }


    // corresponsal_nombre solo si NO es cliente_directo
    if (Number(form?.cliente_directo || 1) !== 1) {
      reqText("corresponsal_nombre", "Requerido");
    }

    // =========================
    // 4) ETAPA ACTUAL requeridos
    // =========================
    reqText("observaciones_etapa_actual", "Requerido");

    // =========================
    // 5) ACCIONES Y PRESTACIONES
    // =========================
    reqText("accion_intentada", "Requerido");

    // Prestaciones: mínimo 1 check
    const p = form?.prestaciones || {};
    if (!anyTrue(p)) req("prestaciones", "Requerido (elige al menos una)");

    // Otras prestaciones: requerido (como en tu screenshot)
    reqText("otras_prestaciones", "Requerido");

    // =========================
    // 6) HECHOS requeridos (los que te faltaban)
    // =========================
    reqText("responsable_despido", "Requerido");
    reqText("jefes_inmediatos", "Requerido");
    reqText("hechos", "Requerido");

    // =========================
    // 7) CONDICIONES DE TRABAJO requeridas
    // =========================
    reqText("puesto", "Requerido");
    reqText("jornada", "Requerido");
    reqText("dia_descanso", "Requerido");
    reqText("lugar_servicio", "Requerido");

    // salarios > 0
    const salario = toNum(form?.salario_diario);
    if (!Number.isFinite(salario) || salario <= 0) req("salario_diario", "Requerido");

    const salarioInt = toNum(form?.salario_diario_integrado);
    if (!Number.isFinite(salarioInt) || salarioInt <= 0) req("salario_diario_integrado", "Requerido");

    // =========================
    // 8) PRUEBAS: mínimo 1 en ACTORA y mínimo 1 en DEMANDADA
    // =========================
    const chk = form?.pruebas_checklist || {};
    const act = chk?.actora || {};

    const actOk = anyTrue(act);

    if (!actOk) {
      req("pruebas_checklist", "Requerido (elige al menos una prueba)");
    }

    // =========================
    // FIN
    // =========================
    setErrors(e);
    console.log("VALIDATE ERRORS =>", e);

    if (Object.keys(e).length > 0) {
      const firstKey = Object.keys(e)[0];
      api.error({
        message: "Revisa el formulario",
        description: e[firstKey] || "Revisa los campos requeridos",
        placement: "bottomRight",
        duration: 3,
      });

      return false;
    }

    return true;
  }, [
    form,
    selectedEstadoId,
    selectedCiudadId,
    selectedAutoridadId,
  ]);


  const buildPayloadAndFiles = useCallback(() => {
    const packRows = (rows = []) =>
      (rows || []).map((x) => ({
        id: x.id,
        filename: x.filename,
        categoria: x.categoria,
        estado: x.estado,
        // NO mandes _file aquí (no se serializa). Va en filesMap.
      }));

    // =========================
    // 1) CITATORIO (MULTI)
    // =========================
    const citatorioRows = Array.isArray(form?.citatorio) ? form.citatorio : [];

    const filesMap = {
      // ahora citatorio es array de archivos
      citatorio: citatorioRows
        .filter((x) => x?._file)
        .map((x) => ({ id: x.id, file: x._file })),

      // evidencias: solo ACTORA (ya no demandada)
      evidencias_actora: (form.evidencias_actora || [])
        .filter((x) => x?._file)
        .map((x) => ({ id: x.id, file: x._file })),
    };

    // =========================
    // 2) PAYLOAD (JSON)
    // =========================
    const payload = {
      meta: {
        isEdit: Boolean(isEdit),
        idExpediente: idExpediente ?? null,
        idCiudad: idCiudad ?? null,
        idAutoridad: idAutoridad ?? null,
        nombreIdentificacionCiudad: nombreIdentificacionCiudad ?? "",
      },

      datos_generales: {
        // orden sugerido
        numero_expediente: form.numero_expediente,
        nombre_parte_actora: form.nombre_parte_actora,

        empresa_id: form.empresa_id,
        empresa_nombre: form.empresa_nombre,
        empresa_razon_social_ids: Array.isArray(form.empresa_razon_social_ids)
          ? form.empresa_razon_social_ids
          : [],

        // opcional puente mientras conectas create real
        empresa_new: null,
        razones_sociales_new: [],

        estado: form.estado,
        ciudad: form.ciudad,
        autoridad: form.autoridad,

        fecha_notificacion_demanda: form.fecha_notificacion_demanda || null,
        fecha_presentacion_demanda: form.fecha_presentacion_demanda || null,



        num_unico: form.num_unico,
      },

      etapas_procesales: {
        fecha_limite_contestacion: form.fecha_limite_contestacion || null,
        fecha_audiencia_conciliatoria: form.fecha_audiencia_conciliatoria || null,
        observaciones_etapa_actual: form.observaciones_etapa_actual || "",
      },

      acciones_prestaciones: {
        accion_intentada: form.accion_intentada,
        prestaciones: { ...form.prestaciones },
        otras_prestaciones: form.otras_prestaciones,
      },

      hechos: {
        responsable_despido: form.responsable_despido,
        jefes_inmediatos: form.jefes_inmediatos,
        narrativa: form.hechos,
      },

      condiciones_trabajo: {
        fecha_ingreso: form.fecha_ingreso,
        fecha_ultimo_dia_laborado: form.fecha_ultimo_dia_laborado || null,
        puesto: form.puesto,
        salario_diario: form.salario_diario === "" ? null : Number(form.salario_diario),
        salario_diario_integrado:
          form.salario_diario_integrado === "" ? null : Number(form.salario_diario_integrado),
        jornada: form.jornada,
        dia_descanso: form.dia_descanso,
        lugar_servicio: form.lugar_servicio,
      },

      pruebas_documentacion: {

          tab: "actora",
          checklist: {
            actora: { ...form.pruebas_checklist.actora },
          },
          detalle: {
            actora: { ...(form?.pruebas_detalle?.actora || {}) },
          },
          evidencias_actora: packRows(form.evidencias_actora),
        },


     
    };

    return { payload, filesMap };
  }, [
    form,
    isEdit,
    idExpediente,
    idCiudad,
    idAutoridad,
    nombreIdentificacionCiudad,
  ]);

  const defaultSubmit = async (payload, filesMap) => {

    console.warn("FormTribunal: onSubmit no fue provisto.", { payload, filesMap });

  };
  const saveTribunal = useCallback(async () => {
    if (submitting) return;

    // 1) valida con TU validate()
    const ok = validate();
    if (!ok) {
      api.error({
        message: "Faltan campos obligatorios",
        description: "Revisa los campos marcados en rojo.",
        placement: "bottomRight",
        duration: 3,
      });
      return;
    }

    // 2) arma payload + files con TU builder
    const { payload, filesMap } = buildPayloadAndFiles();

    try {
      setSubmitting(true);

      // 3) conecta con tu flujo real (padre)
      const fn = onSubmit || defaultSubmit;
      await fn(payload, filesMap);


    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Error al guardar. Revisa el servidor.";

      api.error({
        message: "No se pudo guardar",
        description: msg,
        placement: "bottomRight",
        duration: 4,
      });
    } finally {
      setSubmitting(false);
    }
  }, [api, submitting, validate, buildPayloadAndFiles, onSubmit]);

  useEffect(() => {
    const onSaveEvent = () => saveTribunal();
    window.addEventListener("oa:expediente:save", onSaveEvent);
    return () => window.removeEventListener("oa:expediente:save", onSaveEvent);
  }, [saveTribunal]);
  const citatorioInputRef = useRef(null);     // NUEVO: citatorio

  const openCitatorioPicker = () => {
    if (!citatorioInputRef.current) return;
    citatorioInputRef.current.value = "";
    citatorioInputRef.current.click();
  };
  const onCitatorioPicked = (ev) => {
    const files = ev.target.files ? Array.from(ev.target.files) : [];
    if (!files.length) return;

    const toRow = (f) => ({
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      filename: f.name,
      estado: "Pendiente",
      _file: f,
    });

    setForm((p) => ({
      ...p,
      citatorio: [...(Array.isArray(p.citatorio) ? p.citatorio : []), ...files.map(toRow)],
    }));
  };

  const deleteCitatorio = (id) => {
    setForm((p) => ({
      ...p,
      citatorio: (Array.isArray(p.citatorio) ? p.citatorio : []).filter((x) => x.id !== id),
    }));
  };
const viewCitatorio = (row) => {
  if (row?._file) {
    const url = URL.createObjectURL(row._file);
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const url = row?.url;
  if (url && String(url).trim() !== "") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

  const createEmpresaLikeConciliacion = async () => {
    const name = collapseSpaces(newEmpresaNombre);
    if (!name) {
      api.error({
        message: "Falta información",
        description: "Escribe el nombre de la empresa.",
        placement: "bottomRight",
      });
      return;
    }

    // 🔌 aquí conectas EXACTO tu create real
    // await dispatch(actionEmpresaCreate({ nombre: name }))
    // await dispatch(actionEmpresasGet())

    api.success({
      message: "Empresa",
      description: "Empresa agregada (conecta el create real aquí).",
      placement: "bottomRight",
    });
    setNewEmpresaNombre("");
  };

  const createRazonSocialLikeConciliacion = async () => {
    const empresaNombre = collapseSpaces(form?.empresa_nombre || "");
    if (!empresaNombre) {
      api.error({
        message: "Falta información",
        description: "Primero selecciona una empresa.",
        placement: "bottomRight",
      });
      return;
    }

    const rs = collapseSpaces(newRazonSocialNombre);
    if (!rs) {
      api.error({
        message: "Falta información",
        description: "Escribe la razón social.",
        placement: "bottomRight",
      });
      return;
    }

    // 🔌 aquí conectas EXACTO tu create real
    // await dispatch(actionEmpresaRazonSocialCreate({ empresa_nombre: empresaNombre, nombre: rs }))
    // await dispatch(actionEmpresasGet())

    api.success({
      message: "Razón social",
      description: "Razón social agregada (conecta el create real aquí).",
      placement: "bottomRight",
    });
    setNewRazonSocialNombre("");
  };


const makeNewSelectValue = (label) => {
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `__new__:${id}:${label}`;
};


  const checklistActivo = form.pruebas_checklist.actora;

const SelectWithAdd = ({
  value,
  onChange,
  baseOptions = [],
  overrideKey,
  placeholder = "Agregar nuevo",
  multiple = true, // ✅ por defecto multi
}) => {
  const [draft, setDraft] = useState("");

  const asArray = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);

  const addOption = () => {
    const label = collapseSpaces(draft);
    if (!label) return;

    const newValue = makeNewSelectValue(label);

    setCatalogOverrides((prev) => ({
      ...prev,
      [overrideKey]: [
        ...(prev[overrideKey] || []),
        { label, value: newValue, isNew: true },
      ],
    }));

    // ✅ al agregar, también queda seleccionado (en multi)
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
    () => [...baseOptions, ...(catalogOverrides[overrideKey] || [])],
    [baseOptions, catalogOverrides, overrideKey]
  );

  return (
    <Select
      mode={multiple ? "multiple" : undefined}  // ✅ multi
      value={multiple ? asArray(value) : (value ?? undefined)}
      style={{ width: "100%" }}
      onChange={onChange}                       // ✅ en multi, antd manda array
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
};




  return (
    <div className="oa-page">
      {contextHolder}

      <main className="oa-main">
        <div className="oa-form">
          {submitting ? (
            <div className="oa-loading-overlay" aria-busy="true" aria-live="polite">
              <div className="oa-loading-card">
                <Spin size="large" />
                <div className="oa-loading-text">Guardando expediente…</div>
              </div>
            </div>
          ) : null}
          <fieldset disabled={submitting} style={{ border: 0, padding: 0, margin: 0 }}>
            <section className="oa-card">
              <div className="oa-card-head">
                <h2 className="oa-card-title">
                  <span className="material-symbols-outlined oa-ico oa-ico-primary">folder_shared</span>
                  DATOS GENERALES DEL EXPEDIENTE
                </h2>
              </div>

              <div className="oa-card-body oa-grid-3">


                <div className="oa-field">
                  <label className="oa-label">
                    <span className="oa-req">*</span> Núm. Único de Identificación
                  </label>
                  <AutoComplete
  value={expedienteSearchValue}
  options={expedienteOptions}
  onFocus={handleExpedienteFocus}
  onSearch={handleExpedienteSearch}
  onSelect={handleExpedienteSelect}
  onChange={handleExpedienteChange}
  filterOption={false}
  notFoundContent={expedienteSearching ? "Buscando..." : "Sin resultados"}
>
  <input
    className={`oa-input ${errors.num_unico ? "oa-input-error" : ""}`}
    type="text"
    placeholder="Ej. SLRC/001/2024"
    value={expedienteSearchValue}
    onChange={(e) => handleExpedienteChange(e.target.value)}
  />
</AutoComplete>
                  {errors.num_unico ? <div className="oa-error">{errors.num_unico}</div> : null}
                </div>
                <div className="oa-field">
                  <label className="oa-label">
                    <span className="oa-req">*</span> Número de Expediente
                  </label>
                  <input
                    className={`oa-input ${errors.numero_expediente ? "oa-input-error" : ""}`}
                    type="text"
                    placeholder="Número de expediente"
                    value={form.numero_expediente}
                    onChange={(e) => setField("numero_expediente", e.target.value)}
                  />
                  {errors.numero_expediente ? <div className="oa-error">{errors.numero_expediente}</div> : null}


                </div>
                <div className="oa-field">
                  <label className="oa-label">
                    <span className="oa-req">*</span> Nombre de la Parte Actora
                  </label>
                  <input
                    className={`oa-input ${errors.nombre_parte_actora ? "oa-input-error" : ""}`}
                    type="text"
                    placeholder="Nombre de la parte actora"
                    value={form.nombre_parte_actora}
                    onChange={(e) => setField("nombre_parte_actora", e.target.value)}
                  />
                  {errors.nombre_parte_actora ? <div className="oa-error">{errors.nombre_parte_actora}</div> : null}
                </div>
                <div className="oa-field">
                  <label className="oa-label">
                    <span className="oa-req">*</span> Estado
                  </label>
                  <select
                    className={`oa-input ${errors.estado ? "oa-input-error" : ""}`}
                    value={selectedEstadoId ?? ""}
                    onChange={(e) => handleChangeEstado(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Seleccionar estado</option>
                    {estadosOptionsFinal.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  {errors.estado ? <div className="oa-error">{errors.estado}</div> : null}
                </div>

                <div className="oa-field">
                  <label className="oa-label">
                    <span className="oa-req">*</span> Ciudad
                  </label>
                  <select
                    className={`oa-input ${errors.ciudad ? "oa-input-error" : ""}`}
                    value={selectedCiudadId ?? ""}
                    onChange={(e) => handleChangeCiudad(e.target.value ? Number(e.target.value) : null)}
                    disabled={!selectedEstadoId}
                  >
                    <option value="">Seleccionar ciudad</option>
                    {ciudadesOptionsFinal.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  {errors.ciudad ? <div className="oa-error">{errors.ciudad}</div> : null}
                </div>

                <div className="oa-field">
                  <label className="oa-label">
                    <span className="oa-req">*</span> Autoridad
                  </label>
                  <select
                    className={`oa-input ${errors.autoridad ? "oa-input-error" : ""}`}
                    value={selectedAutoridadId ?? ""}
                    onChange={(e) => handleChangeAutoridad(e.target.value)}
                    disabled={!selectedCiudadId}
                  >
                    <option value="">Seleccionar autoridad</option>
                    {autoridadOptions.map((o) => (
                      <option key={String(o.value)} value={String(o.value)}>
                        {o.label}
                      </option>
                    ))}
                  </select>


                  {errors.autoridad ? <div className="oa-error">{errors.autoridad}</div> : null}
                </div>

                {/* ✅ NUEVO: Empresa / Razón social / Corresponsal */}
                <div className="oa-field">
                  <label className="oa-label">
                    <span className="oa-req">*</span> Empresa
                  </label>

                  <div className={errors.empresa_nombre ? "oa-ant-error" : ""}>
                    <Select
                      value={form.empresa_nombre || undefined}
                      placeholder="Seleccionar empresa"
                      onChange={handleChangeEmpresaNombre}
                      options={empresaNombreOptions}
                      style={{ width: "100%" }}
                      showSearch
                      optionFilterProp="label"
                      dropdownRender={(menu) => (
                        <div>
                          {menu}
                          <Divider style={{ margin: "8px 0" }} />
                          <div style={{ display: "flex", gap: 8, padding: 8 }}>
                            <Input
                              value={newEmpresaNombre}
                              onChange={(e) => setNewEmpresaNombre(e.target.value)}
                              placeholder="Nueva empresa"
                            />
                            <Button type="primary" onClick={createEmpresaLikeConciliacion}>
                              Agregar
                            </Button>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                  {errors.empresa_nombre ? <div className="oa-error">{errors.empresa_nombre}</div> : null}


                </div>

                <div className="oa-field">
                  <label className="oa-label">
                    <span className="oa-req">*</span> Razón social
                  </label>

                  <div className={errors.empresa_razon_social_ids ? "oa-ant-error" : ""}>
                    <Select
                      mode="multiple"
                      value={form.empresa_razon_social_ids || []}
                      placeholder="Seleccionar razón(es) social(es)"
                      onChange={handleChangeRazonSocial}
                      disabled={!String(form.empresa_nombre || "").trim()}
                      style={{ width: "100%" }}
                      options={(razonSocialOptions || []).map((o) => ({
  label: o.label,
  value: String(o.value == null ? o.label : o.value), // ✅ normaliza a string
}))}

                      dropdownRender={(menu) => (
                        <div>
                          {menu}
                          <Divider style={{ margin: "8px 0" }} />
                          <div style={{ display: "flex", gap: 8, padding: 8 }}>
                            <Input
                              value={newRazonSocialNombre}
                              onChange={(e) => setNewRazonSocialNombre(e.target.value)}
                              placeholder="Nueva razón social"
                              disabled={!String(form.empresa_nombre || "").trim()}
                            />
                            <Button
                              type="primary"
                              onClick={createRazonSocialLikeConciliacion}
                              disabled={!String(form.empresa_nombre || "").trim()}
                            >
                              Agregar
                            </Button>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                  {errors.empresa_razon_social_ids ? (
                    <div className="oa-error">{errors.empresa_razon_social_ids}</div>
                  ) : null}

                </div>



                <div className="oa-field">
                  <label className="oa-label">Corresponsal (nombre)</label>
                  <input
                    className="oa-input"
                    type="text"
                    placeholder="Nombre del corresponsal empresa"
                    value={form.corresponsal_nombre || ""}
                    onChange={(e) => setField("corresponsal_nombre", e.target.value)}
                    disabled={Number(form.cliente_directo || 1) === 1}
                  />
                  {errors.corresponsal_nombre ? <div className="oa-error">{errors.corresponsal_nombre}</div> : null}

                </div>



              </div>
            </section>
            <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">


              <div className="p-6 flex flex-col lg:flex-row gap-8">


                {/* Panel derecha (inputs reales conectados a state) */}
                <div className="lg:w-2/3 bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-1">
                      <span className="oa-req">*</span>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Fecha Límite Contestación
                      </label>
                      <input
                        className={`oa-input ${errors.fecha_limite_contestacion ? "oa-input-error" : ""} w-full bg-white dark:bg-slate-900`}
                        type="date"
                        value={form.fecha_limite_contestacion || ""}
                        onChange={(e) => setField("fecha_limite_contestacion", e.target.value)}
                      />
                      {errors.fecha_limite_contestacion ? (
                        <div className="oa-error">{errors.fecha_limite_contestacion}</div>
                      ) : null}


                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Fecha Audiencia Conciliatoria
                      </label>
                      <input
                        className={`oa-input ${errors.fecha_audiencia_conciliatoria ? "oa-input-error" : ""} w-full bg-white dark:bg-slate-900`}
                        type="date"
                        value={form.fecha_audiencia_conciliatoria || ""}
                        onChange={(e) => setField("fecha_audiencia_conciliatoria", e.target.value)}
                      />
                      {errors.fecha_audiencia_conciliatoria ? (
                        <div className="oa-error">{errors.fecha_audiencia_conciliatoria}</div>
                      ) : null}
                    </div>

                    <div className="oa-field">
                      <label className="oa-label">
                        <span className="oa-req">*</span> Fecha de Notificación de la Demanda
                      </label>
                      <input
                        className={`oa-input ${errors.fecha_notificacion_demanda ? "oa-input-error" : ""}`}
                        type="date"
                        value={form.fecha_notificacion_demanda || ""}
                        onChange={(e) => setField("fecha_notificacion_demanda", e.target.value)}
                      />
                      {errors.fecha_notificacion_demanda ? <div className="oa-error">{errors.fecha_notificacion_demanda}</div> : null}
                    </div>

                    <div className="oa-field">
                      <label className="oa-label">
                        <span className="oa-req">*</span> Fecha de Presentación de la Demanda
                      </label>
                      <input
                        className={`oa-input ${errors.fecha_presentacion_demanda ? "oa-input-error" : ""}`}
                        type="date"
                        value={form.fecha_presentacion_demanda || ""}
                        onChange={(e) => setField("fecha_presentacion_demanda", e.target.value)}
                      />
                      {errors.fecha_presentacion_demanda ? <div className="oa-error">{errors.fecha_presentacion_demanda}</div> : null}
                    </div>

                  </div>

                  <div className="space-y-1">

                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      <span className="oa-req">*</span> Observaciones de la etapa actual
                    </label>
                    <textarea
                      type="text"
                      className={`oa-input ${errors.observaciones_etapa_actual ? "oa-input-error" : ""}`}
                      value={form.observaciones_etapa_actual || ""}
                      onChange={(e) => setField("observaciones_etapa_actual", e.target.value)}
                    />

                    {errors.observaciones_etapa_actual ? (
                      <div className="oa-error">{errors.observaciones_etapa_actual}</div>
                    ) : null}


                  </div>

                  {/* =========================
    CITATORIO (1 archivo)
   ========================= */}
                  <div className="mt-6">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2">
                      DEMANDA/NOTIFICACION (documentos)
                    </label>

                    <div
                      className="oa-dropzone"
                      onClick={openCitatorioPicker}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") openCitatorioPicker();
                      }}
                    >
                      <div className="oa-dropzone-ico">
                        <span className="material-symbols-outlined oa-dropzone-ico-sym">attach_file</span>
                      </div>

                      <p className="oa-dropzone-title">
                        {(Array.isArray(form.citatorio) && form.citatorio.length)
                          ? "DEMANDA/NOTIFICACION cargada"
                          : "Anexar DEMANDA/NOTIFICACION"}
                      </p>

                      <p className="oa-dropzone-sub">
                        {(Array.isArray(form.citatorio) && form.citatorio.length)
                          ? `${form.citatorio.length} archivo(s)`
                          : "PDF, PNG, JPG (varios archivos)"}
                      </p>
                    </div>

                    <input
                      ref={citatorioInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg"
                      style={{ display: "none" }}
                      onChange={onCitatorioPicked}
                    />

                    {Array.isArray(form.citatorio) && form.citatorio.length ? (
                      <div className="mt-3 flex flex-col gap-2">
                        {form.citatorio.map((row) => (
                          <div key={row.id} className="flex items-center justify-between gap-2">
                            <div className="text-sm truncate" title={row.filename}>{row.filename}</div>

                            <div className="flex gap-2">
                              <button type="button" className="oa-btn-lite" onClick={() => viewCitatorio(row)}>
                                <span className="material-symbols-outlined oa-btn-lite-ico">visibility</span>
                                Ver
                              </button>
                              <button
                                type="button"
                                className="oa-btn-lite oa-btn-lite-danger"
                                onClick={() => deleteCitatorio(row.id)}
                              >
                                <span className="material-symbols-outlined oa-btn-lite-ico">delete</span>
                                Quitar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                  </div>

                </div>
              </div>
            </section>

            <section className="oa-card">
              <div className="oa-card-head">
                <h2 className="oa-card-title">
                  <span className="material-symbols-outlined oa-ico oa-ico-primary">gavel</span>
                  ACCIONES Y PRESTACIONES RECLAMADAS
                </h2>
              </div>

              <div className="oa-card-body">
                <div className="oa-grid-3 oa-mb-8">


                  <div className="oa-field">
                    <label className="oa-label">
                      <span className="oa-req">*</span> Acción Intentada
                    </label>
                    <select
                      className={`oa-input ${errors.accion_intentada ? "oa-input-error" : ""}`}
                      value={form.accion_intentada}
                      onChange={(e) => setField("accion_intentada", e.target.value)}
                    >
                      <option value="">Seleccionar acción</option>
                      <option value="DESPIDO">DESPIDO</option>

                      <option value="RESCISION LABORAL TRABAJADOR">RESCISION LABORAL TRABAJADOR</option>
                      <option value="REINSTALACION">REINSTALACION</option>
                      <option value="PAGO DE PRESTACIONES">PAGO DE PRESTACIONES</option>
                      <option value="DERECHO DE PREFERENCIA Y/O ASCENSO">DERECHO DE PREFERENCIA Y/O ASCENSO</option>
                    </select>

                    {errors.accion_intentada ? (
                      <div className="oa-error">{errors.accion_intentada}</div>
                    ) : null}
                  </div>


                </div>

                <div className="oa-sep-top">
                  <h3 className="oa-subtitle-row">
                    <span className="material-symbols-outlined oa-sub-ico">payments</span>
                    Prestaciones Reclamadas por el Actor
                  </h3>

                  <div className="oa-checkgrid">
                    <label className="oa-check">
                      <input
                        type="checkbox"
                        checked={!!form.prestaciones.indemnizacion_const}
                        onChange={(e) => setPrestacion("indemnizacion_const", e.target.checked)}
                      />
                      <span>Indemnización Const.</span>
                    </label>

                    <label className="oa-check">
                      <input
                        type="checkbox"
                        checked={!!form.prestaciones.prima_antiguedad}
                        onChange={(e) => setPrestacion("prima_antiguedad", e.target.checked)}
                      />
                      <span>Prima de Antigüedad</span>
                    </label>

                    <label className="oa-check">
                      <input
                        type="checkbox"
                        checked={!!form.prestaciones.salarios_caidos}
                        onChange={(e) => setPrestacion("salarios_caidos", e.target.checked)}
                      />
                      <span>Salarios Caídos</span>
                    </label>

                    <label className="oa-check">
                      <input
                        type="checkbox"
                        checked={!!form.prestaciones.vacaciones}
                        onChange={(e) => setPrestacion("vacaciones", e.target.checked)}
                      />
                      <span>Vacaciones</span>
                    </label>

                    <label className="oa-check">
                      <input
                        type="checkbox"
                        checked={!!form.prestaciones.prima_vacacional}
                        onChange={(e) => setPrestacion("prima_vacacional", e.target.checked)}
                      />
                      <span>Prima Vacacional</span>
                    </label>

                    <label className="oa-check">
                      <input
                        type="checkbox"
                        checked={!!form.prestaciones.aguinaldo}
                        onChange={(e) => setPrestacion("aguinaldo", e.target.checked)}
                      />
                      <span>Aguinaldo</span>
                    </label>

                    <label className="oa-check">
                      <input
                        type="checkbox"
                        checked={!!form.prestaciones.reparto_utilidades}
                        onChange={(e) => setPrestacion("reparto_utilidades", e.target.checked)}
                      />
                      <span>Reparto de Utilidades</span>
                    </label>

                    <label className="oa-check">
                      <input
                        type="checkbox"
                        checked={!!form.prestaciones.horas_extras}
                        onChange={(e) => setPrestacion("horas_extras", e.target.checked)}
                      />
                      <span>Horas Extras</span>
                    </label>
                    <label className="oa-check">
                      <input
                        type="checkbox"
                        checked={!!form.prestaciones.dias_90_salario}
                        onChange={(e) => setPrestacion("dias_90_salario", e.target.checked)}
                      />
                      <span>90 DÍAS DE SALARIO</span>
                    </label>

                    <label className="oa-check">
                      <input
                        type="checkbox"
                        checked={!!form.prestaciones.dias_20_salario}
                        onChange={(e) => setPrestacion("dias_20_salario", e.target.checked)}
                      />
                      <span>20 DÍAS DE SALARIO</span>
                    </label>

                    <label className="oa-check">
                      <input
                        type="checkbox"
                        checked={!!form.prestaciones.reinstalacion}
                        onChange={(e) => setPrestacion("reinstalacion", e.target.checked)}
                      />
                      <span>REINSTALACION</span>
                    </label>

                  </div>

                  {errors.prestaciones ? <div className="oa-error">{errors.prestaciones}</div> : null}

                  <div className="oa-field oa-mt-4">
                    <label className="oa-label">Otras Prestaciones y Detalles</label>
                    <textarea
                      className={`oa-input ${errors.otras_prestaciones ? "oa-input-error" : ""}`}
                      value={form.otras_prestaciones}
                      onChange={(e) => setField("otras_prestaciones", e.target.value)}
                    />

                    {errors.otras_prestaciones ? <div className="oa-error">{errors.otras_prestaciones}</div> : null}

                  </div>
                </div>
              </div>
            </section>

            <section className="oa-card">
              <div className="oa-card-head oa-head-split">
                <h2 className="oa-card-title">
                  <span className="material-symbols-outlined oa-ico oa-ico-primary">history_edu</span>
                  HECHOS DE LA DEMANDA (NARRATIVA DEL TRABAJADOR)
                </h2>


              </div>

              <div className="oa-card-body">
                <div className="oa-grid-2 oa-mb-6">
                  <div className="oa-field">
                    <label className="oa-label">Responsable del Despido (Persona imputada)</label>
                    <input
                      className={`oa-input ${errors.responsable_despido ? "oa-input-error" : ""}`}
                      type="text"
                      value={form.responsable_despido}
                      onChange={(e) => setField("responsable_despido", e.target.value)}
                    />

                    {errors.responsable_despido ? <div className="oa-error">{errors.responsable_despido}</div> : null}

                  </div>

                  <div className="oa-field">
                    <label className="oa-label">Jefes Inmediatos Mencionado</label>
                    <input
                      type="text"
                      className={`oa-input ${errors.jefes_inmediatos ? "oa-input-error" : ""}`}
                      value={form.jefes_inmediatos}
                      placeholder="Jefes Inmediatos"
                      onChange={(e) => setField("jefes_inmediatos", e.target.value)}
                    />

                    {errors.jefes_inmediatos ? <div className="oa-error">{errors.jefes_inmediatos}</div> : null}

                  </div>
                </div>


              </div>
            </section>


            <section className="oa-card">
              <div className="oa-card-head">
                <h2 className="oa-card-title">
                  <span className="material-symbols-outlined oa-ico oa-ico-primary">contract</span>
                  CONDICIONES GENERALES DE TRABAJO RECLAMADOS POR LA PARTE ACTORA

                </h2>
              </div>

              <div className="oa-card-body oa-grid-3">
                <div className="oa-field">
                  <label className="oa-label">Fecha de Ingreso</label>
                  <input
                    className={`oa-input ${errors.fecha_ingreso ? "oa-input-error" : ""}`}
                    type="date"
                    value={form.fecha_ingreso}
                    onChange={(e) => setField("fecha_ingreso", e.target.value)}
                  />

                  {errors.fecha_ingreso ? <div className="oa-error">{errors.fecha_ingreso}</div> : null}

                </div>
                <div className="oa-field">
                  <label className="oa-label">Último día laborado</label>
                  <input
                    className={`oa-input ${errors.fecha_ultimo_dia_laborado ? "oa-input-error" : ""}`}
                    type="date"
                    value={form.fecha_ultimo_dia_laborado}
                    onChange={(e) => setField("fecha_ultimo_dia_laborado", e.target.value)}
                  />
                  {errors.fecha_ultimo_dia_laborado ? <div className="oa-error">{errors.fecha_ultimo_dia_laborado}</div> : null}
                </div>

                <div className="oa-field">
                  <label className="oa-label">Puesto o Categoría</label>
                  <input
                    className={`oa-input ${errors.puesto ? "oa-input-error" : ""}`}
                    type="text"
                    placeholder="Ej. Operador"
                    value={form.puesto}
                    onChange={(e) => setField("puesto", e.target.value)}
                  />
                  {errors.puesto ? <div className="oa-error">{errors.puesto}</div> : null}

                </div>

                <div className="oa-field">
                  <label className="oa-label">Salario Diario</label>
                  <div className={`oa-money ${errors.salario_diario ? "oa-input-error" : ""}`}>
                    <span className="oa-money-prefix">$</span>
                    <input
                      className="oa-money-input"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.salario_diario}
                      onChange={(e) => setField("salario_diario", e.target.value)}
                    />
                  </div>
                  {errors.salario_diario ? <div className="oa-error">{errors.salario_diario}</div> : null}
                </div>

                <div className="oa-field">
                  <label className="oa-label">Salario Diario Integrado</label>
                  <div className={`oa-money ${errors.salario_diario_integrado ? "oa-input-error" : ""}`}>
                    <span className="oa-money-prefix">$</span>
                    <input
                      className="oa-money-input"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.salario_diario_integrado}
                      onChange={(e) => setField("salario_diario_integrado", e.target.value)}
                    />
                  </div>
                  {errors.salario_diario_integrado ? (
                    <div className="oa-error">{errors.salario_diario_integrado}</div>
                  ) : null}
                </div>

                <div className="oa-field">
                  <label className="oa-label">Jornada de Trabajo</label>
                  <select
                    className={`oa-input ${errors.jornada ? "oa-input-error" : ""}`}
                    value={form.jornada}
                    onChange={(e) => setField("jornada", e.target.value)}
                  >
                    <option value="">Seleccionar jornada</option>
                    <option>Diurna</option>
                    <option>Nocturna</option>
                    <option>Mixta</option>
                    <option>Por horas</option>
                  </select>

                  {errors.jornada ? <div className="oa-error">{errors.jornada}</div> : null}

                </div>

                <div className="oa-field">
                  <label className="oa-label">Día de Descanso</label>
                  <select
                    className={`oa-input ${errors.dia_descanso ? "oa-input-error" : ""}`}
                    value={form.dia_descanso}
                    onChange={(e) => setField("dia_descanso", e.target.value)}
                  >
                    <option value="">Seleccionar día</option>
                    <option>Lunes</option>
                    <option>Martes</option>
                    <option>Miércoles</option>
                    <option>Jueves</option>
                    <option>Viernes</option>
                    <option>Sábado</option>
                    <option>Domingo</option>
                  </select>

                  {errors.dia_descanso ? <div className="oa-error">{errors.dia_descanso}</div> : null}

                </div>

                <div className="oa-field ">
                  <label className="oa-label">Lugar de Prestación del Servicio</label>
                  <input
                    className={`oa-input ${errors.lugar_servicio ? "oa-input-error" : ""}`}
                    type="text"
                    placeholder="Domicilio completo del centro de trabajo"
                    value={form.lugar_servicio}
                    onChange={(e) => setField("lugar_servicio", e.target.value)}
                  />

                  {errors.lugar_servicio ? <div className="oa-error">{errors.lugar_servicio}</div> : null}

                </div>
                <div className="oa-field ">
                  <label className="oa-label">Circunstancias de Modo, Tiempo y Lugar</label>
                  <textarea
                    className={`oa-input ${errors.hechos ? "oa-input-error" : ""}`}
                    value={form.hechos}
                    onChange={(e) => setField("hechos", e.target.value)}
                  />

                  {errors.hechos ? <div className="oa-error">{errors.hechos}</div> : null}

                </div>
              </div>
            </section>


    
            <div className="oa-pruebas-wrap">

              <div className="oa-pruebas-head">
                <h3 className="oa-pruebas-title">
                  <span className="material-symbols-outlined oa-ico oa-ico-primary">gavel</span>
                  Tipos de Pruebas
                </h3>
                <p className="oa-pruebas-sub">
                  Seleccione el tipo de prueba para desplegar sus opciones y configure los detalles específicos.
                </p>
              </div>

              <div className="oa-acc-list">

                {/* 1) CONFESIONAL */}
                <details className={`oa-acc ${checklistActivo.confesional ? "oa-acc-active" : ""}`}>
                  <summary className="oa-acc-sum">
                    <div className="oa-acc-left">
                      <div className="oa-acc-ico">
                        <span className="material-symbols-outlined">record_voice_over</span>
                      </div>
                      <div className="oa-acc-txt">
                        <div className="oa-acc-name">Confesional</div>
                        <div className="oa-acc-meta">
                          {checklistActivo.confesional ? "Configuración activa" : "Sin configurar"}
                        </div>
                      </div>
                    </div>

                  <div className="oa-acc-right">
  <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
</div>

                  </summary>

                  <div className="oa-acc-body">


                    <div className="oa-acc-nested-body">
                      <div className="oa-grid-2">
                        <div className="oa-field">
                          <label className="oa-label">Confesional (General)</label>
                        <SelectWithAdd
  value={form?.pruebas_detalle?.actora?.confesional?.general_de || []}
  onChange={(values) =>
    setPruebasDetalle("confesional", {
      ...form?.pruebas_detalle?.actora?.confesional,
      general_de: Array.isArray(values) ? values : [values],
    })
  }
  overrideKey="confesional_general_de"
  baseOptions={[
    { label: "De la parte actora (Trabajador)", value: "actora" },
    { label: "De la parte demandada (Patrón)", value: "demandada" },
  ]}
/>



                        </div>

                        <div className="oa-field">
                          <label className="oa-label">Modalidad</label>
                          <SelectWithAdd
  value={form?.pruebas_detalle?.actora?.confesional?.modalidad || []}
  onChange={(values) =>
    setPruebasDetalle("confesional", {
      ...form?.pruebas_detalle?.actora?.confesional,
      modalidad: Array.isArray(values) ? values : [values],
    })
  }
  overrideKey="confesional_modalidad"
  baseOptions={[
    { label: "Confesional (General)", value: "general" },
    { label: "Confesional por Posiciones", value: "posiciones" },
  ]}
/>



                        </div>

                        <div className="oa-field">
                          <label className="oa-label">Tipo (si aplica)</label>
                          <SelectWithAdd
  value={form?.pruebas_detalle?.actora?.confesional?.tipo || []}
  onChange={(values) =>
    setPruebasDetalle("confesional", {
      ...form?.pruebas_detalle?.actora?.confesional,
      tipo: Array.isArray(values) ? values : [values],
    })
  }
  overrideKey="confesional_tipo"
  baseOptions={[
    { label: "Expresa", value: "expresa" },
    { label: "Tácita", value: "tacita" },
  ]}
/>

                        </div>

                        <div className="oa-field">
                          <label className="oa-label">Absolvente / Persona a absolver</label>
                          <input
                            className="oa-input"
                            type="text"
                            placeholder="Ej. Representante legal"
                            value={form?.pruebas_detalle?.actora?.confesional?.absolvente || ""}
                            onChange={(e) =>
                              setPruebasDetalle("confesional", {
                                ...form?.pruebas_detalle?.actora?.confesional,
                                absolvente: e.target.value,
                              })
                            }
                            disabled={false}
                          />
                        </div>

                        <div className="oa-field">
                          <label className="oa-label">Fecha de audiencia</label>
                          <input
                            className="oa-input"
                            type="date"
                            value={form?.pruebas_detalle?.actora?.confesional?.fecha_audiencia || ""}
                            onChange={(e) =>
                              setPruebasDetalle("confesional", {
                                ...form?.pruebas_detalle?.actora?.confesional,
                                fecha_audiencia: e.target.value,
                              })
                            }
                            disabled={false}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </details>

                {/* 2) TESTIMONIAL */}
                <details className={`oa-acc ${checklistActivo.testimonial ? "oa-acc-active" : ""}`}>
                  <summary className="oa-acc-sum">
                    <div className="oa-acc-left">
                      <div className="oa-acc-ico">
                        <span className="material-symbols-outlined">groups</span>
                      </div>
                      <div className="oa-acc-txt">
                        <div className="oa-acc-name">Testimonial</div>
                        <div className="oa-acc-meta">
                          {checklistActivo.testimonial
                            ? `${(form?.pruebas_detalle?.actora?.testimonial?.testigos || []).length} testigo(s)`
                            : "Sin configurar"}
                        </div>
                      </div>
                    </div>

                    <div className="oa-acc-right">
  <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
</div>

                  </summary>

                  <div className="oa-acc-body">
                

                      <div className="oa-acc-nested-body">
                        <div className="oa-field">
                          <label className="oa-label">Nombre del testigo</label>
                          <div className="oa-inline">
                            <input
                              className="oa-input"
                              type="text"
                              placeholder="Nombre completo"
                              value={form?.pruebas_detalle?.actora?.testimonial?.draft_nombre || ""}
                              onChange={(e) =>
                                setPruebasDetalle("testimonial", {
                                  ...form?.pruebas_detalle?.actora?.testimonial,
                                  draft_nombre: e.target.value,
                                })
                              }
                              disabled={false}
                            />
                            <button
                              type="button"
                              className="oa-btn-lite"
                              onClick={() => addTestigo()}
                              disabled={false}
                            >
                              <span className="material-symbols-outlined oa-btn-lite-ico">add</span>
                              Agregar
                            </button>
                          </div>

                          {(form?.pruebas_detalle?.actora?.testimonial?.testigos || []).length ? (
                            <div className="oa-chiplist">
                              {(form?.pruebas_detalle?.actora?.testimonial?.testigos || []).map((t) => (
                                <span key={t.id} className="oa-chip">
                                  {t.nombre}
                                  <button
                                    type="button"
                                    className="oa-chip-x"
                                    onClick={() => removeTestigo(t.id)}
                                    title="Quitar"
                                  >
                                    <span className="material-symbols-outlined">close</span>
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="oa-muted">No hay testigos agregados aún.</div>
                          )}

                          <div className="oa-grid-2 oa-mt-4">
                            <div className="oa-field">
                              <label className="oa-label">Tipo</label>
                             <SelectWithAdd
  value={form?.pruebas_detalle?.actora?.testimonial?.tipo || []}
  onChange={(values) =>
    setPruebasDetalle("testimonial", {
      ...form?.pruebas_detalle?.actora?.testimonial,
      tipo: Array.isArray(values) ? values : [values],
    })
  }
  overrideKey="testimonial_tipo"
  baseOptions={[
    { label: "Individual", value: "individual" },
    { label: "Grupo de testigos (2 o más)", value: "grupo" },
  ]}
/>

                            </div>
                          </div>
                        </div>
                      </div>
                   
                  </div>
                </details>

                {/* 3) DOCUMENTAL PÚBLICA */}
                <details className={`oa-acc ${checklistActivo.documental_publica ? "oa-acc-active" : ""}`}>
                  <summary className="oa-acc-sum">
                    <div className="oa-acc-left">
                      <div className="oa-acc-ico">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div className="oa-acc-txt">
                        <div className="oa-acc-name">Documental Pública</div>
                        <div className="oa-acc-meta">
                          {checklistActivo.documental_publica ? "Configuración activa" : "Sin configurar"}
                        </div>
                      </div>
                    </div>

                    <div className="oa-acc-right">
  <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
</div>

                  </summary>

                  <div className="oa-acc-body">
                  

                      <div className="oa-acc-nested-body">
                        <div className="oa-grid-2">
                          <div className="oa-field">
                            <label className="oa-label">Tipo de documental pública</label>
                          <SelectWithAdd
  value={form?.pruebas_detalle?.actora?.documental_publica?.tipo || []}
  onChange={(values) =>
    setPruebasDetalle("documental_publica", {
      ...form?.pruebas_detalle?.actora?.documental_publica,
      tipo: Array.isArray(values) ? values : [values],
    })
  }
  overrideKey="documental_publica_tipo"
  baseOptions={[
    { label: "Actuaciones judiciales", value: "judicial" },
    { label: "Oficios", value: "oficios" },
  ]}
/>


                          </div>

                          <div className="oa-field">
                            <label className="oa-label">Descripción</label>
                            <input
                              className="oa-input"
                              type="text"
                              placeholder="Describe el documento"
                              value={form?.pruebas_detalle?.actora?.documental_publica?.descripcion || ""}
                              onChange={(e) =>
                                setPruebasDetalle("documental_publica", {
                                  ...form?.pruebas_detalle?.actora?.documental_publica,
                                  descripcion: e.target.value,
                                })
                              }
                              disabled={false}
                            />
                          </div>
                        </div>
                      </div>
                  
                  </div>
                </details>

                {/* 4) DOCUMENTAL PRIVADA */}
                <details className={`oa-acc ${checklistActivo.documental_privada ? "oa-acc-active" : ""}`}>
                  <summary className="oa-acc-sum">
                    <div className="oa-acc-left">
                      <div className="oa-acc-ico">
                        <span className="material-symbols-outlined">folder_open</span>
                      </div>
                      <div className="oa-acc-txt">
                        <div className="oa-acc-name">Documental Privada</div>
                        <div className="oa-acc-meta">
                          {checklistActivo.documental_privada ? "Configuración activa" : "Sin configurar"}
                        </div>
                      </div>
                    </div>

                    <div className="oa-acc-right">
  <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
</div>

                  </summary>

                  <div className="oa-acc-body">
                   

                      <div className="oa-acc-nested-body">
                        <div className="oa-grid-2">
                          <div className="oa-field">
                            <label className="oa-label">Tipo de documental privada</label>
                           <SelectWithAdd
  value={form?.pruebas_detalle?.actora?.documental_privada?.tipo || []}
  onChange={(values) =>
    setPruebasDetalle("documental_privada", {
      ...form?.pruebas_detalle?.actora?.documental_privada,
      tipo: Array.isArray(values) ? values : [values],
    })
  }
  overrideKey="documental_privada_tipo"
  baseOptions={[
    { label: "Contrato individual de trabajo", value: "contrato" },
    { label: "Recibo de nómina", value: "recibo" },
  ]}
/>

                          </div>

                          <div className="oa-field">
                            <label className="oa-label">Descripción</label>
                            <input
                              className="oa-input"
                              type="text"
                              placeholder="Describe el documento"
                              value={form?.pruebas_detalle?.actora?.documental_privada?.descripcion || ""}
                              onChange={(e) =>
                                setPruebasDetalle("documental_privada", {
                                  ...form?.pruebas_detalle?.actora?.documental_privada,
                                  descripcion: e.target.value,
                                })
                              }
                              disabled={false}
                            />
                          </div>
                        </div>
                      </div>
                   
                  </div>
                </details>

                {/* 5) PERICIAL */}
                <details className={`oa-acc ${checklistActivo.pericial ? "oa-acc-active" : ""}`} open={!false}>
                  <summary className="oa-acc-sum">
                    <div className="oa-acc-left">
                      <div className="oa-acc-ico">
                        <span className="material-symbols-outlined">science</span>
                      </div>
                      <div className="oa-acc-txt">
                        <div className="oa-acc-name">Pericial</div>
                        <div className="oa-acc-meta">
                          {checklistActivo.pericial ? "Configuración activa" : "Sin configurar"}
                        </div>
                      </div>
                    </div>

                    <div className="oa-acc-right">
  <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
</div>

                  </summary>

                  <div className="oa-acc-body">
                    <div className="oa-acc-subhead">
                      <div className="oa-acc-subtitle">Configuración específica</div>
                    </div>

                
                      <div className="oa-acc-nested-body">
                        <div className="oa-grid-2">
                          <div className="oa-field">
                            <label className="oa-label">
                              <span className="oa-req">*</span> Tipo de Pericial
                            </label>
                           <SelectWithAdd
  value={form?.pruebas_detalle?.actora?.pericial?.tipo || []}
  onChange={(values) =>
    setPruebasDetalle("pericial", {
      ...form?.pruebas_detalle?.actora?.pericial,
      tipo: Array.isArray(values) ? values : [values],
    })
  }
  overrideKey="pericial_tipo"
  baseOptions={[
    { label: "Grafoscopía (firma)", value: "grafoscopia" },
    { label: "Contable", value: "contable" },
  ]}
/>


                          </div>

                          <div className="oa-field">
                            <label className="oa-label">
                              <span className="oa-req">*</span> Nombre del Perito Propuesto
                            </label>
                            <input
                              className="oa-input"
                              type="text"
                              placeholder="Ej. Lic. Ana María González"
                              value={form?.pruebas_detalle?.actora?.pericial?.perito || ""}
                              onChange={(e) =>
                                setPruebasDetalle("pericial", {
                                  ...form?.pruebas_detalle?.actora?.pericial,
                                  perito: e.target.value,
                                })
                              }
                              disabled={false}
                            />
                          </div>
                        </div>

                        <div className="oa-field oa-mt-4">
                          <label className="oa-label">
                            <span className="oa-req">*</span> Objeto de la Prueba (Cuestionario al Perito)
                          </label>
                          <textarea
                            className="oa-input"
                            rows={4}
                          
                            value={form?.pruebas_detalle?.actora?.pericial?.objeto || ""}
                            onChange={(e) =>
                              setPruebasDetalle("pericial", {
                                ...form?.pruebas_detalle?.actora?.pericial,
                                objeto: e.target.value,
                              })
                            }
                            disabled={false}
                          />
                          
                        </div>

                      
                      </div>
                   
                  </div>
                </details>

                {/* 6) INSPECCIÓN OCULAR / JUDICIAL */}
                <details className={`oa-acc ${checklistActivo.inspeccion_ocular ? "oa-acc-active" : ""}`}>
                  <summary className="oa-acc-sum">
                    <div className="oa-acc-left">
                      <div className="oa-acc-ico">
                        <span className="material-symbols-outlined">visibility</span>
                      </div>
                      <div className="oa-acc-txt">
                        <div className="oa-acc-name">Inspección Ocular / Judicial</div>
                        <div className="oa-acc-meta">
                          {checklistActivo.inspeccion_ocular ? "Configuración activa" : "Sin configurar"}
                        </div>
                      </div>
                    </div>

                    <div className="oa-acc-right">
  <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
</div>

                  </summary>

                  <div className="oa-acc-body">
                  
                      <div className="oa-acc-nested-body">
                        <div className="oa-grid-2">
                          <div className="oa-field">
                            <label className="oa-label">Objeto a inspeccionar</label>
                            <input
                              className="oa-input"
                              type="text"
                              placeholder="Ej. nóminas, listas de asistencia, maquinaria..."
                              value={form?.pruebas_detalle?.actora?.inspeccion_ocular?.objeto || ""}
                              onChange={(e) =>
                                setPruebasDetalle("inspeccion_ocular", {
                                  ...form?.pruebas_detalle?.actora?.inspeccion_ocular,
                                  objeto: e.target.value,
                                })
                              }
                              disabled={false}
                            />
                          </div>

                          <div className="oa-field">
                            <label className="oa-label">Lugar</label>
                            <input
                              className="oa-input"
                              type="text"
                              placeholder="Centro de trabajo / domicilio / etc."
                              value={form?.pruebas_detalle?.actora?.inspeccion_ocular?.lugar || ""}
                              onChange={(e) =>
                                setPruebasDetalle("inspeccion_ocular", {
                                  ...form?.pruebas_detalle?.actora?.inspeccion_ocular,
                                  lugar: e.target.value,
                                })
                              }
                              disabled={false}
                            />
                          </div>
                        </div>
                      </div>
                  
                  </div>
                </details>

                {/* 7) MEDIOS ELECTRÓNICOS (CIENCIA) */}

<details className={`oa-acc ${checklistActivo.medios_electronicos ? "oa-acc-active" : ""}`}>
  <summary className="oa-acc-sum">
    <div className="oa-acc-left">
      <div className="oa-acc-ico">
        <span className="material-symbols-outlined">memory</span>
      </div>

      <div className="oa-acc-txt" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div className="oa-acc-name" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>Medios Electrónicos / Ciencia</span>

          <Tag style={{ margin: 0 }}>
            {(getMediosTipos()?.length || 0)} seleccionado(s)
          </Tag>
        </div>

        <div className="oa-acc-meta">
          {checklistActivo.medios_electronicos ? "Configuración activa" : "Sin configurar"}
        </div>
      </div>
    </div>

    <div className="oa-acc-right">
      <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
    </div>
  </summary>

  <div className="oa-acc-body">
    <div className="oa-acc-nested-body">
      {/* Caja “moderna” sin depender de tus chips */}
      <div
        style={{
          background: "rgba(148, 163, 184, 0.08)",
          border: "1px solid rgba(148, 163, 184, 0.25)",
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Tipo(s) de medio</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Selecciona lo que aplica. Sin combinaciones raras de teclado.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Button
              size="small"
              onClick={() => setMediosElectronicosTipos(MEDIOS_OPTS.map((x) => x.value))}
            >
              Seleccionar todo
            </Button>

            <Button
              size="small"
              danger
              onClick={() => setMediosElectronicosTipos([])}
            >
              Limpiar
            </Button>
          </div>
        </div>

        <Divider style={{ margin: "12px 0" }} />

        <Checkbox.Group
          value={getMediosTipos()}
          onChange={handleMediosTiposChange}
          style={{ width: "100%" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {MEDIOS_OPTS.map((opt) => (
              <Checkbox key={opt.value} value={opt.value}>
                {opt.label}
              </Checkbox>
            ))}
          </div>
        </Checkbox.Group>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Descripción</div>
          <Input.TextArea
            rows={3}
            placeholder="Describe el contenido, fecha, origen, etc."
            value={form?.pruebas_detalle?.actora?.medios_electronicos?.descripcion || ""}
            onChange={(e) =>
              setPruebasDetalle("medios_electronicos", {
                ...form?.pruebas_detalle?.actora?.medios_electronicos,
                descripcion: e.target.value,
              })
            }
          />
        </div>
      </div>
    </div>
  </div>
</details>

                {/* 8) INSTRUMENTAL DE ACTUACIONES (toggle) */}
               <div className="oa-acc oa-acc-static">
  <div className="oa-acc-sum oa-acc-sum-static">
    <div className="oa-acc-left">
      <div className="oa-acc-ico oa-acc-ico-gray">
        <span className="material-symbols-outlined">folder_special</span>
      </div>
      <div className="oa-acc-txt">
        <div className="oa-acc-name">Instrumental de Actuaciones</div>
        <div className="oa-acc-meta">Se incluye automáticamente en el expediente</div>
      </div>
    </div>

    <div className="oa-acc-right">
      <Switch
        checked={!!form?.pruebas_checklist?.actora?.instrumental_actuaciones}
        onChange={(checked) => setPruebaChecklist("instrumental_actuaciones", checked)}
      />
    </div>
  </div>
</div>

                {/* 9) PRESUNCIONAL LEGAL Y HUMANA (toggle) */}
               <div className="oa-acc oa-acc-static">
  <div className="oa-acc-sum oa-acc-sum-static">
    <div className="oa-acc-left">
      <div className="oa-acc-ico oa-acc-ico-gray">
        <span className="material-symbols-outlined">psychology</span>
      </div>
      <div className="oa-acc-txt">
        <div className="oa-acc-name">Presuncional Legal y Humana</div>
        <div className="oa-acc-meta">Se asume por defecto</div>
      </div>
    </div>

    <div className="oa-acc-right">
      <Switch
        checked={!!form?.pruebas_checklist?.actora?.presuncional_legal_humana}
        onChange={(checked) => setPruebaChecklist("presuncional_legal_humana", checked)}
      />
    </div>
  </div>
</div>

              </div>
            </div>

      

            {/* Acciones internas opcionales (si algún día quieres) */}
            <div className="oa-hidden-actions">
              <button type="button" onClick={onCancel}>
                Cancelar
              </button>
              <button type="button" disabled={submitting} onClick={saveTribunal} >
                {submitting ? "Guardando..." : "Guardar expediente"}
              </button>
            </div>
          </fieldset>
        </div>
      </main>
    </div>
  );
}
