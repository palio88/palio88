import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useDesignStore } from '@/stores/design.store';
import { useDesignSave } from '@/hooks/useDesignSave';
import { ParameterEditor } from '@/components/ParameterEditor';
import { ValidationBadge } from '@/components/ValidationBadge';
import { colors, spacing, radius } from '@/constants/tokens';
import { exportFile } from '@/lib/export';
import { analytics, Events } from '@/lib/analytics';
import templates from '@/data/templates.json';
import type { Template } from '@/lib/types';

const DEBOUNCE_MS = 500;
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_CAD === 'true';

export default function EditorScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const {
    activeTemplate, setActiveTemplate, params,
    generate, isGenerating, lastGeneration, generationError,
  } = useDesignStore();
  const { save, isSaving } = useDesignSave();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!activeTemplate || activeTemplate.id !== templateId) {
      const found = (templates as Template[]).find((t) => t.id === templateId);
      if (found) {
        setActiveTemplate(found);
        analytics.track(Events.TEMPLATE_SELECTED, { template_id: found.id });
      }
    }
  }, [templateId, activeTemplate, setActiveTemplate]);

  useEffect(() => {
    if (!activeTemplate) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      analytics.track(Events.GENERATION_STARTED, { template_id: activeTemplate.id });
      void generate().then(() => {
        analytics.track(Events.GENERATION_COMPLETED, { template_id: activeTemplate.id });
      });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [params, activeTemplate, generate]);

  const handleExport = async (format: 'stl' | '3mf') => {
    if (!lastGeneration || !activeTemplate) return;
    if (MOCK_MODE) {
      Alert.alert('Demo mode', 'Connect a live backend to download real files.');
      return;
    }
    try {
      analytics.track(Events.EXPORT_TAPPED, { format, template_id: activeTemplate.id });
      const url = format === 'stl' ? lastGeneration.stl_url : lastGeneration.tmf_url;
      await exportFile(url, format, activeTemplate.name);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleSave = async () => {
    const ok = await save();
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  if (!activeTemplate) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.teal} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 3D Preview */}
      <View style={styles.preview}>
        {isGenerating ? (
          <View style={styles.previewCenter}>
            <ActivityIndicator color={colors.teal} size="large" />
            <Text style={styles.previewMuted}>Generating…</Text>
          </View>
        ) : generationError ? (
          <View style={styles.previewCenter}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.errorText}>{generationError}</Text>
          </View>
        ) : lastGeneration ? (
          <View style={styles.previewCenter}>
            <Text style={styles.previewReadyIcon}>⬡</Text>
            <Text style={styles.previewReadyLabel}>Preview ready</Text>
            <Text style={styles.previewMeta}>
              {lastGeneration.execution_time_ms}ms
              {MOCK_MODE ? ' · demo mode' : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.previewCenter}>
            <Text style={styles.previewIdleIcon}>⬡</Text>
            <Text style={styles.previewMuted}>Adjust parameters to preview</Text>
          </View>
        )}
      </View>

      {/* Editor header */}
      <View style={styles.editorHeader}>
        <Text style={styles.templateName}>{activeTemplate.name}</Text>
        <View style={styles.headerActions}>
          {lastGeneration && <ValidationBadge validation={lastGeneration.validation} />}
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving || !lastGeneration}
          >
            {isSaving
              ? <ActivityIndicator color={colors.bg} size="small" />
              : <Text style={styles.saveBtnText}>{saveSuccess ? '✓ Saved' : 'Save'}</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Parameter editor — takes remaining space */}
      <View style={styles.editorPanel}>
        <ParameterEditor />
      </View>

      {/* Export bar */}
      {lastGeneration && (
        <View style={styles.exportBar}>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => void handleExport('stl')}
          >
            <Text style={styles.exportBtnText}>Export STL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, styles.exportBtnSecondary]}
            onPress={() => void handleExport('3mf')}
          >
            <Text style={[styles.exportBtnText, { color: colors.hl }]}>Export 3MF</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: colors.bg },
  preview:           {
    height: 220,
    backgroundColor: '#090f1a',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCenter:     { alignItems: 'center', gap: 8 },
  previewIdleIcon:   { fontSize: 52, color: colors.teal, opacity: 0.2 },
  previewReadyIcon:  { fontSize: 52, color: colors.teal, opacity: 0.7 },
  previewReadyLabel: { color: colors.teal, fontSize: 13, fontWeight: '600' },
  previewMuted:      { color: colors.muted, fontSize: 13 },
  previewMeta:       { color: colors.muted, fontSize: 11, fontFamily: 'JetBrainsMono_400Regular' },
  errorIcon:         { fontSize: 28, color: colors.orange },
  errorText:         { color: colors.orange, fontSize: 12, textAlign: 'center', maxWidth: 280 },
  editorHeader:      {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  templateName:      { color: colors.hl, fontSize: 15, fontWeight: '700', flex: 1 },
  headerActions:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveBtn:           {
    backgroundColor: colors.accent,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: radius.sm,
  },
  saveBtnDisabled:   { opacity: 0.5 },
  saveBtnText:       { color: colors.bg, fontSize: 12, fontWeight: '700' },
  editorPanel:       { flex: 1 },
  exportBar:         {
    flexDirection: 'row', gap: 10,
    padding: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  exportBtn:         {
    flex: 1, backgroundColor: colors.teal,
    borderRadius: radius.sm, paddingVertical: 13,
    alignItems: 'center',
  },
  exportBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  exportBtnText:     { color: colors.bg, fontWeight: '700', fontSize: 14 },
});
