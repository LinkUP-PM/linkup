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
  onChange: (isoDate: string) => void;
};

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
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

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatBrazilDate(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const MIN_DATE = startOfDay(new Date(1920, 0, 1));
const MAX_DATE = startOfDay(new Date());

function clampDate(date: Date): Date {
  const day = startOfDay(date);
  if (day.getTime() < MIN_DATE.getTime()) return new Date(MIN_DATE);
  if (day.getTime() > MAX_DATE.getTime()) return new Date(MAX_DATE);
  return day;
}

function buildMonthCells(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function BirthDatePicker({ label, value, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const initial = useMemo(
    () => clampDate(parseIsoDate(value) ?? new Date(2000, 0, 1)),
    [value],
  );
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const display = formatBrazilDate(value);

  function openPicker() {
    const next = clampDate(parseIsoDate(value) ?? new Date(2000, 0, 1));
    setDraft(next);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    setOpen(true);
  }

  function shiftMonth(delta: number) {
    const cursor = new Date(viewYear, viewMonth + delta, 1);
    const minMonth = new Date(MIN_DATE.getFullYear(), MIN_DATE.getMonth(), 1);
    const maxMonth = new Date(MAX_DATE.getFullYear(), MAX_DATE.getMonth(), 1);
    if (cursor.getTime() < minMonth.getTime() || cursor.getTime() > maxMonth.getTime()) {
      return;
    }
    setViewYear(cursor.getFullYear());
    setViewMonth(cursor.getMonth());
  }

  function confirm() {
    onChange(toIsoDate(draft));
    setOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={openPicker} style={styles.input}>
        <Text style={display ? styles.value : styles.placeholder}>
          {display || "Selecionar no calendário"}
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
            <Text style={styles.modalTitle}>Data de nascimento</Text>

            <View style={styles.monthNav}>
              <Pressable onPress={() => shiftMonth(-1)} style={styles.navBtn} hitSlop={8}>
                <Text style={styles.navLabel}>‹</Text>
              </Pressable>
              <Text style={styles.monthLabel}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <Pressable onPress={() => shiftMonth(1)} style={styles.navBtn} hitSlop={8}>
                <Text style={styles.navLabel}>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekday}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((cell, index) => {
                if (!cell) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }
                const disabled =
                  cell.getTime() < MIN_DATE.getTime() || cell.getTime() > MAX_DATE.getTime();
                const selected = sameDay(cell, draft);
                return (
                  <Pressable
                    key={toIsoDate(cell)}
                    disabled={disabled}
                    onPress={() => setDraft(cell)}
                    style={[
                      styles.dayCell,
                      selected && styles.daySelected,
                      disabled && styles.dayDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayLabel,
                        selected && styles.dayLabelSelected,
                        disabled && styles.dayLabelDisabled,
                      ]}
                    >
                      {cell.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.preview}>{formatBrazilDate(toIsoDate(draft))}</Text>

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
    marginBottom: spacing.xs,
  },
  monthNav: {
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
  monthLabel: {
    ...type.headline,
    color: colors.ink,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    ...type.caption1,
    color: colors.muted,
    fontFamily: fonts.bodySemi,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    maxHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  daySelected: {
    backgroundColor: colors.accent,
  },
  dayDisabled: {
    opacity: 0.35,
  },
  dayLabel: {
    ...type.body,
    color: colors.ink,
  },
  dayLabelSelected: {
    color: colors.ink,
    fontFamily: fonts.bodySemi,
  },
  dayLabelDisabled: {
    color: colors.tertiary,
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
