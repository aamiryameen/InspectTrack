import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  responsiveFontSize,
  responsiveSpacing,
} from '../../../utils/responsive';

interface InfoOverlayProps {
  resolution: string;
  fps: number;
  hdrEnabled: boolean;
}

const InfoOverlay: React.FC<InfoOverlayProps> = memo(({ 
  resolution, 
  fps, 
  hdrEnabled 
}) => {
  return (
    <View style={styles.rightSidebar}>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>RESOLUTION</Text>
        <Text style={styles.infoValue}>{resolution}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>FPS</Text>
        <Text style={styles.infoValue}>{fps}</Text>
      </View>

      {hdrEnabled && (
        <View style={styles.hdrBadge}>
          <Text style={styles.hdrIcon}>✨</Text>
          <Text style={styles.hdrText}>HDR</Text>
        </View>
      )}
    </View>
  );
});

InfoOverlay.displayName = 'InfoOverlay';

const styles = StyleSheet.create({
  rightSidebar: {
    position: 'absolute',
    right: responsiveSpacing(15),
    top: responsiveSpacing(15),
    gap: responsiveSpacing(10),
    alignItems: 'flex-end',
  },
  infoCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: responsiveSpacing(8),
    padding: responsiveSpacing(10),
    minWidth: 85,
    alignItems: 'center',
    marginVertical: 5
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: responsiveFontSize(7.5),
    fontWeight: '600',
    marginBottom: responsiveSpacing(3),
    letterSpacing: 0.6,
    gap: 10
  },
  infoValue: {
    color: '#FFF',
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
  },
  hdrBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    borderRadius: responsiveSpacing(8),
    paddingHorizontal: responsiveSpacing(10),
    paddingVertical: responsiveSpacing(6),
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSpacing(5),
  },
  hdrIcon: {
    fontSize: responsiveFontSize(11),
  },
  hdrText: {
    color: '#FFF',
    fontSize: responsiveFontSize(10),
    fontWeight: '700',
  },
});

export default InfoOverlay;

