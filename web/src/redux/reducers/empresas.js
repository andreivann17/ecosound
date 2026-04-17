// redux/reducers/index.js

import {FETCH_EMPRESAS_FAILURE,FETCH_EMPRESAS_SUCCESS} from '../actions/empresas/types';
const initialState = {
  data: [],

};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_EMPRESAS_SUCCESS:
      return {
        ...state,
        data:action.payload,
      };
    case FETCH_EMPRESAS_FAILURE:
      return {
        ...state,
        data: action.payload,
      };

    default:
      return state;
  }
};

export default rootReducer;
