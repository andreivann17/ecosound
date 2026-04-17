import { 
  FETCH_SCROLL,
  FETCH_FECHAS_FAILURE,
  FETCH_FECHAS_SUCCESS,
  FETCH_MESES_FAILURE,
  FETCH_MESES_SUCCESS,
} from "../actions/utils/types";
const initialState = {
  scroll: {},
  meses: [],
  fechas: [],
};
const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_SCROLL:
      return {
        ...state,
        scroll: action.payload,
      };
    case FETCH_MESES_SUCCESS:
      return {
        ...state,
        meses: action.payload,
      };
    case FETCH_MESES_FAILURE:
      return {
        ...state,
        meses: action.payload,
      };
    case FETCH_FECHAS_SUCCESS:
      return {
        ...state,
        fechas: action.payload,
      };
    case FETCH_FECHAS_FAILURE:
      return {
        ...state,
        mesfechases: action.payload,
      };

    default:
      return state;
  }
};

export default rootReducer;
