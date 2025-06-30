import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
//@ts-ignore
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAZblI7S4smfLe5sHfbc2VZqQLa8l2rIAc",
  authDomain: "fuze-be491.firebaseapp.com",
  projectId: "fuze-be491",
  storageBucket: "fuze-be491.firebasestorage.app",
  messagingSenderId: "1022359132799",
  appId: "1:1022359132799:web:74572056121f802ad7bd4a"
};

export const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const db = getFirestore(app);
export const storage = getStorage(app);