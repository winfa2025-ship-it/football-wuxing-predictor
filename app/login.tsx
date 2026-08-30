import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from './context/AuthContext';
import { colors, shadow } from './utils/theme';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const backspace = () => {
    if (mode === 'register') setMode('login'); else setMode('register');
    setError('');
  };

  const submit = async () => {
    setError('');
    const e = email.trim();
    if (!e) return setError('請輸入電郵');
    if (!password) return setError('請輸入密碼');
    if (password.length < 8) return setError('密碼至少8碼（含英文與數字）');
    if (mode === 'register' && inviteCode.trim() !== 'VIP888') return setError('請輸入正確的邀請碼');
    setLoading(true);
    const res = mode === 'login' ? await login(e, password) : await register(e, password, inviteCode.trim());
    setLoading(false);
    if (!res.ok) setError(res.message || (mode === 'login' ? '登入失敗' : '註冊失敗'));
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* 品牌 */}
        <View style={styles.brandBlock}>
          <View style={styles.luxBadge}>
            <Text style={styles.luxBadgeText}>VIP</Text>
          </View>
          <Text style={styles.appTitle}>足球五行</Text>
          <Text style={styles.appSubtitle}>數據預測 · 風水命理 · AI 智能分析</Text>
          <View style={styles.divider} />
          <Text style={styles.appDesc}>⚽ 即時比分　☯ 五行運勢　📊 AI 預測　💬 智能對話</Text>
        </View>

        {/* 卡片 */}
        <View style={[styles.card, shadow]}>
          <Text style={styles.cardTitle}>{mode === 'login' ? '會員登入' : '註冊新帳號'}</Text>
          <Text style={styles.cardHint}>{mode === 'login' ? '歡迎回來，輸入您的帳號' : '註冊需輸入邀請碼解鎖'}</Text>

          <Text style={styles.label}>電郵地址</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textDim}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>密碼</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'register' ? '至少8碼，含英文與數字' : '您的密碼'}
            placeholderTextColor={colors.textDim}
            secureTextEntry
          />

          {mode === 'register' && (
            <>
              <Text style={styles.label}>邀請碼 <Text style={styles.labelAccent}>（自用限定）</Text></Text>
              <TextInput
                style={styles.input}
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="輸入邀請碼..."
                placeholderTextColor={colors.textDim}
                autoCapitalize="characters"
              />
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>{mode === 'login' ? '登  入' : '註  冊'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.modeToggle} onPress={backspace}>
            <Text style={styles.modeToggleText}>
              {mode === 'login' ? '沒有帳號？點此註冊' : '已有帳號？返回登入'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>僅供本人使用 · 邀請碼解鎖 · VIP888</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brandBlock: { alignItems: 'center', marginBottom: 28 },
  luxBadge: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 6, marginBottom: 14, transform: [{ rotate: '-2deg' }] },
  luxBadgeText: { color: '#000', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  appTitle: { color: colors.text, fontSize: 40, fontWeight: '900', letterSpacing: 4 },
  appSubtitle: { color: colors.gold, fontSize: 15, marginTop: 8, letterSpacing: 1 },
  divider: { width: '30%', height: 1, backgroundColor: colors.border, marginVertical: 16 },
  appDesc: { color: colors.textDim, fontSize: 12, letterSpacing: 0.5 },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)' },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  cardHint: { color: colors.textDim, fontSize: 13, marginTop: 4, marginBottom: 20 },
  label: { color: colors.text, fontSize: 13, marginTop: 12, marginBottom: 6, fontWeight: '600' },
  labelAccent: { color: colors.gold, fontSize: 12 },
  input: { backgroundColor: colors.cardLight, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, color: colors.text, fontSize: 15 },
  error: { color: colors.danger, fontSize: 13, marginTop: 12, textAlign: 'center' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 22 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#000', fontSize: 17, fontWeight: 'bold', letterSpacing: 6 },
  modeToggle: { alignItems: 'center', marginTop: 18 },
  modeToggleText: { color: colors.primary, fontSize: 13 },
  footer: { color: colors.textDim, fontSize: 11, textAlign: 'center', marginTop: 24, letterSpacing: 1 },
});
