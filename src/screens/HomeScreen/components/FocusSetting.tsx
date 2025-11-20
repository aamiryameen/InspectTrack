import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { SettingRow } from './SettingRow';
import { CameraDevice } from 'react-native-vision-camera';

interface FocusSettingProps {
  tapToFocusEnabled: boolean;
  device?: CameraDevice;
  onToggle: (value: boolean) => void;
}

export const FocusSetting: React.FC<FocusSettingProps> = ({
  tapToFocusEnabled,
  device,
  onToggle,
}) => {
  const focusSupported = device?.supportsFocus ?? false;
  
  return (
    <View style={styles.settingCard}>
      <SettingRow icon="◎" label="Tap to Focus" color="#3B82F6">
        <Switch
          value={tapToFocusEnabled}
          onValueChange={onToggle}
          trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
          thumbColor="#fff"
          disabled={!focusSupported}
        />
      </SettingRow>
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {tapToFocusEnabled 
            ? 'Tap on camera preview to focus on that point' 
            : 'Auto-focus enabled'}
        </Text>
        {!focusSupported && (
          <Text style={styles.warningText}>
            ⚠️ Focus control not supported by this camera device
          </Text>
        )}
        {focusSupported && !device?.supportsLockingFocus && (
          <Text style={styles.infoText2}>
            Device supports focus but not focus locking
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
  infoContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  infoText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
  infoText2: {
    fontSize: 11,
    color: '#6B7280',
  },
  warningText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
});

