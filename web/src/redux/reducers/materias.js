// redux/reducers/index.js

import {FETCH_MATERIAS_SUCCESS,FETCH_MATERIAS_FAILURE} from '../actions/materias/types';

const initialState = {
  data: [],

};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_MATERIAS_SUCCESS:
      return {
        ...state,
        data:action.payload,
      };
    case FETCH_MATERIAS_FAILURE:
      return {
        ...state,
        data: action.payload,
      };

    default:
      return state;
  }
};

export default rootReducer;
