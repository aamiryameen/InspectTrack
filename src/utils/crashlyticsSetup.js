import crashlytics from '@react-native-firebase/crashlytics';

export const initCrashlytics = () => {
  crashlytics().setCrashlyticsCollectionEnabled(true);
  crashlytics().log("Crashlytics initialized from React Native");
  
  crashlytics().log("Testing Crash");
//   crashlytics().crash(); // 💥 Force crash
  
};
