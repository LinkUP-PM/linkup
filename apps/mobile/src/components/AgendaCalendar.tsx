import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AgendaItem, ApplicationEventType } from "@linkup/shared";
import { APPLICATION_EVENT_LABELS } from "@linkup/shared";
import { GroupedSection } from "./GroupedSection";
import { ListRow } from "./ListRow";
import { formatInterviewWhen } from "../lib/interview-datetime";
import { colors, fonts, radius, spacing } from "../theme/tokens";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

const EVENT_DOT: Record<ApplicationEventType, string> = {
  SUBMITTED: colors.accent,
  RESUBMITTED: colors.suggestions,
  FORWARDED: colors.attention,
  DISCARDED: colors.muted,
  ADJUSTMENT_REQUESTED: colors.attention,
  ACCEPTED: colors.strengths,
  REJECTED: colors.error,
  INTERVIEW_PROPOSED: colors.attention,
  INTERVIEW_ACCEPTED: colors.strengths,
  INTERVIEW_DECLINED: colors.error,
};

function ymdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseItemDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return ymdLocal(date);
}

function monthLabel(year: number, month: number): string {
  const date = new Date(year, month, 1);
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type Props = {
  items: AgendaItem[];
  onOpenItem: (item: AgendaItem) => void;
  showCandidateEmail?: boolean;
};

export function AgendaCalendar({ items, onOpenItem, showCandidateEmail }: Props) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(() => ymdLocal(today));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const byDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const item of items) {
      const key = parseItemDay(item.date);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: Array<{ key: string; day: number | null; ymd: string | null }> = [];
    for (let i = 0; i < startPad; i += 1) {
      out.push({ key: `pad-${i}`, day: null, ymd: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const ymd = ymdLocal(new Date(year, month, day));
      out.push({ key: ymd, day, ymd });
    }
    while (out.length % 7 !== 0) {
      out.push({ key: `trail-${out.length}`, day: null, ymd: null });
    }
    return out;
  }, [year, month]);

  const dayItems = byDay.get(selectedDay) ?? [];
  const selectedLabel = (() => {
    const [y, m, d] = selectedDay.split("-").map(Number);
    if (!y || !m || !d) return selectedDay;
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  })();

  return (
    <View style={styles.wrap}>
      <View style={styles.monthHeader}>
        <Pressable
          onPress={() => setCursor(new Date(year, month - 1, 1))}
          hitSlop={12}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel(year, month)}</Text>
        <Pressable
          onPress={() => setCursor(new Date(year, month + 1, 1))}
          hitSlop={12}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          if (cell.day == null || !cell.ymd) {
            return <View key={cell.key} style={styles.cell} />;
          }
          const dayEvents = byDay.get(cell.ymd) ?? [];
          const selected = cell.ymd === selectedDay;
          const isToday = cell.ymd === ymdLocal(today);
          const dots = Array.from(
            new Set(dayEvents.map((item) => EVENT_DOT[item.type] ?? colors.accent)),
          ).slice(0, 3);

          return (
            <Pressable
              key={cell.key}
              onPress={() => setSelectedDay(cell.ymd!)}
              style={({ pressed }) => [
                styles.cell,
                selected && styles.cellSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  isToday && styles.dayToday,
                  selected && styles.daySelected,
                ]}
              >
                {cell.day}
              </Text>
              <View style={styles.dots}>
                {dots.map((color) => (
                  <View key={color} style={[styles.dot, { backgroundColor: color }]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      <GroupedSection header={selectedLabel}>
        {dayItems.length === 0 ? (
          <ListRow title="Nenhum compromisso neste dia" meta="Toque outro dia no calendário" />
        ) : (
          dayItems.map((item) => (
            <ListRow
              key={item.id}
              title={APPLICATION_EVENT_LABELS[item.type]}
              subtitle={
                showCandidateEmail && item.candidateEmail
                  ? `${item.jobTitle} · ${item.candidateEmail}`
                  : item.jobTitle
              }
              meta={formatInterviewWhen(item.date)}
              accessory={
                <View
                  style={[styles.typeChip, { backgroundColor: `${EVENT_DOT[item.type]}33` }]}
                >
                  <View style={[styles.typeDot, { backgroundColor: EVENT_DOT[item.type] }]} />
                </View>
              }
              onPress={() => onOpenItem(item)}
            />
          ))
        )}
      </GroupedSection>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: spacing.lg,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.accent,
    lineHeight: 28,
  },
  monthTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.ink,
  },
  weekRow: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.muted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.group,
    paddingVertical: spacing.sm,
  },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    gap: 4,
  },
  cellSelected: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.control,
  },
  dayNumber: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
  },
  dayToday: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
  },
  daySelected: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
  },
  dots: {
    flexDirection: "row",
    gap: 3,
    minHeight: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
  },
  typeChip: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  pressed: { opacity: 0.85 },
});
