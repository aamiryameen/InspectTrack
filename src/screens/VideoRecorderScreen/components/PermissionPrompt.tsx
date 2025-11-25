import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { responsiveFontSize, responsiveSpacing } from '../../../utils/responsive';

interface PermissionPromptProps {
  hasDevice: boolean;
  hasCameraPermission: boolean;
  hasMicrophonePermission: boolean;
  onRequestPermissions: () => void;
}

const PermissionPrompt: React.FC<PermissionPromptProps> = memo(({
  hasDevice,
  hasCameraPermission,
  hasMicrophonePermission,
  onRequestPermissions,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          {!hasDevice ? 'No camera device found' : 'Camera permissions required'}
        </Text>
        {(!hasCameraPermission || !hasMicrophonePermission) && (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={onRequestPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

PermissionPrompt.displayName = 'PermissionPrompt';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: responsiveSpacing(20),
  },
  permissionText: {
    color: '#FFF',
    fontSize: responsiveFontSize(13),
    textAlign: 'center',
    marginBottom: responsiveSpacing(14),
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: responsiveSpacing(20),
    paddingVertical: responsiveSpacing(10),
    borderRadius: responsiveSpacing(8),
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
  },
});

export default PermissionPrompt;

