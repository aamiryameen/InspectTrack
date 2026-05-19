import firebase from '@react-native-firebase/app';


export const initFirebase = () => {
  try {
    // For React Native Firebase, initialization happens automatically
    // when google-services.json is in place. We just need to verify it's ready.
    // DO NOT call initializeApp() manually - it's already initialized by the native side.
    const app = firebase.app();
    console.log("🔥 Firebase app ready:", app.name);
    return true;
  } catch (error) {
    console.error("🔥 Firebase initialization error:", error);
    // Don't throw - let the app continue even if Firebase check fails
    return false;
  }
};
