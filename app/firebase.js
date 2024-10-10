// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getStorage } from "firebase/storage"; // Import getStorage

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWEsym8ryD_oUrIpp7hnWEi4BnZfrdRtc",
  authDomain: "invoice-gen-d679c.firebaseapp.com",
  projectId: "invoice-gen-d679c",
  storageBucket: "invoice-gen-d679c.appspot.com",
  messagingSenderId: "174567839812",
  appId: "1:174567839812:web:8343b25fa6e09bb99d8411",
  measurementId: "G-TH878LC5XR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics if supported
let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

// Initialize Firebase Storage
const storage = getStorage(app); // Initialize the storage

// Export storage for use in your application
export { storage };
