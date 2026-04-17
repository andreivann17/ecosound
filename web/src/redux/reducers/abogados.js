// redux/reducers/abogados.js  (recomendado que este archivo sea solo de abogados)
// Si por ahora lo tienes como redux/reducers/index.js, igual sirve.

import {
  FETCH_ABOGADOS_SUCCESS,
  FETCH_ABOGADOS_FAILURE,
} from "../actions/abogados/types";

const initialState = {
  data: [],
  error: null,
};

const abogadosReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_ABOGADOS_SUCCESS:
      return {
        ...state,
        data:action.payload,
      };

    case FETCH_ABOGADOS_FAILURE:
      return {
        ...state,
        data:action.payload,
      };
    default:
      return state;
  }
};

export default abogadosReducer;
