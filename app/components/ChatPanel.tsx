import { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { colors, shadow } from '../utils/theme';
import { ChatMessage, useAiChat } from '../hooks/useAiChat';

const AGENT_OPTIONS = ['數據分析師', '紫微斗數師', '奇門遁甲師', '走地觀察員'];
const AGENT_COLOR: Record<string, string> = {
  數據分析師: colors.secondary,
  紫微斗數師: colors.gold,
  奇門遁甲師: colors.jade,
  走地觀察員: '#9b59b6',
};
const AGENT_ICON: Record<string, string> = {
  數據分析師: '📊',
  紫微斗數師: '🌟',
  奇門遁甲師: '🧭',
  走地觀察員: '👁️',
};

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      {!isUser && msg.agent && (
        <Text style={[styles.agentIconBubble, { color: AGENT_COLOR[msg.agent] || colors.primary }]}>
          {AGENT_ICON[msg.agent] || '🤖'}
        </Text>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAgent, msg.error && styles.bubbleError]}>
        {!isUser && msg.agent && <Text style={[styles.bubbleAgentName, { color: AGENT_COLOR[msg.agent] || colors.primary }]}>{msg.agent}</Text>}
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{msg.text}</Text>
      </View>
    </View>
  );
}

export default function ChatPanel({ focusTeam, matchId, height }: {
  focusTeam?: string;
  matchId?: number;
  height?: number;
}) {
  const { messages, typing, connected, send, clear } = useAiChat();
  const [agent, setAgent] = useState('數據分析師');
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const submit = () => {
    if (!input.trim()) return;
    send(input, { agent, focusTeam, matchId });
    setInput('');
  };

  return (
    <View style={[styles.container, height ? { height } : undefined]}>
      {/* 頂部工具列 */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>💬 AI 對話</Text>
        <View style={styles.agentSelector}>
          {AGENT_OPTIONS.map(a => (
            <TouchableOpacity
              key={a}
              style={[styles.agentChip, agent === a && { backgroundColor: AGENT_COLOR[a] }]}
              onPress={() => setAgent(a)}
            >
              <Text style={[styles.agentChipText, agent === a && { color: '#000' }]}>
                {AGENT_ICON[a]} {a}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={clear}><Text style={styles.clearBtn}>清空</Text></TouchableOpacity>
      </View>

      {focusTeam && <Text style={styles.focusHint}>正在查詢：{focusTeam} 的即時進程 ⚽</Text>}

      {/* 訊息區 */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesInner}
        onContentSizeChange={(w, h) => { if (h > 0) scrollRef.current?.scrollToEnd?.({ animated: true }); }}
      >
        {messages.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>隨時向我查詢比賽進程！</Text>
            <Text style={styles.emptySub}>例：「現在幾多比數？」「邊隊領先？」「有冇紅牌？」「呢場預測點？」</Text>
          </View>
        )}
        {messages.map(m => <Bubble key={m.id} msg={m} />)}
        {typing && (
          <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
            <View style={[styles.bubble, styles.bubbleAgent, { flexDirection: 'row', alignItems: 'center' }]}>
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.bubbleText}>{typing} 正在思考⋯</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 輸入區 */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={connected ? '輸入問題…' : '連線中…'}
            placeholderTextColor={colors.textDim}
            onSubmitEditing={submit}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={submit} disabled={!input.trim()}>
            <Text style={styles.sendBtnText}>發送</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  topBarTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  agentSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  agentChip: { backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 6 },
  agentChipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  clearBtn: { color: colors.textDim, fontSize: 13, marginTop: 6, alignSelf: 'flex-end' },
  focusHint: { color: colors.primary, fontSize: 12, paddingHorizontal: 16, marginBottom: 4 },
  messages: { flex: 1, paddingHorizontal: 16 },
  messagesInner: { paddingVertical: 12 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: colors.textDim, fontSize: 15 },
  emptySub: { color: colors.textDim, fontSize: 12, marginTop: 8, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },
  bubbleRow: { flexDirection: 'row', marginVertical: 4, alignItems: 'flex-end' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  agentIconBubble: { fontSize: 22, marginRight: 6, marginBottom: 6 },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: colors.primary },
  bubbleAgent: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  bubbleError: { borderColor: colors.danger },
  bubbleAgentName: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  bubbleText: { color: colors.text, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  bubbleTextUser: { color: '#000', fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8 },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, maxHeight: 100, minHeight: 40 },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#000', fontWeight: 'bold' },
});
