import { useState } from "react";
import { Animated, Platform, Pressable, type PressableProps } from "react-native";
import * as Haptics from "expo-haptics";

export function TactilePressable({ children, onPressIn, onPressOut, ...props }: PressableProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const animate = (value: number) => Animated.spring(scale, { toValue: value, useNativeDriver: Platform.OS !== "web", speed: 30, bounciness: 2 }).start();
  return <Animated.View style={{ transform: [{ scale }] }}>
    <Pressable {...props} onPressIn={(event) => {
      animate(0.98);
      if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
      onPressIn?.(event);
    }} onPressOut={(event) => { animate(1); onPressOut?.(event); }}>
      {children}
    </Pressable>
  </Animated.View>;
}
