// src/redux/reducers/conciliacion.js
import {
  FETCH_CONCILIACION_SUCCESS,
  FETCH_CONCILIACION_FAILURE,
  FETCH_CONCILIACION_DOCUMENTO_SUCCESS,
  FETCH_CONCILIACION_DOCUMENTO_FAILURE,
  FETCH_CONCILIACION_DETALLES_SUCCESS,
  FETCH_CONCILIACION_DETALLES_FAILURE,
  FETCH_CONCILIACION_AUDIENCIAS_FAILURE,
  FETCH_CONCILIACION_AUDIENCIAS_SUCCESS,
  FETCH_CONCILIACION_HISTORIAL_FAILURE,
  FETCH_CONCILIACION_HISTORIAL_SUCCESS,
  FETCH_AUDIT_LOG_FAILURE,
  FETCH_AUDIT_LOG_SUCCESS,
  FETCH_AUDIT_LOG_ONE_FAILURE,
  FETCH_AUDIT_LOG_ONE_SUCCESS,
} from "../actions/conciliacion/types";

const initialState = {
  // cards/lista de conciliaciones
  data: {},

  // detalle
  detalle: null,
  audiencias: null,
  historial: null,

  // audit log
  audit: null,        // { items, count, total }
  auditOne: null,     // row individual
  auditError: null,
  auditOneError: null,

  // documentos
  documentos: {
    id_conciliacion: null,
    count: 0,
    items: [],
    tipos_documentos: [],
  },

  // flags
  loading: false,
  error: null,
  documentosError: null,
  detalleError: null,
  audienciasError: null,
  historialError: null,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    // ===== Conciliaciones (cards/lista) =====
    case FETCH_CONCILIACION_SUCCESS: {
      const p = action.payload || {};
      return {
        ...state,
        data: p,
        error: null,
        loading: false,
      };
    }

    case FETCH_CONCILIACION_FAILURE:
      return {
        ...state,
        error: action.payload?.error || action.payload || "Error al cargar conciliación",
        loading: false,
      };

    // ===== Detalle conciliación =====
    case FETCH_CONCILIACION_DETALLES_SUCCESS: {
      const p = action.payload || {};
      return {
        ...state,
        detalle: p,
        detalleError: null,
      };
    }

    case FETCH_CONCILIACION_DETALLES_FAILURE:
      return {
        ...state,
        detalle: null,
        detalleError: action.payload?.error || action.payload || "Error al cargar conciliación detalles",
      };

    // ===== Audiencias =====
    case FETCH_CONCILIACION_AUDIENCIAS_SUCCESS: {
      const p = action.payload || {};
      return {
        ...state,
        audiencias: p,
        audienciasError: null,
      };
    }

    case FETCH_CONCILIACION_AUDIENCIAS_FAILURE:
      return {
        ...state,
        audiencias: null,
        audienciasError: action.payload?.error || action.payload || "Error al cargar audiencias de conciliación",
      };

    // ===== Historial procesal =====
    case FETCH_CONCILIACION_HISTORIAL_SUCCESS: {
      const p = action.payload || {};
      return {
        ...state,
        historial: p,
        historialError: null,
      };
    }

    case FETCH_CONCILIACION_HISTORIAL_FAILURE:
      return {
        ...state,
        historial: null,
        historialError: action.payload?.error || action.payload || "Error al cargar historia procesal",
      };

    // ===== Audit log (lista) =====
    case FETCH_AUDIT_LOG_SUCCESS: {
      const p = action.payload || {};
      return {
        ...state,
        audit: p,
        auditError: null,
      };
    }

    case FETCH_AUDIT_LOG_FAILURE:
      return {
        ...state,
        audit: null,
        auditError: action.payload?.error || action.payload || "Error al cargar audit log",
      };

    // ===== Audit log (uno) =====
    case FETCH_AUDIT_LOG_ONE_SUCCESS: {
      const p = action.payload || {};
      return {
        ...state,
        auditOne: p,
        auditOneError: null,
      };
    }

    case FETCH_AUDIT_LOG_ONE_FAILURE:
      return {
        ...state,
        auditOne: null,
        auditOneError: action.payload?.error || action.payload || "Error al cargar registro de audit log",
      };

    // ===== Documentos =====
    case FETCH_CONCILIACION_DOCUMENTO_SUCCESS: {
      const p = action.payload || {};
      return {
        ...state,
        documentos: {
          id_conciliacion: p.id_conciliacion ?? null,
          count: p.count ?? 0,
          items: p.items ?? [],
          tipos_documentos: p.tipos_documentos ?? [],
        },
        documentosError: null,
      };
    }

    case FETCH_CONCILIACION_DOCUMENTO_FAILURE:
      return {
        ...state,
        documentosError: action.payload?.error || action.payload || "Error al cargar documentos",
      };

    default:
      return state;
  }
};

export default reducer;
