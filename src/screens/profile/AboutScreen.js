import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import { colors, radius } from '../../theme';
import { APP_VERSION } from '../../utils/constants';

export default function AboutScreen({ navigation }) {
  return (
    <Screen>
      <Header title="About DocuMate" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Image source={require('../../../assets/logo.png')} style={styles.logo} />
          <Text style={styles.name}>DocuMate</Text>
          <Text style={styles.version}>{`Version ${APP_VERSION}`}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.text}>
            A cross-platform student document manager. Keep transcripts, certificates, IDs and other important documents in one
            secure place, and never miss an expiry date.
          </Text>
          <Text style={[styles.text, { marginTop: 12 }]}>
            Built with React Native (Expo), SQLite and Firebase for CTE308: Mobile Application Development, College of Science
            and Technology, Royal University of Bhutan.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  logo: { width: 110, height: 110, resizeMode: 'contain' },
  name: { fontSize: 30, fontWeight: '700', color: colors.textPrimary, marginTop: 14 },
  version: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20 },
  text: { fontSize: 15, color: colors.textPrimary, lineHeight: 22 },
});
