import React from 'react';
import { View, Switch, Text, StyleSheet } from 'react-native';
import { SettingRow } from './SettingRow';
import { CameraDeviceFormat } from 'react-native-vision-camera';

interface HDRSettingProps {
  hdr: boolean;
  format?: CameraDeviceFormat;
  onToggle: (value: boolean) => void;
}

export const HDRSetting: React.FC<HDRSettingProps> = ({ hdr, format, onToggle }) => {
  const hdrSupported = format?.supportsVideoHdr || format?.supportsPhotoHdr;
  
  // Debug logging
  React.useEffect(() => {
    if (format) {
      console.log('📸 HDR Debug Info:');
      console.log('  - Format Resolution:', format.videoWidth, 'x', format.videoHeight);
      console.log('  - FPS Range:', format.minFps, '-', format.maxFps);
      console.log('  - Video HDR Support:', format.supportsVideoHdr);
      console.log('  - Photo HDR Support:', format.supportsPhotoHdr);
      console.log('  - HDR Enabled:', hdr);
    }
  }, [format, hdr]);
  
  return (
    <View style={styles.settingCard}>
      <SettingRow icon="✨" label="HDR" color="#10B981">
        <Switch
          value={hdr}
          onValueChange={onToggle}
          trackColor={{ false: '#E5E7EB', true: '#14B8A6' }}
          thumbColor="#fff"
        />
      </SettingRow>
      <View style={styles.hdrInfo}>
   
        {!format && (
          <Text style={styles.hdrWarning}>
            ⚠️ Loading camera format...
          </Text>
        )}
        {format && !hdrSupported && hdr && (
          <>
            <Text style={styles.hdrWarning}>
              ⚠️ HDR enabled but not supported by selected format
            </Text>
         
          </>
        )}
        {format && !hdrSupported && !hdr && (
          <>
            <Text style={styles.hdrInfo2}>
              ℹ️ HDR not supported by this device/format combination
            </Text>
            <Text style={styles.hdrDebug}>
              Your device may not support HDR or this resolution/fps combo doesn't support it
            </Text>
          </>
        )}
        {hdrSupported && hdr && (
          <Text style={styles.hdrActive}>
            {format?.supportsVideoHdr ? '✓ Video HDR enabled' : ''} 
            {format?.supportsVideoHdr && format?.supportsPhotoHdr ? ' • ' : ''} 
            {format?.supportsPhotoHdr ? '✓ Photo HDR enabled' : ''}
          </Text>
        )}
        {hdrSupported && !hdr && (
          <Text style={styles.hdrInfo2}>
            HDR is available for this format
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  hdrInfo: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  hdrInfoText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  hdrWarning: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  hdrActive: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  hdrInfo2: {
    fontSize: 11,
    color: '#6B7280',
  },
  hdrDebug: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    fontFamily: 'monospace',
  },
});

