import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import PinPad from '../components/PinPad';
import { colors } from '../theme';
import { useLock } from '../context/LockContext';
import { useAuth } from '../context/AuthContext';
import {
  authenticateWithBiometrics,
  biometricStatus,
  getLockoutRemaining,
  verifyPin,
} from '../services/appLock';
import { wipeOfflineData } from '../services/offlineData';
import { removeFile } from '../services/fileStorage';
import { cancelAllNotifications } from '../services/notifications';
import { PIN_LENGTH } from '../utils/constants';

/**
 * Shown on every app open when App lock is on.
 * Biometrics are tried first; the PIN pad is always available as the fallback.
 */
export default function LockScreen() {
  const { biometric, unlock, removeLock } = useLock();
  const { session, signOut } = useAuth();

  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [wrong, setWrong] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [bio, setBio] = useState({ available: false, label: 'Biometrics' });
  const checking = useRef(false);
  const prompting = useRef(false);

  // Is biometrics available? Then try it as soon as the screen appears.
  useEffect(() => {
    (async () => {
      try {
        const status = await biometricStatus();
        setBio(status);
        setWaitSeconds(await getLockoutRemaining());
        if (biometric && status.available) tryBiometrics();
      } catch (_) {
        // The PIN pad still works if the status checks fail.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-prompt when the app comes back to the foreground while still locked.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && biometric && bio.available && !prompting.current) {
        setTimeout(tryBiometrics, 300);
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometric, bio.available]);

  // Count down the wait after too many wrong PINs.
  useEffect(() => {
    if (waitSeconds <= 0) return undefined;
    const t = setTimeout(() => setWaitSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [waitSeconds]);

  const tryBiometrics = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      const result = await authenticateWithBiometrics('Unlock DocuMate');
      if (result.success) unlock();
    } finally {
      prompting.current = false;
    }
  }, [unlock]);

  const handlePin = async (next) => {
    setPin(next);
    setWrong(false);
    setMessage('');
    if (next.length < PIN_LENGTH || checking.current) return;

    checking.current = true;
    try {
      const result = await verifyPin(next);
      if (result.ok) {
        unlock();
        return;
      }
      setWrong(true);
      if (result.lockedSeconds > 0) {
        setWaitSeconds(result.lockedSeconds);
        setMessage('Too many wrong attempts.');
      } else if (result.attemptsLeft !== null) {
        setMessage(`Wrong PIN. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} left before a short wait.`);
      } else {
        setMessage('Wrong PIN.');
      }
      setTimeout(() => {
        setPin('');
        setWrong(false);
      }, 450);
    } catch (_) {
      // Never leave the pad stuck with four dots if checking the PIN fails.
      setMessage('Could not check the PIN. Please try again.');
      setPin('');
    } finally {
      checking.current = false;
    }
  };

  const forgotPin = () => {
    const offline = Boolean(session?.guest); // only the guest space is wiped; accounts keep their documents
    Alert.alert(
      'Forgot your PIN?',
      offline
        ? 'Your PIN cannot be recovered. To get back in, the app lock is removed and every document saved in offline mode is permanently deleted.'
        : 'Your PIN cannot be recovered. To get back in, you will be logged out and the app lock is removed. Log in again with your email and password. Your documents stay safe on this phone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: offline ? 'Delete and reset' : 'Log out and reset',
          style: 'destructive',
          onPress: async () => {
            try {
              if (offline) {
                const files = await wipeOfflineData();
                await Promise.all(files.map(removeFile));
                await cancelAllNotifications();
              }
              await signOut();
              await removeLock();
            } catch (_) {
              Alert.alert('Could not reset', 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const showBio = biometric && bio.available;

  return (
    <Screen>
      <View style={styles.top}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.title}>DocuMate is locked</Text>
        <Text style={styles.subtitle}>
          {waitSeconds > 0 ? `Try again in ${waitSeconds}s` : 'Enter your PIN to continue'}
        </Text>
        <Text style={[styles.message, { opacity: message ? 1 : 0 }]} accessibilityLiveRegion="polite">
          {message || ' '}
        </Text>
      </View>

      <View style={styles.pad}>
        <PinPad value={pin} onChange={handlePin} disabled={waitSeconds > 0} error={wrong} />
      </View>

      <View style={styles.footer}>
        {showBio ? (
          <Pressable onPress={tryBiometrics} hitSlop={10} accessibilityRole="button">
            <Text style={styles.link}>{`Use ${bio.label}`}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={forgotPin} hitSlop={10} accessibilityRole="button" style={{ marginTop: showBio ? 16 : 0 }}>
          <Text style={[styles.link, { color: colors.textSecondary, fontWeight: '400' }]}>Forgot PIN?</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', paddingTop: 36, paddingHorizontal: 28 },
  logo: { width: 84, height: 84, resizeMode: 'contain' },
  title: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, marginTop: 14 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  message: { fontSize: 13.5, color: colors.danger, marginTop: 10, textAlign: 'center', minHeight: 20 },
  pad: { flex: 1, justifyContent: 'center', paddingBottom: 6 },
  footer: { alignItems: 'center', paddingBottom: 30 },
  link: { fontSize: 16, fontWeight: '600', color: colors.primary },
});