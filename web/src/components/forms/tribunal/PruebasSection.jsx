import React, { useMemo, useState } from "react";
import { Select, Divider, Input, Button, Switch, Modal } from "antd";
import "../../../assets/css/PruebasSection.css"
import { actionValidarNombreTestigo } from "../../../redux/actions/tribunal/tribunal";
import { useDispatch } from "react-redux";
const PERICIAL_TIPO_OPTS = [
  { label: "Caligráfica-Grafoscópica", value: "caligrafica_grafoscopica" },
  { label: "Fonográfica", value: "fonografica" },
  { label: "Contable", value: "contable" },
  { label: "Medios Electrónicos - Informática", value: "medios_electronicos_informatica" },
  { label: "Psicológica", value: "psicologica" },
  { label: "Médica", value: "medica" },
  { label: "Seguridad e Higiene", value: "seguridad_e_higiene" },
  { label: "Valuación", value: "valuacion" },
  { label: "Otros", value: "otros" },
];
const INSPECCION_OCULAR_TIPO_OPTS = [
  { label: "Recibos de pago", value: "recibos_pago" },
  { label: "Nóminas", value: "nominas" },
  { label: "Control de asistencia", value: "control_asistencia" },
  { label: "Tarjetas", value: "tarjetas" },
  { label: "Altas y bajas al seguro social", value: "altas_bajas_seguro_social" },
];
export default function PruebasSection({
  form,
  checklistActivo,
  setPruebasDetalle,
  addTestigo,
  removeTestigo,
  catalogOverrides,
  setCatalogOverrides,
  collapseSpaces,
  makeNewSelectValue,
  MEDIOS_OPTS,
  toggleChecklistActora,
  toggleMedioElectronico,
  setMediosElectronicosTipos,
  empresaNombreOptions,
  empresasIndex,
}) {
const dispatch = useDispatch();
const [validacionTestigos, setValidacionTestigos] = useState({});
const [modalCoincidenciasOpen, setModalCoincidenciasOpen] = useState(false);
const [modalCoincidenciasData, setModalCoincidenciasData] = useState([]);
const [modalCoincidenciasNombre, setModalCoincidenciasNombre] = useState("");
  const SelectWithAdd = ({
    value,
    onChange,
    baseOptions = [],
    overrideKey,
    placeholder = "Agregar nuevo",
    multiple = true,
  }) => {
    const [draft, setDraft] = useState("");

    const asArray = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);

    const addOption = () => {
      const label = collapseSpaces(draft);
      if (!label) return;

      const newValue = makeNewSelectValue(label);

      setCatalogOverrides((prev) => ({
        ...prev,
        [overrideKey]: [...(prev[overrideKey] || []), { label, value: newValue, isNew: true }],
      }));

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
        mode={multiple ? "multiple" : undefined}
        value={multiple ? asArray(value) : value ?? undefined}
        style={{ width: "100%" }}
        onChange={onChange}
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
const testimonialTestigos = form?.pruebas_detalle?.actora?.testimonial?.testigos || [];

const updateTestigoField = (id, field, value) => {
  const nuevosTestigos = (form?.pruebas_detalle?.actora?.testimonial?.testigos || []).map((item) =>
    item.id === id ? { ...item, [field]: value } : item
  );

  setPruebasDetalle("testimonial", {
    ...form?.pruebas_detalle?.actora?.testimonial,
    testigos: nuevosTestigos,
  });
};
const openCoincidenciasModal = (nombre, coincidencias = []) => {
  setModalCoincidenciasNombre(nombre || "");
  setModalCoincidenciasData(Array.isArray(coincidencias) ? coincidencias : []);
  setModalCoincidenciasOpen(true);
};
const handleBlurValidarTestigo = async (testigo) => {
  const nombreLimpio = String(testigo?.nombre || "").trim();

  if (!nombreLimpio) {
    setValidacionTestigos((prev) => ({
      ...prev,
      [testigo.id]: {
        loading: false,
        existe: false,
        message: "",
        coincidencias: [],
        error: null,
      },
    }));
    return;
  }

  setValidacionTestigos((prev) => ({
    ...prev,
    [testigo.id]: {
      ...(prev[testigo.id] || {}),
      loading: true,
      existe: false,
      message: "",
      coincidencias: [],
      error: null,
    },
  }));

  try {
    const data = await dispatch(actionValidarNombreTestigo(nombreLimpio));

    setValidacionTestigos((prev) => ({
      ...prev,
      [testigo.id]: {
        loading: false,
        existe: !!data?.existe,
        message: data?.message || "",
        coincidencias: data?.coincidencias || [],
        error: null,
      },
    }));
  } catch (error) {
    setValidacionTestigos((prev) => ({
      ...prev,
      [testigo.id]: {
        loading: false,
        existe: false,
        message: "",
        coincidencias: [],
        error: error?.response?.data?.message || error?.message || "Error al validar testigo",
      },
    }));
  }
};
const normalizeDateForInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const rawConfesional = form?.pruebas_detalle?.actora?.confesional;

const confesionalRegistros = Array.isArray(rawConfesional)
  ? rawConfesional
  : Array.isArray(rawConfesional?.registros)
  ? rawConfesional.registros
  : [];

const buildConfesionalPayload = (registros) => {
  if (Array.isArray(rawConfesional)) {
    return registros;
  }

  return {
    ...(rawConfesional || {}),
    registros,
  };
};

const addConfesional = () => {
  const nuevo = {
    id: Date.now() + Math.random(),
    demandado: undefined,
    razon_social: undefined,
    persona_confesar: "",
    hechos_confesar: "",
    fecha_solicitud: "",
  };

  setPruebasDetalle("confesional", buildConfesionalPayload([...confesionalRegistros, nuevo]));
};
const removeConfesional = (id) => {
  const nuevos = confesionalRegistros.filter((item) => item.id !== id);

  setPruebasDetalle("confesional", buildConfesionalPayload(nuevos));
};

const updateConfesionalField = (id, field, value) => {
  const nuevos = confesionalRegistros.map((item) =>
    item.id === id ? { ...item, [field]: value } : item
  );

  setPruebasDetalle("confesional", buildConfesionalPayload(nuevos));
};
  const documentalPublicaDocs = form?.pruebas_detalle?.actora?.documental_publica?.documentos || [];
  const documentalPrivadaDocs = form?.pruebas_detalle?.actora?.documental_privada?.documentos || [];
const informeAutoridadDocs = form?.pruebas_detalle?.actora?.informe_autoridad?.documentos || [];

  const addDocumentoPublico = () => {
    const nuevo = {
      id: Date.now() + Math.random(),
      nombre: "",
      descripcion: "",
      fecha: "",
    };

    setPruebasDetalle("documental_publica", {
      ...form?.pruebas_detalle?.actora?.documental_publica,
      documentos: [...documentalPublicaDocs, nuevo],
    });
  };

  const removeDocumentoPublico = (id) => {
    const nuevos = documentalPublicaDocs.filter((item) => item.id !== id);

    setPruebasDetalle("documental_publica", {
      ...form?.pruebas_detalle?.actora?.documental_publica,
      documentos: nuevos,
    });
  };

  const updateDocumentoPublicoField = (id, field, value) => {

    const nuevos = documentalPublicaDocs.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );

    setPruebasDetalle("documental_publica", {
      ...form?.pruebas_detalle?.actora?.documental_publica,
      documentos: nuevos,
    });
  };

  const addDocumentoPrivado = () => {
    const nuevo = {
      id: Date.now() + Math.random(),
      nombre: "",
      descripcion: "",
      fecha: "",
    };

    setPruebasDetalle("documental_privada", {
      ...form?.pruebas_detalle?.actora?.documental_privada,
      documentos: [...documentalPrivadaDocs, nuevo],
    });
  };

  const removeDocumentoPrivado = (id) => {
    const nuevos = documentalPrivadaDocs.filter((item) => item.id !== id);

    setPruebasDetalle("documental_privada", {
      ...form?.pruebas_detalle?.actora?.documental_privada,
      documentos: nuevos,
    });
  };

  const updateDocumentoPrivadoField = (id, field, value) => {
    const nuevos = documentalPrivadaDocs.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );

    setPruebasDetalle("documental_privada", {
      ...form?.pruebas_detalle?.actora?.documental_privada,
      documentos: nuevos,
    });
  };
  const addInformeAutoridad = () => {
  const nuevo = {
    id: Date.now() + Math.random(),
    nombre: "",
    descripcion: "",
    fecha: "",
  };

  setPruebasDetalle("informe_autoridad", {
    ...form?.pruebas_detalle?.actora?.informe_autoridad,
    documentos: [...informeAutoridadDocs, nuevo],
  });
};

const removeInformeAutoridad = (id) => {
  const nuevos = informeAutoridadDocs.filter((item) => item.id !== id);

  setPruebasDetalle("informe_autoridad", {
    ...form?.pruebas_detalle?.actora?.informe_autoridad,
    documentos: nuevos,
  });
};

const updateInformeAutoridadField = (id, field, value) => {
  const nuevos = informeAutoridadDocs.map((item) =>
    item.id === id ? { ...item, [field]: value } : item
  );

  setPruebasDetalle("informe_autoridad", {
    ...form?.pruebas_detalle?.actora?.informe_autoridad,
    documentos: nuevos,
  });
};
  // ================= PERICIAL =================
const rawPericial = form?.pruebas_detalle?.actora?.pericial;

const pericialRegistros = Array.isArray(rawPericial)
  ? rawPericial
  : Array.isArray(rawPericial?.registros)
  ? rawPericial.registros
  : [];

const buildPericialPayload = (registros) => {
  if (Array.isArray(rawPericial)) return registros;

  return {
    ...(rawPericial || {}),
    registros,
  };
};

const addPericial = () => {
  const nuevo = {
    id: Date.now() + Math.random(),
    tipo_pericial: [],
    nombre_perito: "",
    objeto_prueba: "",
  };

  setPruebasDetalle("pericial", buildPericialPayload([...pericialRegistros, nuevo]));
};
const removePericial = (id) => {
  const nuevos = pericialRegistros.filter((item) => item.id !== id);
  setPruebasDetalle("pericial", buildPericialPayload(nuevos));
};

const updatePericialField = (id, field, value) => {
  const nuevos = pericialRegistros.map((item) =>
    item.id === id ? { ...item, [field]: value } : item
  );

  setPruebasDetalle("pericial", buildPericialPayload(nuevos));
};


// ================= INSPECCIÓN OCULAR =================
const rawInspeccion = form?.pruebas_detalle?.actora?.inspeccion_ocular;

const inspeccionRegistros = Array.isArray(rawInspeccion)
  ? rawInspeccion
  : Array.isArray(rawInspeccion?.registros)
  ? rawInspeccion.registros
  : [];

const buildInspeccionPayload = (registros) => {
  if (Array.isArray(rawInspeccion)) return registros;

  return {
    ...(rawInspeccion || {}),
    registros,
  };
};

const addInspeccion = () => {
  const nuevo = {
    id: Date.now() + Math.random(),
    tipo_inspeccion_ocular: [],
    nombre_inspeccion_ocular: "",
    objeto_prueba: "",
  };

  setPruebasDetalle(
    "inspeccion_ocular",
    buildInspeccionPayload([...inspeccionRegistros, nuevo])
  );
};
const removeInspeccion = (id) => {
  const nuevos = inspeccionRegistros.filter((item) => item.id !== id);
  setPruebasDetalle("inspeccion_ocular", buildInspeccionPayload(nuevos));
};

const updateInspeccionField = (id, field, value) => {
  const nuevos = inspeccionRegistros.map((item) =>
    item.id === id ? { ...item, [field]: value } : item
  );

  setPruebasDetalle("inspeccion_ocular", buildInspeccionPayload(nuevos));
};
// ================= CONFESIONAL HECHOS PROPIOS =================
const rawConfesionalPropios = form?.pruebas_detalle?.actora?.confesional_hechos_propios;

const confesionalPropiosRegistros = Array.isArray(rawConfesionalPropios)
  ? rawConfesionalPropios
  : Array.isArray(rawConfesionalPropios?.registros)
  ? rawConfesionalPropios.registros
  : [];

const buildConfesionalPropiosPayload = (registros) => {
  if (Array.isArray(rawConfesionalPropios)) {
    return registros;
  }

  return {
    ...(rawConfesionalPropios || {}),
    registros,
  };
};

const addConfesionalPropios = () => {
  const nuevo = {
    id: Date.now() + Math.random(),
    tipo_prueba: "",
    hechos_propios: "",
    fecha_solicitud: "",
  };

  setPruebasDetalle(
    "confesional_hechos_propios",
    buildConfesionalPropiosPayload([...confesionalPropiosRegistros, nuevo])
  );
};

const removeConfesionalPropios = (id) => {
  const nuevos = confesionalPropiosRegistros.filter((item) => item.id !== id);

  setPruebasDetalle(
    "confesional_hechos_propios",
    buildConfesionalPropiosPayload(nuevos)
  );
};

const updateConfesionalPropiosField = (id, field, value) => {
  const nuevos = confesionalPropiosRegistros.map((item) =>
    item.id === id ? { ...item, [field]: value } : item
  );

  setPruebasDetalle(
    "confesional_hechos_propios",
    buildConfesionalPropiosPayload(nuevos)
  );
};
const getRazonSocialOptionsByEmpresa = (empresaNombre) => {
  if (!empresaNombre || !empresasIndex?.get) return [];
  const bucket = empresasIndex.get(empresaNombre);
  if (!bucket) return [];
  return Array.isArray(bucket.razones) ? bucket.razones : [];
};

const handleChangeConfesionalDemandado = (id, value) => {
  const nuevos = confesionalRegistros.map((item) =>
    item.id === id
      ? {
          ...item,
          demandado: value,
          razon_social: undefined,
        }
      : item
  );

  setPruebasDetalle("confesional", buildConfesionalPayload(nuevos));
};
  return (
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
        {/* CONFESIONAL */}
             
    <details
  className={`oa-acc ${checklistActivo.confesional ? "oa-acc-active" : ""}`}
  open={checklistActivo.confesional}
>
  <summary className="oa-acc-sum">
    <div className="oa-acc-left">
      <div className="oa-acc-ico">
        <span className="material-symbols-outlined">record_voice_over</span>
      </div>
      <div className="oa-acc-txt">
        <div className="oa-acc-name">Confesional Demandada</div>
        <div className="oa-acc-meta">
          {(() => {
            if (!checklistActivo.confesional) return "Sin configurar";
            if (!confesionalRegistros.length) return "Agregar registro(s)";
            return `${confesionalRegistros.length} registro(s) agregado(s)`;
          })()}
        </div>
      </div>
    </div>

    <div className="oa-acc-right">
      <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
    </div>
  </summary>

  <div className="oa-acc-body">
    <div className="oa-acc-nested-body">
      {confesionalRegistros.length ? (
        <div className="oa-testigos-stack">
          {confesionalRegistros.map((item) => (
            <div key={item.id} className="oa-testigo-card">
              <div className="oa-testigo-head">
                <div className="oa-testigo-title-wrap">
                  <span className="material-symbols-outlined oa-testigo-title-ico">
                    record_voice_over
                  </span>
                  <span className="oa-testigo-title">Confesional Demandada</span>
                </div>

                <button
                  type="button"
                  className="oa-testigo-remove"
                  onClick={() => removeConfesional(item.id)}
                  title="Eliminar registro"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="oa-field">
  <label className="oa-label">Demandado</label>
  <Select
    value={item.demandado ?? undefined}
    style={{ width: "100%" }}
    placeholder="Selecciona la empresa demandada"
    options={empresaNombreOptions || []}
    showSearch
    optionFilterProp="label"
    onChange={(value) => handleChangeConfesionalDemandado(item.id, value)}
  />
</div>

<div className="oa-field">
  <label className="oa-label">Razón Social</label>
  <Select
    value={item.razon_social ?? undefined}
    style={{ width: "100%" }}
    placeholder={
      item.demandado
        ? "Selecciona la razón social"
        : "Primero selecciona la empresa demandada"
    }
    options={getRazonSocialOptionsByEmpresa(item.demandado)}
    showSearch
    optionFilterProp="label"
    disabled={!item.demandado}
    onChange={(value) =>
      updateConfesionalField(item.id, "razon_social", value)
    }
  />
</div>

             

             
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="oa-add-testigo-box"
        onClick={addConfesional}
      >
        + Agregar Confesional
      </button>
    </div>
  </div>
</details>
<details
  className={`oa-acc ${checklistActivo.confesional_hechos_propios ? "oa-acc-active" : ""}`}
  open={checklistActivo.confesional_hechos_propios}
>
  <summary className="oa-acc-sum">
    <div className="oa-acc-left">
      <div className="oa-acc-ico">
        <span className="material-symbols-outlined">record_voice_over</span>
      </div>
      <div className="oa-acc-txt">
        <div className="oa-acc-name">Confesional Hechos Propios</div>
        <div className="oa-acc-meta">
          {(() => {
            if (!checklistActivo.confesional_hechos_propios) return "Sin configurar";
            if (!confesionalPropiosRegistros.length) return "Agregar registro(s)";
            return `${confesionalPropiosRegistros.length} registro(s) agregado(s)`;
          })()}
        </div>
      </div>
    </div>

    <div className="oa-acc-right">
      <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
    </div>
  </summary>

  <div className="oa-acc-body">
    <div className="oa-acc-nested-body">
      {confesionalPropiosRegistros.length ? (
        <div className="oa-testigos-stack">
          {confesionalPropiosRegistros.map((item) => (
            <div key={item.id} className="oa-testigo-card">

              <div className="oa-testigo-head">
                <div className="oa-testigo-title-wrap">
                  <span className="material-symbols-outlined oa-testigo-title-ico">
                    record_voice_over
                  </span>
                  <span className="oa-testigo-title">Confesional Propia</span>
                </div>

                <button
                  type="button"
                  className="oa-testigo-remove"
                  onClick={() => removeConfesionalPropios(item.id)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="oa-field">
                <label className="oa-label">Nombre de la Persona Fisica</label>
                <input
                  className="oa-input"
                  type="text"
                  placeholder="Ej. Confesional de la parte actora"
                  value={item.tipo_prueba || ""}
                  onChange={(e) =>
                    updateConfesionalPropiosField(item.id, "tipo_prueba", e.target.value)
                  }
                />
              </div>

              <div className="oa-field">
                <label className="oa-label">Hechos Propios a Confesar</label>
                <textarea
                  className="oa-input oa-textarea"
                  rows={4}
                  placeholder="Describe los hechos propios que se deben confesar"
                  value={item.hechos_propios || ""}
                  onChange={(e) =>
                    updateConfesionalPropiosField(item.id, "hechos_propios", e.target.value)
                  }
                />
              </div>

            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="oa-add-testigo-box"
        onClick={addConfesionalPropios}
      >
        + Agregar Confesional (Hechos Propios)
      </button>
    </div>
  </div>
</details>
<div className="oa-acc oa-acc-static">
  <div className="oa-acc-sum oa-acc-sum-static">
    <div className="oa-acc-left">
      <div className="oa-acc-ico oa-acc-ico-gray">
        <span className="material-symbols-outlined">record_voice_over</span>
      </div>
      <div className="oa-acc-txt">
        <div className="oa-acc-name">Confesional Expresa</div>
        
      </div>
    </div>

    <div className="oa-acc-right">
      <Switch
        checked={!!form?.pruebas_checklist?.actora?.confesional_expresa}
        onChange={() => toggleChecklistActora("confesional_expresa")}
      />
    </div>
  </div>
</div>
        {/* TESTIMONIAL */}

        <details className={`oa-acc ${checklistActivo.testimonial ? "oa-acc-active" : ""}`} open={checklistActivo.testimonial}>
          <summary className="oa-acc-sum">
            <div className="oa-acc-left">
              <div className="oa-acc-ico">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <div className="oa-acc-txt">
                <div className="oa-acc-name">Testimonial</div>
                <div className="oa-acc-meta">
                  {(() => {
                    const testigos = form?.pruebas_detalle?.actora?.testimonial?.testigos || [];
                    if (!checklistActivo.testimonial) return "Sin configurar";
                    if (!testigos.length) return "Agregar testigos";
                    return `${testigos.length} testigo(s) agregado(s)`;
                  })()}
                </div>
              </div>
            </div>

            <div className="oa-acc-right">
              <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
            </div>
          </summary>

          <div className="oa-acc-body">
            <div className="oa-acc-nested-body">
              {!(form?.pruebas_detalle?.actora?.testimonial?.testigos || []).length ? null : (
                <div className="oa-testigos-stack">
                  {(form?.pruebas_detalle?.actora?.testimonial?.testigos || []).map((t) => (
                    <div key={t.id} className="oa-testigo-card">
                      <div className="oa-testigo-head">
                        <div className="oa-testigo-title-wrap">
                          <span className="material-symbols-outlined oa-testigo-title-ico">group_add</span>
                          <span className="oa-testigo-title">Testigo</span>
                        </div>

                        <button
                          type="button"
                          className="oa-testigo-remove"
                          onClick={() => removeTestigo(t.id)}
                          title="Eliminar testigo"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>

       <div className="oa-field">
  <label className="oa-label">Nombre Completo</label>
  <input
    className={`oa-input ${validacionTestigos?.[t.id]?.existe ? "oa-input-warning" : ""}`}
    type="text"
    placeholder="Ej: Pedro Ramírez López"
    value={t.nombre || ""}
    onChange={(e) => {
      updateTestigoField(t.id, "nombre", e.target.value);

      setValidacionTestigos((prev) => ({
        ...prev,
        [t.id]: {
          ...(prev[t.id] || {}),
          existe: false,
          message: "",
          coincidencias: [],
          error: null,
        },
      }));
    }}
    onBlur={() => handleBlurValidarTestigo(t)}
  />

  {validacionTestigos?.[t.id]?.loading ? (
    <div className="oa-inline-help">Validando testigo...</div>
  ) : null}

{validacionTestigos?.[t.id]?.existe ? (
  <div className="oa-inline-alert oa-inline-alert-warning">
    <div>
      {validacionTestigos?.[t.id]?.message || "Ya existe un testigo o testimonio con un nombre similar."}
    </div>

    {!!validacionTestigos?.[t.id]?.coincidencias?.length && (
      <button
        type="button"
        className="oa-link-button"
        onClick={() =>
          openCoincidenciasModal(
            t.nombre,
            validacionTestigos?.[t.id]?.coincidencias || []
          )
        }
      >
        Ver coincidencias ({validacionTestigos?.[t.id]?.coincidencias?.length})
      </button>
    )}
  </div>
) : null}

  {validacionTestigos?.[t.id]?.error ? (
    <div className="oa-inline-alert oa-inline-alert-error">
      {validacionTestigos?.[t.id]?.error}
    </div>
  ) : null}
</div>

                      <div className="oa-field">
  <label className="oa-label">Relación con el Caso</label>
  <input
    className="oa-input"
    type="text"
    placeholder="Ej: Compañero de trabajo"
    value={t.relacion || ""}
    onChange={(e) => updateTestigoField(t.id, "relacion", e.target.value)}
  />
</div>

<div className="oa-field">
  <label className="oa-label">Contacto</label>
  <input
    className="oa-input"
    type="text"
    placeholder="Teléfono o email"
    value={t.contacto || ""}
    onChange={(e) => updateTestigoField(t.id, "contacto", e.target.value)}
  />
</div>

                      
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="oa-add-testigo-box"
                onClick={() => {
                  const actuales = form?.pruebas_detalle?.actora?.testimonial?.testigos || [];
                  const nuevo = {
                    id: Date.now() + Math.random(),
                    nombre: "",
                    relacion: "",
                    contacto: "",
                  };

                  setPruebasDetalle("testimonial", {
                    ...form?.pruebas_detalle?.actora?.testimonial,
                    testigos: [...actuales, nuevo],
                  });
                }}
              >
                + Agregar Testigo
              </button>
            </div>
          </div>
        </details>
        {/* MEDIOS ELECTRÓNICOS */}
      
        <details
          className={`oa-acc ${checklistActivo.medios_electronicos ? "oa-acc-active" : ""}`}
          open={checklistActivo.medios_electronicos}
        >
          <summary className="oa-acc-sum">
            <div className="oa-acc-left">
              <div className="oa-acc-ico">
                <span className="material-symbols-outlined">memory</span>
              </div>
              <div className="oa-acc-txt">
                <div className="oa-acc-name">Medios Electrónicos / Ciencia</div>
                <div className="oa-acc-meta">
                  {(() => {
                    const tipos = form?.pruebas_detalle?.actora?.medios_electronicos?.tipos || [];
                    if (!checklistActivo.medios_electronicos) return "Sin configurar";
                    if (!tipos.length) return "Selecciona los medios";
                    return `${tipos.length} medio(s) seleccionado(s)`;
                  })()}
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
                <div className="oa-medios-topbar">
                  <label className="oa-label" style={{ marginBottom: 0 }}>
                    Tipo(s) de medio
                  </label>

                  <div className="oa-medios-actions">
                    <button
                      type="button"
                      className="oa-btn-lite"
                      onClick={() => setMediosElectronicosTipos(MEDIOS_OPTS.map((x) => x.value))}
                    >
                      Seleccionar todo
                    </button>

                    <button
                      type="button"
                      className="oa-btn-lite oa-btn-lite-danger"
                      onClick={() => setMediosElectronicosTipos([])}
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="oa-checkcard-grid">
                  {MEDIOS_OPTS.map((opt) => {
                    const selected = (form?.pruebas_detalle?.actora?.medios_electronicos?.tipos || []).includes(opt.value);

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`oa-checkcard ${selected ? "oa-checkcard-on" : ""}`}
                        onClick={() => toggleMedioElectronico(opt.value)}
                        aria-pressed={selected}
                      >
                        <span className={`oa-checkcard-box ${selected ? "oa-checkcard-box-on" : ""}`}>
                          {selected ? (
                            <span className="material-symbols-outlined oa-checkcard-check">check</span>
                          ) : null}
                        </span>

                        <span className="oa-checkcard-label">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="oa-muted">Selecciona uno o varios medios de forma directa.</div>
              </div>

            
            </div>
          </div>
        </details>
        {/* DOCUMENTAL PÚBLICA */}
               {/* DOCUMENTAL PÚBLICA */}
        <details
          className={`oa-acc ${checklistActivo.documental_publica ? "oa-acc-active" : ""}`}
          open={checklistActivo.documental_publica}
        >
          <summary className="oa-acc-sum">
            <div className="oa-acc-left">
              <div className="oa-acc-ico">
                <span className="material-symbols-outlined">description</span>
              </div>
              <div className="oa-acc-txt">
                <div className="oa-acc-name">Documental Pública</div>
                <div className="oa-acc-meta">
                  {(() => {
                    if (!checklistActivo.documental_publica) return "Sin configurar";
                    if (!documentalPublicaDocs.length) return "Agregar documento(s)";
                    return `${documentalPublicaDocs.length} documento(s) agregado(s)`;
                  })()}
                </div>
              </div>
            </div>

            <div className="oa-acc-right">
              <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
            </div>
          </summary>

          <div className="oa-acc-body">
            <div className="oa-acc-nested-body">
              {documentalPublicaDocs.length ? (
                <div className="oa-testigos-stack">
                  {documentalPublicaDocs.map((doc) => (
                    <div key={doc.id} className="oa-testigo-card">
                      <div className="oa-testigo-head">
                        <div className="oa-testigo-title-wrap">
                          <span className="material-symbols-outlined oa-testigo-title-ico">article</span>
                          <span className="oa-testigo-title">Documento Público</span>
                        </div>

                        <button
                          type="button"
                          className="oa-testigo-remove"
                          onClick={() => removeDocumentoPublico(doc.id)}
                          title="Eliminar documento"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>

                      <div className="oa-field">
                        <label className="oa-label">Nombre del Documento</label>
                        <input
                          className="oa-input"
                          type="text"
                          placeholder="Ej: Acta de nacimiento"
                          value={doc.nombre || ""}
                          onChange={(e) => updateDocumentoPublicoField(doc.id, "nombre", e.target.value)}
                        />
                      </div>

                      <div className="oa-field">
                        <label className="oa-label">Descripción</label>
                        <textarea
                          className="oa-input oa-textarea"
                          rows={3}
                          placeholder="Descripción del contenido"
                          value={doc.descripcion || ""}
                          onChange={(e) => updateDocumentoPublicoField(doc.id, "descripcion", e.target.value)}
                        />
                      </div>

                      <div className="oa-field">
                        <label className="oa-label">Fecha de Emisión</label>
                        <input
                          className="oa-input"
                          type="date"
                          value={doc.fecha || ""}
                          onChange={(e) => updateDocumentoPublicoField(doc.id, "fecha", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                className="oa-add-testigo-box"
                onClick={addDocumentoPublico}
              >
                + Agregar Documento Público
              </button>
            </div>
          </div>
        </details>
                {/* DOCUMENTAL PRIVADA */}
             {/* DOCUMENTAL PRIVADA */}
        <details
          className={`oa-acc ${checklistActivo.documental_privada ? "oa-acc-active" : ""}`}
          open={checklistActivo.documental_privada}
        >
          <summary className="oa-acc-sum">
            <div className="oa-acc-left">
              <div className="oa-acc-ico">
                <span className="material-symbols-outlined">folder_open</span>
              </div>
              <div className="oa-acc-txt">
                <div className="oa-acc-name">Documental Privada</div>
                <div className="oa-acc-meta">
                  {(() => {
                    if (!checklistActivo.documental_privada) return "Sin configurar";
                    if (!documentalPrivadaDocs.length) return "Agregar documento(s)";
                    return `${documentalPrivadaDocs.length} documento(s) agregado(s)`;
                  })()}
                </div>
              </div>
            </div>

            <div className="oa-acc-right">
              <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
            </div>
          </summary>

          <div className="oa-acc-body">
            <div className="oa-acc-nested-body">
              {documentalPrivadaDocs.length ? (
                <div className="oa-testigos-stack">
                  {documentalPrivadaDocs.map((doc) => (
                    <div key={doc.id} className="oa-testigo-card">
                      <div className="oa-testigo-head">
                        <div className="oa-testigo-title-wrap">
                          <span className="material-symbols-outlined oa-testigo-title-ico">description</span>
                          <span className="oa-testigo-title">Documento Privado</span>
                        </div>

                        <button
                          type="button"
                          className="oa-testigo-remove"
                          onClick={() => removeDocumentoPrivado(doc.id)}
                          title="Eliminar documento"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>

                      <div className="oa-field">
                        <label className="oa-label">Nombre del Documento</label>
                        <input
                          className="oa-input"
                          type="text"
                          placeholder="Ej: Contrato laboral"
                          value={doc.nombre || ""}
                          onChange={(e) => updateDocumentoPrivadoField(doc.id, "nombre", e.target.value)}
                        />
                      </div>

                      <div className="oa-field">
                        <label className="oa-label">Descripción</label>
                        <textarea
                          className="oa-input oa-textarea"
                          rows={3}
                          placeholder="Descripción del contenido"
                          value={doc.descripcion || ""}
                          onChange={(e) => updateDocumentoPrivadoField(doc.id, "descripcion", e.target.value)}
                        />
                      </div>

                      <div className="oa-field">
                        <label className="oa-label">Fecha del Documento</label>
                        <input
                          className="oa-input"
                          type="date"
                          value={doc.fecha || ""}
                          onChange={(e) => updateDocumentoPrivadoField(doc.id, "fecha", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                className="oa-add-testigo-box"
                onClick={addDocumentoPrivado}
              >
                + Agregar Documento Privado
              </button>
            </div>
          </div>
        </details>
<details
  className={`oa-acc ${checklistActivo.informe_autoridad ? "oa-acc-active" : ""}`}
  open={checklistActivo.informe_autoridad}
>
  <summary className="oa-acc-sum">
    <div className="oa-acc-left">
      <div className="oa-acc-ico">
        <span className="material-symbols-outlined">account_balance</span>
      </div>
      <div className="oa-acc-txt">
        <div className="oa-acc-name">Informe de Autoridad</div>
        <div className="oa-acc-meta">
          {(() => {
            if (!checklistActivo.informe_autoridad) return "Sin configurar";
            if (!informeAutoridadDocs.length) return "Agregar documento(s)";
            return `${informeAutoridadDocs.length} documento(s) agregado(s)`;
          })()}
        </div>
      </div>
    </div>

    <div className="oa-acc-right">
      <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
    </div>
  </summary>

  <div className="oa-acc-body">
    <div className="oa-acc-nested-body">
      {informeAutoridadDocs.length ? (
        <div className="oa-testigos-stack">
          {informeAutoridadDocs.map((doc) => (
            <div key={doc.id} className="oa-testigo-card">
              <div className="oa-testigo-head">
                <div className="oa-testigo-title-wrap">
                  <span className="material-symbols-outlined oa-testigo-title-ico">account_balance</span>
                  <span className="oa-testigo-title">Informe de Autoridad</span>
                </div>

                <button
                  type="button"
                  className="oa-testigo-remove"
                  onClick={() => removeInformeAutoridad(doc.id)}
                  title="Eliminar documento"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="oa-field">
                <label className="oa-label">Nombre del Documento</label>
                <input
                  className="oa-input"
                  type="text"
                  placeholder="Ej: Oficio de autoridad"
                  value={doc.nombre || ""}
                  onChange={(e) => updateInformeAutoridadField(doc.id, "nombre", e.target.value)}
                />
              </div>

              <div className="oa-field">
                <label className="oa-label">Descripción</label>
                <textarea
                  className="oa-input oa-textarea"
                  rows={3}
                  placeholder="Descripción del contenido"
                  value={doc.descripcion || ""}
                  onChange={(e) => updateInformeAutoridadField(doc.id, "descripcion", e.target.value)}
                />
              </div>

              <div className="oa-field">
                <label className="oa-label">Fecha del Documento</label>
                <input
                  className="oa-input"
                  type="date"
                  value={doc.fecha || ""}
                  onChange={(e) => updateInformeAutoridadField(doc.id, "fecha", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="oa-add-testigo-box"
        onClick={addInformeAutoridad}
      >
        + Agregar Informe de Autoridad
      </button>
    </div>
  </div>
</details>
        {/* PERICIAL */}
<details className={`oa-acc ${checklistActivo.pericial ? "oa-acc-active" : ""}`} open={checklistActivo.pericial}>
  <summary className="oa-acc-sum">
    <div className="oa-acc-left">
      <div className="oa-acc-ico">
        <span className="material-symbols-outlined">science</span>
      </div>
      <div className="oa-acc-txt">
        <div className="oa-acc-name">Pericial</div>
        <div className="oa-acc-meta">
          {(() => {
            if (!checklistActivo.pericial) return "Sin configurar";
            if (!pericialRegistros.length) return "Agregar pericial";
            return `${pericialRegistros.length} registro(s) agregado(s)`;
          })()}
        </div>
      </div>
    </div>

    <div className="oa-acc-right">
      <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
    </div>
  </summary>

  <div className="oa-acc-body">
    <div className="oa-acc-nested-body">

      {pericialRegistros.length ? (
        <div className="oa-testigos-stack">
          {pericialRegistros.map((item) => (
            <div key={item.id} className="oa-testigo-card">

              <div className="oa-testigo-head">
                <div className="oa-testigo-title-wrap">
                  <span className="material-symbols-outlined oa-testigo-title-ico">science</span>
                  <span className="oa-testigo-title">Prueba Pericial</span>
                </div>

                <button
                  type="button"
                  className="oa-testigo-remove"
                  onClick={() => removePericial(item.id)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

             <div className="oa-field">
  <label className="oa-label">Tipo de Pericial</label>
  <Select
    value={Array.isArray(item.tipo_pericial) ? item.tipo_pericial : item.tipo_pericial ? [item.tipo_pericial] : []}
    style={{ width: "100%" }}
    placeholder="Selecciona uno o varios tipos de pericial"
    options={PERICIAL_TIPO_OPTS}
    showSearch
    optionFilterProp="label"
    onChange={(value) => updatePericialField(item.id, "tipo_pericial", value)}
  />
</div>

              <div className="oa-field">
                <label className="oa-label">Nombre del Perito Propuesto</label>
                <input
                  className="oa-input"
                  value={item.nombre_perito || ""}
                  onChange={(e) => updatePericialField(item.id,"nombre_perito",e.target.value)}
                />
              </div>

              <div className="oa-field">
                <label className="oa-label">Objeto de la Prueba</label>
                <textarea
                  className="oa-input oa-textarea"
                  rows={4}
                  value={item.objeto_prueba || ""}
                  onChange={(e) => updatePericialField(item.id,"objeto_prueba",e.target.value)}
                />
              </div>

            </div>
          ))}
        </div>
      ) : null}

      <button type="button" className="oa-add-testigo-box" onClick={addPericial}>
        + Agregar Pericial
      </button>

    </div>
  </div>
</details>
{/* INSPECCIÓN OCULAR */}
<details className={`oa-acc ${checklistActivo.inspeccion_ocular ? "oa-acc-active" : ""}`} open={checklistActivo.inspeccion_ocular}>
  <summary className="oa-acc-sum">
    <div className="oa-acc-left">
      <div className="oa-acc-ico">
        <span className="material-symbols-outlined">visibility</span>
      </div>
      <div className="oa-acc-txt">
        <div className="oa-acc-name">Inspección Ocular</div>
        <div className="oa-acc-meta">
          {(() => {
            if (!checklistActivo.inspeccion_ocular) return "Sin configurar";
            if (!inspeccionRegistros.length) return "Agregar inspección";
            return `${inspeccionRegistros.length} registro(s) agregado(s)`;
          })()}
        </div>
      </div>
    </div>

    <div className="oa-acc-right">
      <span className="material-symbols-outlined oa-acc-chevron">expand_more</span>
    </div>
  </summary>

  <div className="oa-acc-body">
    <div className="oa-acc-nested-body">

      {inspeccionRegistros.length ? (
        <div className="oa-testigos-stack">
          {inspeccionRegistros.map((item) => (
            <div key={item.id} className="oa-testigo-card">

              <div className="oa-testigo-head">
                <div className="oa-testigo-title-wrap">
                  <span className="material-symbols-outlined oa-testigo-title-ico">visibility</span>
                  <span className="oa-testigo-title">Inspección</span>
                </div>

                <button
                  type="button"
                  className="oa-testigo-remove"
                  onClick={() => removeInspeccion(item.id)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

             <div className="oa-field">
  <label className="oa-label">Tipo de Inspección Ocular</label>
  <Select
  mode="multiple"
  value={
    Array.isArray(item.tipo_inspeccion_ocular)
      ? item.tipo_inspeccion_ocular
      : item.tipo_inspeccion_ocular
      ? [item.tipo_inspeccion_ocular]
      : []
  }
  style={{ width: "100%" }}
  placeholder="Selecciona uno o varios tipos de inspección ocular"
  options={INSPECCION_OCULAR_TIPO_OPTS}
  showSearch
  optionFilterProp="label"
  onChange={(value) =>
    updateInspeccionField(item.id, "tipo_inspeccion_ocular", value)
  }
/>
</div>



<div className="oa-field">
  <label className="oa-label">Objeto de la Prueba</label>
  <textarea
    className="oa-input oa-textarea"
    rows={4}
    value={item.objeto_prueba || ""}
    onChange={(e) =>
      updateInspeccionField(item.id, "objeto_prueba", e.target.value)
    }
  />
</div>

            </div>
          ))}
        </div>
      ) : null}

      <button type="button" className="oa-add-testigo-box" onClick={addInspeccion}>
        + Agregar Inspección
      </button>

    </div>
  </div>
</details>        



        {/* INSTRUMENTAL y PRESUNCIONAL (estáticos) */}
               {/* INSTRUMENTAL y PRESUNCIONAL */}
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
  onChange={() => toggleChecklistActora("instrumental_actuaciones")}
/>
            </div>
          </div>
        </div>

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
  onChange={() => toggleChecklistActora("presuncional_legal_humana")}
/>
            </div>
          </div>
        </div>
      </div>
         <Modal
        title={`Coincidencias encontradas${modalCoincidenciasNombre ? `: ${modalCoincidenciasNombre}` : ""}`}
        open={modalCoincidenciasOpen}
        onCancel={() => setModalCoincidenciasOpen(false)}
        footer={null}
          closeIcon={<span style={{ color: "#000", fontSize: 18 }}>×</span>}

        width={760}
      >
        {!modalCoincidenciasData.length ? (
          <div className="oa-empty-modal">No hay coincidencias para mostrar.</div>
        ) : (
          <div className="oa-coincidencias-list">
            {modalCoincidenciasData.map((item) => (
              <div
                key={`${item.id_tribunal_prueba_testigo}-${item.id_tribunal_prueba}`}
                className="oa-coincidencia-card"
              >
                <div className="oa-coincidencia-row">
                  <span className="oa-coincidencia-label">Nombre:</span>
                  <span>{item.nombre || "-"}</span>
                </div>

                <div className="oa-coincidencia-row">
                  <span className="oa-coincidencia-label">Expediente:</span>
                  <span>{item.expediente || "-"}</span>
                </div>

            

                <div className="oa-coincidencia-row">
                  <span className="oa-coincidencia-label">Número de expediente:</span>
                  <span>{item.numero_expediente  || "-"}</span>
                </div>

                <div className="oa-coincidencia-row">
                  <span className="oa-coincidencia-label">Relación con el caso:</span>
                  <span>{item.relacion_caso || "-"}</span>
                </div>

                <div className="oa-coincidencia-row">
                  <span className="oa-coincidencia-label">Contacto:</span>
                  <span>{item.contacto || "-"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}