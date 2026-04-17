// redux/reducers/index.js

import {FETCH_TIPO_AUTORIDADES_SUCCESS,FETCH_TIPO_AUTORIDADES_FAILURE} from '../actions/tipo_autoridades/types';

const initialState = {
  data: [],

};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_TIPO_AUTORIDADES_SUCCESS:
      return {
        ...state,
        data:action.payload,
      };
    case FETCH_TIPO_AUTORIDADES_FAILURE:
      return {
        ...state,
        data: action.payload,
      };

    default:
      return state;
  }
};

export default rootReducer;
