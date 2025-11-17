import React from 'react';
import { View, StyleSheet } from 'react-native';
import VideoRecorder from '../components/VideoRecorder';

const RecordingScreen = () => {
  return (
    <View style={styles.container}>
      <VideoRecorder />
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
