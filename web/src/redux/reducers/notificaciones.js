// redux/reducers/notificaciones.js  (recomendado que este archivo sea solo de notificaciones)
// Si por ahora lo tienes como redux/reducers/index.js, igual sirve.

import {
  FETCH_NOTIFICACIONES_SUCCESS,
  FETCH_NOTIFICACIONES_FAILURE,
} from "../actions/notificaciones/types";

const initialState = {
  data: [],
  error: null,
};

const notificacionesReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_NOTIFICACIONES_SUCCESS:
      return {
        ...state,
        data:action.payload,
      };

    case FETCH_NOTIFICACIONES_FAILURE:
      return {
        ...state,
        data:action.payload,
      };
    default:
      return state;
  }
};

export default notificacionesReducer;
