import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, spacing, type } from "../theme/tokens";

type Props = {
  label: string;
  value: string;
  onChange: (month: string) => void;
  placeholder?: string;
};

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const MONTHS_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MIN_YEAR = 1960;
const MAX_YEAR = new Date().getFullYear() + 6;

function parseMonth(value: string): { year: number; month: number } | null {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const [y, m] = value.split("-").map(Number);
  if (m < 1 || m > 12) return null;
  return { year: y, month: m - 1 };
}

function toMonthValue(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function formatBrazilMonth(value: string): string {
  const parsed = parseMonth(value);
  if (!parsed) return "";
  return `${MONTHS_FULL[parsed.month]} de ${parsed.year}`;
}

export function MonthYearPicker({
  label,
  value,
  onChange,
  placeholder = "Selecionar mês e ano",
}: Props) {
  const insets = useSafeAreaInsets();
  const initial = useMemo(() => {
    const parsed = parseMonth(value);
    if (parsed) return parsed;
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, [value]);

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);

  const display = formatBrazilMonth(value);

  function openPicker() {
    const parsed = parseMonth(value);
    if (parsed) {
      setYear(parsed.year);
      setMonth(parsed.month);
    } else {
      const now = new Date();
      setYear(now.getFullYear());
      setMonth(now.getMonth());
    }
    setOpen(true);
  }

  function confirm() {
    onChange(toMonthValue(year, month));
    setOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={openPicker} style={styles.input}>
        <Text style={display ? styles.value : styles.placeholder} numberOfLines={1}>
          {display || placeholder}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            ]}
          >
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>{label}</Text>

            <View style={styles.yearNav}>
              <Pressable
                onPress={() => setYear((y) => Math.max(MIN_YEAR, y - 1))}
                style={styles.navBtn}
                hitSlop={8}
              >
                <Text style={styles.navLabel}>‹</Text>
              </Pressable>
              <Text style={styles.yearLabel}>{year}</Text>
              <Pressable
                onPress={() => setYear((y) => Math.min(MAX_YEAR, y + 1))}
                style={styles.navBtn}
                hitSlop={8}
              >
                <Text style={styles.navLabel}>›</Text>
              </Pressable>
            </View>

            <View style={styles.monthGrid}>
              {MONTHS.map((name, index) => {
                const selected = index === month;
                return (
                  <Pressable
                    key={name}
                    onPress={() => setMonth(index)}
                    style={[styles.monthCell, selected && styles.monthSelected]}
                  >
                    <Text style={[styles.monthLabel, selected && styles.monthLabelSelected]}>
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.preview}>
              {MONTHS_FULL[month]} de {year}
            </Text>

            <View style={styles.actions}>
              <Pressable onPress={() => setOpen(false)} style={styles.actionBtn}>
                <Text style={styles.cancel}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirm} style={[styles.actionBtn, styles.confirmBtn]}>
                <Text style={styles.confirm}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  fieldLabel: {
    ...type.caption1,
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.input,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  value: {
    ...type.body,
    color: colors.ink,
  },
  placeholder: {
    ...type.body,
    color: colors.tertiary,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.group * 1.5,
    borderTopRightRadius: radius.group * 1.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderBottomWidth: 0,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.tertiary,
    marginBottom: spacing.xs,
  },
  modalTitle: {
    ...type.headline,
    color: colors.ink,
    textAlign: "center",
  },
  yearNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    color: colors.ink,
    fontSize: 26,
    lineHeight: 30,
  },
  yearLabel: {
    ...type.title2,
    color: colors.ink,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  monthCell: {
    width: "31%",
    minHeight: 48,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  monthSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  monthLabel: {
    ...type.body,
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
  },
  monthLabelSelected: {
    color: colors.ink,
    fontFamily: fonts.bodySemi,
  },
  preview: {
    ...type.body,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceElevated,
  },
  confirmBtn: {
    backgroundColor: colors.accent,
  },
  cancel: {
    ...type.body,
    color: colors.muted,
    fontFamily: fonts.bodySemi,
  },
  confirm: {
    ...type.body,
    color: colors.ink,
    fontFamily: fonts.bodySemi,
  },
});
