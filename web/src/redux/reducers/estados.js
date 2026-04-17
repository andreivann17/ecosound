// redux/reducers/index.js

import {FETCH_ESTADOS_SUCCESS,FETCH_ESTADOS_FAILURE} from '../actions/estados/types';
const initialState = {
  data: [],

};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_ESTADOS_SUCCESS:
      return {
        ...state,
        data:action.payload,
      };
    case FETCH_ESTADOS_FAILURE:
      return {
        ...state,
        data: action.payload,
      };

    default:
      return state;
  }
};

export default rootReducer;
