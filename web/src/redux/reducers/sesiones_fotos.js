import {
  FETCH_SESIONES_REQUEST,
  FETCH_SESIONES_SUCCESS,
  FETCH_SESIONES_FAILURE,
  FETCH_SESION_ONE_SUCCESS,
  FETCH_SESION_ONE_FAILURE,
} from "../actions/sesiones_fotos/types";

const initialState = {
  items: [],
  detalle: null,
  loading: false,
  error: null,
  detalleError: null,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_SESIONES_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_SESIONES_SUCCESS: {
      const payload = action.payload;
      const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
      return { ...state, loading: false, items, error: null };
    }

    case FETCH_SESIONES_FAILURE:
      return { ...state, loading: false, error: action.payload?.error ?? "Error desconocido" };

    case FETCH_SESION_ONE_SUCCESS:
      return { ...state, detalle: action.payload, detalleError: null };

    case FETCH_SESION_ONE_FAILURE:
      return { ...state, detalleError: action.payload?.error ?? "Error desconocido" };

    default:
      return state;
  }
};

export default reducer;
