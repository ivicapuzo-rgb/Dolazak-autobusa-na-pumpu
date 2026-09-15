import React from "react";
import { Text, View } from "react-native";

import { makeStyles, radius, spacing } from "@/src/theme";

interface Props {
  label: string;
  value: number | string;
  color: string;
  testID?: string;
}

export function StatCard({ label, value, color, testID }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  dot: { width: 9, height: 9, borderRadius: 999 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: colors.muted,
    flexShrink: 1,
  },
  value: {
    fontSize: 34,
    fontWeight: "800",
  },
}));
