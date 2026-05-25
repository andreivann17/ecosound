let _isRefreshing = false;
let _subscribers = [];

export const sessionManager = {
  get isRefreshing() {
    return _isRefreshing;
  },

  setRefreshing(value) {
    _isRefreshing = value;
  },

  subscribe(callback) {
    _subscribers.push(callback);
  },

  onAuthSuccess(token) {
    const subs = _subscribers;
    _subscribers = [];
    _isRefreshing = false;
    subs.forEach((cb) => cb(null, token));
  },

  onAuthFailure() {
    const subs = _subscribers;
    _subscribers = [];
    _isRefreshing = false;
    subs.forEach((cb) => cb(new Error("Authentication cancelled"), null));
  },
};
