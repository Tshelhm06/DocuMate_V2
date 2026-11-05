import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import SettingRow from '../../components/SettingRow';
import PinFlowModal from '../../components/PinFlowModal';
import { colors, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useLock } from '../../context/LockContext';
import {
  authenticateWithBiometrics,
  biometricStatus,
  disableLock,
  savePin,
  setBiometricEnabled,
} from '../../services/appLock';
import { friendlyAuthError } from '../../services/auth';

export default function SecurityScreen({ navigation }) {
  const { session, resetPassword } = useAuth();
  const { enabled, biometric, reload, runWithoutLock } = useLock();
  const [bio, setBio] = useState({ available: false, hasHardware: false, enrolled: false, label: 'Biometrics' });
  const [pinModal, setPinModal] = useState(null); // null | 'setup' | 'change'

  useEffect(() => {
    biometricStatus().then(setBio);
  }, []);

  // App lock on / off 
  const toggleLock = (value) => {
    if (value) {
      setPinModal('setup');
      return;
    }
    Alert.alert('Turn off app lock?', 'DocuMate will open without a PIN or biometrics.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Turn off',
        style: 'destructive',
        onPress: async () => {
          await disableLock();
          await reload();
        },
      },
    ]);
  };

  const askToUseBiometrics = async () => {
    const status = await biometricStatus();
    setBio(status);
    if (!status.available) return;
    Alert.alert(`Use ${status.label}?`, `Unlock DocuMate with ${status.label.toLowerCase()} instead of typing the PIN each time. The PIN always stays as a backup.`, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Use it', onPress: () => toggleBiometrics(true) },
    ]);
  };

  const onPinComplete = async (pin) => {
    const wasEnabled = enabled;
    try {
      await savePin(pin);
      setPinModal(null);
      await reload();
      if (!wasEnabled) setTimeout(askToUseBiometrics, 400);
      else Alert.alert('PIN changed', 'Your new PIN is ready to use.');
    } catch (e) {
      Alert.alert('Could not save PIN', 'Please try again.');
    }
  };

  // Biometrics
  const toggleBiometrics = async (value) => {
    if (!value) {
      await setBiometricEnabled(false);
      await reload();
      return;
    }
    const result = await runWithoutLock(() => authenticateWithBiometrics(`Confirm to use ${bio.label.toLowerCase()}`));
    if (result.success) {
      await setBiometricEnabled(true);
      await reload();
    }
  };

  // Password 
  const sendReset = () => {
    Alert.alert('Reset password', `We will email a reset link to ${session.email}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send link',
        onPress: async () => {
          try {
            await resetPassword(session.email);
            Alert.alert('Check your email', 'A password reset link is on its way.');
          } catch (e) {
            Alert.alert('Could not send email', friendlyAuthError(e));
          }
        },
      },
    ]);
  };

  const bioSubtitle = !bio.hasHardware
    ? 'Not supported on this device'
    : !bio.enrolled
    ? 'Set up fingerprint or Face ID in your phone settings first'
    : `Unlock with ${bio.label.toLowerCase()}`;

  return (
    <Screen>
      <Header title="Security" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.group}>
          <SettingRow
            title="App lock"
            subtitle="Ask for a PIN or biometrics every time DocuMate opens"
            switchValue={enabled}
            onSwitchChange={toggleLock}
          />
          <SettingRow
            title={`Use ${bio.label.toLowerCase()}`}
            subtitle={bioSubtitle}
            switchValue={enabled && biometric}
            onSwitchChange={toggleBiometrics}
            switchDisabled={!enabled || !bio.available}
          />
          <SettingRow
            title="Change PIN"
            subtitle={enabled ? 'Choose a new PIN' : 'Turn on app lock first'}
            onPress={enabled ? () => setPinModal('change') : undefined}
            last
          />
        </View>

        <Text style={styles.note}>
          Your PIN is kept in the phone’s secure storage and only a scrambled version is saved. After several wrong tries
          the keypad pauses for a while. If you forget your PIN you will have to log out to reset the lock.
        </Text>

        <Text style={styles.section}>Account</Text>
        <View style={styles.group}>
          {session.offline ? (
            <SettingRow title="Password" subtitle="Offline mode has no account. Log out and sign up to create one." last />
          ) : (
            <SettingRow title="Reset password" subtitle={`Email a reset link to ${session.email}`} onPress={sendReset} last />
          )}
        </View>
      </ScrollView>

      <PinFlowModal
        visible={pinModal !== null}
        mode={pinModal === 'change' ? 'change' : 'setup'}
        onClose={() => setPinModal(null)}
        onComplete={onPinComplete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 18 },
  note: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20, marginTop: 14, marginHorizontal: 4 },
  section: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginTop: 28, marginBottom: 12 },
});