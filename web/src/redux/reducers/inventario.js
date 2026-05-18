import {
  FETCH_INVENTARIO_REQUEST,
  FETCH_INVENTARIO_SUCCESS,
  FETCH_INVENTARIO_FAILURE,
  FETCH_EQUIPO_ONE_SUCCESS,
  FETCH_EQUIPO_ONE_FAILURE,
  FETCH_CATEGORIAS_SUCCESS,
} from "../actions/inventario/types";

const initialState = {
  items: [],
  categorias: [],
  detalle: null,
  loading: false,
  error: null,
  detalleError: null,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_INVENTARIO_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_INVENTARIO_SUCCESS: {
      const payload = action.payload;
      const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
      return { ...state, loading: false, items, error: null };
    }

    case FETCH_INVENTARIO_FAILURE:
      return { ...state, loading: false, error: action.payload?.error ?? "Error desconocido" };

    case FETCH_EQUIPO_ONE_SUCCESS:
      return { ...state, detalle: action.payload, detalleError: null };

    case FETCH_EQUIPO_ONE_FAILURE:
      return { ...state, detalleError: action.payload?.error ?? "Error desconocido" };

    case FETCH_CATEGORIAS_SUCCESS: {
      const cats = Array.isArray(action.payload) ? action.payload : [];
      return { ...state, categorias: cats };
    }

    default:
      return state;
  }
};

export default reducer;
