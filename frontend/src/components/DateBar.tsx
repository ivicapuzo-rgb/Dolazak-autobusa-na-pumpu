import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { CalendarBlank, CaretLeft, CaretRight } from "phosphor-react-native";
import React, { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { useData } from "@/src/data/DataContext";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function DateBar() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { selectedDate, setSelectedDate } = useData();
  const [showPicker, setShowPicker] = useState(false);

  const shift = (days: number) => {
    setSelectedDate(dayjs(selectedDate).add(days, "day").format("YYYY-MM-DD"));
  };

  const isToday = selectedDate === dayjs().format("YYYY-MM-DD");

  return (
    <View style={styles.wrap}>
      <Pressable
        testID="date-prev"
        onPress={() => shift(-1)}
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        hitSlop={8}
      >
        <CaretLeft size={22} color={colors.brandPrimary} weight="bold" />
      </Pressable>

      <Pressable
        testID="date-open-picker"
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [styles.center, pressed && styles.pressed]}
      >
        <CalendarBlank size={18} color={colors.brandPrimary} weight="fill" />
        <Text style={styles.dateText} testID="date-label">
          {dayjs(selectedDate).format("DD.MM.YYYY.")}
        </Text>
        {isToday && <Text style={styles.todayBadge}>danas</Text>}
      </Pressable>

      <Pressable
        testID="date-next"
        onPress={() => shift(1)}
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        hitSlop={8}
      >
        <CaretRight size={22} color={colors.brandPrimary} weight="bold" />
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={new Date(selectedDate)}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, date) => {
            setShowPicker(Platform.OS === "ios");
            if (event.type === "set" && date) {
              setSelectedDate(dayjs(date).format("YYYY-MM-DD"));
              if (Platform.OS === "ios") setShowPicker(false);
            }
          }}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.pill,
    padding: spacing.xs,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
  },
  center: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 40,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onBrandTertiary,
  },
  todayBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brandPrimary,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  pressed: { opacity: 0.6 },
}));
