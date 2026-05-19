import crashlytics from '@react-native-firebase/crashlytics';

export const initCrashlytics = () => {
  try {
    crashlytics().setCrashlyticsCollectionEnabled(true);
    crashlytics().log("Crashlytics initialized from React Native");
    
    crashlytics().log("Testing Crash");
//   crashlytics().crash(); // 💥 Force crash
  } catch (error) {
    console.error("🔥 Crashlytics initialization error:", error);
  }
};
