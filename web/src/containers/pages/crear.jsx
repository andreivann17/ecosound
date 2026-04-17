// src/pages/expedientes/CrearExpedienteWizard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Form,
  Select,
  Input,
  Button,
  Steps,
  Card,
  Row,
  Col,
  Typography,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import {
  CalendarOutlined,
  BankOutlined,
  FileProtectOutlined,
  FormOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import LOGO_SRC from "../../assets/img/logo.png";
import { actionEstadosGet } from "../../redux/actions/estados/estados.js";
import { actionCiudadesGet } from "../../redux/actions/ciudades/ciudades.js";
import { actionAutoridadesGet } from "../../redux/actions/autoridades/autoridades";
import { actionEmpresasGet } from "../../redux/actions/empresas/empresas";
import FormCentroConciliacion from "../../components/forms/centro_conciliacion/FormCentroConciliacion";
import FormDesvinculaciones from "../../components/forms/desvinculaciones/FormDesvinculaciones.jsx";

const { Title, Text } = Typography;

/* =========================
   Helpers locales
   ========================= */
const tipoRegistroOptionsBase = [
  {
    label: "Audiencias Prejudiciales",
    value: "audiencias_prejudiciales",
    icon: <CalendarOutlined />,
  },
  {
    label: "Tribunal Laboral",
    value: "expedientes_tribunal_laboral",
    icon: <BankOutlined />,
  },
  {
    label: "Juntas de Conciliación",
    value: "juntasde_conciliacion",
    icon: <FormOutlined />,
  },
  {
    label: "Procedimiento fuera de Juicio",
    value: "procedimiento_fuera_juicio",
    icon: <FileProtectOutlined />,
  },
  {
    label: "Documentacion Jurídica",
    value: "documentacion_juridica",
    icon: <FormOutlined />,
  },
  {
    label: "Desvinculaciones",
    value: "desvinculaciones",
    icon: <FormOutlined />,
  },
  {
    label: "Secretaria del Trabajo",
    value: "secretaria_trabajo",
    icon: <FormOutlined />,
  },
];

const coerceItems = (slice) => {
  if (!slice) return [];
  const data = slice.data ?? slice;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return [];
};

const coerceEmpresasArray = (slice) => {
  if (Array.isArray(slice)) return slice;
  if (Array.isArray(slice?.items)) return slice.items;
  if (Array.isArray(slice?.data)) return slice.data;
  if (Array.isArray(slice?.list)) return slice.list;
  if (Array.isArray(slice?.items?.data)) return slice.items.data;
  if (Array.isArray(slice?.data?.items)) return slice.data.items;
  return [];
};

const pickCompanyName = (it) =>
  it?.nombre ??
  it?.nombre_cliente ??
  it?.empresa ??
  it?.name ??
  it?.razon_social ??
  it?.empresa_nombre ??
  "";

const pickCompanyId = (it) => it?.id_empresa ?? it?.id ?? null;

const collapseSpaces = (s) =>
  String(s ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normLabel = (txt) => collapseSpaces(txt || "").trim().toLowerCase();

const buildRSOption = ({ label, value, empresa_id }) => ({
  label: collapseSpaces(label || ""),
  value: value ?? collapseSpaces(label || ""),
  empresa_id: empresa_id ?? null,
});

const dedupRazones = (arr = []) => {
  const map = new Map();
  for (const r of arr) {
    const key = `${normLabel(r.label)}|${r.empresa_id ?? "null"}`;
    const existing = map.get(key);
    if (!existing) map.set(key, r);
    else if (existing.value == null && r.value != null) map.set(key, r);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "es")
  );
};

const buildEmpresasIndex = (items = []) => {
  const byName = new Map();
  if (!Array.isArray(items)) return byName;

  items.forEach((it) => {
    const name = collapseSpaces(pickCompanyName(it));
    if (!name) return;

    const idEmpresa = pickCompanyId(it);

    if (!byName.has(name))
      byName.set(name, {
        empresaIds: new Set(),
        razones: [],
        raw: [],
      });

    const bucket = byName.get(name);
    bucket.raw.push(it);

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
      bucket.razones.push(
        buildRSOption({ label: plainRS, value: null, empresa_id: idEmpresa })
      );
    }
  });

  for (const [name, bucket] of byName.entries()) {
    bucket.razones = dedupRazones(bucket.razones);
    byName.set(name, bucket);
  }

  return byName;
};

/* =========================
   Catálogos base
   ========================= */
const materias = [
  { key: "laboral", title: "Laboral" },
  { key: "penal", title: "Penal" },
  { key: "mercantil", title: "Mercantil" },
  { key: "civil", title: "Civil" },
  { key: "familiar", title: "Familiar" },
  { key: "agrario", title: "Agrario" },
  { key: "otro", title: "Otra materia" },
];

const laboralOptions = [
  { key: "fuera-juicio", title: "Procedimiento fuera de juicio" },
  { key: "centro-conciliacion", title: "Centro de conciliación" },
  { key: "tribunal", title: "Tribunal" },
  { key: "junta-conciliacion", title: "Junta de conciliación" },
  { key: "documentacion", title: "Documentación" },
  { key: "otros", title: "Otros" },
];

function CrearExpedienteWizard() {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const formRef = useRef(null);

  // Redux slices
  const estadosSlice = useSelector((state) => state.estados || {});
  const ciudadesSlice = useSelector((state) => state.ciudades || {});
  const autoridadesSlice = useSelector((state) => state.autoridades || {});
  const empresasSlice = useSelector((state) => state?.empresas ?? {});

  // Datos normalizados
  const estadosItems = useMemo(() => coerceItems(estadosSlice), [estadosSlice]);
  const ciudadesItems = useMemo(
    () => coerceItems(ciudadesSlice),
    [ciudadesSlice]
  );
  const autoridadesItems = useMemo(
    () => coerceItems(autoridadesSlice),
    [autoridadesSlice]
  );

  const empresasItems = useMemo(
    () => coerceEmpresasArray(empresasSlice),
    [empresasSlice]
  );

  const empresasIndex = useMemo(
    () => buildEmpresasIndex(empresasItems),
    [empresasItems]
  );

  const empresaNombreOptionsBase = useMemo(() => {
    const names = Array.from(empresasIndex.keys());
    return names
      .map((n) => ({ label: n, value: n }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [empresasIndex]);

  // Estado local del wizard
  const [currentStep, setCurrentStep] = useState(0);

  const [tipoRegistro, setTipoRegistro] = useState("audiencias_prejudiciales");
  const [materiaSel, setMateriaSel] = useState("laboral");
  const [procedimientoSel, setProcedimientoSel] = useState(null);

  const [selectedAutoridadId, setSelectedAutoridadId] = useState(null);
  const [selectedAutoridadData, setSelectedAutoridadData] = useState(null);
  const [selectedCiudadId, setSelectedCiudadId] = useState(null);

  const [selectedEmpresaNombre, setSelectedEmpresaNombre] = useState(null);
  const [clienteNuevo, setClienteNuevo] = useState(false);

  // === Estados para creación dinámica de cliente ===
  const [empresaCustomNames, setEmpresaCustomNames] = useState([]);
  const [empresaNewName, setEmpresaNewName] = useState("");
  const empresaInputRef = useRef(null);

  // === Razón social dinámica ===
  const [razonCustomByEmpresa, setRazonCustomByEmpresa] = useState({});
  const [razonNewName, setRazonNewName] = useState("");
  const razonInputRef = useRef(null);

  // === Cliente directo / Corresponsal (solo aplica cuando el citado es NUEVO) ===
  const [clienteDirecto, setClienteDirecto] = useState(true);
  const [corresponsalNombre, setCorresponsalNombre] = useState("");
  const [corresponsalCelular, setCorresponsalCelular] = useState("");
  const [corresponsalCorreo, setCorresponsalCorreo] = useState("");

  const empresaNombreOptions = useMemo(() => {
    const extra = empresaCustomNames.map((n) => ({ label: n, value: n }));
    return [...empresaNombreOptionsBase, ...extra];
  }, [empresaNombreOptionsBase, empresaCustomNames]);

  const handleAddEmpresa = (e) => {
    e.preventDefault();
    const raw = (empresaNewName || "").trim();
    if (!raw) return;

    const clean = raw.replace(/_/g, "").trim();
    if (!clean) return;

    const existsBase = empresaNombreOptionsBase.some(
      (o) => (o.label || "").toLowerCase() === clean.toLowerCase()
    );
    const existsExtra = empresaCustomNames.some(
      (n) => n.toLowerCase() === clean.toLowerCase()
    );

    if (existsBase || existsExtra) {
      setEmpresaNewName("");
      return;
    }

    setEmpresaCustomNames((prev) => [...prev, clean]);
    setEmpresaNewName("");

    form.setFieldsValue({
      empresa_nombre: clean,
      empresa_razon_social_id: [],
    });

    setTimeout(() => {
      empresaInputRef.current?.focus();
    }, 0);
  };

  const handleAddRazonSocial = (e) => {
    e.preventDefault();

    const empresaNombreVal = form.getFieldValue("empresa_nombre") || "";
    if (!empresaNombreVal) {
      notification.error({
        message: "Selecciona primero el citado (cliente).",
        placement: "bottomRight",
      });
      return;
    }

    const raw = (razonNewName || "").trim();
    if (!raw) return;

    const sanitized = raw.replace(/_/g, "").trim();
    if (!sanitized) return;

    const key = sanitized.replace(/\s+/g, "_");
    const label = sanitized;

    const bucket = empresasIndex.get(empresaNombreVal);
    const base = bucket?.razones ?? [];
    const extra = razonCustomByEmpresa[empresaNombreVal] || [];
    const full = [...base, ...extra];

    const exists = full.some(
      (o) =>
        (o?.label || "").toLowerCase() === label.toLowerCase() ||
        String(o?.value ?? "") === String(key)
    );
    if (exists) {
      setRazonNewName("");
      return;
    }

    let empresaIdFromBucket = null;
    if (bucket && bucket.empresaIds.size >= 1)
      empresaIdFromBucket = Array.from(bucket.empresaIds)[0];

    const newOption = { label, value: key, empresa_id: empresaIdFromBucket };

    setRazonCustomByEmpresa((prev) => {
      const current = prev[empresaNombreVal] || [];
      return { ...prev, [empresaNombreVal]: [...current, newOption] };
    });

    const prevVal = form.getFieldValue("empresa_razon_social_id") || [];
    const arr = Array.isArray(prevVal) ? prevVal : [prevVal].filter(Boolean);
    form.setFieldsValue({ empresa_razon_social_id: [...arr, key] });

    setRazonNewName("");
    setTimeout(() => {
      razonInputRef.current?.focus();
    }, 0);
  };

  const empresaNombreWatch = Form.useWatch("empresa_nombre", form);
  const tipoRegistroWatch = Form.useWatch("tipo_registro", form);

  const razonSocialOptionsBase = useMemo(() => {
    if (!empresaNombreWatch) return [];
    const bucket = empresasIndex.get(empresaNombreWatch);
    if (!bucket) return [];
    return bucket.razones || [];
  }, [empresaNombreWatch, empresasIndex]);

  const razonSocialOptions = useMemo(() => {
    const extra = razonCustomByEmpresa[empresaNombreWatch] || [];
    return [...razonSocialOptionsBase, ...extra];
  }, [razonSocialOptionsBase, razonCustomByEmpresa, empresaNombreWatch]);

  const empresaEsNueva = useMemo(() => {
    const empresaNombreVal = form.getFieldValue("empresa_nombre") || "";
    if (!empresaNombreVal) return false;

    const baseExists = empresaNombreOptionsBase.some(
      (o) => (o.value || "").toLowerCase() === empresaNombreVal.toLowerCase()
    );
    const extraExists = empresaCustomNames.some(
      (n) => n.toLowerCase() === empresaNombreVal.toLowerCase()
    );
    return !baseExists && extraExists;
  }, [empresaNombreOptionsBase, empresaCustomNames, form, empresaNombreWatch]);

  // Autopoblar clienteDirecto/corresponsal cuando eliges un cliente (existente)
  const isClienteNuevo = useMemo(() => {
    const tipo = form.getFieldValue("tipo_registro") || tipoRegistro;
    if (tipo !== "desvinculaciones") return false;
    return !!empresaEsNueva;
  }, [form, tipoRegistro, empresaEsNueva]);

  useEffect(() => {
    // solo aplica cuando estás en desvinculaciones
    const tipoNow = form.getFieldValue("tipo_registro") || tipoRegistro;
    if (tipoNow !== "desvinculaciones") return;

    const toBool01 = (v, defaultVal = true) => {
      if (v === undefined || v === null || v === "") return defaultVal;
      const s = String(v).trim().toLowerCase();
      if (s === "1" || s === "true" || s === "si" || s === "sí") return true;
      if (s === "0" || s === "false" || s === "no") return false;
      return Boolean(v);
    };

    const pickFirst = (obj, keys) => {
      for (const k of keys) {
        const val = obj?.[k];
        const clean = collapseSpaces(val || "");
        if (clean) return clean;
      }
      return "";
    };

    const empresaNombreVal = form.getFieldValue("empresa_nombre") || "";

    // sin cliente seleccionado
    if (!empresaNombreVal) {
      setClienteDirecto(true);
      setCorresponsalNombre("No hay corresponsal");
      setCorresponsalCelular("");
      setCorresponsalCorreo("");
      form.setFieldsValue({
        cliente_directo: true,
        corresponsal_nombre: undefined,
        corresponsal_celular: undefined,
        corresponsal_correo: undefined,
      });
      return;
    }

    // empresa nueva: aquí manda el switch (y limpia si es directo)
    if (empresaEsNueva) {
      const directNow = !!form.getFieldValue("cliente_directo");
      if (directNow) {
        setClienteDirecto(true);
        setCorresponsalNombre("No hay corresponsal");
        setCorresponsalCelular("");
        setCorresponsalCorreo("");
        form.setFieldsValue({
          cliente_directo: true,
          corresponsal_nombre: undefined,
          corresponsal_celular: undefined,
          corresponsal_correo: undefined,
        });
      }
      return;
    }

    // empresa existente: leer de dataset
    const nombreNormalizado = collapseSpaces(empresaNombreVal).toLowerCase();
    const bucket = empresasIndex.get(empresaNombreVal);
    const rawList = bucket?.raw || [];

    const empresaMatch =
      rawList.find((e) => {
        const n = collapseSpaces(pickCompanyName(e)).toLowerCase();
        return n === nombreNormalizado;
      }) ||
      (empresasItems || []).find((e) => {
        const n = collapseSpaces(pickCompanyName(e)).toLowerCase();
        return n === nombreNormalizado;
      });

    if (!empresaMatch) {
      setClienteDirecto(true);
      setCorresponsalNombre("No hay corresponsal");
      setCorresponsalCelular("");
      setCorresponsalCorreo("");
      form.setFieldsValue({
        cliente_directo: true,
        corresponsal_nombre: undefined,
        corresponsal_celular: undefined,
        corresponsal_correo: undefined,
      });
      return;
    }

    // --- normalización de campos ---
    const esDirecto = toBool01(empresaMatch.cliente_directo, true);

    const nCorr = pickFirst(empresaMatch, [
      "corresponsal_nombre",
      "nombre_corresponsal",
      "nombre_corresponsal_empresa",
      "nombre_contacto",
      "contacto_nombre",
    ]);

    const cCorr = pickFirst(empresaMatch, [
      "corresponsal_celular",
      "celular_corresponsal",
      "telefono_corresponsal",
      "telefono_contacto",
      "contacto_telefono",
    ]);

    const eCorr = pickFirst(empresaMatch, [
      "corresponsal_correo",
      "correo_corresponsal",
      "email_corresponsal",
      "correo_contacto",
      "email_contacto",
      "contacto_email",
    ]);

    setClienteDirecto(esDirecto);
    setCorresponsalNombre(esDirecto ? "No hay corresponsal" : nCorr || "");
    setCorresponsalCelular(esDirecto ? "" : cCorr || "");
    setCorresponsalCorreo(esDirecto ? "" : eCorr || "");

    form.setFieldsValue({
      cliente_directo: esDirecto,
      corresponsal_nombre: esDirecto ? undefined : nCorr || undefined,
      corresponsal_celular: esDirecto ? undefined : cCorr || undefined,
      corresponsal_correo: esDirecto ? undefined : eCorr || undefined,
    });
  }, [
    tipoRegistro,
    empresaNombreWatch,
    empresaEsNueva,
    empresasIndex,
    empresasItems,
    form,
  ]);

  /* =========================
     Carga de catálogos
     ========================= */
  useEffect(() => {
    dispatch(actionEstadosGet({}));
    dispatch(actionCiudadesGet({}));
    dispatch(actionAutoridadesGet({}));
    dispatch(actionEmpresasGet());
  }, [dispatch]);

  useEffect(() => {
    form.setFieldsValue({
      materia: "laboral",
      tipo_registro: "audiencias_prejudiciales",
    });
  }, [form]);

  /* =========================
     Refs + Enter como Tab en Step 0
     ========================= */
  const tipoRegistroRef = useRef(null);
  const materiaRef = useRef(null);
  const procedimientoRef = useRef(null);
  const autoridadRef = useRef(null);
  const nextButtonRef = useRef(null);

  const focusOrder = [
    tipoRegistroRef,
    materiaRef,
    procedimientoRef,
    autoridadRef,
    nextButtonRef,
  ];

  const focusNext = (currentRef) => {
    const idx = focusOrder.indexOf(currentRef);
    if (idx === -1) return;

    for (let i = idx + 1; i < focusOrder.length; i++) {
      const r = focusOrder[i];
      if (r && r.current && typeof r.current.focus === "function") {
        r.current.focus();
        return;
      }
    }
  };

  const makeEnterHandler = (fieldRef) => (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      focusNext(fieldRef);
    }
  };

  /* =========================
     Opciones Select Materia / Tipo de materia
     ========================= */
  const materiaSelectOptions = useMemo(
    () =>
      materias.map((m) => ({
        label: m.title,
        value: m.key,
        disabled: m.key !== "laboral",
      })),
    []
  );

  const tipoMateriaOptions = useMemo(
    () =>
      laboralOptions.map((l) => ({
        label: l.title,
        value: l.key,
        disabled: l.key !== "centro-conciliacion",
      })),
    []
  );

  /* =========================
     Opciones dinámicas de Tipo de registro según materia
     ========================= */
  const tipoRegistroOptions = useMemo(() => {
    if (materiaSel === "laboral" || !materiaSel) {
      const enabled = new Set(["audiencias_prejudiciales", "desvinculaciones"]);
      return tipoRegistroOptionsBase.map((opt) => ({
        ...opt,
        disabled: !enabled.has(opt.value),
      }));
    }
    return tipoRegistroOptionsBase.map((opt) => ({
      ...opt,
      disabled: true,
    }));
  }, [materiaSel]);

  /* =========================
     Autoridades (CON UI)
     ========================= */
  const autoridadOptions = useMemo(
    () =>
      autoridadesItems
        .filter((au) => {
          if (!selectedCiudadId) return true;
          return Number(au?.id_ciudad || 0) === Number(selectedCiudadId);
        })
        .map((au) => ({
          label: collapseSpaces(au?.nombre || ""),
          value: au?.id,
          data: au,
        }))
        .filter((o) => o.label),
    [autoridadesItems, selectedCiudadId]
  );

  // Mantener sincronizado el Select de "cliente" con el estado local
  useEffect(() => {
    const v = form.getFieldValue("cliente") || null;
    if (v !== selectedEmpresaNombre) setSelectedEmpresaNombre(v);
  }, [form, selectedEmpresaNombre]);

  /* =========================
     Ciudad: filtro SOLO para "audiencias_prejudiciales"
     y Autoselección de autoridad si solo hay 1
     ========================= */

  // set de ciudades que tienen autoridades
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

  // opciones de ciudad con filtro condicional
  const ciudadOptions = useMemo(() => {
    const tipoNow = tipoRegistroWatch || tipoRegistro;

    const base = (ciudadesItems || []).map((c) => ({
      label: c.nombre || c.code || `Ciudad ${c.id}`,
      value: c.id,
    }));

    // SOLO si es Centro de conciliación (en tu flujo: audiencias_prejudiciales)
    if (tipoNow === "audiencias_prejudiciales") {
      return base
        .filter((o) => ciudadIdsConAutoridad.has(Number(o.value)))
        .sort((a, b) => String(a.label).localeCompare(String(b.label), "es"));
    }

    // cualquier otro: no filtrar
    return base.sort((a, b) =>
      String(a.label).localeCompare(String(b.label), "es")
    );
  }, [ciudadesItems, ciudadIdsConAutoridad, tipoRegistroWatch, tipoRegistro]);

  // si cambia a audiencias_prejudiciales y la ciudad actual NO es válida, limpiar ciudad/autoridad
  useEffect(() => {
    const tipoNow = tipoRegistroWatch || tipoRegistro;
    if (tipoNow !== "audiencias_prejudiciales") return;

    const ciudadNow = form.getFieldValue("ciudad");
    if (!ciudadNow) return;

    if (!ciudadIdsConAutoridad.has(Number(ciudadNow))) {
      setSelectedCiudadId(null);
      setSelectedAutoridadId(null);
      setSelectedAutoridadData(null);
      form.setFieldsValue({ ciudad: undefined, autoridad: undefined });
    }
  }, [
    tipoRegistroWatch,
    tipoRegistro,
    ciudadIdsConAutoridad,
    form,
    setSelectedCiudadId,
    setSelectedAutoridadId,
    setSelectedAutoridadData,
  ]);

  /* =========================
     Navegación de steps
     ========================= */
  const handleNextFromConfigStep = async () => {
    try {
      const tipo = form.getFieldValue("tipo_registro") || tipoRegistro;

      const baseFields = ["tipo_registro", "materia", "ciudad"];

      let extraFields = [];
      if (tipo === "desvinculaciones") {
        const esNuevo = !!form.getFieldValue("cliente_nuevo");

        if (!esNuevo) {
          extraFields = ["cliente"];
        } else {
          const esEmpresaNuevaNow = (() => {
            const v = form.getFieldValue("empresa_nombre") || "";
            if (!v) return false;
            const baseExists = empresaNombreOptionsBase.some(
              (o) => (o.value || "").toLowerCase() === v.toLowerCase()
            );
            const extraExists = empresaCustomNames.some(
              (n) => n.toLowerCase() === v.toLowerCase()
            );
            return !baseExists && extraExists;
          })();

          const esClienteDirectoNow = !!form.getFieldValue("cliente_directo");

          extraFields = [
            "empresa_nombre",
            "empresa_razon_social_id",
            "cliente_directo",
          ];

          if (esEmpresaNuevaNow && !esClienteDirectoNow) {
            extraFields.push(
              "corresponsal_nombre",
              "corresponsal_celular",
              "corresponsal_correo"
            );
          }
        }
      } else {
        extraFields = ["autoridad"];
      }

      const values = await form.validateFields([...baseFields, ...extraFields]);

      const allowed = new Set(["audiencias_prejudiciales", "desvinculaciones"]);
      if (!allowed.has(values.tipo_registro)) {
        notification.info({
          message: "Tipo no disponible",
          description:
            "Por ahora solo están habilitadas la creación de expedientes de audiencias prejudiciales y desvinculaciones.",
        });
        return;
      }

      setCurrentStep(1);
    } catch (err) {
      console.log("Errores al validar configuración:", err);
    }
  };

  const handleBackToConfigStep = () => {
    setCurrentStep(0);
  };

  const handleSubmitExpediente = async () => {
    try {
      const allValues = await form.validateFields();


      form.resetFields();
      setCurrentStep(0);
      setTipoRegistro("audiencias_prejudiciales");
      setMateriaSel("laboral");
      setProcedimientoSel(null);
      setSelectedAutoridadId(null);
      setSelectedAutoridadData(null);
      setSelectedCiudadId(null);
      setSelectedEmpresaNombre(null);
      setClienteNuevo(false);

      setClienteDirecto(true);
      setCorresponsalNombre("");
      setCorresponsalCelular("");
      setCorresponsalCorreo("");

      form.setFieldsValue({
        tipo_registro: "audiencias_prejudiciales",
        materia: "laboral",
        cliente_nuevo: false,
        cliente_directo: true,
        empresa_razon_social_id: [],
      });
    } catch (err) {
      console.log("Errores al guardar expediente:", err);
    }
  };

  const handleClickGuardar = async () => {
    await formRef.current?.submit();
  };

  useEffect(() => {
    if (
      currentStep === 1 &&
      formRef.current &&
      typeof formRef.current.focusFirst === "function"
    ) {
      formRef.current.focusFirst();
    }
  }, [currentStep]);

  const clientesItems = useMemo(() => {
    return (empresasItems || []).filter((e) => {
      const activo = e?.active === undefined ? true : Boolean(e.active);

      const esCliente =
        e?.es_cliente === 1 ||
        e?.is_cliente === 1 ||
        e?.tipo === "cliente" ||
        e?.tipo_empresa === "cliente" ||
        e?.cliente === 1 ||
        e?.id_empresa != null;

      return activo && esCliente;
    });
  }, [empresasItems]);

  const ciudadNombre = useMemo(() => {
    const c = (ciudadesItems || []).find(
      (x) => String(x.id) === String(selectedCiudadId)
    );
    return (
      c?.nombre || c?.code || (selectedCiudadId ? `Ciudad ${selectedCiudadId}` : "—")
    );
  }, [ciudadesItems, selectedCiudadId]);

  const renderExpedienteForm = () => {
    const tipo = form.getFieldValue("tipo_registro") || tipoRegistro;

    if (tipo === "desvinculaciones") {
      return (
        <FormDesvinculaciones
          ref={formRef}
          variant={"standalone_full"}
          idCiudad={selectedCiudadId}
          ctxCiudadNombre={ciudadNombre}
          ctxClienteNombre={form.getFieldValue("empresa_nombre") || "—"}
          ctxEmpresaId={form.getFieldValue("empresa_id")}
          ctxRazonSocialIds={form.getFieldValue("empresa_razon_social_id") || []}
          ctxRazonSocialNombres={
            form.getFieldValue("empresa_razon_social_nombre") || []
          }
          ctxClienteDirecto={!!form.getFieldValue("cliente_directo")}
          ctxCorresponsalNombre={form.getFieldValue("corresponsal_nombre") || null}
          ctxCorresponsalCelular={form.getFieldValue("corresponsal_celular") || null}
          ctxCorresponsalCorreo={form.getFieldValue("corresponsal_correo") || null}
          isClienteNuevo={isClienteNuevo}
        />
      );
    }

    return (
      <FormCentroConciliacion
        ref={formRef}
        idCiudad={selectedCiudadId}
        idAutoridad={selectedAutoridadId}
        nombreIdentificacionCiudad={
          selectedAutoridadData?.nombre_identificacion_ciudad || null
        }
        onSaved={handleSubmitExpediente}
      />
    );
  };

  /* =========================
     Render principal
     ========================= */
  return (
    <>
      <main className="crear-main">
        <div className="crear-wrapper">
          <Row style={{ marginBottom: 12 }}>
            <Col>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
              >
                Regresar
              </Button>
            </Col>
          </Row>

          <Card className="crear-card">
            <Row justify="center" style={{ marginBottom: 12 }}>
              <Col span={24} style={{ textAlign: "center" }}>
                <img src={LOGO_SRC} alt="Logo" className="crear-logo" />
              </Col>
            </Row>

            <Row justify="center" style={{ marginBottom: 24 }}>
              <Col span={24} style={{ textAlign: "center" }}>
                <Title level={3} className="crear-title">
                  Registrar actividad
                </Title>
                <Text type="secondary" className="crear-subtitle">
                  Selecciona la actividad correspondiente y después completa la
                  información necesaria para crear el registro.
                </Text>
              </Col>
            </Row>

            <div className="crear-steps">
              <Steps
                current={currentStep}
                items={[
                  {
                    title: "¿Qué vas a registrar?",
                    description:
                      "Selecciona el tipo de actividad que deseas registrar.",
                  },
                  {
                    title: "Registrar información",
                    description:
                      "Completa los datos necesarios para generar el registro de actividad.",
                  },
                ]}
              />
            </div>

            <Form
              form={form}
              layout="vertical"
              initialValues={{
                tipo_registro: "audiencias_prejudiciales",
                materia: "laboral",
                cliente_nuevo: false,
                cliente_directo: true,
                empresa_razon_social_id: [],
                empresa_id: null,
                empresa_razon_social_nombre: [],
              }}
            >
              <Form.Item name="empresa_id" hidden>
                <Input />
              </Form.Item>

              <Form.Item name="empresa_razon_social_nombre" hidden>
                <Input />
              </Form.Item>

              {currentStep === 0 && (
                <div className="wizard-step-content d-flex justify-content-center">
                  <div className="w-100">
                    <Row gutter={[20, 12]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Materia"
                          name="materia"
                          rules={[
                            {
                              required: true,
                              message: "Selecciona la materia.",
                            },
                          ]}
                        >
                          <Select
                            ref={materiaRef}
                            placeholder="Selecciona la materia"
                            options={materiaSelectOptions}
                            value={materiaSel}
                            onChange={(value) => {
                              const v = value || null;
                              setMateriaSel(v);
                              setProcedimientoSel(null);

                              setClienteDirecto(true);
                              setCorresponsalNombre("");
                              setCorresponsalCelular("");
                              setCorresponsalCorreo("");

                              if (v === "laboral") {
                                setTipoRegistro("audiencias_prejudiciales");
                                setSelectedEmpresaNombre(null);
                                setClienteNuevo(false);

                                setSelectedAutoridadId(null);
                                setSelectedAutoridadData(null);

                                setSelectedCiudadId(null);

                                form.setFieldsValue({
                                  materia: v,
                                  tipo_registro: "audiencias_prejudiciales",
                                  procedimiento_laboral: undefined,
                                  ciudad: undefined,
                                  autoridad: undefined,

                                  cliente: undefined,
                                  cliente_nuevo: false,
                                  empresa_nombre: undefined,
                                  empresa_razon_social_id: [],
                                  cliente_directo: true,
                                  corresponsal_nombre: undefined,
                                  corresponsal_celular: undefined,
                                  corresponsal_correo: undefined,
                                });
                              } else {
                                setTipoRegistro(undefined);
                                setSelectedEmpresaNombre(null);
                                setClienteNuevo(false);

                                setSelectedAutoridadId(null);
                                setSelectedAutoridadData(null);

                                setSelectedCiudadId(null);

                                form.setFieldsValue({
                                  materia: v || undefined,
                                  tipo_registro: undefined,
                                  procedimiento_laboral: undefined,
                                  ciudad: undefined,
                                  autoridad: undefined,

                                  cliente: undefined,
                                  cliente_nuevo: false,
                                  empresa_nombre: undefined,
                                  empresa_razon_social_id: [],
                                  cliente_directo: true,
                                  corresponsal_nombre: undefined,
                                  corresponsal_celular: undefined,
                                  corresponsal_correo: undefined,
                                });
                              }
                            }}
                            showSearch
                            optionFilterProp="label"
                            onKeyDown={makeEnterHandler(materiaRef)}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Tipo de Actividad"
                          name="tipo_registro"
                          rules={[
                            {
                              required: true,
                              message: "Selecciona lo que deseas registrar.",
                            },
                          ]}
                        >
                          <Select
                            ref={tipoRegistroRef}
                            placeholder="Selecciona una opción"
                            value={tipoRegistro}
                            showSearch
                            optionFilterProp="label"
                            autoFocus
                            onChange={(value) => {
                              const v = value || "audiencias_prejudiciales";
                              const prevCliente =
                                form.getFieldValue("cliente") || undefined;

                              setTipoRegistro(v);

                              // reset autoridad siempre que cambia el tipo
                              setSelectedAutoridadId(null);
                              setSelectedAutoridadData(null);
                              form.setFieldsValue({ autoridad: undefined });

                              setClienteDirecto(true);
                              setCorresponsalNombre("");
                              setCorresponsalCelular("");
                              setCorresponsalCorreo("");

                              if (v === "desvinculaciones") {
                                setClienteNuevo(false);

                                form.setFieldsValue({
                                  tipo_registro: v,
                                  cliente: prevCliente,
                                  cliente_nuevo: false,
                                  empresa_nombre: undefined,
                                  empresa_razon_social_id: [],
                                  cliente_directo: true,
                                  corresponsal_nombre: undefined,
                                  corresponsal_celular: undefined,
                                  corresponsal_correo: undefined,
                                });

                                setSelectedEmpresaNombre(prevCliente || null);
                              } else {
                                setSelectedEmpresaNombre(null);
                                setClienteNuevo(false);

                                form.setFieldsValue({
                                  tipo_registro: v,
                                  cliente: undefined,
                                  cliente_nuevo: false,
                                  empresa_nombre: undefined,
                                  empresa_razon_social_id: [],
                                  cliente_directo: true,
                                  corresponsal_nombre: undefined,
                                  corresponsal_celular: undefined,
                                  corresponsal_correo: undefined,
                                });
                              }

                              // si regresa a audiencias_prejudiciales y la ciudad actual no tiene autoridad, limpiar ciudad/autoridad
                              if (v === "audiencias_prejudiciales") {
                                const ciudadNow = form.getFieldValue("ciudad");
                                if (
                                  ciudadNow &&
                                  !ciudadIdsConAutoridad.has(Number(ciudadNow))
                                ) {
                                  setSelectedCiudadId(null);
                                  form.setFieldsValue({
                                    ciudad: undefined,
                                    autoridad: undefined,
                                  });
                                }
                              }

                              form.setFieldsValue({ tipo_registro: v });
                            }}
                            options={tipoRegistroOptions}
                            onKeyDown={makeEnterHandler(tipoRegistroRef)}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Ciudad + (Autoridad si NO desvinculaciones) */}
                    <Row gutter={[20, 12]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Ciudad"
                          name="ciudad"
                          rules={[
                            {
                              required: true,
                              message: "Selecciona la ciudad.",
                            },
                          ]}
                        >
                          <Select
                            placeholder="Selecciona la ciudad"
                            options={ciudadOptions}
                            value={selectedCiudadId}
                            onChange={(value) => {
                              const v = value || null;

                              setSelectedCiudadId(v);

                              // limpiar autoridad siempre al cambiar ciudad
                              setSelectedAutoridadId(null);
                              setSelectedAutoridadData(null);

                              form.setFieldsValue({
                                ciudad: v || undefined,
                                autoridad: undefined,
                              });

                              // === AUTOSET autoridad: solo si NO es desvinculaciones y hay exactamente 1 autoridad para esa ciudad
                              const tipoNow =
                                form.getFieldValue("tipo_registro") ||
                                tipoRegistro;

                              if (tipoNow !== "desvinculaciones" && v) {
                                const disponibles = (autoridadesItems || [])
                                  .filter(
                                    (au) =>
                                      Number(au?.id_ciudad || 0) === Number(v)
                                  )
                                  .map((au) => ({
                                    label: collapseSpaces(au?.nombre || ""),
                                    value: au?.id,
                                    data: au,
                                  }))
                                  .filter((o) => o.label);

                                if (disponibles.length === 1) {
                                  const only = disponibles[0];
                                  setSelectedAutoridadId(only.value || null);
                                  setSelectedAutoridadData(only.data || null);
                                  form.setFieldsValue({
                                    autoridad: only.value || undefined,
                                  });
                                }
                              }
                            }}
                            showSearch
                            optionFilterProp="label"
                          />
                        </Form.Item>
                      </Col>

                      {tipoRegistro !== "desvinculaciones" && (
                        <Col xs={24} md={12}>
                          <Form.Item
                            label="Autoridad"
                            name="autoridad"
                            rules={[
                              {
                                required: true,
                                message: "Selecciona la autoridad.",
                              },
                            ]}
                          >
                            <Select
                              ref={autoridadRef}
                              placeholder="Escribe o selecciona la autoridad"
                              options={autoridadOptions}
                              value={selectedAutoridadId}
                              onChange={(value, option) => {
                                const v = value || null;
                                setSelectedAutoridadId(v);
                                setSelectedAutoridadData(option?.data || null);
                                form.setFieldsValue({
                                  autoridad: v || undefined,
                                });
                              }}
                              showSearch
                              optionFilterProp="label"
                              onKeyDown={makeEnterHandler(autoridadRef)}
                            />
                          </Form.Item>
                        </Col>
                      )}
                    </Row>

                    <Row justify="end" style={{ marginTop: 24 }}>
                      <Col>
                        <Button
                          type="primary"
                          onClick={handleNextFromConfigStep}
                          ref={nextButtonRef}
                        >
                          Siguiente
                        </Button>
                      </Col>
                    </Row>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="wizard-step-content">
                  {renderExpedienteForm()}

                  <Row justify="space-between" style={{ marginTop: 32 }}>
                    <Col>
                      <Button onClick={handleBackToConfigStep}>Regresar</Button>
                    </Col>
                    <Col>
                      <Button type="primary" onClick={handleClickGuardar}>
                        Guardar expediente
                      </Button>
                    </Col>
                  </Row>
                </div>
              )}
            </Form>
          </Card>
        </div>
      </main>

      <style>
        {`
.crear-main {
  background-color: #eef1f5;
  min-height: calc(100vh - 56px);
  padding: 32px 24px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.crear-wrapper {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.crear-card {
  max-width: 1200px;
  min-height: 760px;
  margin: 0 auto;
  border-radius: 18px !important;
  border: 1px solid #e5e7eb !important;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08) !important;
  padding: 20px;
}

.crear-card .ant-card-body {
  padding: 32px 40px;
}

.crear-logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  padding: 8px;
}

.crear-title {
  margin-bottom: 4px !important;
}

.crear-subtitle {
  font-size: 13px;
}

.crear-steps {
  margin-bottom: 28px;
  padding: 10px 18px;
  background: #f9fafb;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
}

.crear-steps .ant-steps {
  max-width: 620px;
  margin: 0 auto;
}

.wizard-step-content {
  margin-top: 56px;
  animation: fadeInUp 0.25s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 992px) {
  .crear-card .ant-card-body {
    padding: 24px 24px;
  }

  .crear-steps {
    padding: 8px 12px;
  }

  .crear-steps .ant-steps {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .crear-main {
    padding: 24px 12px;
    align-items: flex-start;
  }

  .crear-card {
    border-radius: 14px !important;
  }

  .crear-card .ant-card-body {
    padding: 20px 16px;
  }
}
        `}
      </style>
    </>
  );
}

export default CrearExpedienteWizard;
