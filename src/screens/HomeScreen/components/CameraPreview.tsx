import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Animated, LayoutChangeEvent } from 'react-native';
import { Camera, CameraDevice, CameraDeviceFormat } from 'react-native-vision-camera';
import { RecordingSettings } from '../../../utils/settingsUtils';

interface CameraPreviewProps {
  cameraRef: React.RefObject<Camera | null>;
  device: CameraDevice | undefined;
  format: CameraDeviceFormat | undefined;
  settings: RecordingSettings;
  zoom: number;
  selectedLens: string;
  hdr: boolean;
  onStartRecording: () => void;
  onDownloadFile?: () => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  cameraRef,
  device,
  format,
  settings,
  zoom,
  selectedLens,
  hdr,
  onStartRecording,
  onDownloadFile,
}) => {
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });

  const fps = format ? Math.min(format.maxFps, settings.frameRate.fps) : settings.frameRate.fps;
  
  const videoHdrEnabled = hdr && format?.supportsVideoHdr;
  const photoHdrEnabled = hdr && format?.supportsPhotoHdr;

  const handleCameraLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCameraLayout({ width, height });
  };

  const handleTapToFocus = async (event: any) => {
    if (!settings.camera.tapToFocusEnabled || !device?.supportsFocus) {
      console.log('❌ Tap-to-focus disabled or not supported');
      return;
    }
    
    const { locationX, locationY } = event.nativeEvent;
    
    // Validate coordinates
    if (locationX === undefined || locationY === undefined) {
      console.log('❌ Invalid tap coordinates');
      return;
    }

    // Validate camera layout
    if (!cameraLayout.width || !cameraLayout.height) {
      console.log('❌ Camera layout not initialized');
      return;
    }

    // Show focus indicator at tap location
    setFocusPoint({ x: locationX, y: locationY });
    
    // Animate focus indicator
    fadeAnim.setValue(1);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 1500,
      useNativeDriver: true,
    }).start(() => {
      setFocusPoint(null);
    });

    // Focus camera with normalized coordinates (0-1 range)
    if (cameraRef.current) {
      try {
        const normalizedX = locationX / cameraLayout.width;
        const normalizedY = locationY / cameraLayout.height;
        
        console.log('📸 Focusing at:', {
          pixel: { x: locationX, y: locationY },
          normalized: { x: normalizedX.toFixed(2), y: normalizedY.toFixed(2) },
          layout: cameraLayout,
        });

        await cameraRef.current.focus({
          x: normalizedX,
          y: normalizedY,
        });
        
        console.log('✅ Focus successful');
      } catch (error) {
        console.error('❌ Focus error:', error);
      }
    } else {
      console.log('❌ Camera ref not available');
    }
  };
  return (
    <View style={styles.previewSection}>
      <Text style={styles.previewLabel}>Camera Preview</Text>
      <View style={styles.cameraContainer}>
        {device && (
          <>
            <Pressable 
              style={styles.cameraTouchable} 
              onPress={handleTapToFocus}
              onLayout={handleCameraLayout}
            >
              <Camera
                key={`${settings.video.resolution}-${settings.frameRate.fps}-${hdr}`}
                ref={cameraRef}
                style={styles.camera}
                device={device}
                format={format}
                isActive={true}
                photo={true}
                video={true}
                zoom={zoom}
                fps={fps}
                videoHdr={videoHdrEnabled}
                photoHdr={photoHdrEnabled}
                exposure={settings.camera.exposureMode === 'manual' ? settings.camera.exposure : undefined}
              />
            </Pressable>
        
            {focusPoint && settings.camera.tapToFocusEnabled && (
              <Animated.View
                style={[
                  styles.focusIndicator,
                  {
                    left: focusPoint.x - 40,
                    top: focusPoint.y - 40,
                    opacity: fadeAnim,
                  },
                ]}
              />
            )}
            
            <View style={styles.cameraOverlay} pointerEvents="none">
              <Text style={styles.cameraStats}>
                {settings.video.resolution} • {fps}fps • {selectedLens} {videoHdrEnabled ? '• HDR' : ''}
               
              </Text>
            </View>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.recordButton} onPress={onStartRecording}>
        <Text style={styles.recordButtonText}>Start Recording</Text>
      </TouchableOpacity>

      {/* {onDownloadFile && (
        <TouchableOpacity style={styles.downloadButton} onPress={onDownloadFile}>
          <Text style={styles.downloadButtonText}>📥 Download File</Text>
        </TouchableOpacity>
      )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  previewSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cameraContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraTouchable: {
    height: 220,
    width: '100%',
  },
  camera: {
    height: 220,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cameraStats: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  recordButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    width: '80%',
    alignSelf: 'center',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  downloadButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 12,
    width: '80%',
    alignSelf: 'center',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  focusIndicator: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 40,
    backgroundColor: 'transparent',
  },
});
