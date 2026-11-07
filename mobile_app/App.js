import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';

function AppRoot() {
  const { user, isInitializing } = useApp();

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Strict Authentication Guard: If no valid logged-in user exists, MUST render LoginScreen
  if (!user || !user.email) {
    return <LoginScreen />;
  }

  // Only authenticated users with a valid session can reach the main application
  return <AppNavigator key={user.id || user._id || user.email} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppRoot />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
