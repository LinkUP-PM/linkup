import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, spacing, type } from "../theme/tokens";

export type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function SearchableSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecionar",
  disabled = false,
  emptyMessage = "Nenhuma opção encontrada.",
}: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = useMemo(() => {
    const match = options.find((item) => item.value === value);
    return match?.label ?? value;
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return options;
    return options.filter(
      (item) => normalize(item.label).includes(q) || normalize(item.value).includes(q),
    );
  }, [options, query]);

  function openModal() {
    if (disabled) return;
    setQuery("");
    setOpen(true);
  }

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        onPress={openModal}
        disabled={disabled}
        style={[styles.input, disabled && styles.inputDisabled]}
      >
        <Text style={value ? styles.value : styles.placeholder} numberOfLines={1}>
          {value ? selectedLabel : placeholder}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View
          style={[
            styles.modal,
            {
              paddingTop: Math.max(insets.top, spacing.md),
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <Text style={styles.close}>Fechar</Text>
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Digite para filtrar"
            placeholderTextColor={colors.tertiary}
            style={styles.search}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  onPress={() => choose(item.value)}
                  style={[styles.option, active && styles.optionActive]}
                >
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  inputDisabled: {
    opacity: 0.45,
  },
  value: {
    ...type.body,
    color: colors.ink,
    flex: 1,
  },
  placeholder: {
    ...type.body,
    color: colors.tertiary,
    flex: 1,
  },
  chevron: {
    color: colors.tertiary,
    fontSize: 22,
    lineHeight: 22,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...type.headline,
    color: colors.ink,
  },
  close: {
    ...type.body,
    color: colors.accent,
    fontFamily: fonts.bodySemi,
  },
  search: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.input,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    ...type.body,
  },
  option: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  optionActive: {
    backgroundColor: colors.accentSoft,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.input,
  },
  optionLabel: {
    ...type.body,
    color: colors.ink,
  },
  optionLabelActive: {
    color: colors.accent,
    fontFamily: fonts.bodySemi,
  },
  empty: {
    ...type.body,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
