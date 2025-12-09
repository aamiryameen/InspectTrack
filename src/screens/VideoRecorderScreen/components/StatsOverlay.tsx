import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  responsiveFontSize,
  responsiveSpacing,
  scale as responsiveScale,
} from '../../../utils/responsive';

interface StatsOverlayProps {
  cpuUsage: number;
  memoryUsage: number;
  recordingVideoSizeGB: number;
  isRecording: boolean;
}

const StatsOverlay: React.FC<StatsOverlayProps> = memo(({
  cpuUsage,
  memoryUsage,
  recordingVideoSizeGB,
  isRecording
}) => {
  const videoSizeMB = recordingVideoSizeGB > 0
    ? (recordingVideoSizeGB * 1024).toFixed(2)
    : '0';

  return (
    <View style={styles.leftSidebar}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>CPU</Text>
        <Text style={styles.statValue}>{Math.round(cpuUsage)}%</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${cpuUsage}%`, backgroundColor: '#10B981' }]} />
        </View>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>MEMORY</Text>
        <Text style={styles.statValue}>{Math.round(memoryUsage)} Mb</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(memoryUsage / 50) * 100}%`, backgroundColor: '#10B981' }]} />
        </View>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>STORAGE</Text>
        <Text style={styles.statValue}>{videoSizeMB} MB</Text>
        <Text style={styles.statUnit}>{isRecording ? 'Recording' : 'Ready'}</Text>
      </View>
    </View>
  );
});

StatsOverlay.displayName = 'StatsOverlay';

const styles = StyleSheet.create({
  leftSidebar: {
    position: 'absolute',
    left: responsiveSpacing(15),
    top: responsiveSpacing(15),
    gap: 30,
  },
  statCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: responsiveSpacing(10),
    padding: responsiveSpacing(10),
    minWidth: responsiveScale(120),
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: responsiveFontSize(8),
    fontWeight: '600',
    marginBottom: responsiveSpacing(4),
    letterSpacing: 0.6,
  },
  statValue: {
    color: '#FFF',
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    marginBottom: responsiveSpacing(6),
  },
  statUnit: {
    color: '#94A3B8',
    fontSize: responsiveFontSize(10),
    fontWeight: '500',
    marginTop: responsiveSpacing(-4),
  },
  progressBar: {
    height: responsiveSpacing(4),
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: responsiveSpacing(2),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: responsiveSpacing(2),
  },
});

export default StatsOverlay;
