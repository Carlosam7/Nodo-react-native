import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "@/features/auth/context/auth-context";

SplashScreen.preventAutoHideAsync();

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
    <AuthProvider>
      <RootStack />
    </AuthProvider>
  );
}
