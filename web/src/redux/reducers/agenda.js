import {
  FETCH_AGENDA_REQUEST,
  FETCH_AGENDA_SUCCESS,
  FETCH_AGENDA_FAILURE,
} from "../actions/agenda/types";

const initialState = {
  data: [],
  loading: false,
  error: null,
};

const normalizeAgendaItems = (payload) => {
  if (!payload) return [];

  // array directo
  if (Array.isArray(payload)) return payload;

  // { items: [] }
  if (Array.isArray(payload.items)) return payload.items;

  // { data: [] }
  if (Array.isArray(payload.data)) return payload.data;

  // { data: { items: [] } }
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;

  // { payload: { items: [] } } (por si algún middleware lo envuelve)
  if (payload.payload && Array.isArray(payload.payload.items)) return payload.payload.items;

  return [];
};


const agendaReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_AGENDA_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FETCH_AGENDA_SUCCESS:
      return {
        ...state,
        loading: false,
        data: normalizeAgendaItems(action.payload),
        error: null,
      };

    case FETCH_AGENDA_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload?.error || "Error al cargar agenda",
      };

    default:
      return state;
  }
};

export default agendaReducer;
