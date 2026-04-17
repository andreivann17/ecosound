import {
  FETCH_CONVENIOS_SUCCESS,
  FETCH_CONVENIOS_FAILURE,
} from "../actions/convenios/types";

const initialState = {
  data: [],
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_CONVENIOS_SUCCESS:
      return {
        ...state,
        data: action.payload,
      };

    case FETCH_CONVENIOS_FAILURE:
      return {
        ...state,
        data: action.payload,
      };

    default:
      return state;
  }
};

export default rootReducer;
