import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SettingRowProps {
  icon: string;
  label: string;
  color: string;
  children: React.ReactNode;
}

export const SettingRow: React.FC<SettingRowProps> = ({ icon, label, color, children }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingLeft}>
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
});

