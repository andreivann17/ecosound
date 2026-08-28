const TOKEN_KEY = "evaluation_token";
const EVALUATOR_KEY = "evaluation_evaluator";

export function getEvaluationToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getEvaluationEvaluator() {
  try {
    return JSON.parse(localStorage.getItem(EVALUATOR_KEY) || "null");
  } catch {
    return null;
  }
}

export function setEvaluationSession(token, evaluator) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EVALUATOR_KEY, JSON.stringify(evaluator));
}

export function clearEvaluationSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EVALUATOR_KEY);
}

export function evaluationAuthHeader() {
  const token = getEvaluationToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getEvaluatorInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
