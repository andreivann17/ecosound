import {
  FETCH_COTIZACIONES_REQUEST,
  FETCH_COTIZACIONES_SUCCESS,
  FETCH_COTIZACIONES_FAILURE,
  FETCH_COTIZACION_ONE_SUCCESS,
  FETCH_COTIZACION_ONE_FAILURE,
} from "../actions/cotizaciones/types";

const initialState = {
  items: [],
  detalle: null,
  loading: false,
  error: null,
  detalleError: null,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_COTIZACIONES_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_COTIZACIONES_SUCCESS: {
      const payload = action.payload;
      const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
      return { ...state, loading: false, items, error: null };
    }

    case FETCH_COTIZACIONES_FAILURE:
      return { ...state, loading: false, error: action.payload?.error ?? "Error desconocido" };

    case FETCH_COTIZACION_ONE_SUCCESS:
      return { ...state, detalle: action.payload, detalleError: null };

    case FETCH_COTIZACION_ONE_FAILURE:
      return { ...state, detalleError: action.payload?.error ?? "Error desconocido" };

    default:
      return state;
  }
};

export default reducer;
