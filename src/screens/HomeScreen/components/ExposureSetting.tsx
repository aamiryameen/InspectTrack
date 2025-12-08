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

  const sliderLength = 280;

  const calculatePosition = (value: number) => {
    const range = allowedMaxExposure - allowedMinExposure;
    if (range === 0) return 0;
    const percentage = (value - allowedMinExposure) / range;
    return percentage * sliderLength;
  };

  const minPosition = calculatePosition(exposureMin);
  const maxPosition = calculatePosition(exposureMax);

  const handleSliderChange = (values: number[]) => {
    const [newMin, newMax] = values;
    const roundedMin = Math.round(newMin * 100) / 100;
    const roundedMax = Math.round(newMax * 100) / 100;
    onExposureMinChange(roundedMin);
    onExposureMaxChange(roundedMax);
  };

  const renderCustomLabel = (value: number, position: number, index: number) => {
    const bubbleLeft = position - 25;
    return (
      <View 
        key={index}
        style={[
          styles.labelBubble,
          { left: Math.max(0, Math.min(bubbleLeft, sliderLength - 50)) }
        ]}
      >
        <View style={styles.labelBubbleContent}>
          <Text style={styles.labelBubbleText}>{formatExposureValue(value)}</Text>
        </View>
        <View style={styles.labelBubblePointer} />
      </View>
    );
  };

  return (
    <View style={styles.settingCard}>
      <SettingRow icon="☀️" label="Exposure" color="#F59E0B">
        <AutoManualToggle mode={exposureMode} onToggle={onModeChange} />
      </SettingRow>
      {exposureMode === 'manual' && (
        <>
          <View style={styles.sliderContainer}>
            <View style={styles.sliderWrapper}>
              <View style={styles.labelContainer}>
                {renderCustomLabel(exposureMin, minPosition, 0)}
                {renderCustomLabel(exposureMax, maxPosition, 1)}
              </View>
              <MultiSlider
                values={[exposureMin, exposureMax]}
                onValuesChange={handleSliderChange}
                min={allowedMinExposure}
                max={allowedMaxExposure}
                step={0.1}
                sliderLength={280}
                selectedStyle={{
                  backgroundColor: '#0EA5E9',
                  height: 4,
                }}
                unselectedStyle={{
                  backgroundColor: '#E5E7EB',
                  height: 4,
                }}
                markerStyle={{
                  backgroundColor: '#0EA5E9',
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
                  backgroundColor: '#0284C7',
                  height: 28,
                  width: 28,
                  borderRadius: 14,
                }}
                enableLabel={false}
                allowOverlap={false}
                minMarkerOverlapDistance={40}
              />
              <View style={styles.sliderLabelsRow}>
                <Text style={[styles.sliderLabel, styles.sliderLabelStart]}>MIN: {formatExposureValue(allowedMinExposure)}</Text>
                <Text style={[styles.sliderLabel, styles.sliderLabelEnd]}>MAX: {formatExposureValue(allowedMaxExposure)}</Text>
              </View>
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
    marginBottom: 12,
  },
  sliderWrapper: {
    alignItems: 'center',
    paddingVertical: 1,
  },
  labelContainer: {
    width: 280,
    height: 50,
    position: 'relative',
  },
  labelBubble: {
    alignItems: 'center',
    position: 'absolute',
    top: 20,
  },
  labelBubbleContent: {
    backgroundColor: '#0EA5E9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  labelBubbleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  labelBubblePointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0EA5E9',
    marginTop: -1,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 300,
    position: 'relative',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#0EA5E9',
    fontWeight: '500',
  },
  sliderLabelStart: {
    textAlign: 'left',
  },
  sliderLabelEnd: {
    textAlign: 'right',
  },
});
