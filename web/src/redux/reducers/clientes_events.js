import {
  FETCH_CLIENTES_EVENTS_REQUEST,
  FETCH_CLIENTES_EVENTS_SUCCESS,
  FETCH_CLIENTES_EVENTS_FAILURE,
} from "../actions/clientes_events/types";

const initialState = {
  items: [],
  loading: false,
  error: null,
};

export default function clientesEventsReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_CLIENTES_EVENTS_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_CLIENTES_EVENTS_SUCCESS:
      return { ...state, loading: false, items: action.payload };
    case FETCH_CLIENTES_EVENTS_FAILURE:
      return { ...state, loading: false, error: action.payload.error };
    default:
      return state;
  }
}
