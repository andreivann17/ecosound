import {
  FETCH_EVENTOS_REQUEST,
  FETCH_EVENTOS_SUCCESS,
  FETCH_EVENTOS_FAILURE,
  FETCH_EVENTO_ONE_SUCCESS,
  FETCH_EVENTO_ONE_FAILURE,
} from "../actions/eventos/types";

const initialState = {
  items: [],
  detalle: null,
  loading: false,
  error: null,
  detalleError: null,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_EVENTOS_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_EVENTOS_SUCCESS: {
      const payload = action.payload;
      const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
      return { ...state, loading: false, items, error: null };
    }

    case FETCH_EVENTOS_FAILURE:
      return { ...state, loading: false, error: action.payload?.error ?? "Error desconocido" };

    case FETCH_EVENTO_ONE_SUCCESS:
      return { ...state, detalle: action.payload, detalleError: null };

    case FETCH_EVENTO_ONE_FAILURE:
      return { ...state, detalleError: action.payload?.error ?? "Error desconocido" };

    default:
      return state;
  }
};

export default reducer;
