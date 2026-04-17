// redux/reducers/index.js

import {FETCH_CIUDADES_SUCCESS,FETCH_CIUDADES_FAILURE} from '../actions/ciudades/types';
const initialState = {
  data: [],

};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_CIUDADES_SUCCESS:
      return {
        ...state,
        data:action.payload,
      };
    case FETCH_CIUDADES_FAILURE:
      return {
        ...state,
        data: action.payload,
      };

    default:
      return state;
  }
};

export default rootReducer;
