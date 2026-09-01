/**
 * Login de identidad — port de `IdentitySetupView.swift`.
 *
 * Se muestra una sola vez, tras el splash. Elegir email activa Profile
 * Anywhere (server-side, cross-canal); seguir con un dyid deja el perfil
 * client-side de afinidades, que es el que alimenta la web.
 */

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useDy } from '../dy/DyProvider';
import { theme } from '../theme';

export const IdentitySetupScreen: React.FC<{ onDone: () => void }> = ({
  onDone,
}) => {
  const dy = useDy();
  const [email, setEmail] = useState('');
  const [dyid, setDyid] = useState('');

  const continueWithEmail = (): void => {
    dy.setIdentity('profileAnywhere', 'email', email);
    void dy.reportLogin();
    onDone();
  };

  const continueWithDyid = (): void => {
    dy.setIdentity('affinityProfile', 'id', dyid);
    onDone();
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Who's shopping?</Text>
      <Text style={styles.subtitle}>
        Elige cómo quieres que Dynamic Yield resuelva tu perfil. Puedes
        cambiarlo luego desde Profile.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile Anywhere</Text>
        <Text style={styles.cardBody}>
          Server-side, por email. Trae el perfil que ya tengas en cualquier
          canal.
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          placeholderTextColor={theme.color.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
        />
        <Pressable
          onPress={continueWithEmail}
          disabled={!email.trim()}
          style={({ pressed }) => [
            styles.primary,
            !email.trim() && styles.disabled,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Continue with email</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Affinity Profile</Text>
        <Text style={styles.cardBody}>
          Client-side, por dyid. Déjalo vacío para navegar con el dyid anónimo
          que asigne DY, o pega uno de la web para ver ese mismo perfil.
        </Text>
        <TextInput
          value={dyid}
          onChangeText={setDyid}
          placeholder="dyid (opcional)"
          placeholderTextColor={theme.color.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Pressable
          onPress={continueWithDyid}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>
            {dyid.trim()
              ? 'Continue with this dyid'
              : 'Continue as a new shopper'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  content: { padding: theme.space.xl, gap: theme.space.lg },
  title: {
    fontSize: theme.font.display,
    fontWeight: '800',
    color: theme.color.text,
  },
  subtitle: {
    fontSize: theme.font.body,
    color: theme.color.textMuted,
    lineHeight: 21,
  },
  card: {
    padding: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceAlt,
    gap: theme.space.md,
  },
  cardTitle: {
    fontSize: theme.font.section,
    fontWeight: '700',
    color: theme.color.text,
  },
  cardBody: {
    fontSize: theme.font.label,
    color: theme.color.textMuted,
    lineHeight: 18,
  },
  input: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    fontSize: theme.font.body,
    color: theme.color.text,
  },
  primary: {
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    backgroundColor: theme.color.brand,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: theme.font.body },
  secondary: {
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    backgroundColor: theme.color.surface,
  },
  secondaryText: {
    color: theme.color.text,
    fontWeight: '700',
    fontSize: theme.font.body,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
