import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal,
} from 'react-native';
import { colors, spacing, radius } from '@/constants/tokens';
import type { PrintReport, PrintIssue, DimensionInfo } from '@/lib/types';
import { PRINTER_PROFILES } from '@/lib/printers';

interface Props {
  report: PrintReport;
}

export function PrintReadinessReport({ report }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showDetail, setShowDetail] = useState<PrintIssue | null>(null);

  const statusColor = report.is_printable
    ? report.warnings.length > 0 ? colors.gold : colors.teal
    : colors.red;

  const statusLabel = report.is_printable
    ? report.warnings.length > 0 ? 'PRINT READY WITH WARNINGS' : 'PRINT READY'
    : 'NOT PRINTABLE';

  return (
    <>
      {/* Collapsed summary bar */}
      <TouchableOpacity
        style={[styles.summaryBar, { borderColor: statusColor }]}
        onPress={() => setExpanded(true)}
        activeOpacity={0.8}
      >
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>

        {report.dimensions && (
          <Text style={styles.dims}>
            {report.dimensions.x.toFixed(0)}×
            {report.dimensions.y.toFixed(0)}×
            {report.dimensions.z.toFixed(0)} mm
          </Text>
        )}

        {report.estimated_support_needed && (
          <View style={styles.supportPill}>
            <Text style={styles.supportText}>needs support</Text>
          </View>
        )}

        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Detail modal */}
      <Modal
        visible={expanded}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setExpanded(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={styles.modalPill} />
            <Text style={styles.modalTitle}>Print Readiness Report</Text>
            <TouchableOpacity onPress={() => setExpanded(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>

            {/* Overall verdict */}
            <View style={[styles.verdictCard, { borderColor: statusColor, backgroundColor: `${statusColor}11` }]}>
              <Text style={[styles.verdictLabel, { color: statusColor }]}>{statusLabel}</Text>
              {report.wall_thickness_min_mm !== null && (
                <Text style={styles.verdictSub}>
                  Min wall thickness: {report.wall_thickness_min_mm.toFixed(2)}mm
                  {report.wall_thickness_min_mm >= 1.5 ? ' ✓' : ' ⚠'}
                </Text>
              )}
              {report.overhang_fraction > 0.02 && (
                <Text style={styles.verdictSub}>
                  Overhangs: {(report.overhang_fraction * 100).toFixed(1)}% of surface
                </Text>
              )}
            </View>

            {/* Issues */}
            {report.errors.length > 0 && (
              <IssueSection title="Errors — fix before printing" issues={report.errors} color={colors.red} onPressDetail={setShowDetail} />
            )}
            {report.warnings.length > 0 && (
              <IssueSection title="Warnings" issues={report.warnings} color={colors.gold} onPressDetail={setShowDetail} />
            )}
            {report.info.length > 0 && (
              <IssueSection title="Info" issues={report.info} color={colors.teal} onPressDetail={setShowDetail} />
            )}

            {/* Dimensions */}
            {report.dimensions && <DimensionsSection dim={report.dimensions} />}

            {/* Bed compatibility */}
            <BedCompatibilitySection bedFit={report.bed_fit} />

          </ScrollView>
        </View>

        {/* Issue detail popover */}
        {showDetail && (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={() => setShowDetail(null)}
          >
            <TouchableOpacity
              style={styles.detailOverlay}
              activeOpacity={1}
              onPress={() => setShowDetail(null)}
            >
              <View style={styles.detailCard}>
                <Text style={styles.detailCode}>{showDetail.code}</Text>
                <Text style={styles.detailMessage}>{showDetail.message}</Text>
                {showDetail.detail ? (
                  <Text style={styles.detailBody}>{showDetail.detail}</Text>
                ) : null}
                <TouchableOpacity onPress={() => setShowDetail(null)}>
                  <Text style={styles.detailDismiss}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </Modal>
    </>
  );
}

function IssueSection({
  title, issues, color, onPressDetail,
}: {
  title: string;
  issues: PrintIssue[];
  color: string;
  onPressDetail: (issue: PrintIssue) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      {issues.map((issue, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.issueRow, { borderLeftColor: color }]}
          onPress={() => issue.detail ? onPressDetail(issue) : undefined}
          activeOpacity={issue.detail ? 0.7 : 1}
        >
          <Text style={styles.issueMsg}>{issue.message}</Text>
          {issue.detail ? <Text style={styles.issueTap}>tap for detail ›</Text> : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function DimensionsSection({ dim }: { dim: DimensionInfo }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Dimensions</Text>
      <View style={styles.dimGrid}>
        <DimCell label="Width"  value={`${dim.x.toFixed(1)} mm`} />
        <DimCell label="Depth"  value={`${dim.y.toFixed(1)} mm`} />
        <DimCell label="Height" value={`${dim.z.toFixed(1)} mm`} />
        <DimCell label="Volume" value={`${dim.volume_cm3.toFixed(1)} cm³`} />
      </View>
    </View>
  );
}

function DimCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dimCell}>
      <Text style={styles.dimLabel}>{label}</Text>
      <Text style={styles.dimValue}>{value}</Text>
    </View>
  );
}

function BedCompatibilitySection({ bedFit }: { bedFit: Record<string, { fits: boolean }> }) {
  const featured = ['bambu_x1c', 'prusa_mk4', 'ender_3', 'prusa_mini'];
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Printer Bed Compatibility</Text>
      {featured.map((printerId) => {
        const result = bedFit[printerId];
        const profile = PRINTER_PROFILES.find((p) => p.id === printerId);
        if (!result || !profile) return null;
        return (
          <View key={printerId} style={styles.bedRow}>
            <View style={[styles.bedDot, { backgroundColor: result.fits ? colors.teal : colors.red }]} />
            <Text style={styles.bedPrinter}>{profile.brand} {profile.name}</Text>
            <Text style={styles.bedSize}>
              {profile.bed_x}×{profile.bed_y}×{profile.bed_z}mm
            </Text>
            <Text style={[styles.bedStatus, { color: result.fits ? colors.teal : colors.red }]}>
              {result.fits ? 'fits' : 'too large'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryBar:      {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderRadius: radius.sm,
    marginHorizontal: spacing.md, marginBottom: 8,
  },
  statusDot:       { width: 8, height: 8, borderRadius: 4 },
  statusLabel:     { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, flex: 1 },
  dims:            { fontSize: 11, color: colors.muted, fontFamily: 'JetBrainsMono_400Regular' },
  supportPill:     {
    backgroundColor: '#1a150a', borderWidth: 1, borderColor: '#3a2e0a',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  supportText:     { fontSize: 9, color: colors.gold },
  chevron:         { color: colors.muted, fontSize: 18 },

  modal:           { flex: 1, backgroundColor: colors.bg },
  modalHeader:     {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 12,
  },
  modalPill:       { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border },
  modalTitle:      { flex: 1, color: colors.hl, fontSize: 16, fontWeight: '700' },
  closeBtn:        { color: colors.muted, fontSize: 18, padding: 4 },
  modalScroll:     { flex: 1, padding: spacing.md },

  verdictCard:     {
    borderWidth: 1, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md,
  },
  verdictLabel:    { fontSize: 14, fontWeight: '700', marginBottom: 4, letterSpacing: 0.3 },
  verdictSub:      { fontSize: 12, color: colors.muted, marginTop: 2 },

  section:         { marginBottom: spacing.lg },
  sectionTitle:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  issueRow:        {
    borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 8,
    marginBottom: 6, backgroundColor: colors.surface,
    borderRadius: 4,
  },
  issueMsg:        { color: colors.text, fontSize: 13 },
  issueTap:        { color: colors.muted, fontSize: 10, marginTop: 3 },

  dimGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dimCell:         {
    flex: 1, minWidth: '45%', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: spacing.sm,
  },
  dimLabel:        { fontSize: 10, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  dimValue:        { fontSize: 16, color: colors.teal, fontFamily: 'JetBrainsMono_400Regular', fontWeight: '600', marginTop: 2 },

  bedRow:          {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  bedDot:          { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  bedPrinter:      { flex: 1, color: colors.text, fontSize: 13 },
  bedSize:         { color: colors.muted, fontSize: 11, fontFamily: 'JetBrainsMono_400Regular' },
  bedStatus:       { fontSize: 11, fontWeight: '700', minWidth: 60, textAlign: 'right' },

  detailOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: spacing.xl },
  detailCard:      {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.lg,
  },
  detailCode:      { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: colors.muted, marginBottom: 6 },
  detailMessage:   { color: colors.hl, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  detailBody:      { color: colors.text, fontSize: 13, lineHeight: 20, marginBottom: spacing.md },
  detailDismiss:   { color: colors.accent, fontSize: 13, textAlign: 'center' },
});
