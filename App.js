import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LockProvider } from './src/context/LockContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <LockProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </LockProvider>
    </SafeAreaProvider>
  );
}
