export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function tokenExpiresInMs(token) {
  if (!token) return 0;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Math.max(0, payload.exp * 1000 - Date.now());
  } catch {
    return 0;
  }
}
