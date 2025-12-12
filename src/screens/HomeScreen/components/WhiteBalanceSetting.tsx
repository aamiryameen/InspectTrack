import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SettingRow } from './SettingRow';

interface WhiteBalanceSettingProps {
  // White balance is managed automatically by the camera device
}

export const WhiteBalanceSetting: React.FC<WhiteBalanceSettingProps> = () => {
  return (
    <View style={styles.settingCard}>
      <SettingRow icon="◐" label="White Balance" color="#EC4899">
        <Text style={styles.autoLabel}>AUTO</Text>
      </SettingRow>
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          White Balance is automatically controlled by the camera device
        </Text>
        {/* <Text style={styles.descriptionText}>
          Vision Camera API doesn't support manual white balance control. 
          The camera automatically adjusts white balance based on lighting conditions.
        </Text> */}
        <Text style={styles.tipText}>
           Use Exposure settings to influence brightness and color
        </Text>
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
  autoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EC4899',
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  infoContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  tipText: {
    fontSize: 11,
    color: '#3B82F6',
    fontStyle: 'italic',
  },
});

