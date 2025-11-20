import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AutoManualToggleProps {
  mode: 'auto' | 'manual';
  onToggle: (mode: 'auto' | 'manual') => void;
}

export const AutoManualToggle: React.FC<AutoManualToggleProps> = ({ mode, onToggle }) => (
  <View style={styles.toggleContainer}>
    <TouchableOpacity
      style={[styles.toggleButton, mode === 'auto' && styles.toggleButtonActive]}
      onPress={() => onToggle('auto')}
    >
      <Text style={[styles.toggleButtonText, mode === 'auto' && styles.toggleButtonTextActive]}>Auto</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.toggleButton, mode === 'manual' && styles.toggleButtonActive]}
      onPress={() => onToggle('manual')}
    >
      <Text style={[styles.toggleButtonText, mode === 'manual' && styles.toggleButtonTextActive]}>Manual</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  toggleButtonTextActive: {
    color: '#0EA5E9',
  },
});

