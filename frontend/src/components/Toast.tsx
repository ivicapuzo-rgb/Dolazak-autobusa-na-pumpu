import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type ToastType = "success" | "error" | "info";

interface ToastCtx {
  show: (message: string, type?: ToastType) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("info");
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (msg: string, t: ToastType = "info") => {
      setMessage(msg);
      setType(t);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start();
      }, 2200);
    },
    [opacity],
  );

  const bg =
    type === "success"
      ? colors.success
      : type === "error"
        ? colors.error
        : colors.surfaceInverse;

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wrap,
          { top: insets.top + spacing.md, opacity },
        ]}
      >
        <View
          testID="app-toast"
          style={[styles.toast, { backgroundColor: bg }]}
        >
          <Text style={styles.text}>{message}</Text>
        </View>
      </Animated.View>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    maxWidth: "100%",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    ...StyleSheet.flatten({
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    }),
  },
  text: {
    color: colors.onSurfaceInverse,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
}));
