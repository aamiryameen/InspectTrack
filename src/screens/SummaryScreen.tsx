import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RecordingSettings } from '../utils/settingsUtils';
import RNFS from 'react-native-fs';
import Orientation from 'react-native-orientation-locker';

type RootStackParamList = {
  Home: undefined;
  Recording: {
    settings: RecordingSettings;
    zoom: number;
  };
  Summary: {
    startTime: string;
    endTime: string;
    distance: number;
    duration: number;
    avgCPU: number;
    highestCPU: number;
    avgMemory: number;
    highestMemory: number;
    videoPath: string;
    gpsFilePath: string;
    gyroscopeFilePath: string;
    cameraSettingsFilePath: string;
    settings: RecordingSettings;
  };
};

type SummaryScreenProps = NativeStackScreenProps<RootStackParamList, 'Summary'>;

const SummaryScreen: React.FC<SummaryScreenProps> = ({ route, navigation }) => {
  const {
    startTime,
    endTime,
    distance,
    duration,
    avgCPU,
    highestCPU,
    avgMemory,
    highestMemory,
    videoPath,
    gpsFilePath,
    gyroscopeFilePath,
    cameraSettingsFilePath,
    settings,
  } = route.params;

  const [gpsData, setGpsData] = useState<any>(null);
  const [gyroscopeData, setGyroscopeData] = useState<any>(null);

  // Lock orientation to portrait mode
  useEffect(() => {
    Orientation.lockToPortrait();
    
    return () => {
      Orientation.unlockAllOrientations();
    };
  }, []);

  useEffect(() => {
    loadGPSData();
    loadGyroscopeData();
  }, []);

  const loadGPSData = async () => {
    try {
      if (gpsFilePath) {
        const fileExists = await RNFS.exists(gpsFilePath);
        if (fileExists) {
          const gpsContent = await RNFS.readFile(gpsFilePath, 'utf8');
          const parsedGPSData = JSON.parse(gpsContent);
          setGpsData(parsedGPSData);
          console.log('GPS data loaded successfully');
        }
      }
    } catch (error) {
      console.error('Error loading GPS data:', error);
    }
  };

  const loadGyroscopeData = async () => {
    try {
      if (gyroscopeFilePath) {
        const fileExists = await RNFS.exists(gyroscopeFilePath);
        if (fileExists) {
          const gyroContent = await RNFS.readFile(gyroscopeFilePath, 'utf8');
          const parsedGyroData = JSON.parse(gyroContent);
          setGyroscopeData(parsedGyroData);
          console.log('Gyroscope data loaded successfully');
        }
      }
    } catch (error) {
      console.error('Error loading Gyroscope data:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatUTCTimestamp = (timestamp: number): string => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = new Date(timestamp);
      
      // Use Intl.DateTimeFormat for proper UTC conversion
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(date);
      const partValues: { [key: string]: string } = {};
      
      parts.forEach(({ type, value }) => {
        partValues[type] = value;
      });
      
      // Format: MM/DD/YYYY, HH:MM:SS (UTC)
      return `${partValues.hour}:${partValues.minute}:${partValues.second}`;
    } catch (error) {
      console.error('Error formatting UTC timestamp:', error);
      return 'Invalid Date';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successIcon}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <Text style={styles.title}>Collection Complete!</Text>
        <Text style={styles.subtitle}>
          Your road patrol data has been recorded and saved successfully.
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>🕐</Text>
                <Text style={styles.statLabel}>Start Time (UTC)</Text>
              </View>
              <Text style={styles.statValue}>
                {gpsData?.recordingStartTime ? formatUTCTimestamp(gpsData.recordingStartTime) : 'Loading...'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>🕐</Text>
                <Text style={styles.statLabel}>End Time (UTC)</Text>
              </View>
              <Text style={styles.statValue}>
                {gpsData?.recordingEndTime ? formatUTCTimestamp(gpsData.recordingEndTime) : 'Loading...'}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>⏱</Text>
                <Text style={styles.statLabel}>Video Duration</Text>
              </View>
              <Text style={styles.statValue}>{formatDuration(duration)}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>↔</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <Text style={styles.statValue}>{distance.toFixed(2)} km</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Average CPU</Text>
              <Text style={styles.statValue}>{avgCPU}%</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Highest CPU</Text>
              <Text style={styles.statValue}>{highestCPU}%</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Average Memory Load</Text>
              <Text style={styles.statValue}>{avgMemory.toFixed(2)} GB</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Highest Memory Load</Text>
              <Text style={styles.statValue}>{highestMemory.toFixed(2)} GB</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.backToHomeButton}
          onPress={() => {
            navigation.navigate('Home');
          }}
        >
          <Text style={styles.backToHomeText}>BACK TO HOME</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  checkmark: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  statsGrid: {
    width: '100%',
    maxWidth: 900,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    minHeight: 90,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statIcon: {
    fontSize: 20,
    color: '#14B8A6',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  backToHomeButton: {
    backgroundColor: '#14B8A6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    maxWidth: 500,
  },
  backToHomeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default SummaryScreen;

