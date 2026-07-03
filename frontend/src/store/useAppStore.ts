import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setAuthToken } from "../services/api";
import type { User } from "../types";

interface AppState {
  token: string | null;
  user: User | null;
  activeCourseId: number | undefined;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setActiveCourseId: (id: number | undefined) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      activeCourseId: undefined,
      setAuth: (token, user) => {
        setAuthToken(token);
        set({ token, user });
      },
      logout: () => {
        setAuthToken(null);
        set({ token: null, user: null, activeCourseId: undefined });
      },
      setActiveCourseId: (id) => set({ activeCourseId: id }),
    }),
    {
      name: "ata-auth",
      onRehydrateStorage: () => (state) => {
        // Keep the axios auth header in sync after the store hydrates on reload.
        if (state?.token) setAuthToken(state.token);
      },
    }
  )
);
