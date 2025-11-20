import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import VideoRecorder from '../components/VideoRecorder';
import { RecordingSettings } from '../utils/settingsUtils';

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

type RecordingScreenProps = NativeStackScreenProps<RootStackParamList, 'Recording'>;

const RecordingScreen: React.FC<RecordingScreenProps> = ({ route }) => {
  const { settings, zoom } = route.params;

  console.log('📹 RecordingScreen received settings:', {
    camera: settings.camera,
    video: settings.video,
    frameRate: settings.frameRate,
    zoom,
  });

  return (
    <View style={styles.container}>
      <VideoRecorder settings={settings} zoom={zoom} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default RecordingScreen;
