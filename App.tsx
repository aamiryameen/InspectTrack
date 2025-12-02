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
import { LogBox } from 'react-native';

// Lazy load Firebase modules to avoid initialization errors
let firebaseAppModule: any = null;
let crashlyticsModule: any = null;

const getFirebaseApp = () => {
  if (!firebaseAppModule) {
    try {
      firebaseAppModule = require('@react-native-firebase/app').default;
    } catch (e) {
      console.warn('Failed to load Firebase App module:', e);
    }
  }
  return firebaseAppModule;
};

const getCrashlytics = () => {
  if (!crashlyticsModule) {
    try {
      crashlyticsModule = require('@react-native-firebase/crashlytics').default;
    } catch (e) {
      console.warn('Failed to load Crashlytics module:', e);
    }
  }
  return crashlyticsModule;
};

// Helper function to test Crashlytics (expose globally for testing)
const testCrashlytics = () => {
  try {
    const firebaseApp = getFirebaseApp();
    const crashlytics = getCrashlytics();
    
    if (firebaseApp && crashlytics) {
      const apps = firebaseApp.getApps();
      if (apps && apps.length > 0) {
        const testError = new Error('Manual test error - ' + new Date().toISOString());
        crashlytics().recordError(testError);
        crashlytics().log('Manual test error sent');
        console.log('✅ Test error sent to Crashlytics');
        return true;
      }
    }
    console.error('❌ Firebase or Crashlytics not initialized');
    return false;
  } catch (e) {
    console.error('❌ Error testing Crashlytics:', e);
    return false;
  }
};

// Expose test function globally for debugging
try {
  // @ts-ignore - global is available in React Native runtime
  const globalObj = typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {});
  if (globalObj) {
    (globalObj as any).testCrashlytics = testCrashlytics;
  }
} catch (e) {
  // Ignore if global is not available
}

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

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to Crashlytics (only if Firebase is initialized)
    try {
      const firebaseApp = getFirebaseApp();
      if (firebaseApp) {
        const apps = firebaseApp.getApps();
        if (apps && apps.length > 0) {
          // Only load Crashlytics if Firebase is already initialized
          const crashlytics = getCrashlytics();
          if (crashlytics) {
            try {
              crashlytics().recordError(error);
              crashlytics().log('Error Boundary caught an error');
              crashlytics().setAttribute('errorBoundary', 'true');
              if (errorInfo.componentStack) {
                crashlytics().log(`Component Stack: ${errorInfo.componentStack}`);
              }
            } catch (crashlyticsError) {
              console.error('Error calling Crashlytics methods:', crashlyticsError);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to log error to Crashlytics:', e);
    }
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render a custom fallback UI here
      return null; // Or return a custom error screen
    }

    return this.props.children;
  }
}

const App = () => {
  const [firebaseReady, setFirebaseReady] = useState(false);
  LogBox.ignoreAllLogs()

  useEffect(() => {
    // Set up global error handlers for unhandled errors
    const errorHandler = (error: Error, isFatal: boolean) => {
      try {
        const firebaseApp = getFirebaseApp();
        const crashlytics = getCrashlytics();
        
        if (firebaseApp && crashlytics) {
          const apps = firebaseApp.getApps();
          if (apps && apps.length > 0) {
            crashlytics().recordError(error);
            crashlytics().log(`Unhandled ${isFatal ? 'fatal' : 'non-fatal'} error: ${error.message}`);
            crashlytics().setAttribute('error_type', isFatal ? 'fatal' : 'non-fatal');
          }
        }
      } catch (e) {
        console.error('Failed to log error to Crashlytics:', e);
      }
      console.error('Global error handler:', error, isFatal);
    };

    // Handle unhandled promise rejections
    const rejectionHandler = (reason: any) => {
      try {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        const firebaseApp = getFirebaseApp();
        const crashlytics = getCrashlytics();
        
        if (firebaseApp && crashlytics) {
          const apps = firebaseApp.getApps();
          if (apps && apps.length > 0) {
            crashlytics().recordError(error);
            crashlytics().log(`Unhandled promise rejection: ${error.message}`);
            crashlytics().setAttribute('error_type', 'promise_rejection');
          }
        }
      } catch (e) {
        console.error('Failed to log promise rejection to Crashlytics:', e);
      }
      console.error('Unhandled promise rejection:', reason);
    };

    // Set up error handlers
    const ErrorUtils = require('react-native').ErrorUtils;
    if (ErrorUtils) {
      const originalHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        errorHandler(error, isFatal || false);
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    // Handle unhandled promise rejections (if available)
    try {
      // @ts-ignore - global is available in React Native runtime
      const globalObj = typeof global !== 'undefined' ? global : {};
      if (globalObj && (globalObj as any).HermesInternal) {
        // Hermes engine
        const originalPromiseRejectionHandler = (globalObj as any).onunhandledrejection;
        (globalObj as any).onunhandledrejection = (event: any) => {
          rejectionHandler(event.reason);
          if (originalPromiseRejectionHandler) {
            originalPromiseRejectionHandler(event);
          }
        };
      }
    } catch (e) {
      // Ignore if global is not available
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  useEffect(() => {
    // Initialize Firebase and setup Crashlytics
    const initializeFirebase = async () => {
      try {
        // React Native Firebase should auto-initialize from GoogleService-Info.plist
        // First, wait for Firebase App to be initialized
        let retries = 0;
        const maxRetries = 30; // Increased retries
        
        // Step 1: Wait for Firebase App to be initialized
        while (retries < maxRetries) {
          try {
            const firebaseApp = getFirebaseApp();
            if (firebaseApp) {
              const apps = firebaseApp.getApps();
              if (apps && apps.length > 0) {
                console.log('Firebase App initialized, now loading Crashlytics...');
                // Firebase is initialized, now we can safely load Crashlytics
                break;
              }
            }
          } catch (e) {
            // Firebase not ready yet, continue waiting
          }
          
          await new Promise<void>(resolve => setTimeout(() => resolve(), 100));
          retries++;
        }

        // Step 2: Now that Firebase is initialized, load and setup Crashlytics
        try {
          const firebaseApp = getFirebaseApp();
          if (!firebaseApp) {
            console.warn('Firebase App module not available');
            return;
          }
          const apps = firebaseApp.getApps();
          if (!apps || apps.length === 0) {
            console.warn('Firebase not initialized after waiting');
            return;
          }

          // Now safely load Crashlytics (Firebase is already initialized)
          const crashlytics = getCrashlytics();
          if (crashlytics) {
            // Setup Crashlytics - IMPORTANT: Enable in debug mode for testing
            crashlytics().setCrashlyticsCollectionEnabled(true);
            
            // Enable debug mode to see crashes in development
            // This is important for testing Crashlytics
            if (__DEV__) {
              crashlytics().log('Crashlytics enabled in DEBUG mode');
            }
            
            crashlytics().log('App started');
            crashlytics().setAttribute('app_version', '0.0.1');
            crashlytics().setAttribute('platform', 'ios');
            crashlytics().setAttribute('build_type', __DEV__ ? 'debug' : 'release');
            
            setFirebaseReady(true);
            console.log('Firebase and Crashlytics initialized successfully');
            console.log('Crashlytics collection enabled:', true);
            
            // Log that Crashlytics is ready
            crashlytics().log('Crashlytics setup complete');
            
            // Verify Crashlytics is working by sending a test log
            crashlytics().log('Crashlytics is active and ready to capture crashes');
            
            // IMPORTANT: Send a test non-fatal error immediately to verify Crashlytics is working
            // This should appear in Firebase Console within a few minutes
            try {
              const testError = new Error('Test error to verify Crashlytics integration - ' + new Date().toISOString());
              crashlytics().recordError(testError);
              crashlytics().log('Test error sent to Crashlytics - check Firebase console');
              crashlytics().setAttribute('test_sent', 'true');
              crashlytics().setAttribute('test_timestamp', new Date().toISOString());
              console.log('✅ Test error sent to Crashlytics - should appear in Firebase console within 5-10 minutes');
              console.log('✅ Check Firebase Console > Crashlytics > Issues tab');
            } catch (e) {
              console.error('❌ Failed to send test error:', e);
            }
            
            // Also verify we can check if collection is enabled
            try {
              const isEnabled = crashlytics().isCrashlyticsCollectionEnabled();
              console.log('✅ Crashlytics collection enabled:', isEnabled);
              crashlytics().log(`Crashlytics collection status: ${isEnabled}`);
            } catch (e) {
              console.error('❌ Failed to check Crashlytics status:', e);
            }
            
            // For testing: Uncomment the line below to force a test crash
            // WARNING: This will crash the app! Only use for testing.
            // After crash, restart the app and check Firebase console in 5-10 minutes
            // crashlytics().crash();
          }
        } catch (e) {
          console.error('Error setting up Crashlytics:', e);
        }
      } catch (error) {
        console.error('Error initializing Firebase/Crashlytics:', error);
      }
    };

    // Delay initialization slightly to ensure native modules are ready
    setTimeout(() => {
      initializeFirebase();
    }, 1000);
  }, []);

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};

export default App;