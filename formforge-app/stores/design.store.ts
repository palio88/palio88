import { create } from 'zustand';
import type { Template, SavedDesign, GenerateResponse } from '@/lib/types';
import { generateParametric } from '@/lib/cad-client';

interface DesignState {
  activeTemplate: Template | null;
  params: Record<string, unknown>;
  lastGeneration: GenerateResponse | null;
  savedDesigns: SavedDesign[];
  isGenerating: boolean;
  generationError: string | null;

  setActiveTemplate: (template: Template) => void;
  updateParam: (key: string, value: unknown) => void;
  resetParams: () => void;
  generate: () => Promise<void>;
  setSavedDesigns: (designs: SavedDesign[]) => void;
}

export const useDesignStore = create<DesignState>((set, get) => ({
  activeTemplate: null,
  params: {},
  lastGeneration: null,
  savedDesigns: [],
  isGenerating: false,
  generationError: null,

  setActiveTemplate: (template) => {
    const defaults: Record<string, unknown> = {};
    for (const [key, param] of Object.entries(template.params)) {
      defaults[key] = param.default;
    }
    set({ activeTemplate: template, params: defaults, lastGeneration: null, generationError: null });
  },

  updateParam: (key, value) =>
    set((state) => ({ params: { ...state.params, [key]: value } })),

  resetParams: () => {
    const { activeTemplate } = get();
    if (!activeTemplate) return;
    const defaults: Record<string, unknown> = {};
    for (const [key, param] of Object.entries(activeTemplate.params)) {
      defaults[key] = param.default;
    }
    set({ params: defaults });
  },

  generate: async () => {
    const { activeTemplate, params } = get();
    if (!activeTemplate) return;
    set({ isGenerating: true, generationError: null });
    try {
      const result = await generateParametric(activeTemplate, params);
      set({ lastGeneration: result, isGenerating: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      set({ isGenerating: false, generationError: msg });
    }
  },

  setSavedDesigns: (designs) => set({ savedDesigns: designs }),
}));
