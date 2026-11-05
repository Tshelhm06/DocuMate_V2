import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getBoolSetting } from '../db/settingsRepo';
import { Notifications } from '../services/notifications';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import AuthScreen from '../screens/auth/AuthScreen';
import MainTabs from './MainTabs';
import DocumentDetailsScreen from '../screens/documents/DocumentDetailsScreen';
import AddEditDocumentScreen from '../screens/documents/AddEditDocumentScreen';
import AddReminderScreen from '../screens/reminders/AddReminderScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import AboutScreen from '../screens/profile/AboutScreen';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

const navTheme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.accent,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

export default function RootNavigator() {
  const { ready, session } = useAuth();
  const [seenWelcome, setSeenWelcome] = useState(null);

  useEffect(() => {
    getBoolSetting('seen_welcome', false)
      .then(setSeenWelcome)
      .catch(() => setSeenWelcome(false));
  }, []);

  // Tapping an expiry notification opens the Reminders tab.
  useEffect(() => {
    if (!Notifications) return undefined; // notifications not available in this Expo Go
    let sub;
    try {
      sub = Notifications.addNotificationResponseReceivedListener(() => {
        if (navigationRef.isReady() && navigationRef.getRootState()?.routes?.some((r) => r.name === 'Main')) {
          navigationRef.navigate('Main', { screen: 'Reminders' });
        }
      });
    } catch (e) {
      return undefined;
    }
    return () => sub && sub.remove();
  }, []);

  if (!ready || seenWelcome === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        {!session ? (
          // Not signed in
          <>
            {!seenWelcome ? (
              <Stack.Screen name="Welcome">
                {(props) => <WelcomeScreen {...props} onStart={() => setSeenWelcome(true)} />}
              </Stack.Screen>
            ) : null}
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="DocumentDetails" component={DocumentDetailsScreen} />
            <Stack.Screen name="AddEditDocument" component={AddEditDocumentScreen} />
            <Stack.Screen name="AddReminder" component={AddReminderScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
