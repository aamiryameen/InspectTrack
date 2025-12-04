import React, { useEffect, ErrorInfo, ReactNode, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import HomeScreen from './src/screens/HomeScreen';
import RecordingScreen from './src/screens/RecordingScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import DownloadFileScreen from './src/screens/DownloadFileScreen';
import { store } from './src/store/store';
import { RecordingSettings } from './src/utils/settingsUtils';
import { LogBox, Button, View } from 'react-native';
import { initFirebase } from '../InspectTrack/src/utils/firebaseInit';
import { initCrashlytics } from '../InspectTrack/src/utils/crashlyticsSetup';

import crashlytics from '@react-native-firebase/crashlytics';

export type RootStackParamList = {
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
  DownloadFile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const handleCrashTest = () => {
  crashlytics().log("Testing Crash");
  crashlytics().crash(); // 💥 Force crash
};

const App = () => {

  LogBox.ignoreAllLogs()

  useEffect(() => {
    initFirebase();      // Initialize Firebase in React Native
    initCrashlytics();  
  }, []);
  
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#FFF',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
          />
          <Stack.Screen
            name="Recording"
            component={RecordingScreen}
          />
          <Stack.Screen
            name="Summary"
            component={SummaryScreen}
          />
          <Stack.Screen
            name="DownloadFile"
            component={DownloadFileScreen}
          />
        </Stack.Navigator>
   
      </NavigationContainer>
    </Provider>
  );
};

export default App;