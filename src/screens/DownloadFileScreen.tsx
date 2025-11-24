import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const DownloadFileScreen: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedFiles, setDownloadedFiles] = useState<string[]>([]);

  // Create dummy JSON data
  const createDummyJSON = () => {
    return {
      appName: 'InspectTrack',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {
        inspections: [
          {
            id: 1,
            title: 'Building Inspection A',
            date: '2024-11-21',
            status: 'completed',
            location: { latitude: 37.7749, longitude: -122.4194 },
            notes: 'All systems operational',
          },
          {
            id: 2,
            title: 'Building Inspection B',
            date: '2024-11-20',
            status: 'pending',
            location: { latitude: 34.0522, longitude: -118.2437 },
            notes: 'Follow-up required',
          },
          {
            id: 3,
            title: 'Building Inspection C',
            date: '2024-11-19',
            status: 'completed',
            location: { latitude: 40.7128, longitude: -74.006 },
            notes: 'Minor issues found',
          },
        ],
        recordings: [
          {
            id: 101,
            inspectionId: 1,
            duration: 120,
            resolution: '1080p',
            fps: 30,
            fileSize: '45MB',
          },
          {
            id: 102,
            inspectionId: 2,
            duration: 180,
            resolution: '4K',
            fps: 60,
            fileSize: '120MB',
          },
        ],
        settings: {
          camera: {
            defaultResolution: '1080p',
            defaultFPS: 30,
            hdrEnabled: false,
          },
          storage: {
            autoBackup: true,
            compressionLevel: 'medium',
          },
        },
      },
    };
  };

  const downloadJSON = async () => {
    try {
      setIsDownloading(true);

      // Create dummy JSON data
      const jsonData = createDummyJSON();
      const jsonString = JSON.stringify(jsonData, null, 2);

      // Create filename with timestamp
      const timestamp = new Date().getTime();
      const fileName = `InspectTrack_Export_${timestamp}.json`;

      // Define file path based on platform
      const filePath =
        Platform.OS === 'ios'
          ? `${RNFS.DocumentDirectoryPath}/${fileName}`
          : `${RNFS.DownloadDirectoryPath}/${fileName}`;

      // Write JSON file
      await RNFS.writeFile(filePath, jsonString, 'utf8');

      console.log('✅ File saved to:', filePath);

      // Add to downloaded files list
      setDownloadedFiles((prev) => [...prev, fileName]);

      setIsDownloading(false);

      // On iOS, use Share API to allow users to save/share the file
      if (Platform.OS === 'ios') {
        try {
          const shareOptions = {
            title: 'Save InspectTrack Export',
            message: 'InspectTrack data exported successfully',
            url: `file://${filePath}`,
            subject: 'InspectTrack Data Export',
            type: 'application/json',
          };
          
          await Share.open(shareOptions);
          console.log('✅ File shared:', fileName);
        } catch (shareError: any) {
          if (shareError.message !== 'User did not share') {
            console.error('❌ Error sharing file:', shareError);
            Alert.alert(
              'Share Failed',
              'Failed to open share dialog. Please try again.'
            );
          }
        }
      } else {
        // On Android, file is saved to Downloads folder
        Alert.alert(
          'Export Successful',
          `Your data has been successfully exported to Downloads folder.\n\nFile: ${fileName}`,
          [
            {
              text: 'OK',
              onPress: () => console.log('✅ File downloaded:', fileName),
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Download error:', error);
      setIsDownloading(false);
      Alert.alert(
        'Export Failed',
        'Failed to export data. Please try again.'
      );
    }
  };

  const viewDownloadedFiles = async () => {
    try {
      const dirPath =
        Platform.OS === 'ios'
          ? RNFS.DocumentDirectoryPath
          : RNFS.DownloadDirectoryPath;

      const files = await RNFS.readDir(dirPath);
      const jsonFiles = files
        .filter((file) => file.name.includes('InspectTrack_Export'))
        .map((file) => `• ${file.name}`)
        .sort()
        .reverse(); // Most recent first

      if (jsonFiles.length === 0) {
        Alert.alert(
          'No Files Found',
          'No exported files found. Download a file first to see it here.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Downloaded Files',
        `Found ${jsonFiles.length} file(s):\n\n${jsonFiles.join('\n')}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Error reading files:', error);
      Alert.alert(
        'Error',
        'Could not read files. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Download Files</Text>
          <Text style={styles.subtitle}>
            Export and save your InspectTrack data as JSON files
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📦 Export Information</Text>
          <Text style={styles.infoText}>
            • JSON files will be saved to your device
          </Text>
          <Text style={styles.infoText}>
            • Files include inspection data, recordings, and settings
          </Text>
          <Text style={styles.infoText}>
            • {Platform.OS === 'ios' 
              ? 'Share dialog will open to save or share files'
              : 'Files saved to Downloads folder automatically'}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.downloadButton, isDownloading && styles.buttonDisabled]}
            onPress={downloadJSON}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.downloadButtonText}>📥 Download JSON File</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={viewDownloadedFiles}
          >
            <Text style={styles.secondaryButtonText}>📂 View Downloaded Files</Text>
          </TouchableOpacity>
        </View>

        {downloadedFiles.length > 0 && (
          <View style={styles.recentFilesCard}>
            <Text style={styles.recentFilesTitle}>Recent Downloads</Text>
            {downloadedFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <Text style={styles.fileName}>✅ {file}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>
            {Platform.OS === 'ios' ? '📱 iOS Behavior' : '🤖 Android Behavior'}
          </Text>
          <Text style={styles.infoSectionText}>
            {Platform.OS === 'ios'
              ? 'Files are created in the app\'s Documents directory. A share dialog will open allowing you to:\n• Save to Files app\n• Share via email, messages, AirDrop\n• Save to iCloud Drive\n• Copy to other apps'
              : `Files are automatically saved to:\n${RNFS.DownloadDirectoryPath}\n\nYou can access them from your Downloads folder or any file manager app.`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  downloadButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0EA5E9',
  },
  secondaryButtonText: {
    color: '#0EA5E9',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  recentFilesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentFilesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  fileItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  fileName: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  infoSectionText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
});

export default DownloadFileScreen;

