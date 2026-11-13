import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Platform } from "react-native";

/** Muestra el aviso, espera y lo retira por arriba antes de desmontarlo. */
export function FloatingNotice({ children, onDismiss, topOffset = 0 }: {
  children: (dismiss: (after?: () => void) => void) => ReactNode;
  onDismiss: () => void;
  topOffset?: number;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const [height, setHeight] = useState(160);
  const exiting = useRef(false);
  const finish = useCallback((after?: () => void) => {
    if (exiting.current) return;
    exiting.current = true;
    Animated.timing(progress, { toValue: 0, duration: 350, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== "web" }).start(({ finished }) => {
      if (!finished) return;
      onDismiss();
      after?.();
    });
  }, [onDismiss, progress]);

  useEffect(() => {
    exiting.current = false;
    Animated.timing(progress, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" }).start();
    const timer = setTimeout(() => finish(), 5000);
    return () => { clearTimeout(timer); progress.stopAnimation(); };
  }, [finish, progress]);

  return <Animated.View onLayout={(event) => setHeight(event.nativeEvent.layout.height)} style={{ width: "100%", alignItems: "center", opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-(height + topOffset + 24), 0] }) }] }}>
    {/* El callback solo se ejecuta al pulsar el aviso o su botón de cierre. */}
    {/* eslint-disable-next-line react-hooks/refs */}
    {children((after) => finish(after))}
  </Animated.View>;
}
