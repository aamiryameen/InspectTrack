import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraDeviceFormat } from 'react-native-vision-camera';
import { SettingRow } from './SettingRow';
import { AutoManualToggle } from './AutoManualToggle';
import MultiSlider from '@ptomasroos/react-native-multi-slider';

interface ISOSettingProps {
  isoMode: 'auto' | 'manual';
  isoMin: number;
  isoMax: number;
  format: CameraDeviceFormat | undefined;
  onModeChange: (mode: 'auto' | 'manual') => void;
  onIsoMinChange: (value: number) => void;
  onIsoMaxChange: (value: number) => void;
}

export const ISOSetting: React.FC<ISOSettingProps> = ({
  isoMode,
  isoMin,
  isoMax,
  format,
  onModeChange,
  onIsoMinChange,
  onIsoMaxChange,
}) => {
  const minLimit = format?.minISO ?? 100;
  const maxLimit = format?.maxISO ?? 3200;

  const allowedMinISO = Math.min(minLimit, maxLimit);
  const allowedMaxISO = Math.max(minLimit, maxLimit);

  const sliderLength = 280;

  const calculatePosition = (value: number) => {
    const range = allowedMaxISO - allowedMinISO;
    if (range === 0) return 0;
    const percentage = (value - allowedMinISO) / range;
    return percentage * sliderLength;
  };

  const minPosition = calculatePosition(isoMin);
  const maxPosition = calculatePosition(isoMax);

  const handleSliderChange = (values: number[]) => {
    const [newMin, newMax] = values;
    const roundedMin = Math.round(newMin);
    const roundedMax = Math.round(newMax);
    onIsoMinChange(roundedMin);
    onIsoMaxChange(roundedMax);
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
          <Text style={styles.labelBubbleText}>{Math.round(value)}</Text>
        </View>
        <View style={styles.labelBubblePointer} />
      </View>
    );
  };

  return (
    <View style={styles.settingCard}>
      <SettingRow icon="◉" label="ISO" color="#8B5CF6">
        <AutoManualToggle mode={isoMode} onToggle={onModeChange} />
      </SettingRow>
      {isoMode === 'manual' && (
        <>
          <View style={styles.sliderContainer}>
            <View style={styles.sliderWrapper}>
              <View style={styles.labelContainer}>
                {renderCustomLabel(isoMin, minPosition, 0)}
                {renderCustomLabel(isoMax, maxPosition, 1)}
              </View>
              <MultiSlider
                values={[isoMin, isoMax]}
                onValuesChange={handleSliderChange}
                min={allowedMinISO}
                max={allowedMaxISO}
                step={1}
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
                <Text style={[styles.sliderLabel, styles.sliderLabelStart]}>MIN: {allowedMinISO}</Text>
                <Text style={[styles.sliderLabel, styles.sliderLabelEnd]}>MAX: {allowedMaxISO}</Text>
              </View>
            </View>
          </View>
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
