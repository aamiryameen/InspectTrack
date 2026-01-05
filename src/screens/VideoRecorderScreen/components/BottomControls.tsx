import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import {
  responsiveFontSize,
  responsiveSpacing,
  scale as responsiveScale,
} from '../../../utils/responsive';

interface BottomControlsProps {
  isRecording: boolean;
  isPaused?: boolean;
  isProcessing: boolean;
  onRecordPress: () => void;
  onStopPress: () => void;
  onClosePress: () => void;
}

const BottomControls: React.FC<BottomControlsProps> = memo(({
  isRecording,
  isPaused = false,
  isProcessing,
  onRecordPress,
  onStopPress,
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

  if (!isRecording) {
    return (
      <View style={styles.bottomControls}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClosePress}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.recordButton}
          onPress={onRecordPress}
          disabled={isProcessing}
        >
          <View style={styles.recordButtonInner} />
        </TouchableOpacity>
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
        style={styles.stopButton}
        onPress={onStopPress}
        disabled={isProcessing}
      >
        <View style={styles.stopButtonInner} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pausePlayButton, isPaused && styles.playButton]}
        onPress={onRecordPress}
        disabled={isProcessing}
      >
        {isPaused ? (
          <Text style={styles.playIcon}>▶</Text>
        ) : (
          <View style={styles.pauseIconContainer}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        )}
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
  recordButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 100,
    backgroundColor: '#EF4444',
  },
  stopButton: {
    width: 90,
    height: 90,
    borderRadius: 100,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  stopButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  pausePlayButton: {
    width: 60,
    height: 60,
    borderRadius: 100,
    backgroundColor: 'rgba(249, 115, 22, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F97316',
  },
  playButton: {
    backgroundColor: 'rgba(20, 184, 166, 0.3)',
    borderColor: '#14B8A6',
  },
  pauseIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pauseBar: {
    width: 4,
    height: 20,
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  playIcon: {
    color: '#FFF',
    fontSize: responsiveFontSize(20),
    fontWeight: 'bold',
    marginLeft: 2,
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

