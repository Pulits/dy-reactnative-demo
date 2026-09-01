/**
 * Shopping Muse — port de `ShoppingMuseView.swift`.
 *
 * La pantalla arranca con una sola llamada (`Muse Home`) que trae a la vez la
 * configuración del asistente y los productos de bienvenida. A partir de ahí es
 * un chat: cada respuesta reenvía el `chatId` para que DY mantenga el hilo.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { appConfig } from '../config/appConfig';
import { ProductRail } from '../components/ProductRail';
import { useDy } from '../dy/DyProvider';
import type { MuseGallery, MuseHome } from '../models';
import { theme } from '../theme';

interface Turn {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  galleries: MuseGallery[];
}

export const MuseScreen: React.FC = () => {
  const dy = useDy();
  const [home, setHome] = useState<MuseHome>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const chatId = useRef<string | undefined>(undefined);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    void dy.museHome().then(setHome);
  }, [dy]);

  const send = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || sending) {
      return;
    }
    setDraft('');
    setSending(true);
    setTurns(current => [
      ...current,
      { id: `u-${Date.now()}`, role: 'user', text: trimmed, galleries: [] },
    ]);

    const reply = await dy.museChat(trimmed, chatId.current);
    chatId.current = reply.chatId;

    setTurns(current => [
      ...current,
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: reply.isSupport ? appConfig.muse.supportMessage : reply.text,
        galleries: reply.galleries,
      },
    ]);
    setSending(false);
  };

  const suggestions = home?.suggestions ?? appConfig.muse.fallbackSuggestions;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: true })
        }
      >
        <View style={styles.intro}>
          <Text style={styles.sparkle}>✦</Text>
          <Text style={styles.assistantName}>
            {home?.assistantName ?? appConfig.muse.assistantName}
          </Text>
          <Text style={styles.welcome}>{appConfig.muse.welcomeMessage}</Text>
        </View>

        {turns.length === 0 && (
          <>
            <View style={styles.suggestions}>
              {suggestions.map(suggestion => (
                <Pressable
                  key={suggestion}
                  onPress={() => void send(suggestion)}
                  style={({ pressed }) => [
                    styles.suggestion,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>

            {!!home?.products.length && (
              <ProductRail title="Picked for you" products={home.products} />
            )}
          </>
        )}

        {turns.map(turn =>
          turn.role === 'user' ? (
            <View key={turn.id} style={styles.userBubble}>
              <Text style={styles.userText}>{turn.text}</Text>
            </View>
          ) : (
            <View key={turn.id} style={styles.assistantTurn}>
              {!!turn.text && (
                <View style={styles.assistantBubble}>
                  <Text style={styles.assistantText}>{turn.text}</Text>
                </View>
              )}
              {turn.galleries.map((gallery, index) => (
                <ProductRail
                  key={`${turn.id}-${index}`}
                  title={gallery.title}
                  products={gallery.products}
                  cardWidth={140}
                />
              ))}
            </View>
          ),
        )}

        {sending && (
          <View style={styles.typing}>
            <ActivityIndicator color={appConfig.muse.primaryColor} />
          </View>
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={
            home?.searchPlaceholder ?? appConfig.muse.inputPlaceholder
          }
          placeholderTextColor={theme.color.textFaint}
          // El input de Muse tiene tope de caracteres, igual que en iOS.
          maxLength={appConfig.muse.maxChars}
          style={styles.input}
          onSubmitEditing={() => void send(draft)}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => void send(draft)}
          disabled={!draft.trim() || sending}
          style={({ pressed }) => [
            styles.sendButton,
            (!draft.trim() || sending) && styles.sendButtonOff,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Enviar"
        >
          <Text style={styles.sendIcon}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  content: { paddingVertical: theme.space.lg, gap: theme.space.lg },
  intro: { alignItems: 'center', gap: theme.space.xs },
  sparkle: { fontSize: 30, color: appConfig.muse.primaryColor },
  assistantName: {
    fontSize: theme.font.title,
    fontWeight: '800',
    color: theme.color.text,
  },
  welcome: {
    fontSize: theme.font.label,
    color: theme.color.textMuted,
    textAlign: 'center',
    paddingHorizontal: theme.space.xl,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  suggestion: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: appConfig.muse.secondaryColor,
  },
  suggestionText: { fontSize: theme.font.label, color: theme.color.text },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '78%',
    marginHorizontal: theme.space.lg,
    padding: theme.space.md,
    borderRadius: theme.radius.lg,
    backgroundColor: appConfig.muse.secondaryColor,
  },
  userText: { fontSize: theme.font.body, color: theme.color.text },
  assistantTurn: { gap: theme.space.md },
  assistantBubble: {
    alignSelf: 'flex-start',
    maxWidth: '86%',
    marginHorizontal: theme.space.lg,
    padding: theme.space.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceAlt,
  },
  assistantText: { fontSize: theme.font.body, color: theme.color.text },
  typing: { paddingHorizontal: theme.space.lg },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    padding: theme.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceAlt,
    fontSize: theme.font.body,
    color: theme.color.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appConfig.muse.primaryColor,
  },
  sendButtonOff: { opacity: 0.4 },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
