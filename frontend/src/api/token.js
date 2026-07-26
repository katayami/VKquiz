const STORAGE_KEY = 'quiz-auth';

export function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveAuth(auth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getToken() {
  return loadAuth()?.token || null;
}
