// redux/reducers/index.js

import {FETCH_CONCILIACION_STATUS_SUCCESS,FETCH_CONCILIACION_STATUS_FAILURE} from '../actions/conciliacion_status/types';
const initialState = {
  data: [],

};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_CONCILIACION_STATUS_SUCCESS:
      return {
        ...state,
        data:action.payload,
      };
    case FETCH_CONCILIACION_STATUS_FAILURE:
      return {
        ...state,
        data: action.payload,
      };

    default:
      return state;
  }
};

export default rootReducer;
