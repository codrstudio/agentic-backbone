import { create } from "zustand";
import { persist } from "zustand/middleware";

const AUTHELIA_PORTAL = "https://proxy.processa.info";

export interface AuthUser {
  id: string;
  role: string;
  displayName: string;
  authSource?: string;
  email?: string;
  groups?: string[];
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  checkSession: () => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      checkSession: async () => {
        try {
          const res = await fetch("/api/v1/ai/auth/me", {
            credentials: "include",
          });
          if (!res.ok) return false;
          const me = (await res.json()) as {
            user: string;
            role: string;
            displayName: string;
            authSource?: string;
            email?: string;
            groups?: string[];
          };
          set({
            user: {
              id: me.user,
              role: me.role,
              displayName: me.displayName,
              authSource: me.authSource,
              email: me.email,
              groups: me.groups,
            },
            token: null,
          });
          return true;
        } catch {
          return false;
        }
      },

      login: async (username, password) => {
        const res = await fetch("/api/v1/ai/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Erro desconhecido" }));
          throw new Error(body.error ?? "Erro desconhecido");
        }

        const { token } = (await res.json()) as { token: string };
        set({ token });

        const meRes = await fetch("/api/v1/ai/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const me = (await meRes.json()) as { user: string; role: string; displayName: string };
          set({ user: { id: me.user, role: me.role, displayName: me.displayName } });
        }
      },

      logout: () => {
        set({ token: null, user: null });
        window.location.href = `${AUTHELIA_PORTAL}/logout`;
      },
    }),
    {
      name: "ab-hub-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
