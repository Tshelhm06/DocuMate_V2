import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import { colors, radius } from '../../theme';
import { setBoolSetting } from '../../db/settingsRepo';

export default function WelcomeScreen({ onStart }) {
  const start = async () => {
    try {
      await setBoolSetting('seen_welcome', true);
    } catch (_) {
      // Not important enough to block the user.
    }
    onStart();
  };

  return (
    <Screen>
      <View style={styles.center}>
        <Image source={require('../../../assets/logo.png')} style={styles.logo} accessibilityLabel="DocuMate logo" />
        <Text style={styles.name}>DocuMate</Text>
        <Text style={styles.tagline}>Your documents, quietly organized.</Text>
      </View>

      <View style={styles.bottom}>
        <Pressable onPress={start} style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Text style={styles.buttonText}>Get started</Text>
        </Pressable>
        <Text style={styles.motto}>Secure. Simple. Yours.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logo: { width: 150, height: 150, resizeMode: 'contain' },
  name: { fontSize: 38, fontWeight: '700', color: colors.textPrimary, marginTop: 22 },
  tagline: { fontSize: 16, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  bottom: { paddingHorizontal: 32, paddingBottom: 48, alignItems: 'center' },
  button: {
    alignSelf: 'stretch',
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: '600' },
  motto: { marginTop: 22, fontSize: 14, color: colors.primary, fontWeight: '500' },
});
