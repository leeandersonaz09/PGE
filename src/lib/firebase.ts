import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBk0C7zfNJm84tDYnIpsL-Wu-UoJ534jRo",
  authDomain: "pge-new.firebaseapp.com",
  projectId: "pge-new",
  storageBucket: "pge-new.firebasestorage.app",
  messagingSenderId: "1050209499978",
  appId: "1:1050209499978:web:90c09be18edbaa5bbddfb3",
  measurementId: "G-N4HBFSWE1T"
};

// Inicializa o App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Exporta Auth e Provider normalmente
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Inicializa Analytics apenas no lado do cliente e se for suportado
export const initAnalytics = async () => {
  if (typeof window !== "undefined") {
    const supported = await isSupported();
    if (supported) {
      return getAnalytics(app);
    }
  }
  return null;
};