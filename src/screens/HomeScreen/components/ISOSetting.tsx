import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { CameraDeviceFormat } from 'react-native-vision-camera';
import { SettingRow } from './SettingRow';
import { AutoManualToggle } from './AutoManualToggle';

interface ISOSettingProps {
  isoMode: 'auto' | 'manual';
  iso: number;
  format: CameraDeviceFormat | undefined;
  onModeChange: (mode: 'auto' | 'manual') => void;
  onIsoChange: (value: number) => void;
}

export const ISOSetting: React.FC<ISOSettingProps> = ({
  isoMode,
  iso,
  format,
  onModeChange,
  onIsoChange,
}) => {
  return (
    <View style={styles.settingCard}>
      <SettingRow icon="◉" label="ISO" color="#8B5CF6">
        <AutoManualToggle mode={isoMode} onToggle={onModeChange} />
      </SettingRow>
      {isoMode === 'manual' && (
        <>
          <Slider
            style={styles.slider}
            minimumValue={format?.minISO ?? 100}
            maximumValue={format?.maxISO ?? 3200}
            value={iso}
            onValueChange={onIsoChange}
            minimumTrackTintColor="#0EA5E9"
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor="#0EA5E9"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>ISO {Math.round(format?.minISO ?? 100)}</Text>
            <Text style={styles.sliderLabel}>ISO {Math.round(format?.maxISO ?? 3200)}</Text>
          </View>
          <Text style={styles.sliderValue}>Current: ISO {Math.round(iso)}</Text>
          {/* <Text style={styles.noteText}>
            Note: ISO settings are saved but react-native-vision-camera v4.7 doesn't support direct ISO control. The exposure setting controls both ISO and shutter speed automatically.
          </Text> */}
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
  noteText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 8,
    paddingHorizontal: 8,
    lineHeight: 14,
  },
});

