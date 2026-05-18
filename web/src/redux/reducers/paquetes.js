import {
  FETCH_PAQUETES_REQUEST,
  FETCH_PAQUETES_SUCCESS,
  FETCH_PAQUETES_FAILURE,
} from "../actions/paquetes/types";

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_PAQUETES_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_PAQUETES_SUCCESS: {
      const items = Array.isArray(action.payload) ? action.payload : [];
      return { ...state, loading: false, items, error: null };
    }

    case FETCH_PAQUETES_FAILURE:
      return { ...state, loading: false, error: action.payload?.error ?? "Error desconocido" };

    default:
      return state;
  }
};

export default reducer;
