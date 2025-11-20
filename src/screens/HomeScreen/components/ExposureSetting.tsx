import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { CameraDevice } from 'react-native-vision-camera';
import { SettingRow } from './SettingRow';
import { AutoManualToggle } from './AutoManualToggle';

interface ExposureSettingProps {
  exposureMode: 'auto' | 'manual';
  exposure: number;
  device: CameraDevice | undefined;
  onModeChange: (mode: 'auto' | 'manual') => void;
  onExposureChange: (value: number) => void;
}

export const ExposureSetting: React.FC<ExposureSettingProps> = ({
  exposureMode,
  exposure,
  device,
  onModeChange,
  onExposureChange,
}) => {
  return (
    <View style={styles.settingCard}>
      <SettingRow icon="☀️" label="Exposure" color="#F59E0B">
        <AutoManualToggle mode={exposureMode} onToggle={onModeChange} />
      </SettingRow>
      {exposureMode === 'manual' && (
        <>
          <Slider
            style={styles.slider}
            minimumValue={device?.minExposure ?? -2}
            maximumValue={device?.maxExposure ?? 2}
            value={exposure}
            onValueChange={onExposureChange}
            minimumTrackTintColor="#0EA5E9"
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor="#0EA5E9"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>EV {(device?.minExposure ?? -2).toFixed(1)}</Text>
            <Text style={styles.sliderLabel}>EV {(device?.maxExposure ?? 2).toFixed(1)}</Text>
          </View>
          <Text style={styles.sliderValue}>Current: EV {exposure.toFixed(2)}</Text>
        </>
      )}
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
  slider: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  sliderValue: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});

