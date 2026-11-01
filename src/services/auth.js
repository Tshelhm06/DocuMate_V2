import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';

const NOT_CONFIGURED =
  'Firebase is not set up yet. Fill in the .env file (see README) or use "Continue offline".';

const MESSAGES = {
  'auth/invalid-email': 'That email address does not look right.',
  'auth/missing-email': 'Enter your email address.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
  'auth/weak-password': 'Choose a stronger password (at least 6 characters).',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'No internet connection. Check your network and try again.',
  'auth/user-disabled': 'This account has been disabled.',
};

export function friendlyAuthError(error) {
  if (error?.message === NOT_CONFIGURED) return NOT_CONFIGURED;
  return MESSAGES[error?.code] || 'Something went wrong. Please try again.';
}

function requireAuth() {
  if (!isFirebaseConfigured || !auth) throw new Error(NOT_CONFIGURED);
  return auth;
}

export async function signUp({ name, email, password }) {
  const a = requireAuth();
  const cred = await createUserWithEmailAndPassword(a, email.trim(), password);
  try {
    await updateProfile(cred.user, { displayName: name.trim() });
  } catch (_) {
    // Name is also stored locally, so this is not fatal.
  }
  return cred.user;
}

export async function signIn({ email, password }) {
  const a = requireAuth();
  const cred = await signInWithEmailAndPassword(a, email.trim(), password);
  return cred.user;
}

export async function signOut() {
  if (auth) await firebaseSignOut(auth);
}


export async function updateDisplayName(name) {
  if (auth?.currentUser) {
    await updateProfile(auth.currentUser, { displayName: name.trim() });
  }
}
