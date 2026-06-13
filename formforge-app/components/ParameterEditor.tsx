import { useCallback } from 'react';
import { View, Text, Switch, TextInput, StyleSheet, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { useDesignStore } from '@/stores/design.store';
import { colors, spacing, radius } from '@/constants/tokens';
import type { RangeParam, BoolParam, TextParam } from '@/lib/types';

export function ParameterEditor() {
  const { activeTemplate, params, updateParam } = useDesignStore();

  if (!activeTemplate) return null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {Object.entries(activeTemplate.params).map(([key, param]) => (
        <View key={key} style={styles.row}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{param.label}</Text>
            {param.type === 'range' && (
              <Text style={styles.value}>
                {String(params[key] ?? param.default)}
                {(param as RangeParam).unit ? ` ${(param as RangeParam).unit}` : ''}
              </Text>
            )}
          </View>
          <ParamControl paramKey={key} param={param} />
        </View>
      ))}
    </ScrollView>
  );
}

function ParamControl({
  paramKey,
  param,
}: {
  paramKey: string;
  param: ReturnType<typeof Object.values<typeof import('@/lib/types').TemplateParam>>[number];
}) {
  const { params, updateParam } = useDesignStore();

  if (param.type === 'range') {
    const rp = param as RangeParam;
    const value = Number(params[paramKey] ?? rp.default);
    return (
      <Slider
        style={styles.slider}
        minimumValue={rp.min}
        maximumValue={rp.max}
        value={value}
        step={(rp.max - rp.min) / 100}
        minimumTrackTintColor={colors.teal}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.teal}
        onValueChange={(v) => updateParam(paramKey, Math.round(v * 10) / 10)}
      />
    );
  }

  if (param.type === 'bool') {
    const bp = param as BoolParam;
    return (
      <Switch
        value={Boolean(params[paramKey] ?? bp.default)}
        onValueChange={(v) => updateParam(paramKey, v)}
        trackColor={{ false: colors.border, true: colors.teal }}
        thumbColor={colors.hl}
      />
    );
  }

  if (param.type === 'text') {
    const tp = param as TextParam;
    return (
      <TextInput
        style={styles.textInput}
        value={String(params[paramKey] ?? tp.default)}
        onChangeText={(v) => updateParam(paramKey, v)}
        placeholderTextColor={colors.muted}
        maxLength={60}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label:    { color: colors.text, fontSize: 13 },
  value:    { color: colors.teal, fontSize: 13, fontFamily: 'JetBrainsMono_400Regular' },
  slider:   { width: '100%', height: 36 },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.hl,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 14,
  },
});
