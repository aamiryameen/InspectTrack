import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RecordingSettings } from '../utils/settingsUtils';
import RNFS from 'react-native-fs';

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
  } = route.params;

  const [isDownloading, setIsDownloading] = useState(false);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} hrs`;
  };

  const downloadCollectionsJSON = async () => {
    try {
      setIsDownloading(true);

      const timestamp = new Date().getTime();
      const fileName = `collection_${timestamp}.json`;

      const collectionData = {
        collectionId: timestamp,
        createdAt: new Date().toISOString(),
        recording: {
          startTime,
          endTime,
          duration: duration,
          durationFormatted: formatDuration(duration),
          videoPath,
        },
        location: {
          distanceKm: parseFloat(distance.toFixed(2)),
          distanceMiles: parseFloat((distance * 0.621371).toFixed(2)),
        },
        performance: {
          cpu: {
            average: avgCPU,
            highest: highestCPU,
            unit: 'percentage',
          },
          memory: {
            average: parseFloat(avgMemory.toFixed(2)),
            highest: parseFloat(highestMemory.toFixed(2)),
            unit: 'GB',
          },
        },
        metadata: {
          platform: Platform.OS,
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
        },
      };

      const filePath = Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/${fileName}`
        : `${RNFS.DownloadDirectoryPath}/${fileName}`;

      await RNFS.writeFile(
        filePath,
        JSON.stringify(collectionData, null, 2),
        'utf8'
      );

      setIsDownloading(false);

      const folderName = Platform.OS === 'ios' ? 'Documents' : 'Downloads';

      Alert.alert(
        'Collection Exported',
        `Your collection data has been successfully exported to ${folderName} folder.\n\nFile: ${fileName}`,
        [
          {
            text: 'OK',
            onPress: () => console.log('Collection JSON downloaded:', fileName),
          },
        ]
      );
    } catch (error) {
      console.error('Error downloading collection JSON:', error);
      setIsDownloading(false);
      Alert.alert(
        'Export Failed',
        'Failed to export collection data. Please try again.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successIcon}>
          <Text style={styles.checkmark}>✓</Text>
        </View>

        <Text style={styles.title}>Collection Complete!</Text>
        <Text style={styles.subtitle}>
          Your road patrol data has been saved successfully to the photo library.
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>🕐</Text>
                <Text style={styles.statLabel}>Start Time</Text>
              </View>
              <Text style={styles.statValue}>{startTime}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>🕐</Text>
                <Text style={styles.statLabel}>End Time</Text>
              </View>
              <Text style={styles.statValue}>{endTime}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>↔</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <Text style={styles.statValue}>{distance.toFixed(1)} kms</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>⏱</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              <Text style={styles.statValue}>{formatDuration(duration)}</Text>
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
              <Text style={styles.statValue}>{avgMemory.toFixed(1)} GB</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Highest Memory Load</Text>
              <Text style={styles.statValue}>{highestMemory.toFixed(1)} GB</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[
              styles.viewCollectionsButton,
              isDownloading && styles.buttonDisabled,
            ]}
            onPress={downloadCollectionsJSON}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#14B8A6" />
                <Text style={styles.viewCollectionsText}>DOWNLOADING...</Text>
              </View>
            ) : (
              <Text style={styles.viewCollectionsText}>VIEW COLLECTIONS</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToHomeButton}
            onPress={() => {
              navigation.navigate('Home');
            }}
          >
            <Text style={styles.backToHomeText}>BACK TO HOME</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 30,
    width: '100%',
    maxWidth: 500,
  },
  viewCollectionsButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#14B8A6',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewCollectionsText: {
    color: '#14B8A6',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  backToHomeButton: {
    flex: 1,
    backgroundColor: '#14B8A6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  backToHomeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default SummaryScreen;

