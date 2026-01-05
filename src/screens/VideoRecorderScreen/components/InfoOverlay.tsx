import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  responsiveFontSize,
  responsiveSpacing,
} from '../../../utils/responsive';
import { GPSQuality } from '../hooks/useLocationTracking';

interface InfoOverlayProps {
  resolution: string;
  fps: number;
  hdrEnabled: boolean;
  gpsQuality: GPSQuality;
}

const getGPSQualityColor = (quality: GPSQuality): string => {
  switch (quality) {
    case 'excellent':
      return '#10B981'; // Green
    case 'good':
      return '#3B82F6'; // Blue
    case 'moderate':
      return '#F59E0B'; // Orange
    case 'poor':
      return '#EF4444'; // Red
    default:
      return '#6B7280'; // Gray
  }
};

const getGPSQualityLabel = (quality: GPSQuality): string => {
  switch (quality) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'moderate':
      return 'Moderate';
    case 'poor':
      return 'Poor';
    default:
      return 'Unknown';
  }
};

const getGPSQualityIcon = (quality: GPSQuality): string => {
  switch (quality) {
    case 'excellent':
      return '📡';
    case 'good':
      return '📶';
    case 'moderate':
      return '📡';
    case 'poor':
      return '📡';
    default:
      return '❓';
  }
};

const InfoOverlay: React.FC<InfoOverlayProps> = memo(({ 
  resolution, 
  fps, 
  hdrEnabled,
  gpsQuality
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

      <View style={[styles.gpsQualityCard, { borderColor: getGPSQualityColor(gpsQuality) }]}>
        <Text style={styles.gpsIcon}>{getGPSQualityIcon(gpsQuality)}</Text>
        <View>
          <Text style={styles.gpsLabel}>GPS</Text>
          <Text style={[styles.gpsValue, { color: getGPSQualityColor(gpsQuality) }]}>
            {getGPSQualityLabel(gpsQuality)}
          </Text>
        </View>
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
  gpsQualityCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: responsiveSpacing(8),
    padding: responsiveSpacing(10),
    minWidth: 85,
    alignItems: 'center',
    marginVertical: 5,
    borderWidth: 2,
    flexDirection: 'row',
    gap: responsiveSpacing(6),
    justifyContent: 'center',
  },
  gpsIcon: {
    fontSize: responsiveFontSize(16),
  },
  gpsLabel: {
    color: '#94A3B8',
    fontSize: responsiveFontSize(7.5),
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  gpsValue: {
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
    marginTop: responsiveSpacing(2),
  },
});

export default InfoOverlay;

