import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { CameraDevice } from 'react-native-vision-camera';
import { SettingRow } from './SettingRow';
import { AutoManualToggle } from './AutoManualToggle';

interface ExposureSettingProps {
  exposureMode: 'auto' | 'manual';
  exposureMin: number;
  exposureMax: number;
  device: CameraDevice | undefined;
  onModeChange: (mode: 'auto' | 'manual') => void;
  onExposureMinChange: (value: number) => void;
  onExposureMaxChange: (value: number) => void;
}

export const ExposureSetting: React.FC<ExposureSettingProps> = ({
  exposureMode,
  exposureMin,
  exposureMax,
  device,
  onModeChange,
  onExposureMinChange,
  onExposureMaxChange,
}) => {
  const minExposure = device?.minExposure ?? -2;
  const maxExposure = device?.maxExposure ?? 2;

  return (
    <View style={styles.settingCard}>
      <SettingRow icon="☀️" label="Exposure" color="#F59E0B">
        <AutoManualToggle mode={exposureMode} onToggle={onModeChange} />
      </SettingRow>
      {exposureMode === 'manual' && (
        <>
          <Text style={styles.sectionLabel}>Exposure Range</Text>
          
          <Text style={styles.sliderTitle}>Minimum Exposure</Text>
          <Slider
            style={styles.slider}
            minimumValue={minExposure}
            maximumValue={exposureMax}
            value={exposureMin}
            onValueChange={onExposureMinChange}
            minimumTrackTintColor="#0EA5E9"
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor="#0EA5E9"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>EV {minExposure.toFixed(1)}</Text>
            <Text style={styles.sliderLabel}>EV {exposureMax.toFixed(1)}</Text>
          </View>
          <Text style={styles.sliderValue}>Min: EV {exposureMin.toFixed(2)}</Text>

          <Text style={styles.sliderTitle}>Maximum Exposure</Text>
          <Slider
            style={styles.slider}
            minimumValue={exposureMin}
            maximumValue={maxExposure}
            value={exposureMax}
            onValueChange={onExposureMaxChange}
            minimumTrackTintColor="#0EA5E9"
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor="#0EA5E9"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>EV {exposureMin.toFixed(1)}</Text>
            <Text style={styles.sliderLabel}>EV {maxExposure.toFixed(1)}</Text>
          </View>
          <Text style={styles.sliderValue}>Max: EV {exposureMax.toFixed(2)}</Text>
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
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sliderTitle: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
});

