import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ImageBackground, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui';
import GetStartedScreen from './GetStartedScreen';

export default function LoginScreen() {
  const { login, register, loading, language, setLanguage, t } = useApp();
  // 'getStarted' | 'signIn' | 'register'
  const [view, setView] = useState('getStarted');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (view === 'getStarted') {
    return <GetStartedScreen onGetStarted={() => setView('signIn')} />;
  }

  const isRegister = view === 'register';

  const handleAuthSubmit = async () => {
    setErrorMessage('');
    const cleanEmail = email.trim();
    if (isRegister && !name.trim()) return setErrorMessage(t('errEnterName'));
    if (!cleanEmail) return setErrorMessage(t('errEnterEmail'));
    if (!/\S+@\S+\.\S+/.test(cleanEmail)) return setErrorMessage(t('errValidEmail'));
    if (!password) return setErrorMessage(t('errEnterPassword'));
    if (isRegister && password.length < 6) return setErrorMessage(t('errPasswordLength'));

    if (isRegister) {
      const res = await register({ name: name.trim(), email: cleanEmail, password, phone: phone.trim() });
      if (!res.success) {
        setErrorMessage(res.error || t('errAuthFailed'));
      }
    } else {
      const res = await login(cleanEmail, password);
      if (!res.success) {
        setErrorMessage(res.error || t('errAuthFailed'));
      }
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      t('resetPasswordTitle'),
      t('resetPasswordMsg'),
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Sugarcane Plantation Background Image (Screens 2 & 3 in Reference Mockup) */}
      <ImageBackground
        source={require('../../assets/sugarcane_bg.jpg')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <View style={styles.scrimOverlay} />

        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Brand Header */}
              <View style={styles.brandHeader}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => {
                    setErrorMessage('');
                    if (isRegister) {
                      setView('signIn');
                    } else {
                      setView('getStarted');
                    }
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t('back')}
                >
                  <MCIcons name="arrow-left" size={22} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.brandLogoWrap}>
                  <View style={styles.sproutBubble}>
                    <MCIcons name="sprout" size={32} color="#4ADE80" />
                  </View>
                  <Text style={styles.brandTitle}>{t('appName')}</Text>
                </View>

                {/* Language Switcher Pill */}
                <View style={styles.langPillHeader}>
                  {['en', 'hi', 'mr'].map((langKey) => {
                    const active = language === langKey;
                    const label = langKey === 'en' ? 'EN' : (langKey === 'hi' ? 'हि' : 'म');
                    return (
                      <TouchableOpacity
                        key={langKey}
                        style={[styles.langChipHeader, active && styles.langChipHeaderActive]}
                        onPress={() => setLanguage(langKey)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.langChipHeaderText, active && styles.langChipHeaderTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Frosted Glass Form Card */}
              <View style={styles.glassCard}>
                <Text style={styles.cardHeading}>
                  {isRegister ? t('register') : t('welcomeBack')}
                </Text>
                <Text style={styles.cardSub}>
                  {isRegister
                    ? t('registerSub')
                    : t('signInSub')}
                </Text>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <MCIcons name="alert-circle-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* Full Name (Sign Up only) */}
                {isRegister && (
                  <View style={styles.inputContainer}>
                    <MCIcons name="account-outline" size={20} color="rgba(255, 255, 255, 0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('fullName')}
                      placeholderTextColor="rgba(255, 255, 255, 0.45)"
                      value={name}
                      onChangeText={(txt) => {
                        setName(txt);
                        setErrorMessage('');
                      }}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                {/* Email */}
                <View style={styles.inputContainer}>
                  <MCIcons name="email-outline" size={20} color="rgba(255, 255, 255, 0.7)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('email')}
                    placeholderTextColor="rgba(255, 255, 255, 0.45)"
                    value={email}
                    onChangeText={(txt) => {
                      setEmail(txt);
                      setErrorMessage('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Mobile Number (Sign Up only) */}
                {isRegister && (
                  <View style={styles.inputContainer}>
                    <MCIcons name="phone-outline" size={20} color="rgba(255, 255, 255, 0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('mobileNumber')}
                      placeholderTextColor="rgba(255, 255, 255, 0.45)"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                )}

                {/* Password */}
                <View style={styles.inputContainer}>
                  <MCIcons name="lock-outline" size={20} color="rgba(255, 255, 255, 0.7)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('password')}
                    placeholderTextColor="rgba(255, 255, 255, 0.45)"
                    value={password}
                    onChangeText={(txt) => {
                      setPassword(txt);
                      setErrorMessage('');
                    }}
                    secureTextEntry={!showPass}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPass(!showPass)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MCIcons
                      name={showPass ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="rgba(255, 255, 255, 0.7)"
                    />
                  </TouchableOpacity>
                </View>

                {/* Forgot Password Link (Sign In only) */}
                {!isRegister && (
                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    style={styles.forgotWrap}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
                  </TouchableOpacity>
                )}

                {/* Primary Pill Button */}
                <Button
                  title={isRegister ? t('createAccountBtn') : t('signInBtn')}
                  onPress={handleAuthSubmit}
                  loading={loading}
                  style={styles.submitBtn}
                />

                {/* Switch View Toggle */}
                {!isRegister ? (
                  <>
                    <View style={styles.orRow}>
                      <View style={styles.orLine} />
                      <Text style={styles.orText}>{t('or')}</Text>
                      <View style={styles.orLine} />
                    </View>

                    <TouchableOpacity
                      style={styles.createAccountBtn}
                      onPress={() => {
                        setView('register');
                        setErrorMessage('');
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.createAccountText}>{t('createNewAccount')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.alreadyRow}
                    onPress={() => {
                      setView('signIn');
                      setErrorMessage('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.alreadyText}>
                      {t('alreadyHaveAccount')}<Text style={styles.alreadyHighlight}>{t('signIn')}</Text>
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ height: 30 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#072318'
  },
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  scrimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 25, 17, 0.58)'
  },
  safe: {
    flex: 1
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center'
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
    paddingTop: spacing.md
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: spacing.md,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  brandLogoWrap: {
    alignItems: 'center'
  },
  sproutBubble: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(74, 222, 128, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 222, 128, 0.45)'
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  langPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 35, 24, 0.85)',
    borderRadius: 16,
    padding: 3,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)'
  },
  langChipHeader: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12
  },
  langChipHeaderActive: {
    backgroundColor: '#16A34A'
  },
  langChipHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  langChipHeaderTextActive: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  glassCard: {
    backgroundColor: 'rgba(7, 35, 24, 0.82)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    padding: spacing.xl,
    ...shadows.lg
  },
  cardHeading: {
    ...typography.h3,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4
  },
  cardSub: {
    ...typography.body,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    marginBottom: spacing.lg
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderRadius: 14,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  errorText: {
    ...typography.caption,
    color: '#FCA5A5',
    flex: 1,
    fontWeight: '600'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: spacing.md,
    minHeight: 52,
    marginBottom: spacing.md
  },
  inputIcon: {
    marginRight: spacing.sm
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  eyeBtn: {
    padding: 6
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -4
  },
  forgotText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600'
  },
  submitBtn: {
    borderRadius: 26,
    minHeight: 52,
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)'
  },
  orText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: spacing.md
  },
  createAccountBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center'
  },
  createAccountText: {
    ...typography.body,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  alreadyRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.xs
  },
  alreadyText: {
    ...typography.body,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)'
  },
  alreadyHighlight: {
    color: '#4ADE80',
    fontWeight: '800'
  }
});
