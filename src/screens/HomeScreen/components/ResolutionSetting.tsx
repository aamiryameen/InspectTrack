import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SettingRow } from './SettingRow';
import { CameraDeviceFormat } from 'react-native-vision-camera';

interface ResolutionSettingProps {
  resolution: '720p' | '1080p' | '4K';
  resolutionOptions: Array<'720p' | '1080p' | '4K'>;
  isExpanded: boolean;
  format?: CameraDeviceFormat;
  onToggleExpand: () => void;
  onSelectResolution: (resolution: '720p' | '1080p' | '4K') => void;
}

const getResolutionDimensions = (resolution: '720p' | '1080p' | '4K') => {
  switch (resolution) {
    case '720p':
      return { width: 1280, height: 720 };
    case '1080p':
      return { width: 1920, height: 1080 };
    case '4K':
      return { width: 3840, height: 2160 };
  }
};

export const ResolutionSetting: React.FC<ResolutionSettingProps> = ({
  resolution,
  resolutionOptions,
  isExpanded,
  format,
  onToggleExpand,
  onSelectResolution,
}) => {
  const currentDimensions = getResolutionDimensions(resolution);
  return (
    <View style={styles.settingCard}>
      <SettingRow icon="▦" label="Resolution" color="#84CC16">
        <TouchableOpacity style={styles.dropdown} onPress={onToggleExpand}>
          <Text style={styles.dropdownText}>{resolution}</Text>
          <Text style={styles.dropdownArrow}>{isExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </SettingRow>
      {isExpanded && (
        <View style={styles.dropdownOptions}>
          {resolutionOptions.map((option) => {
            const dimensions = getResolutionDimensions(option);
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.dropdownOption,
                  resolution === option && styles.dropdownOptionSelected,
                ]}
                onPress={() => onSelectResolution(option)}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    resolution === option && styles.dropdownOptionTextSelected,
                  ]}
                >
                  {option} ({dimensions.width}x{dimensions.height})
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
  dropdownOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  dropdownOptionTextSelected: {
    color: '#0EA5E9',
    fontWeight: '600',
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

