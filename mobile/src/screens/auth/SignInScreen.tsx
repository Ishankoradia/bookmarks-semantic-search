import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

export function SignInScreen() {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    GoogleSignin.configure({
      scopes: ['email', 'profile'],
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      forceCodeForRefreshToken: false,
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('[AUTH] Starting Google Sign-In...');
      console.log('[AUTH] Web Client ID:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID);

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log('[AUTH] Play Services available');

      const response = await GoogleSignin.signIn();
      console.log('[AUTH] Sign-in response type:', response.type);
      console.log('[AUTH] Sign-in response:', JSON.stringify(response, null, 2));

      if (response.type === 'success') {
        const userData = response.data;
        console.log('[AUTH] Got user data:', JSON.stringify(userData, null, 2));

        console.log('[AUTH] Calling backend signIn...');
        await signIn({
          email: userData.user.email,
          name: userData.user.name,
          picture: userData.user.photo,
          google_id: userData.user.id,
        });
        console.log('[AUTH] Backend signIn successful');
      } else {
        console.log('[AUTH] Sign-in was not successful, type:', response.type);
        setError(`Sign-in response type: ${response.type}`);
      }
    } catch (e: any) {
      // Show ALL errors on screen, including cancellation
      const msg = `Code: ${e.code || 'none'}\nMessage: ${e.message || 'Unknown error'}`;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: 'search' as const, title: 'Search by meaning', desc: 'Find bookmarks with natural language' },
    { icon: 'folder-open' as const, title: 'Auto-organize', desc: 'AI categorizes and tags your bookmarks' },
    { icon: 'compass' as const, title: 'Discover content', desc: 'Get personalized article recommendations' },
    { icon: 'people' as const, title: 'Share with friends', desc: 'Follow people and see their bookmarks' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
          <Ionicons name="bookmark" size={24} color={colors.primaryForeground} />
        </View>
        <Text style={[styles.appName, { color: colors.foreground }]}>Semantic Bookmarks</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Your AI-powered bookmark manager
        </Text>
      </View>

      <View style={styles.features}>
        {features.map((feature) => (
          <View key={feature.title} style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + '1A' }]}>
              <Ionicons name={feature.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>{feature.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{feature.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.signInCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.getStarted, { color: colors.foreground }]}>Get Started</Text>
        <Text style={[styles.signInDesc, { color: colors.mutedForeground }]}>
          Sign in with your Google account to start organizing your bookmarks.
        </Text>

        {error ? (
          <Text style={[styles.errorText, { color: colors.destructive }]} selectable>
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleGoogleSignIn}
          disabled={loading}
          style={[styles.googleBtn, { borderColor: colors.border }]}
        >
          {loading ? (
            <ActivityIndicator color={colors.foreground} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color={colors.foreground} />
              <Text style={[styles.googleBtnText, { color: colors.foreground }]}>
                Continue with Google
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 14,
    marginTop: 4,
  },
  features: {
    gap: 8,
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  featureDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  signInCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  getStarted: {
    fontSize: 18,
    fontWeight: '700',
  },
  signInDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
    justifyContent: 'center',
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 11,
    textAlign: 'left',
    width: '100%',
    fontFamily: 'monospace',
  },
});
