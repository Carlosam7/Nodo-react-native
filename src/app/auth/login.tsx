import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NodoColors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLocalError(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Ingresa tu correo y contraseña');
      return;
    }

    try {
      await login(email, password);
      router.back();
    } catch {
      // El error se gestiona mediante el contexto
    }
  };

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled">
        {/* Cabecera / Botón volver */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Volver">
            <Text style={styles.backButtonText}>←</Text>
          </Pressable>
        </View>

        {/* Brand Hero */}
        <View style={styles.brandHero}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetter}>N</Text>
          </View>
          <Text style={styles.appName}>NODO</Text>
          <Text style={styles.tagline}>
            Sistema de Innovación · Universidad del Norte
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Iniciar sesión</Text>
          <Text style={styles.formSubtitle}>
            Ingresa para postularte o crear nuevas iniciativas
          </Text>

          {displayError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          ) : null}

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Correo institucional</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (displayError) clearError();
              }}
              placeholder="tu_correo@uninorte.edu.co"
              placeholderTextColor={NodoColors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (displayError) clearError();
              }}
              placeholder="••••••••"
              placeholderTextColor={NodoColors.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.pressed,
              isLoading && styles.disabledButton,
            ]}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Iniciar sesión</Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerPrompt}>¿No tienes cuenta? </Text>
            <Link href="/auth/register" asChild replace>
              <Pressable>
                <Text style={styles.footerLink}>Regístrate aquí</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: NodoColors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  headerRow: {
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: NodoColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: NodoColors.border,
  },
  backButtonText: {
    fontSize: 22,
    color: NodoColors.textPrimary,
    fontWeight: '700',
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: NodoColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: NodoColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoLetter: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    color: NodoColors.textPrimary,
  },
  tagline: {
    fontSize: 13,
    color: NodoColors.textSecondary,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: NodoColors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: NodoColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: NodoColors.textPrimary,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: NodoColors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: NodoColors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: NodoColors.background,
    borderWidth: 1,
    borderColor: NodoColors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: NodoColors.textPrimary,
  },
  submitButton: {
    backgroundColor: NodoColors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: NodoColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerPrompt: {
    fontSize: 14,
    color: NodoColors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: NodoColors.primary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
