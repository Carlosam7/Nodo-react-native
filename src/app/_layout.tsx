import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { projects, applicants, chat, notifications } from "@/core/composition/services";
import { ServicesProvider } from "@/core/presentation/services-context";

import { authService } from "@/features/auth/infrastructure/auth-composition";
import { AuthProvider, useAuth } from "@/features/auth/context/auth-context";
import { NotificationBubble } from "@/features/notifications/components/NotificationBubble";

SplashScreen.preventAutoHideAsync();

const services = { projects, applicants, chat, notifications };

function RootStack() {
  const { isBootstrapped } = useAuth();

  useEffect(() => {
    if (isBootstrapped) {
      SplashScreen.hideAsync();
    }
  }, [isBootstrapped]);

  if (!isBootstrapped) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
      <NotificationBubble />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider><GestureHandlerRootView style={{ flex: 1 }}>
      <ServicesProvider services={services}>
        <AuthProvider authService={authService}>
          <RootStack />
        </AuthProvider>
      </ServicesProvider>
    </GestureHandlerRootView></SafeAreaProvider>
  );
}
