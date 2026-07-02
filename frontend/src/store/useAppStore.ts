import { create } from "zustand";

interface AppState {
  activeCourseId: number | undefined;
  setActiveCourseId: (id: number | undefined) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeCourseId: undefined,
  setActiveCourseId: (id) => set({ activeCourseId: id }),
}));
