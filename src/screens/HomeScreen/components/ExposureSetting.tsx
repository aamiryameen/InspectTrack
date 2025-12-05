import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraDevice } from 'react-native-vision-camera';
import { defaultSettings } from '../../../utils/settingsUtils';
import { SettingRow } from './SettingRow';
import { AutoManualToggle } from './AutoManualToggle';
import MultiSlider from '@ptomasroos/react-native-multi-slider';

interface ExposureSettingProps {
  exposureMode: 'auto' | 'manual';
  exposureMin: number;
  exposureMax: number;
  minLimit: number;
  maxLimit: number;
  device: CameraDevice | undefined;
  onModeChange: (mode: 'auto' | 'manual') => void;
  onExposureMinChange: (value: number) => void;
  onExposureMaxChange: (value: number) => void;
}

export const ExposureSetting: React.FC<ExposureSettingProps> = ({
  exposureMode,
  exposureMin,
  exposureMax,
  minLimit,
  maxLimit,
  device,
  onModeChange,
  onExposureMinChange,
  onExposureMaxChange,
}) => {
  const resolvedMinLimit = useMemo(() => {
    if (Number.isFinite(minLimit)) return minLimit;
    if (typeof device?.minExposure === 'number') return device.minExposure;
    return defaultSettings.camera.exposureMin;
  }, [minLimit, device?.minExposure]);

  const resolvedMaxLimit = useMemo(() => {
    if (Number.isFinite(maxLimit)) return maxLimit;
    if (typeof device?.maxExposure === 'number') return device.maxExposure;
    return defaultSettings.camera.exposureMax;
  }, [maxLimit, device?.maxExposure]);

  const allowedMinExposure = Math.min(resolvedMinLimit, resolvedMaxLimit);
  const allowedMaxExposure = Math.max(resolvedMinLimit, resolvedMaxLimit);

  const handleSliderChange = (values: number[]) => {
    const [newMin, newMax] = values;
    const roundedMin = Math.round(newMin * 100) / 100;
    const roundedMax = Math.round(newMax * 100) / 100;
    onExposureMinChange(roundedMin);
    onExposureMaxChange(roundedMax);
  };

  return (
    <View style={styles.settingCard}>
      <SettingRow icon="☀️" label="Exposure" color="#F59E0B">
        <AutoManualToggle mode={exposureMode} onToggle={onModeChange} />
      </SettingRow>
      {exposureMode === 'manual' && (
        <>
          <View style={styles.sliderContainer}>
            <View style={styles.sliderValueRow}>
              <View style={styles.valueBox}>
                <Text style={styles.valueLabel}>Min</Text>
                <Text style={styles.valueText}>EV {formatExposureValue(exposureMin)}</Text>
              </View>
              <View style={styles.valueBox}>
                <Text style={styles.valueLabel}>Max</Text>
                <Text style={styles.valueText}>EV {formatExposureValue(exposureMax)}</Text>
              </View>
            </View>

            <View style={styles.sliderWrapper}>
              <MultiSlider
                values={[exposureMin, exposureMax]}
                onValuesChange={handleSliderChange}
                min={allowedMinExposure}
                max={allowedMaxExposure}
                step={0.1}
                sliderLength={280}
                selectedStyle={{
                  backgroundColor: '#3B82F6',
                  height: 4,
                }}
                unselectedStyle={{
                  backgroundColor: '#E5E7EB',
                  height: 4,
                }}
                markerStyle={{
                  backgroundColor: '#3B82F6',
                  height: 24,
                  width: 24,
                  borderRadius: 12,
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 4,
                }}
                pressedMarkerStyle={{
                  backgroundColor: '#2563EB',
                  height: 28,
                  width: 28,
                  borderRadius: 14,
                }}
                enableLabel={false}
                allowOverlap={false}
                minMarkerOverlapDistance={40}
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const formatExposureValue = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const fixed = value.toFixed(2);
  return fixed.replace(/\.?0+$/, '') || '0';
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
  sectionLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  deviceInfoContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  deviceInfoText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  sliderContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  sliderValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  valueBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 120,
  },
  valueLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  sliderWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
});

