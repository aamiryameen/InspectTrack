import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = () => {
  const [frameRate, setFrameRate] = useState('30');
  const [captureInterval, setCaptureInterval] = useState('1');
  const [bufferSize, setBufferSize] = useState('50');
  const [resolution, setResolution] = useState('1080p');
  const [codec, setCodec] = useState('H.264');
  const [bitrate, setBitrate] = useState('8');
  const [gpsAccuracy, setGpsAccuracy] = useState('high');
  const [gpsUpdateInterval, setGpsUpdateInterval] = useState('1');
  const [gpsDistanceFilter, setGpsDistanceFilter] = useState('0');
  const [minStorageSpace, setMinStorageSpace] = useState('500');
  const [enableAutoCleanup, setEnableAutoCleanup] = useState(true);
  const [enableCacheManagement, setEnableCacheManagement] = useState(true);
  const [metadataFormat, setMetadataFormat] = useState('JSON');
  const [timestampFormat, setTimestampFormat] = useState('ISO8601');
  const [enableGpsSync, setEnableGpsSync] = useState(true);

  const saveSettings = async () => {
    try {
      const settings = {
        frameRate: {
          fps: parseInt(frameRate),
          captureInterval: parseInt(captureInterval),
          bufferSize: parseInt(bufferSize),
        },
        video: {
          resolution,
          codec,
          bitrate: parseInt(bitrate),
        },
        gps: {
          accuracy: gpsAccuracy,
          updateInterval: parseInt(gpsUpdateInterval),
          distanceFilter: parseInt(gpsDistanceFilter),
        },
        storage: {
          minSpace: parseInt(minStorageSpace),
          autoCleanup: enableAutoCleanup,
          cacheManagement: enableCacheManagement,
        },
        metadata: {
          format: metadataFormat,
          timestampFormat,
          gpsSync: enableGpsSync,
        },
      };

      await AsyncStorage.setItem('recordingSettings', JSON.stringify(settings));
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Frame Rate Configuration</Text>

        <View style={styles.settingRow}>
          <Text style={styles.label}>FPS</Text>
          <View style={styles.optionGroup}>
            <TouchableOpacity
              style={[styles.optionButton, frameRate === '30' && styles.optionButtonActive]}
              onPress={() => setFrameRate('30')}
            >
              <Text style={[styles.optionText, frameRate === '30' && styles.optionTextActive]}>
                30 FPS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, frameRate === '60' && styles.optionButtonActive]}
              onPress={() => setFrameRate('60')}
            >
              <Text style={[styles.optionText, frameRate === '60' && styles.optionTextActive]}>
                60 FPS
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Capture Interval (seconds)</Text>
          <TextInput
            style={styles.input}
            value={captureInterval}
            onChangeText={setCaptureInterval}
            keyboardType="numeric"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Buffer Size (MB)</Text>
          <TextInput
            style={styles.input}
            value={bufferSize}
            onChangeText={setBufferSize}
            keyboardType="numeric"
            placeholderTextColor="#666"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Video Resolution & Quality</Text>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Resolution</Text>
          <View style={styles.optionGroup}>
            <TouchableOpacity
              style={[styles.optionButton, resolution === '720p' && styles.optionButtonActive]}
              onPress={() => setResolution('720p')}
            >
              <Text style={[styles.optionText, resolution === '720p' && styles.optionTextActive]}>
                720p
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, resolution === '1080p' && styles.optionButtonActive]}
              onPress={() => setResolution('1080p')}
            >
              <Text style={[styles.optionText, resolution === '1080p' && styles.optionTextActive]}>
                1080p
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, resolution === '4K' && styles.optionButtonActive]}
              onPress={() => setResolution('4K')}
            >
              <Text style={[styles.optionText, resolution === '4K' && styles.optionTextActive]}>
                4K
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Codec</Text>
          <Text style={styles.valueText}>{codec}</Text>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Bitrate (Mbps)</Text>
          <TextInput
            style={styles.input}
            value={bitrate}
            onChangeText={setBitrate}
            keyboardType="numeric"
            placeholderTextColor="#666"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. GPS/Location Settings</Text>

        <View style={styles.settingRow}>
          <Text style={styles.label}>GPS Accuracy</Text>
          <View style={styles.optionGroup}>
            <TouchableOpacity
              style={[styles.optionButton, gpsAccuracy === 'low' && styles.optionButtonActive]}
              onPress={() => setGpsAccuracy('low')}
            >
              <Text style={[styles.optionText, gpsAccuracy === 'low' && styles.optionTextActive]}>
                Low
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, gpsAccuracy === 'high' && styles.optionButtonActive]}
              onPress={() => setGpsAccuracy('high')}
            >
              <Text style={[styles.optionText, gpsAccuracy === 'high' && styles.optionTextActive]}>
                High
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Update Interval (seconds)</Text>
          <TextInput
            style={styles.input}
            value={gpsUpdateInterval}
            onChangeText={setGpsUpdateInterval}
            keyboardType="numeric"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Distance Filter (meters)</Text>
          <TextInput
            style={styles.input}
            value={gpsDistanceFilter}
            onChangeText={setGpsDistanceFilter}
            keyboardType="numeric"
            placeholderTextColor="#666"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Storage & Memory Management</Text>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Minimum Storage Space (MB)</Text>
          <TextInput
            style={styles.input}
            value={minStorageSpace}
            onChangeText={setMinStorageSpace}
            keyboardType="numeric"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Auto Cleanup</Text>
          <Switch
            value={enableAutoCleanup}
            onValueChange={setEnableAutoCleanup}
            trackColor={{ false: '#333', true: '#34C759' }}
            thumbColor="#FFF"
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Cache Management</Text>
          <Switch
            value={enableCacheManagement}
            onValueChange={setEnableCacheManagement}
            trackColor={{ false: '#333', true: '#34C759' }}
            thumbColor="#FFF"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Metadata & Timestamping</Text>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Metadata Format</Text>
          <Text style={styles.valueText}>{metadataFormat}</Text>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Timestamp Format</Text>
          <Text style={styles.valueText}>{timestampFormat}</Text>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>GPS Sync Per Frame</Text>
          <Switch
            value={enableGpsSync}
            onValueChange={setEnableGpsSync}
            trackColor={{ false: '#333', true: '#34C759' }}
            thumbColor="#FFF"
          />
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  label: {
    fontSize: 15,
    color: '#CCC',
    flex: 1,
  },
  valueText: {
    fontSize: 15,
    color: '#888',
  },
  input: {
    width: 100,
    height: 40,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFF',
    fontSize: 15,
    textAlign: 'center',
  },
  optionGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#333',
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#FFF',
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 30,
    height: 50,
    backgroundColor: '#34C759',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  bottomPadding: {
    height: 40,
  },
});

export default SettingsScreen;
