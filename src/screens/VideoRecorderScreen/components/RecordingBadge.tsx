import React, { memo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import {
  responsiveFontSize,
  responsiveSpacing,
  scale as responsiveScale,
} from '../../../utils/responsive';

interface RecordingBadgeProps {
  isRecording: boolean;
  pulseAnim: Animated.Value;
  formattedTime: string;
}

const RecordingBadge: React.FC<RecordingBadgeProps> = memo(({ 
  isRecording, 
  pulseAnim, 
  formattedTime 
}) => {
  if (!isRecording) return null;

  return (
    <View style={styles.recordingBadge}>
      <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
      <Text style={styles.recordingText}>Recording</Text>
      <Text style={styles.recordingDuration}>{formattedTime}</Text>
    </View>
  );
});

RecordingBadge.displayName = 'RecordingBadge';

const styles = StyleSheet.create({
  recordingBadge: {
    position: 'absolute',
    top: responsiveSpacing(15),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: responsiveSpacing(12),
    paddingVertical: responsiveSpacing(6),
    borderRadius: responsiveSpacing(6),
    gap: responsiveSpacing(6),
  },
  recordingDot: {
    width: responsiveScale(8),
    height: responsiveScale(8),
    borderRadius: responsiveScale(4),
    backgroundColor: '#FFF',
  },
  recordingText: {
    color: '#FFF',
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
  },
  recordingDuration: {
    color: '#FFF',
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
    marginLeft: responsiveSpacing(4),
  },
});

export default RecordingBadge;

