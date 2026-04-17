// redux/reducers/contratos.js
import {
  FETCH_CONTRATOS_REQUEST,
  FETCH_CONTRATOS_SUCCESS,
  FETCH_CONTRATOS_FAILURE,
  FETCH_CONTRATO_ONE_SUCCESS,
  FETCH_CONTRATO_ONE_FAILURE,
} from "../actions/contratos/types";

const initialState = {
  items: [],       // lista de contratos
  detalle: null,   // contrato individual seleccionado
  loading: false,
  error: null,
  detalleError: null,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_CONTRATOS_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_CONTRATOS_SUCCESS: {
      const payload = action.payload;
      // El backend devuelve un array directamente
      const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
      return { ...state, loading: false, items, error: null };
    }

    case FETCH_CONTRATOS_FAILURE:
      return { ...state, loading: false, error: action.payload?.error ?? "Error desconocido" };

    case FETCH_CONTRATO_ONE_SUCCESS:
      return { ...state, detalle: action.payload, detalleError: null };

    case FETCH_CONTRATO_ONE_FAILURE:
      return { ...state, detalleError: action.payload?.error ?? "Error desconocido" };

    default:
      return state;
  }
};

export default reducer;
