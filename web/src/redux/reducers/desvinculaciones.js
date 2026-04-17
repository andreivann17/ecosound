import {
  FETCH_DESVINCULACIONES_SUCCESS,
  FETCH_DESVINCULACIONES_FAILURE,
} from "../actions/desvinculaciones/types";

const initialState = {
  data: [],
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_DESVINCULACIONES_SUCCESS:
      return {
        ...state,
        data: action.payload,
      };

    case FETCH_DESVINCULACIONES_FAILURE:
      return {
        ...state,
        data: action.payload,
      };

    default:
      return state;
  }
};

export default rootReducer;
