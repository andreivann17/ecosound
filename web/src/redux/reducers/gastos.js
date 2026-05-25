import {
  FETCH_GASTOS_REQUEST,
  FETCH_GASTOS_SUCCESS,
  FETCH_GASTOS_FAILURE,
} from "../actions/gastos/types";

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_GASTOS_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_GASTOS_SUCCESS: {
      const items = Array.isArray(action.payload) ? action.payload : [];
      return { ...state, loading: false, items, error: null };
    }

    case FETCH_GASTOS_FAILURE:
      return { ...state, loading: false, error: action.payload?.error ?? "Error desconocido" };

    default:
      return state;
  }
};

export default reducer;
