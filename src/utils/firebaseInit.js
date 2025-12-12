import firebase from '@react-native-firebase/app';


export const initFirebase = () => {
  if (!firebase.apps.length) {
    firebase.initializeApp();
    console.log("🔥 Firebase initialized in React Native");
  } else {
    console.log("🔥 Firebase already initialized in React Native");
  }
};
