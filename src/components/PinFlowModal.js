import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Screen from './Screen';
import PinPad from './PinPad';
import { colors } from '../theme';
import { PIN_LENGTH } from '../utils/constants';
import { verifyPin } from '../services/appLock';

const TITLES = {
  current: ['Enter your current PIN', 'To change your PIN, first confirm the one you use now.'],
  new: ['Choose a new PIN', `Pick ${PIN_LENGTH} digits you will remember. This PIN opens the app if biometrics fail.`],
  confirm: ['Confirm your PIN', 'Enter the same PIN once more.'],
};

/**
 * Full-screen PIN entry used to set up or change the app-lock PIN.
 * mode "setup":  new -> confirm
 * mode "change": current -> new -> confirm
 */
export default function PinFlowModal({ visible, mode = 'setup', onClose, onComplete }) {
  const startStep = mode === 'change' ? 'current' : 'new';
  const [step, setStep] = useState(startStep);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [wrong, setWrong] = useState(false);
  const first = useRef('');
  const busy = useRef(false);

  useEffect(() => {
    if (visible) {
      setStep(startStep);
      setPin('');
      setMessage('');
      setWrong(false);
      first.current = '';
    }
  }, [visible, startStep]);

  const flash = (text, nextStep) => {
    setWrong(true);
    setMessage(text);
    setTimeout(() => {
      setPin('');
      setWrong(false);
      if (nextStep) setStep(nextStep);
    }, 500);
  };

  const handle = async (next) => {
    setPin(next);
    setMessage('');
    if (next.length < PIN_LENGTH || busy.current) return;
    busy.current = true;
    try {
      if (step === 'current') {
        const result = await verifyPin(next);
        if (result.ok) {
          setPin('');
          setStep('new');
        } else if (result.lockedSeconds > 0) {
          flash(`Too many wrong attempts. Wait ${result.lockedSeconds} seconds and try again.`);
        } else {
          flash('Wrong PIN. Try again.');
        }
      } else if (step === 'new') {
        first.current = next;
        setPin('');
        setStep('confirm');
      } else if (next === first.current) {
        await onComplete(next);
      } else {
        first.current = '';
        flash('The PINs did not match. Start again.', 'new');
      }
    } finally {
      busy.current = false;
    }
  };

  const [title, subtitle] = TITLES[step];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <Screen>
          <View style={styles.top}>
            <Pressable onPress={onClose} hitSlop={12} style={styles.cancel} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <Text style={[styles.message, { opacity: message ? 1 : 0 }]}>{message || ' '}</Text>
          </View>
          <View style={styles.pad}>
            <PinPad value={pin} onChange={handle} error={wrong} />
          </View>
        </Screen>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 28, paddingTop: 8 },
  cancel: { alignSelf: 'flex-start', paddingVertical: 8 },
  cancelText: { color: colors.primary, fontSize: 16, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, marginTop: 18 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 8, lineHeight: 21 },
  message: { fontSize: 14, color: colors.danger, marginTop: 14, minHeight: 20 },
  pad: { flex: 1, justifyContent: 'center', paddingBottom: 30 },
});