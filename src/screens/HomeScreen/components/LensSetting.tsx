import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SettingRow } from './SettingRow';
import { CameraDevice, CameraDeviceFormat } from 'react-native-vision-camera';

interface LensSettingProps {
  selectedLens: string;
  lensOptions: string[];
  isExpanded: boolean;
  device?: CameraDevice;
  format?: CameraDeviceFormat;
  zoom: number;
  onToggleExpand: () => void;
  onSelectLens: (lens: string) => void;
}

const getLensDescription = (lens: string) => {
  switch (lens) {
    case '0.5x':
      return 'Ultra-wide';
    case '1x':
      return 'Wide';
    case '2x':
      return 'Telephoto';
    case '3x':
      return 'Telephoto 3x';
    default:
      return '';
  }
};

export const LensSetting: React.FC<LensSettingProps> = ({
  selectedLens,
  lensOptions,
  isExpanded,
  device,
  format,
  zoom,
  onToggleExpand,
  onSelectLens,
}) => {
  const minZoom = device?.minZoom ?? 1;
  const maxZoom = device?.maxZoom ?? 1;
  return (
    <View style={styles.settingCard}>
      <SettingRow icon="⊕" label="Lens" color="#84CC16">
        <TouchableOpacity style={styles.dropdown} onPress={onToggleExpand}>
          <Text style={styles.dropdownText}>{selectedLens}</Text>
          <Text style={styles.dropdownArrow}>{isExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </SettingRow>
      {isExpanded && (
        <View style={styles.dropdownOptions}>
          {lensOptions.map((option) => {
            const zoomValue = parseFloat(option);
            const isSupported = zoomValue >= minZoom && zoomValue <= maxZoom;
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.dropdownOption,
                  selectedLens === option && styles.dropdownOptionSelected,
                  !isSupported && styles.dropdownOptionDisabled,
                ]}
                onPress={() => onSelectLens(option)}
                disabled={!isSupported}
              >
                <View>
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      selectedLens === option && styles.dropdownOptionTextSelected,
                      !isSupported && styles.dropdownOptionTextDisabled,
                    ]}
                  >
                    {option}
                  </Text>
                  <Text style={styles.dropdownOptionDescription}>
                    {getLensDescription(option)} {!isSupported && '(Not supported)'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      <View style={styles.infoContainer}>
    
        {device && (
          <Text style={styles.formatInfo}>
            Device supports: {minZoom.toFixed(1)}x - {maxZoom.toFixed(1)}x zoom
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
    fontWeight: '600',
  },
  dropdownOptionTextSelected: {
    color: '#0EA5E9',
    fontWeight: '600',
  },
  dropdownOptionTextDisabled: {
    color: '#9CA3AF',
  },
  dropdownOptionDescription: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
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
});

