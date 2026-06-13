import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useDesignStore } from '@/stores/design.store';
import { supabase } from '@/lib/supabase';
import { analytics, Events } from '@/lib/analytics';

export function useDesignSave() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const { activeTemplate, params, lastGeneration, setSavedDesigns, savedDesigns } = useDesignStore();

  const save = async () => {
    if (!user) {
      setError('Sign in to save designs');
      return false;
    }
    if (!activeTemplate) return false;

    setIsSaving(true);
    setError(null);

    try {
      const record = {
        user_id: user.id,
        template_id: activeTemplate.id,
        template_name: activeTemplate.name,
        params,
        stl_url: lastGeneration?.stl_url ?? null,
        glb_url: lastGeneration?.glb_url ?? null,
      };

      const { data, error: dbError } = await supabase
        .from('designs')
        .insert(record)
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);

      setSavedDesigns([data, ...savedDesigns]);
      analytics.track(Events.DESIGN_SAVED, { template_id: activeTemplate.id });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { save, isSaving, error };
}
