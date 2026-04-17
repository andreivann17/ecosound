import {
  FETCH_TRIBUNAL_SUCCESS,
  FETCH_TRIBUNAL_FAILURE,
  FETCH_TRIBUNAL_ETAPAS_SUCCESS,
  FETCH_TRIBUNAL_ETAPAS_FAILURE,
  FETCH_TRIBUNAL_DETALLES_SUCCESS,
  FETCH_TRIBUNAL_DETALLES_FAILURE,
} from "../actions/tribunal/types";

const initialState = {
  data: null,
  error: null,
  detalles: null,
  documentos: null,
  docsError: null,
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_TRIBUNAL_SUCCESS:
      return { ...state, data: action.payload, error: null };

    case FETCH_TRIBUNAL_FAILURE:
      return { ...state, error: action.payload };
    case FETCH_TRIBUNAL_DETALLES_SUCCESS:
      return { ...state, detalles: action.payload, error: null };

    case FETCH_TRIBUNAL_DETALLES_FAILURE:
      return { ...state, error: action.payload };
    // OJO: aquí NO es "etapas". Aquí lo usas para DOCUMENTOS.
    case FETCH_TRIBUNAL_ETAPAS_SUCCESS:
      return { ...state, documentos: action.payload, docsError: null };

    case FETCH_TRIBUNAL_ETAPAS_FAILURE:
      return { ...state, docsError: action.payload };

    default:
      return state;
  }
};

export default rootReducer;