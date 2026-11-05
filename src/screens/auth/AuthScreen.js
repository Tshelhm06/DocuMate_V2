import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { colors, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useLock } from '../../context/LockContext';
import { friendlyAuthError } from '../../services/auth';
import { isFirebaseConfigured } from '../../config/firebase';
import { countOfflineDocuments, adoptOfflineData } from '../../services/offlineData';
import { validateEmail, validateName, validatePassword } from '../../utils/validation';

export default function AuthScreen() {
  const { signIn, signUp, continueOffline, resetPassword, lastAccount } = useAuth();
  const { markUnlocked } = useLock();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const emailRef = useRef(null);
  const passRef = useRef(null);
  const confirmRef = useRef(null);

  const switchMode = (next) => {
    setMode(next);
    setErrors({});
  };

  // Documents saved earlier in "Continue offline" mode can move into the new account.
  const offerOfflineTransfer = async (uid) => {
    try {
      const count = await countOfflineDocuments();
      if (count === 0) return;
      Alert.alert(
        'Add offline documents?',
        `You have ${count} document${count === 1 ? '' : 's'} saved in offline mode. Add ${count === 1 ? 'it' : 'them'} to this account?`,
        [
          { text: 'No, keep separate', style: 'cancel' },
          { text: 'Yes, add', onPress: () => adoptOfflineData(uid).catch(() => {}) },
        ]
      );
    } catch (_) {
      // Optional step.
    }
  };

  const submit = async () => {
    const next = {};
    if (mode === 'signup') next.name = validateName(name);
    next.email = validateEmail(email);
    next.password = mode === 'signup' ? validatePassword(password) : password ? null : 'Enter your password';
    if (mode === 'signup') next.confirm = confirm !== password ? 'Passwords do not match' : null;

    const filtered = Object.fromEntries(Object.entries(next).filter(([, v]) => v));
    setErrors(filtered);
    if (Object.keys(filtered).length > 0) return;

    setBusy(true);
    try {
      const user = mode === 'signup' ? await signUp({ name, email, password }) : await signIn({ email, password });
      markUnlocked();
      offerOfflineTransfer(user.uid);
    } catch (e) {
      Alert.alert(mode === 'signup' ? 'Could not create account' : 'Could not log in', friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: 'Enter your email first' });
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email);
      Alert.alert('Check your email', `We sent a password reset link to ${email.trim()}.`);
    } catch (e) {
      Alert.alert('Could not send reset email', friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const goOffline = async (asAccount) => {
    try {
      await continueOffline(asAccount);
      markUnlocked();
    } catch (_) {
      Alert.alert('Could not continue offline', 'Please try again.');
    }
  };

  const accountLabel = lastAccount ? lastAccount.name.trim().split(' ')[0] || lastAccount.email : '';

  const isLogin = mode === 'login';

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{isLogin ? 'Welcome back' : 'Create your account'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Pick up where you left off.' : 'Keep your documents organized from day one.'}
          </Text>

          <View style={styles.tabs}>
            <Tab label="LOGIN" active={isLogin} onPress={() => switchMode('login')} />
            <Tab label="SIGN UP" active={!isLogin} onPress={() => switchMode('signup')} />
          </View>

          {!isFirebaseConfigured ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Firebase is not configured yet, so login is unavailable. Fill in the .env file, or use "Continue offline".
              </Text>
            </View>
          ) : null}

          {!isLogin ? (
            <TextField
              label="Full name"
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              error={errors.name}
            />
          ) : null}

          <TextField
            inputRef={emailRef}
            label="Email address"
            value={email}
            onChangeText={setEmail}
            placeholder="student@example.com"
            keyboardType="email-address"
            autoComplete="email"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passRef.current?.focus()}
            error={errors.email}
          />

          <TextField
            inputRef={passRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder={isLogin ? 'Your password' : 'Create a password'}
            secure
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            returnKeyType={isLogin ? 'done' : 'next'}
            onSubmitEditing={() => (isLogin ? submit() : confirmRef.current?.focus())}
            error={errors.password}
          />

          {!isLogin ? (
            <TextField
              inputRef={confirmRef}
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat your password"
              secure
              returnKeyType="done"
              onSubmitEditing={submit}
              error={errors.confirm}
            />
          ) : (
            <Pressable onPress={forgotPassword} style={styles.forgot} hitSlop={8} accessibilityRole="button">
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          )}

          <Button
            title={isLogin ? 'Login' : 'Create account'}
            onPress={submit}
            loading={busy}
            style={{ marginTop: 14 }}
          />

          {isLogin ? (
            <>
              <Text style={styles.or}>or</Text>
              {lastAccount ? (
                <>
                  <Button
                    title={`Continue offline as ${accountLabel}`}
                    variant="secondary"
                    onPress={() => goOffline(true)}
                    disabled={busy}
                  />
                  <Text style={styles.note}>Opens your documents saved on this phone. No internet needed.</Text>
                  <Pressable onPress={() => goOffline(false)} style={styles.switchLink} accessibilityRole="button">
                    <Text style={styles.forgotText}>Use guest mode instead (separate, empty)</Text>
                  </Pressable>
                </>
              ) : (
                <Button title="Continue offline" variant="secondary" onPress={() => goOffline(false)} disabled={busy} />
              )}
            </>
          ) : (
            <>
              <Text style={styles.note}>Your documents stay available offline.</Text>
              <Pressable onPress={() => switchMode('login')} style={styles.switchLink} accessibilityRole="button">
                <Text style={styles.forgotText}>Already have an account? Login</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Tab({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 26, paddingTop: 30, paddingBottom: 40 },
  title: { fontSize: 34, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 6, marginBottom: 26 },
  tabs: { flexDirection: 'row', marginBottom: 26 },
  tab: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.pill, backgroundColor: colors.secondary, marginRight: 12 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  tabTextActive: { color: colors.white },
  notice: { backgroundColor: colors.tint, borderRadius: radius.sm, padding: 12, marginBottom: 18 },
  noticeText: { fontSize: 13, color: colors.primaryDark, lineHeight: 18 },
  forgot: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  or: { textAlign: 'center', color: colors.textSecondary, marginVertical: 16 },
  note: { textAlign: 'center', color: colors.textSecondary, marginTop: 22, fontSize: 14 },
  switchLink: { alignSelf: 'center', marginTop: 28 },
});