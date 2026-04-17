// redux/reducers/index.js
import {
  FETCH_LOGIN_SUCCESS,
  FETCH_LOGIN_FAILURE,
  FETCH_ME_SUCCESS,
  FETCH_ME_FAILURE,
} from "../actions/login/types";

const SESSION_EXPIRED = "SESSION_EXPIRED";

const initialState = {
  login: {},
  me: null,
  me_error: null,
  sessionExpired: false, // 👈 NUEVO
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_LOGIN_SUCCESS:
      return {
        ...state,
        login: action.payload,
        sessionExpired: false, // por si venía de una sesión caída
      };

    case FETCH_LOGIN_FAILURE:
      return {
        ...state,
        login: action.payload,
      };

    case FETCH_ME_SUCCESS:
      return {
        ...state,
        me: action.payload,
        me_error: null,
        sessionExpired: false,
      };

    case FETCH_ME_FAILURE:
      return {
        ...state,
        me_error: action.payload,
      };

    case SESSION_EXPIRED:
      return {
        ...state,
        login: {},
        me: null,
        me_error: null,
        sessionExpired: true, // 👈 CLAVE
      };

    default:
      return state;
  }
};

export default rootReducer;
