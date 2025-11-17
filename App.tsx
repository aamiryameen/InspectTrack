import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VideoRecorder from './src/components/VideoRecorder';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <VideoRecorder />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default App;