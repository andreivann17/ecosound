// redux/reducers/index.js

import {FETCH_OBJETOS_SUCCESS,FETCH_OBJETOS_FAILURE} from '../actions/objetos/types';

const initialState = {
  data: [],

};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_OBJETOS_SUCCESS:
      return {
        ...state,
        data:action.payload,
      };
    case FETCH_OBJETOS_FAILURE:
      return {
        ...state,
        data: action.payload,
      };

    default:
      return state;
  }
};

export default rootReducer;
