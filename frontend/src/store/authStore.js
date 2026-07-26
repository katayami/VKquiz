import { create } from 'zustand';
import { apiFetch } from '../api/client';
import { loadAuth, saveAuth, clearAuth } from '../api/token';

const initial = loadAuth();

export const useAuthStore = create((set) => ({
  user: initial?.user || null,

  async login(email, password) {
    const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    saveAuth(data);
    set({ user: data.user });
  },

  async register(email, password, name, role) {
    const data = await apiFetch('/auth/register', { method: 'POST', body: { email, password, name, role } });
    saveAuth(data);
    set({ user: data.user });
  },

  logout() {
    clearAuth();
    set({ user: null });
  },
}));
