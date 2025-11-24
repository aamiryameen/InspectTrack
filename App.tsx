import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import HomeScreen from './src/screens/HomeScreen';
import RecordingScreen from './src/screens/RecordingScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import DownloadFileScreen from './src/screens/DownloadFileScreen';
import { store } from './src/store/store';
import { RecordingSettings } from './src/utils/settingsUtils';

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

const App = () => {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
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
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Recording"
            component={RecordingScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Summary"
            component={SummaryScreen}
            options={{
              title: 'Summary',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="DownloadFile"
            component={DownloadFileScreen}
            options={{
              title: 'Download Files',
              headerShown: true,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
};

export default App;