import { useCallback } from 'react';
import { View, Text, Switch, TextInput, StyleSheet, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { useDesignStore } from '@/stores/design.store';
import { colors, spacing, radius } from '@/constants/tokens';
import type { TemplateParam, RangeParam, BoolParam, TextParam } from '@/lib/types';

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
                {String(params[key] ?? (param as RangeParam).default)}
                {(param as RangeParam).unit ? ` ${(param as RangeParam).unit}` : ''}
              </Text>
            )}
          </View>
          <ParamControl paramKey={key} param={param} value={params[key]} onUpdate={updateParam} />
        </View>
      ))}
    </ScrollView>
  );
}

function ParamControl({
  paramKey,
  param,
  value,
  onUpdate,
}: {
  paramKey: string;
  param: TemplateParam;
  value: unknown;
  onUpdate: (key: string, value: unknown) => void;
}) {
  const handleSlider = useCallback(
    (v: number) => onUpdate(paramKey, Math.round(v * 10) / 10),
    [paramKey, onUpdate],
  );

  if (param.type === 'range') {
    const rp = param as RangeParam;
    return (
      <Slider
        style={styles.slider}
        minimumValue={rp.min}
        maximumValue={rp.max}
        value={Number(value ?? rp.default)}
        step={Math.max(0.1, (rp.max - rp.min) / 100)}
        minimumTrackTintColor={colors.teal}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.teal}
        onValueChange={handleSlider}
      />
    );
  }

  if (param.type === 'bool') {
    const bp = param as BoolParam;
    return (
      <Switch
        value={Boolean(value ?? bp.default)}
        onValueChange={(v) => onUpdate(paramKey, v)}
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
        value={String(value ?? tp.default)}
        onChangeText={(v) => onUpdate(paramKey, v)}
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
