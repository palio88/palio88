import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useDesignStore } from '@/stores/design.store';
import { ParameterEditor } from '@/components/ParameterEditor';
import { ValidationBadge } from '@/components/ValidationBadge';
import { colors, spacing, radius } from '@/constants/tokens';
import { exportFile } from '@/lib/export';
import templates from '@/data/templates.json';
import type { Template } from '@/lib/types';

const DEBOUNCE_MS = 500;

export default function EditorScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const {
    activeTemplate, setActiveTemplate, params,
    generate, isGenerating, lastGeneration, generationError,
  } = useDesignStore();

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeTemplate || activeTemplate.id !== templateId) {
      const found = (templates as Template[]).find((t) => t.id === templateId);
      if (found) setActiveTemplate(found);
    }
  }, [templateId, activeTemplate, setActiveTemplate]);

  useEffect(() => {
    if (!activeTemplate) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void generate();
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [params, activeTemplate, generate]);

  if (!activeTemplate) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.teal} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 3D Preview placeholder — react-three-fiber requires native GL context */}
      <View style={styles.preview}>
        {isGenerating ? (
          <View style={styles.previewLoading}>
            <ActivityIndicator color={colors.teal} />
            <Text style={styles.previewLoadingText}>Generating…</Text>
          </View>
        ) : generationError ? (
          <View style={styles.previewLoading}>
            <Text style={styles.errorText}>{generationError}</Text>
          </View>
        ) : lastGeneration ? (
          <View style={styles.previewLoading}>
            <Text style={styles.previewReadyText}>⬡ Preview ready</Text>
            <Text style={styles.previewSub}>
              {lastGeneration.execution_time_ms}ms
              {lastGeneration.validation.warnings.length > 0
                ? ` · ${lastGeneration.validation.warnings.length} warning(s)`
                : ' · validated ✓'}
            </Text>
          </View>
        ) : (
          <Text style={styles.previewIdle}>Adjust parameters to preview</Text>
        )}
      </View>

      {/* Parameter Editor */}
      <View style={styles.editorPanel}>
        <View style={styles.editorHeader}>
          <Text style={styles.templateName}>{activeTemplate.name}</Text>
          {lastGeneration && (
            <ValidationBadge validation={lastGeneration.validation} />
          )}
        </View>
        <ParameterEditor />
      </View>

      {/* Export bar */}
      {lastGeneration && (
        <View style={styles.exportBar}>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={async () => {
              try {
                await exportFile(lastGeneration.stl_url, 'stl', activeTemplate?.name ?? 'design');
              } catch (e) {
                Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
              }
            }}
          >
            <Text style={styles.exportBtnText}>Export STL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, styles.exportBtnSecondary]}
            onPress={async () => {
              try {
                await exportFile(lastGeneration.tmf_url, '3mf', activeTemplate?.name ?? 'design');
              } catch (e) {
                Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
              }
            }}
          >
            <Text style={styles.exportBtnText}>Export 3MF</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.bg },
  preview:            {
    height: 240,
    backgroundColor: colors.surface2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLoading:     { alignItems: 'center', gap: 10 },
  previewLoadingText: { color: colors.muted, fontSize: 13 },
  previewReadyText:   { color: colors.teal, fontSize: 36 },
  previewSub:         { color: colors.muted, fontSize: 12 },
  previewIdle:        { color: colors.muted, fontSize: 14 },
  errorText:          { color: colors.red, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.lg },
  editorPanel:        { flex: 1 },
  editorHeader:       {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  templateName:       { color: colors.hl, fontSize: 15, fontWeight: '700' },
  validBadge:         {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.sm, borderWidth: 1,
    borderColor: '#0f3530', backgroundColor: '#091a18',
  },
  validBadgeText:     { color: colors.teal, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  exportBar:          {
    flexDirection: 'row', gap: 10,
    padding: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  exportBtn:          {
    flex: 1, backgroundColor: colors.teal,
    borderRadius: radius.sm, paddingVertical: 13,
    alignItems: 'center',
  },
  exportBtnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  exportBtnText:      { color: colors.bg, fontWeight: '700', fontSize: 14 },
});
