import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setAuthToken } from "../services/api";
import type { User } from "../types";

interface AppState {
  token: string | null;
  user: User | null;
  activeCourseId: number | undefined;
  /** Mobile only: the sidebar is an off-canvas drawer below `md`. */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
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
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setAuth: (token, user) => {
        setAuthToken(token);
        set({ token, user });
      },
      logout: () => {
        setAuthToken(null);
        set({ token: null, user: null, activeCourseId: undefined, sidebarOpen: false });
      },
      setActiveCourseId: (id) => set({ activeCourseId: id }),
    }),
    {
      name: "ata-auth",
      // Persist only the session. Without this, transient UI state (sidebarOpen)
      // would be written to localStorage and the drawer would reopen on reload.
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        activeCourseId: state.activeCourseId,
      }),
      onRehydrateStorage: () => (state) => {
        // Keep the axios auth header in sync after the store hydrates on reload.
        if (state?.token) setAuthToken(state.token);
      },
    }
  )
);
