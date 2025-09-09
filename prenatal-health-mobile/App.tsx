import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { MainChatScreen } from './screens/MainChatScreen';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

type AuthMode = 'login' | 'register';

const AppContent: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00bfff" />
      </View>
    );
  }

  if (!user) {
    return authMode === 'login' ? (
      <LoginScreen onNavigateToRegister={() => setAuthMode('register')} />
    ) : (
      <RegisterScreen onNavigateToLogin={() => setAuthMode('login')} />
    );
  }

  if (!user.profileCompleted) {
    return <OnboardingScreen onComplete={() => {}} />;
  }

  return <MainChatScreen onLogout={logout} />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
