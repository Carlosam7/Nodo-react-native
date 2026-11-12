import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { projects, applicants, chat } from "@/core/composition/services";
import { ServicesProvider } from "@/core/presentation/services-context";

import { authService } from "@/features/auth/infrastructure/auth-composition";
import { AuthProvider, useAuth } from "@/features/auth/context/auth-context";

SplashScreen.preventAutoHideAsync();

const services = { projects, applicants, chat };

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
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ServicesProvider services={services}>
        <AuthProvider authService={authService}>
          <RootStack />
        </AuthProvider>
      </ServicesProvider>
    </GestureHandlerRootView>
  );
}
