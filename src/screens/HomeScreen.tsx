import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Recording: undefined;
  Settings: undefined;
};

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <Text style={styles.title}>InspectTrack</Text>
        <Text style={styles.subtitle}>Video Recording & Inspection</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.recordButton]}
          onPress={() => navigation.navigate('Recording')}
        >
          <View style={styles.recordIcon} />
          <Text style={styles.buttonText}>Start Recording</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.settingsButton]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
          <Text style={styles.buttonText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Configure your recording settings before starting
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
    paddingVertical: 50,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  buttonContainer: {
    paddingHorizontal: 40,
    gap: 20,
  },
  button: {
    height: 120,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 15,
  },
  recordButton: {
    backgroundColor: '#FF3B30',
  },
  settingsButton: {
    backgroundColor: '#007AFF',
  },
  recordIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  settingsIcon: {
    fontSize: 32,
    color: '#FFF',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default HomeScreen;
