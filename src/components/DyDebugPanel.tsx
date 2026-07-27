import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { hasRealApiKey, useDy, type DyLogEntry } from '../dy';
import { theme } from '../theme';

const KIND_COLOR: Record<DyLogEntry['kind'], string> = {
  init: theme.color.textMuted,
  consent: theme.color.warning,
  pageview: theme.color.accent,
  choose: theme.color.success,
  engagement: '#B98BE0',
  event: '#E0A33E',
};

const time = (at: number): string =>
  new Date(at).toLocaleTimeString('es-ES', { hour12: false });

/**
 * Panel de depuración de la demo.
 *
 * Muestra la secuencia de llamadas que la app hace contra la capa DY, que es lo
 * que en una integración real viajaría a los endpoints de Dynamic Yield.
 */
export const DyDebugPanel: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { log, clearLog, consent, setConsent, client } = useDy();
  const identity = client.getIdentity();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Actividad Dynamic Yield</Text>
            <Pressable onPress={onClose} accessibilityRole="button">
              <Text style={styles.close}>Cerrar</Text>
            </Pressable>
          </View>

          {!hasRealApiKey() && (
            <Text style={styles.notice}>
              Cliente simulado — no hay API key configurada. Sustituye
              DY_API_KEY en src/dy/dyConfig.ts por tu clave client-side.
            </Text>
          )}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Consentimiento activo</Text>
            <Switch value={consent} onValueChange={setConsent} />
          </View>
          <Text style={styles.identity}>
            dyid: {identity.dyid ?? '—'} · sesión: {identity.sessionId ?? '—'}
          </Text>

          <ScrollView style={styles.log} contentContainerStyle={styles.logBody}>
            {log.length === 0 ? (
              <Text style={styles.muted}>Sin actividad todavía.</Text>
            ) : (
              [...log].reverse().map(entry => (
                <View key={entry.id} style={styles.entry}>
                  <View style={styles.entryHead}>
                    <Text
                      style={[styles.kind, { color: KIND_COLOR[entry.kind] }]}>
                      {entry.kind}
                    </Text>
                    <Text style={styles.muted}>{time(entry.at)}</Text>
                  </View>
                  <Text style={styles.summary}>{entry.summary}</Text>
                  <Text style={styles.detail} numberOfLines={6}>
                    {JSON.stringify(entry.detail, null, 2)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          <Pressable
            onPress={clearLog}
            accessibilityRole="button"
            style={styles.clear}>
            <Text style={styles.clearText}>Limpiar registro</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '82%',
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.space(2),
    gap: theme.space(1),
  },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: theme.color.text, fontSize: 17, fontWeight: '700' },
  close: { color: theme.color.accent, fontSize: 15 },
  notice: {
    color: theme.color.warning,
    fontSize: 12,
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.space(0.5),
  },
  rowLabel: { color: theme.color.text, fontSize: 14 },
  identity: { color: theme.color.textMuted, fontSize: 11 },
  log: { maxHeight: 380 },
  logBody: { gap: theme.space(1), paddingVertical: theme.space(1) },
  entry: {
    backgroundColor: theme.color.surfaceAlt,
    borderRadius: theme.radius.sm,
    padding: theme.space(1.25),
    gap: 2,
  },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between' },
  kind: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  summary: { color: theme.color.text, fontSize: 13, fontWeight: '600' },
  detail: {
    color: theme.color.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  muted: { color: theme.color.textMuted, fontSize: 12 },
  clear: { alignSelf: 'flex-start', paddingVertical: theme.space(0.5) },
  clearText: { color: theme.color.accent, fontSize: 13 },
});
