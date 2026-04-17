// src/components/tribunal/FormTribunal/formTribunal.defaults.js

export const getDefaults = () => ({
  numero_expediente: "",
  nombre_parte_actora: "",
  citatorio: [],

  empresa_id: null,
  empresa_nombre: "",
  empresa_razon_social_ids: [],

  estado: null,
  ciudad: null,
  autoridad: null,

  fecha_notificacion_demanda: "",
  fecha_presentacion_demanda: "",

  corresponsal_nombre: "No hay corresponsal",

  num_unico: "",

  fecha_limite_contestacion: "",
  fecha_audiencia_conciliatoria: "",
  observaciones_etapa_actual: "",

  accion_intentada: "",
  prestaciones: {
    indemnizacion_const: false,
    prima_antiguedad: false,
    salarios_caidos: false,
    vacaciones: false,
    prima_vacacional: false,
    aguinaldo: false,
    reparto_utilidades: false,
    horas_extras: false,
    dias_90_salario: false,
    dias_20_salario: false,
    reinstalacion: false,
  },
  otras_prestaciones: "",

  responsable_despido: "",
  jefes_inmediatos: "",
  hechos: "",

  fecha_ingreso: "",
  fecha_ultimo_dia_laborado: "",
  puesto: "",
  salario_diario: "",
  salario_diario_integrado: "",
  jornada: "",
  dia_descanso: "",
  lugar_servicio: "",

  pruebas_tab: "actora",
  pruebas_checklist: {
    actora: {
      confesional: false,
      testimonial: false,
      documental_publica: false,
      documental_privada: false,
      pericial: false,
      instrumental_actuaciones: true,
      presuncional_legal_humana: true,
      inspeccion_ocular: false,
      medios_electronicos: false,
    },
  },
  pruebas_detalle: {
    actora: {
            confesional: {
        tipo_prueba: "",
        persona_confesar: "",
        hechos_confesar: "",
        fecha_solicitud: "",
      },
      testimonial: {
        tipo: ["grupo"],
        draft_nombre: "",
        testigos: [],
      },
            documental_publica: {
        documentos: [],
      },
            documental_privada: {
        documentos: [],
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
            instrumental_actuaciones: {
        activo: true,
      },
      presuncional_legal_humana: {
        activo: true,
      },
    },
  },

  evidencias_actora: [],
});

export const mergeInitialValues = (defaults, initialValues) => {
  const iv = initialValues || {};
  return {
    ...defaults,
    ...iv,
    prestaciones: { ...defaults.prestaciones, ...(iv.prestaciones || {}) },
    pruebas_checklist: { ...defaults.pruebas_checklist, ...(iv.pruebas_checklist || {}) },
    pruebas_detalle: {
      ...defaults.pruebas_detalle,
      ...(iv.pruebas_detalle || {}),
      actora: {
        ...defaults.pruebas_detalle.actora,
        ...(iv?.pruebas_detalle?.actora || {}),
      },
    },
    evidencias_actora: Array.isArray(iv.evidencias_actora) ? iv.evidencias_actora : defaults.evidencias_actora,
    citatorio: Array.isArray(iv.citatorio) ? iv.citatorio : defaults.citatorio,
    pruebas_tab: iv.pruebas_tab === "demandada" || iv.pruebas_tab === "actora" ? iv.pruebas_tab : defaults.pruebas_tab,
  };
};