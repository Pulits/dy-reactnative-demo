/**
 * Profile — port de `ProfileAnywhereView.swift` y `ActivityView.swift`.
 *
 * Reúne las cuatro cosas que hacen demostrable la integración: qué identidad
 * está activa, el perfil de afinidad que devuelve DY, el registro de lo que la
 * app ha reportado, y los controles de consentimiento y reseteo del dyid.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { affinityModeTitle } from '../dy';
import type { AffinityMode } from '../dy';
import { useDy, useDyClientInfo, useDyState } from '../dy/DyProvider';
import type { ActivityKind, AffinityProfile } from '../models';
import { theme } from '../theme';

const KIND_LABEL: Record<ActivityKind, string> = {
  pageView: 'Pageviews',
  engagement: 'Engagement',
  event: 'Eventos',
};

export const ProfileScreen: React.FC = () => {
  const dy = useDy();
  const state = useDyState();
  const client = useDyClientInfo();

  const [identityDraft, setIdentityDraft] = useState(state.identityValue);
  const [profile, setProfile] = useState<AffinityProfile>();
  const [profileError, setProfileError] = useState<string>();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [kind, setKind] = useState<ActivityKind>('pageView');

  const applyIdentity = (mode: AffinityMode, cuidType: string): void => {
    dy.setIdentity(mode, cuidType, identityDraft);
    void dy.reportLogin();
    setProfile(undefined);
    setProfileError(undefined);
  };

  const loadProfile = async (): Promise<void> => {
    setLoadingProfile(true);
    setProfileError(undefined);
    const result = await dy.fetchAffinityProfile();
    if (result.ok) {
      setProfile(result.profile);
    } else {
      setProfile(undefined);
      setProfileError(result.error);
    }
    setLoadingProfile(false);
  };

  const resetDyid = async (): Promise<void> => {
    setResetting(true);
    setProfile(undefined);
    await dy.regenerateDyid();
    setResetting(false);
  };

  const entries = dy.activityEntries(kind);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dynamic Yield</Text>
        <Row
          label="Adaptador"
          value={client.kind === 'native' ? 'SDK nativo' : 'Simulado'}
        />
        <Text style={styles.reason}>{client.reason}</Text>
        <Row label="dyid" value={state.dyid || '(sin asignar)'} mono />
        <Row label="Sesión" value={state.sessionId || '(sin asignar)'} mono />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Consentimiento activo</Text>
          <Switch
            value={state.activeConsentAccepted}
            onValueChange={value => void dy.setActiveConsent(value)}
            trackColor={{
              true: theme.color.brand,
              false: theme.color.borderStrong,
            }}
          />
        </View>

        <Pressable
          onPress={() => void resetDyid()}
          disabled={resetting}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>
            {resetting ? 'Regenerando…' : 'Regenerar dyid'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Identidad</Text>
        <Text style={styles.help}>
          Con un email se identifica al usuario (cuidType "email"). Con un dyid
          se navega anónimo a propósito: mandarlo como cuid atribuiría el
          comportamiento a un perfil identificado y rompería las afinidades.
        </Text>

        <TextInput
          value={identityDraft}
          onChangeText={setIdentityDraft}
          placeholder="email@example.com o un dyid"
          placeholderTextColor={theme.color.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => applyIdentity('affinityProfile', 'id')}
            style={({ pressed }) => [
              styles.modeButton,
              state.affinityMode === 'affinityProfile' && styles.modeButtonOn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.modeText,
                state.affinityMode === 'affinityProfile' && styles.modeTextOn,
              ]}
            >
              {affinityModeTitle('affinityProfile')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => applyIdentity('profileAnywhere', 'email')}
            style={({ pressed }) => [
              styles.modeButton,
              state.affinityMode === 'profileAnywhere' && styles.modeButtonOn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.modeText,
                state.affinityMode === 'profileAnywhere' && styles.modeTextOn,
              ]}
            >
              {affinityModeTitle('profileAnywhere')}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {affinityModeTitle(state.affinityMode)}
          </Text>
          <Pressable
            onPress={() => void loadProfile()}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.link}>Consultar</Text>
          </Pressable>
        </View>

        {loadingProfile && <ActivityIndicator color={theme.color.brand} />}
        {!!profileError && <Text style={styles.error}>{profileError}</Text>}

        {profile?.dimensions.map(dimension => (
          <View key={dimension.name} style={styles.dimension}>
            <Text style={styles.dimensionName}>{dimension.name}</Text>
            {dimension.values.map(value => (
              <View key={value.name} style={styles.affinityRow}>
                <Text style={styles.affinityName} numberOfLines={1}>
                  {value.name}
                </Text>
                <Text style={styles.affinityScore}>
                  {value.score.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {profile?.dimensions.length === 0 && (
          <Text style={styles.help}>
            El perfil no tiene aún dimensiones de afinidad. Navega por la app y
            vuelve a consultar.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Activity Report</Text>

        <View style={styles.counters}>
          <Counter label="Pageviews" value={state.pageViewCount} />
          <Counter label="Engagement" value={state.engagementCount} />
          <Counter label="Eventos" value={state.eventCount} />
        </View>

        <View style={styles.modeRow}>
          {(Object.keys(KIND_LABEL) as ActivityKind[]).map(entry => (
            <Pressable
              key={entry}
              onPress={() => setKind(entry)}
              style={({ pressed }) => [
                styles.modeButton,
                kind === entry && styles.modeButtonOn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[styles.modeText, kind === entry && styles.modeTextOn]}
              >
                {KIND_LABEL[entry]}
              </Text>
            </Pressable>
          ))}
        </View>

        {entries.length === 0 ? (
          <Text style={styles.help}>Nada reportado todavía.</Text>
        ) : (
          entries.slice(0, 40).map(entry => (
            <View key={entry.id} style={styles.entry}>
              <Text style={styles.entryTitle}>{entry.title}</Text>
              <Text style={styles.entryDetail}>{entry.detail}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, mono && styles.mono]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const Counter: React.FC<{ label: string; value: number }> = ({
  label,
  value,
}) => (
  <View style={styles.counter}>
    <Text style={styles.counterValue}>{value}</Text>
    <Text style={styles.counterLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  content: {
    padding: theme.space.lg,
    paddingBottom: theme.space.xxl,
    gap: theme.space.lg,
  },
  title: {
    fontSize: theme.font.display,
    fontWeight: '800',
    color: theme.color.text,
  },
  card: {
    padding: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceAlt,
    gap: theme.space.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: theme.font.section,
    fontWeight: '700',
    color: theme.color.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  label: { fontSize: theme.font.label, color: theme.color.textMuted },
  value: {
    flex: 1,
    textAlign: 'right',
    fontSize: theme.font.label,
    color: theme.color.text,
  },
  mono: { fontFamily: 'Courier' },
  reason: { fontSize: theme.font.caption, color: theme.color.textFaint },
  help: {
    fontSize: theme.font.caption,
    color: theme.color.textMuted,
    lineHeight: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    backgroundColor: theme.color.text,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: theme.font.label },
  input: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    fontSize: theme.font.body,
    color: theme.color.text,
  },
  modeRow: { flexDirection: 'row', gap: theme.space.sm },
  modeButton: {
    flex: 1,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    backgroundColor: theme.color.surface,
  },
  modeButtonOn: { backgroundColor: theme.color.brand },
  modeText: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.color.text,
  },
  modeTextOn: { color: '#fff' },
  link: {
    fontSize: theme.font.label,
    fontWeight: '600',
    color: theme.color.brand,
  },
  error: {
    fontSize: theme.font.caption,
    color: theme.color.danger,
    lineHeight: 16,
  },
  dimension: { gap: 2 },
  dimensionName: {
    fontSize: theme.font.label,
    fontWeight: '700',
    color: theme.color.text,
    textTransform: 'capitalize',
  },
  affinityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  affinityName: {
    flex: 1,
    fontSize: theme.font.caption,
    color: theme.color.textMuted,
  },
  affinityScore: { fontSize: theme.font.caption, color: theme.color.text },
  counters: { flexDirection: 'row', gap: theme.space.sm },
  counter: {
    flex: 1,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    alignItems: 'center',
  },
  counterValue: {
    fontSize: theme.font.title,
    fontWeight: '800',
    color: theme.color.text,
  },
  counterLabel: { fontSize: theme.font.caption, color: theme.color.textMuted },
  entry: {
    paddingVertical: theme.space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
  },
  entryTitle: {
    fontSize: theme.font.label,
    fontWeight: '600',
    color: theme.color.text,
  },
  entryDetail: { fontSize: theme.font.caption, color: theme.color.textMuted },
  pressed: { opacity: 0.75 },
});
