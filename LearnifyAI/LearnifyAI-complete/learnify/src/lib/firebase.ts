import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY || 'AIzaSyARmsJQ2of5CfJf99stoXMxUcjqpgRIMFs',
  authDomain: 'learnify-f0a94.firebaseapp.com',
  projectId: 'learnify-f0a94',
  storageBucket: 'learnify-f0a94.appspot.com',
  messagingSenderId: '277899891871',
  appId: '1:277899891871:web:learnify'
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
// Force Google to show the account chooser popup (Choose an account)
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return {
      ok: true as const,
      user: {
        name: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        avatar: user.photoURL || undefined
      }
    };
  } catch (error: any) {
    console.error('Firebase Google Sign-In error:', error);
    // If popup was blocked or closed by user
    return {
      ok: false as const,
      error: error.message || 'Failed to sign in with Google',
      code: error.code as string
    };
  }
}

export { signInWithRedirect, signOut };
