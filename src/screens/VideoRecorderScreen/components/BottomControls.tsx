import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import {
  responsiveFontSize,
  responsiveSpacing,
  scale as responsiveScale,
} from '../../../utils/responsive';

interface BottomControlsProps {
  isRecording: boolean;
  isProcessing: boolean;
  onRecordPress: () => void;
  onClosePress: () => void;
}

const BottomControls: React.FC<BottomControlsProps> = memo(({
  isRecording,
  isProcessing,
  onRecordPress,
  onClosePress,
}) => {
  if (isProcessing) {
    return (
      <View style={styles.bottomControls}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#FF3B30" />
          <Text style={styles.processingText}>Saving...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bottomControls}>
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={onClosePress}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.recordButton, isRecording && styles.recordButtonActive]}
        onPress={onRecordPress}
        disabled={isProcessing}
      >
        <View style={[styles.recordButtonInner, isRecording && styles.recordButtonInnerActive]} />
      </TouchableOpacity>
    </View>
  );
});

BottomControls.displayName = 'BottomControls';

const styles = StyleSheet.create({
  bottomControls: {
    position: 'absolute',
    bottom: responsiveSpacing(20),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSpacing(5),
  },
  closeButton: {
    width: 60,
    height: 60,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: responsiveFontSize(16),
    fontWeight: '300',
  },
  recordButton: {
    width: 90,
    height: 90,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: '#EF4444',
  },
  recordButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 100,
    backgroundColor: '#EF4444',
  },
  recordButtonInnerActive: {
    borderRadius: responsiveSpacing(4),
    width: responsiveScale(20),
    height: responsiveScale(20),
  },
  processingContainer: {
    alignItems: 'center',
    gap: responsiveSpacing(8),
  },
  processingText: {
    color: '#FFF',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
  },
});

export default BottomControls;

