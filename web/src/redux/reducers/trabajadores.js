import {
  FETCH_TRABAJADORES_REQUEST,
  FETCH_TRABAJADORES_SUCCESS,
  FETCH_TRABAJADORES_FAILURE,
  FETCH_TRABAJADOR_ONE_SUCCESS,
  FETCH_TRABAJADOR_ONE_FAILURE,
  FETCH_PUESTOS_SUCCESS,
} from "../actions/trabajadores/types";

const initialState = {
  items: [],
  puestos: [],
  detalle: null,
  loading: false,
  error: null,
  detalleError: null,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_TRABAJADORES_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_TRABAJADORES_SUCCESS: {
      const payload = action.payload;
      const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
      return { ...state, loading: false, items, error: null };
    }

    case FETCH_TRABAJADORES_FAILURE:
      return { ...state, loading: false, error: action.payload?.error ?? "Error desconocido" };

    case FETCH_TRABAJADOR_ONE_SUCCESS:
      return { ...state, detalle: action.payload, detalleError: null };

    case FETCH_TRABAJADOR_ONE_FAILURE:
      return { ...state, detalleError: action.payload?.error ?? "Error desconocido" };

    case FETCH_PUESTOS_SUCCESS: {
      const puestos = Array.isArray(action.payload) ? action.payload : [];
      return { ...state, puestos };
    }

    default:
      return state;
  }
};

export default reducer;
