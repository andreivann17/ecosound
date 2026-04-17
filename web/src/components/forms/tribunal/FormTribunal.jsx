// src/components/tribunal/FormTribunal/FormTribunal.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { notification, Spin } from "antd";
import { useNavigate } from "react-router-dom";

import "../tribunal/FormTribunal.css";
import "../../modals/tribunal/selectAddNew.css";

import { actionConciliacionSearchExpedientes } from "../../../redux/actions/conciliacion/conciliacion";
import { actionAutoridadesTribunalGet } from "../../../redux/actions/autoridades/autoridades";
import useLaboralCatalogos from "../../../containers/pages/materias/laboral/useLaboralCatalogos";
import { actionEmpresasGet } from "../../../redux/actions/empresas/empresas";

import { getDefaults, mergeInitialValues } from "./formTribunal.defaults";
import { collapseSpaces, anyTrue, isEmpty, isValidISODate, toNum } from "./formTribunal.helpers";
import useExpedienteAutocomplete from "./useExpedienteAutocomplete";

import DatosGeneralesSection from "./DatosGeneralesSection";
import EtapasCitatorioSection from "./EtapasCitatorioSection";
import AccionesPrestacionesSection from "./AccionesPrestacionesSection";
import HechosSection from "./HechosSection";
import CondicionesTrabajoSection from "./CondicionesTrabajoSection";
import PruebasSection from "./PruebasSection";
import { PATH } from "../../../redux/utils";
const genRowId = () => `row_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const safeArr = (v) => (Array.isArray(v) ? v : []);
const safeObj = (v) => (v && typeof v === "object" ? v : {});

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
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [api, contextHolder] = notification.useNotification();
  const defaults = useMemo(() => getDefaults(), []);

  const [form, setForm] = useState(() => mergeInitialValues(defaults, initialValues));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [catalogOverrides, setCatalogOverrides] = useState({});
  const [newEmpresaNombre, setNewEmpresaNombre] = useState("");
  const [newRazonSocialNombre, setNewRazonSocialNombre] = useState("");

  const autoridadesSlice = useSelector((state) => state?.autoridades ?? {});
  const empresasSlice = useSelector((state) => state?.empresas ?? {});

  // =========================
  // Helpers coerce
  // =========================
  const coerceEmpresasArray = (slice) => {
    if (Array.isArray(slice)) return slice;
    if (Array.isArray(slice?.items)) return slice.items;
    if (Array.isArray(slice?.data)) return slice.data;
    if (Array.isArray(slice?.list)) return slice.list;
    if (Array.isArray(slice?.data?.items)) return slice.data.items;
    return [];
  };

  const coerceItems = (slice) => {
    const a = slice?.data?.items;
    if (Array.isArray(a)) return a;
    const b = slice?.items;
    if (Array.isArray(b)) return b;
    return [];
  };

  const pickCompanyName = (it) =>
    it?.nombre ?? it?.nombre_cliente ?? it?.empresa ?? it?.name ?? it?.razon_social ?? "";
  const pickCompanyId = (it) => it?.id_empresa ?? it?.id ?? null;

  const buildRSOption = ({ label, value, empresa_id }) => ({
    label: collapseSpaces(label || ""),
    value: value ?? collapseSpaces(label || ""),
    empresa_id: empresa_id ?? null,
  });

  const normLabelLocal = (txt) => collapseSpaces(txt || "").trim().toLowerCase();

  const dedupRazones = (arr = []) => {
    const map = new Map();
    for (const r of arr) {
      const key = `${normLabelLocal(r.label)}|${r.empresa_id ?? "null"}`;
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
        it?.razon_social && String(it.razon_social).trim() !== "" ? String(it.razon_social) : null;
      if (plainRS) bucket.razones.push(buildRSOption({ label: plainRS, value: null, empresa_id: idEmpresa }));
    });

    for (const [name, bucket] of byName.entries()) {
      bucket.razones = dedupRazones(bucket.razones);
      byName.set(name, bucket);
    }
    return byName;
  };

  const empresasItems = useMemo(() => coerceEmpresasArray(empresasSlice), [empresasSlice]);
  const empresasIndex = useMemo(() => buildEmpresasIndex(empresasItems), [empresasItems]);

  // =========================
  // Estado/catálogos
  // =========================
  const [selectedEstadoId, setSelectedEstadoId] = useState(null);
  const [selectedCiudadId, setSelectedCiudadId] = useState(null);
  const [selectedAutoridadId, setSelectedAutoridadId] = useState(null);
  const [selectedAutoridadData, setSelectedAutoridadData] = useState(null);

  const { estadosOptions, ciudadesOptions, estadosById, ciudadesById } = useLaboralCatalogos(
    selectedEstadoId,
    selectedCiudadId
  );

  useEffect(() => {
    dispatch(actionAutoridadesTribunalGet({}));
  }, [dispatch]);

  useEffect(() => {
    dispatch(actionEmpresasGet());
  }, [dispatch]);

  // =========================
  // setters
  // =========================
  const setField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((e) => {
      if (!e[name]) return e;
      const copy = { ...e };
      delete copy[name];
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

  // =========================
  // Hidratar en edit
  // =========================
  useEffect(() => {
    if (!initialValues) return;
    const iv = initialValues || {};

    setForm(mergeInitialValues(defaults, iv));

    if (iv.estado != null && String(iv.estado).trim() !== "") setSelectedEstadoId(Number(iv.estado));
    if (iv.ciudad != null && String(iv.ciudad).trim() !== "") setSelectedCiudadId(Number(iv.ciudad));
    if (iv.autoridad != null && String(iv.autoridad).trim() !== "") setSelectedAutoridadId(String(iv.autoridad));
  }, [initialValues, defaults, isEdit]);

  // =========================
  // Sincronizar selected* => form
  // =========================
  useEffect(() => {
    if (selectedEstadoId != null) setField("estado", selectedEstadoId);
    if (selectedCiudadId != null) setField("ciudad", selectedCiudadId);
    if (selectedAutoridadId != null) setField("autoridad", selectedAutoridadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEstadoId, selectedCiudadId, selectedAutoridadId]);

  // =========================
  // Filtrar autoridades (tipo 2 tribunal)
  // =========================
  const autoridadesItems = useMemo(() => {
    const items = coerceItems(autoridadesSlice);
    return (items || []).filter((au) => Number(au?.id_tipo_autoridad) === 2);
  }, [autoridadesSlice]);

  const ciudadIdsConAutoridad = useMemo(() => {
    const s = new Set();
    (autoridadesItems || []).forEach((au) => {
      const idc = au?.id_ciudad;
      if (idc !== undefined && idc !== null && String(idc) !== "") s.add(Number(idc));
    });
    return s;
  }, [autoridadesItems]);

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

  const handleChangeEstado = (value) => {
    const v = value ?? null;
    setSelectedEstadoId(v);
    setSelectedCiudadId(null);
    setSelectedAutoridadId(null);
    setSelectedAutoridadData(null);
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
    setSelectedAutoridadId(v);
    setField("autoridad", v);
    setErrors((e) => {
      if (!e.autoridad) return e;
      const c = { ...e };
      delete c.autoridad;
      return c;
    });
  };

  // =========================
  // Options empresas
  // =========================
  const empresaNombreOptions = useMemo(() => {
    const names = Array.from(empresasIndex.keys());
    return names.map((n) => ({ label: n, value: n })).sort((a, b) => a.label.localeCompare(b.label, "es"));
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

    const first = arr[0];
    const chosen = (bucket.razones || []).find((o) => String(o.value == null ? o.label : o.value) === String(first));

    let empresaId = null;
    if (chosen?.empresa_id != null) empresaId = chosen.empresa_id;
    else if (bucket.empresaIds?.size >= 1) empresaId = Array.from(bucket.empresaIds)[0];

    if (empresaId != null) setField("empresa_id", empresaId);
  };

  // =========================
  // Hook autocomplete expedientes
  // =========================
  const {
    expedienteSearchValue,
    expedienteOptions,
    expedienteSearching,
    handleExpedienteFocus,
    handleExpedienteSearch,
    handleExpedienteSelect,
    handleExpedienteChange,
  } = useExpedienteAutocomplete({
    dispatch,
    actionConciliacionSearchExpedientes,
    setField,
    setSelectedCiudadId,
    setSelectedEstadoId,
    ciudadesById,
    empresasIndex,
    api,
  });

  // =========================
  // CITATORIO (archivos)
  // =========================
  const citatorioInputRef = useRef(null);

  const openCitatorioPicker = () => {
    if (citatorioInputRef.current) citatorioInputRef.current.click();
  };

  const onCitatorioPicked = (e) => {
    const list = Array.from(e?.target?.files || []);
    if (!list.length) return;

    setForm((p) => {
      const prev = safeArr(p.citatorio);
      const next = [...prev];

      for (const f of list) {
        next.push({
          id: genRowId(),
          filename: f.name,
          categoria: "DEMANDA/NOTIFICACION",
          estado: "nuevo",
          _file: f,
        });
      }
      return { ...p, citatorio: next };
    });

    setErrors((er) => {
      if (!er.citatorio) return er;
      const c = { ...er };
      delete c.citatorio;
      return c;
    });

    e.target.value = "";
  };

  const viewCitatorio = (row) => {
    if (!row) return;

    if (row._file) {
      const url = URL.createObjectURL(row._file);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return;
    }
    console.log(PATH)
    console.log(row.url)

    if (row.url) {
      window.open(PATH+`/uploads/tribunal/${idExpediente}/${row.url}`, "_blank", "noopener,noreferrer");
      return;
    }

    api.info({
      message: "Documento",
      description: "No hay archivo local ni URL para previsualizar.",
      placement: "bottomRight",
      duration: 3,
    });
  };

  const deleteCitatorio = (rowId) => {
    setForm((p) => {
      const prev = safeArr(p.citatorio);
      const next = prev.filter((x) => String(x.id) !== String(rowId));
      return { ...p, citatorio: next };
    });
  };

  // =========================
  // PRUEBAS: checklist + helpers UI
  // =========================
  const MEDIOS_OPTS = useMemo(
    () => [
      { label: "WhatsApp", value: "whatsapp" },
      { label: "Correo", value: "correo" },
      { label: "SMS", value: "sms" },
      { label: "Redes sociales", value: "redes_sociales" },
      { label: "Audios", value: "audios" },
      { label: "Videos", value: "videos" },
      { label: "Fotografías", value: "fotos" },
      { label: "Capturas", value: "capturas" },
      { label: "Plataformas", value: "plataformas" },
      { label: "Archivos digitales", value: "archivos" },
    ],
    []
  );

  const collapseSpacesLocal = (s) => collapseSpaces(s || "");

  const makeNewSelectValue = (label) => {
    const clean = collapseSpacesLocal(label);
    const stamp = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    return `new:${clean}:${stamp}`;
  };

  const toggleChecklistActora = (key) => {
    setForm((p) => {
      const prev = safeObj(p.pruebas_checklist);
      const act = safeObj(prev.actora);
      return {
        ...p,
        pruebas_checklist: {
          ...prev,
          actora: { ...act, [key]: !act[key] },
        },
      };
    });

    setErrors((e) => {
      if (!e.pruebas_checklist) return e;
      const c = { ...e };
      delete c.pruebas_checklist;
      return c;
    });
  };
const checklistActivo = useMemo(() => {
  const act = safeObj(form?.pruebas_checklist?.actora);
  return {
    confesional: !!act.confesional,
    confesional_hechos_propios: !!act.confesional_hechos_propios,
    testimonial: !!act.testimonial,
    medios_electronicos: !!act.medios_electronicos,
    documental_publica: !!act.documental_publica,
    documental_privada: !!act.documental_privada,
    informe_autoridad: !!act.informe_autoridad,
    documental: !!act.documental,
    pericial: !!act.pericial,
    inspeccion_ocular: !!act.inspeccion_ocular,
  };
}, [form?.pruebas_checklist?.actora]);
  const addTestigo = () => {
    setForm((p) => {
      const pd = safeObj(p.pruebas_detalle);
      const act = safeObj(pd.actora);
      const t = safeObj(act.testimonial);

      const nombre = collapseSpacesLocal(t.draft_nombre || "");
      if (!nombre) return p;

      const prevList = safeArr(t.testigos);
      const nextList = [...prevList, { id: genRowId(), nombre }];

      return {
        ...p,
        pruebas_detalle: {
          ...pd,
          actora: {
            ...act,
            testimonial: {
              ...t,
              draft_nombre: "",
              testigos: nextList,
            },
          },
        },
      };
    });
  };

  const removeTestigo = (id) => {
    setForm((p) => {
      const pd = safeObj(p.pruebas_detalle);
      const act = safeObj(pd.actora);
      const t = safeObj(act.testimonial);

      const prevList = safeArr(t.testigos);
      const nextList = prevList.filter((x) => String(x.id) !== String(id));

      return {
        ...p,
        pruebas_detalle: {
          ...pd,
          actora: { ...act, testimonial: { ...t, testigos: nextList } },
        },
      };
    });
  };

  const setMediosElectronicosTipos = (arr) => {
    const next = safeArr(arr);
    setPruebasDetalle("medios_electronicos", {
      ...(safeObj(form?.pruebas_detalle?.actora?.medios_electronicos) || {}),
      tipos: next,
    });
  };

  const toggleMedioElectronico = (value) => {
    const cur = safeArr(form?.pruebas_detalle?.actora?.medios_electronicos?.tipos);
    const exists = cur.includes(value);
    const next = exists ? cur.filter((x) => x !== value) : [...cur, value];
    setMediosElectronicosTipos(next);
  };

  // =========================
  // Validación
  // =========================
  const validate = useCallback(() => {
    const e = {};
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

    if (selectedEstadoId == null || String(selectedEstadoId).trim() === "") req("estado");
    if (selectedCiudadId == null || String(selectedCiudadId).trim() === "") req("ciudad");
    if (selectedAutoridadId == null || String(selectedAutoridadId).trim() === "") req("autoridad");

    reqDate("fecha_limite_contestacion");

    reqDate("fecha_notificacion_demanda");
    reqDate("fecha_presentacion_demanda");

 
    reqText("numero_expediente", "Requerido");
    reqText("nombre_parte_actora", "Requerido");
    reqText("empresa_nombre", "Requerido");

    if (!Array.isArray(form?.empresa_razon_social_ids) || form.empresa_razon_social_ids.length === 0) {
      req("empresa_razon_social_ids", "Requerido");
    }

    if (Number(form?.cliente_directo || 1) !== 1) reqText("corresponsal_nombre", "Requerido");

   // reqText("accion_intentada", "Requerido");

    if (!anyTrue(form?.prestaciones || {})) req("prestaciones", "Requerido (elige al menos una)");
    console.log(form)
    reqText("accion_intentada", "Requerido");

  //  reqText("hechos", "Requerido");
    setErrors(e);

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
  }, [form, selectedEstadoId, selectedCiudadId, selectedAutoridadId, api]);

  // =========================
  // payload builder + submit
  // =========================
  const buildPayloadAndFiles = useCallback(() => {
    const packRows = (rows = []) =>
      (rows || []).map((x) => ({
        id: x.id,
        filename: x.filename,
        categoria: x.categoria,
        estado: x.estado,
      }));

    const citatorioRows = Array.isArray(form?.citatorio) ? form.citatorio : [];

    const filesMap = {
      citatorio: citatorioRows.filter((x) => x?._file).map((x) => ({ id: x.id, file: x._file })),
      evidencias_actora: (form.evidencias_actora || [])
        .filter((x) => x?._file)
        .map((x) => ({ id: x.id, file: x._file })),
    };

    const actoraDetalle = { ...(form?.pruebas_detalle?.actora || {}) };

    const confesionalRegistros = Array.isArray(actoraDetalle?.confesional?.registros)
      ? actoraDetalle.confesional.registros
      : [];

    const testimonialTestigos = Array.isArray(actoraDetalle?.testimonial?.testigos)
      ? actoraDetalle.testimonial.testigos
      : [];

    const documentalPublicaDocs = Array.isArray(actoraDetalle?.documental_publica?.documentos)
      ? actoraDetalle.documental_publica.documentos
      : [];

    const documentalPrivadaDocs = Array.isArray(actoraDetalle?.documental_privada?.documentos)
      ? actoraDetalle.documental_privada.documentos
      : [];
const informeAutoridadDocs = Array.isArray(actoraDetalle?.informe_autoridad?.documentos)
  ? actoraDetalle.informe_autoridad.documentos
  : [];

    const pericialRegistros = Array.isArray(actoraDetalle?.pericial?.registros)
      ? actoraDetalle.pericial.registros
      : [];

    const inspeccionOcularRegistros = Array.isArray(actoraDetalle?.inspeccion_ocular?.registros)
  ? actoraDetalle.inspeccion_ocular.registros
  : [];

if (actoraDetalle?.inspeccion_ocular) {
    actoraDetalle.inspeccion_ocular = inspeccionOcularRegistros.map((r) => ({
    tipo_inspeccion_ocular: Array.isArray(r?.tipo_inspeccion_ocular)
      ? r.tipo_inspeccion_ocular
      : r?.tipo_inspeccion_ocular
      ? [r.tipo_inspeccion_ocular]
      : [],
    nombre_inspeccion_ocular: r?.nombre_inspeccion_ocular || "",
    objeto_prueba: r?.objeto_prueba || "",
  }));
}

    if (actoraDetalle?.testimonial) {
      actoraDetalle.testimonial = {
        testigos: testimonialTestigos.map((t) => ({
          nombre: t?.nombre || "",
          relacion: t?.relacion || "",
          contacto: t?.contacto || "",
        })),
      };
    }

    if (actoraDetalle?.documental_publica) {
      actoraDetalle.documental_publica = {
        documentos: documentalPublicaDocs.map((d) => ({
          nombre: d?.nombre || "",
          descripcion: d?.descripcion || "",
          fecha: d?.fecha || null,
        })),
      };
    }

    if (actoraDetalle?.documental_privada) {
      actoraDetalle.documental_privada = {
        documentos: documentalPrivadaDocs.map((d) => ({
          nombre: d?.nombre || "",
          descripcion: d?.descripcion || "",
          fecha: d?.fecha || null,
        })),
      };
    }
if (actoraDetalle?.informe_autoridad) {
  actoraDetalle.informe_autoridad = {
    documentos: informeAutoridadDocs.map((d) => ({
      nombre: d?.nombre || "",
      descripcion: d?.descripcion || "",
      fecha: d?.fecha || null,
    })),
  };
}
   if (actoraDetalle?.pericial) {
  actoraDetalle.pericial = pericialRegistros.map((r) => ({
    tipo_pericial: Array.isArray(r?.tipo_pericial)
      ? r.tipo_pericial
      : r?.tipo_pericial
      ? [r.tipo_pericial]
      : [],
    nombre_perito: r?.nombre_perito || "",
    objeto_prueba: r?.objeto_prueba || "",
  }));
}

   if (actoraDetalle?.inspeccion_ocular) {
  actoraDetalle.inspeccion_ocular = inspeccionOcularRegistros.map((r) => ({
    tipo_inspeccion_ocular: Array.isArray(r?.tipo_inspeccion_ocular)
      ? r.tipo_inspeccion_ocular
      : r?.tipo_inspeccion_ocular
      ? [r.tipo_inspeccion_ocular]
      : [],
    nombre_inspeccion_ocular: r?.nombre_inspeccion_ocular || "",
    objeto_prueba: r?.objeto_prueba || "",
  }));
}
    const payload = {
      meta: {
        isEdit: Boolean(isEdit),
        idExpediente: idExpediente ?? null,
        idCiudad: idCiudad ?? null,
        idAutoridad: idAutoridad ?? null,
        nombreIdentificacionCiudad: nombreIdentificacionCiudad ?? "",
      },
      datos_generales: {
        numero_expediente: form.numero_expediente,
        nombre_parte_actora: form.nombre_parte_actora,
        empresa_id: form.empresa_id,
        empresa_nombre: form.empresa_nombre,
        empresa_razon_social_ids: Array.isArray(form.empresa_razon_social_ids) ? form.empresa_razon_social_ids : [],
        empresa_new: null,
        razones_sociales_new: [],
        estado: form.estado,
        ciudad: form.ciudad,
        autoridad: form.autoridad,
        fecha_notificacion_demanda: form.fecha_notificacion_demanda || null,
        fecha_constancia_conciliacion: form.fecha_constancia_conciliacion || null,
        fecha_emision_citatorio: form.fecha_emision_citatorio || null,
        fecha_radicacion_demanda: form.fecha_radicacion_demanda || null,
        fecha_recepcion_demanda: form.fecha_recepcion_demanda || null,
        dias_limite: form.dias_limite|| null,
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
  abogado_contrario: form.abogado_contrario || "",
  narrativa: form.hechos,
},
      condiciones_trabajo: {
        fecha_ingreso: form.fecha_ingreso || null,
        fecha_ultimo_dia_laborado: form.fecha_ultimo_dia_laborado || null,
        puesto: form.puesto,
        salario_diario: form.salario_diario === "" ? null : Number(form.salario_diario),
        salario_diario_integrado: form.salario_diario_integrado === "" ? null : Number(form.salario_diario_integrado),
        jornada: form.jornada,
        dia_descanso: form.dia_descanso,
        lugar_servicio: form.lugar_servicio,
      },
      pruebas_documentacion: {
        tab: "actora",
        checklist: { actora: { ...(form?.pruebas_checklist?.actora || {}) } },
        detalle: { actora: actoraDetalle },
        evidencias_actora: packRows(form.evidencias_actora),
      },
    };

    return { payload, filesMap };
  }, [form, isEdit, idExpediente, idCiudad, idAutoridad, nombreIdentificacionCiudad]);

  const defaultSubmit = async () => {
    // no-op
  };

  const saveTribunal = useCallback(async () => {
    if (submitting) return;

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

    const { payload, filesMap } = buildPayloadAndFiles();

    try {
      setSubmitting(true);
      const fn = onSubmit || defaultSubmit;
      await fn(payload, filesMap);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Error al guardar. Revisa el servidor.";
      api.error({ message: "No se pudo guardar", description: msg, placement: "bottomRight", duration: 4 });
    } finally {
      setSubmitting(false);
    }
  }, [api, submitting, validate, buildPayloadAndFiles, onSubmit]);

  useEffect(() => {
    const onSaveEvent = () => saveTribunal();
    window.addEventListener("oa:expediente:save", onSaveEvent);
    return () => window.removeEventListener("oa:expediente:save", onSaveEvent);
  }, [saveTribunal]);

  // =========================
  // createEmpresa / createRazonSocial placeholders
  // =========================
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
    api.success({
      message: "Razón social",
      description: "Razón social agregada (conecta el create real aquí).",
      placement: "bottomRight",
    });
    setNewRazonSocialNombre("");
  };

  // =========================
  // RETURN COMPLETO
  // =========================
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
            <DatosGeneralesSection
              form={form}
              errors={errors}
              expedienteSearchValue={expedienteSearchValue}
              expedienteOptions={expedienteOptions}
              expedienteSearching={expedienteSearching}
              handleExpedienteFocus={handleExpedienteFocus}
              handleExpedienteSearch={handleExpedienteSearch}
              handleExpedienteSelect={handleExpedienteSelect}
              handleExpedienteChange={handleExpedienteChange}
              selectedEstadoId={selectedEstadoId}
              selectedCiudadId={selectedCiudadId}
              selectedAutoridadId={selectedAutoridadId}
              estadosOptionsFinal={estadosOptionsFinal}
              ciudadesOptionsFinal={ciudadesOptionsFinal}
              autoridadOptions={autoridadOptions}
              handleChangeEstado={handleChangeEstado}
              handleChangeCiudad={handleChangeCiudad}
              handleChangeAutoridad={handleChangeAutoridad}
              empresaNombreOptions={empresaNombreOptions}
              razonSocialOptions={razonSocialOptions}
              handleChangeEmpresaNombre={handleChangeEmpresaNombre}
              handleChangeRazonSocial={handleChangeRazonSocial}
              newEmpresaNombre={newEmpresaNombre}
              setNewEmpresaNombre={setNewEmpresaNombre}
              createEmpresaLikeConciliacion={createEmpresaLikeConciliacion}
              newRazonSocialNombre={newRazonSocialNombre}
              setNewRazonSocialNombre={setNewRazonSocialNombre}
              createRazonSocialLikeConciliacion={createRazonSocialLikeConciliacion}
              setField={setField}
            />

            <EtapasCitatorioSection
              form={form}
              errors={errors}
              submitting={submitting}
              setField={setField}
              openCitatorioPicker={openCitatorioPicker}
              onCitatorioPicked={onCitatorioPicked}
              viewCitatorio={viewCitatorio}
              deleteCitatorio={deleteCitatorio}
              citatorioInputRef={citatorioInputRef}
            />

            <AccionesPrestacionesSection
              form={form}
              errors={errors}
              setField={setField}
              setPrestacion={setPrestacion}
            />

            <HechosSection form={form} errors={errors} setField={setField} />

            <CondicionesTrabajoSection form={form} errors={errors} setField={setField} />

           <PruebasSection
  form={form}
  checklistActivo={checklistActivo}
  setPruebasDetalle={setPruebasDetalle}
  removeTestigo={removeTestigo}
  catalogOverrides={catalogOverrides}
  setCatalogOverrides={setCatalogOverrides}
  collapseSpaces={collapseSpacesLocal}
  makeNewSelectValue={makeNewSelectValue}
  MEDIOS_OPTS={MEDIOS_OPTS}
  toggleMedioElectronico={toggleMedioElectronico}
  setMediosElectronicosTipos={setMediosElectronicosTipos}
  toggleChecklistActora={toggleChecklistActora}
  errors={errors}
  api={api}
  empresaNombreOptions={empresaNombreOptions}
  empresasIndex={empresasIndex}
/>
    
            <div className="oa-hidden-actions">
              <button type="button" onClick={onCancel}>
                Cancelar
              </button>
              <button type="button" disabled={submitting} onClick={saveTribunal}>
                {submitting ? "Guardando..." : "Guardar expediente"}
              </button>
            </div>
          </fieldset>
        </div>
      </main>
    </div>
  );
}