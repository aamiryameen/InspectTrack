import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SettingRow } from './SettingRow';
import { CameraDeviceFormat } from 'react-native-vision-camera';

interface FrameRateSettingProps {
  frameRate: number;
  frameRateOptions: number[];
  isExpanded: boolean;
  format?: CameraDeviceFormat;
  onToggleExpand: () => void;
  onSelectFrameRate: (fps: number) => void;
}

export const FrameRateSetting: React.FC<FrameRateSettingProps> = ({
  frameRate,
  frameRateOptions,
  isExpanded,
  format,
  onToggleExpand,
  onSelectFrameRate,
}) => {
  const actualFps = format ? Math.min(format.maxFps, frameRate) : frameRate;
  return (
    <View style={styles.settingCard}>
      <SettingRow icon="▦" label="Frame Rate" color="#84CC16">
        <TouchableOpacity style={styles.dropdown} onPress={onToggleExpand}>
          <Text style={styles.dropdownText}>{frameRate}fps</Text>
          <Text style={styles.dropdownArrow}>{isExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </SettingRow>
      {isExpanded && (
        <View style={styles.dropdownOptions}>
          {frameRateOptions.map((option) => {
            const isSupported = format ? option <= format.maxFps && option >= format.minFps : true;
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.dropdownOption,
                  frameRate === option && styles.dropdownOptionSelected,
                  !isSupported && styles.dropdownOptionDisabled,
                ]}
                onPress={() => onSelectFrameRate(option)}
                disabled={!isSupported}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    frameRate === option && styles.dropdownOptionTextSelected,
                    !isSupported && styles.dropdownOptionTextDisabled,
                  ]}
                >
                  {option}fps {!isSupported && '(Not supported)'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    minWidth: 80,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#6B7280',
  },
  dropdownOptions: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  dropdownOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  dropdownOptionDisabled: {
    opacity: 0.5,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  dropdownOptionTextSelected: {
    color: '#0EA5E9',
    fontWeight: '600',
  },
  dropdownOptionTextDisabled: {
    color: '#9CA3AF',
  },
  infoContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#6B7280',
  },
  formatInfo: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  warningText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
});

