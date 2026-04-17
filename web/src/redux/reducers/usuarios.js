// redux/reducers/usuarios.js
import {
  FETCH_USUARIOS_REQUEST,
  FETCH_USUARIOS_SUCCESS,
  FETCH_USUARIOS_FAILURE,
} from "../actions/usuarios/types";

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_USUARIOS_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_USUARIOS_SUCCESS: {
      const payload = action.payload;
      const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
      return { ...state, loading: false, items, error: null };
    }

    case FETCH_USUARIOS_FAILURE:
      return { ...state, loading: false, error: action.payload?.error ?? "Error desconocido" };

    default:
      return state;
  }
};

export default reducer;
