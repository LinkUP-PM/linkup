import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Resume } from "@linkup/shared";
import { listResumes } from "../lib/api";
import { colors, fonts, radius, spacing, type } from "../theme/tokens";
import { ListRow } from "./ListRow";
import { PrimaryButton } from "./PrimaryButton";

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  visible: boolean;
  title?: string;
  /** Ação extra abaixo da lista (ex.: PDF avulso no reenvio). */
  extraLabel?: string;
  onExtra?: () => void;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onSelect: (resume: Resume) => void;
  onClose: () => void;
};

export function PickResumeSheet({
  visible,
  title = "Qual currículo encaminhar?",
  extraLabel,
  onExtra,
  emptyActionLabel,
  onEmptyAction,
  onSelect,
  onClose,
}: Props) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listResumes()
      .then((items) => {
        if (!cancelled) setResumes(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar os currículos.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const ordered = useMemo(
    () => [
      ...resumes.filter((r) => r.kind === "MAIN"),
      ...resumes.filter((r) => r.kind === "FOCUSED"),
    ],
    [resumes],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={styles.spinner} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : ordered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyBody}>
                Ainda não há currículo no perfil. Salve o principal para candidatar-se com um toque.
              </Text>
              {emptyActionLabel && onEmptyAction ? (
                <PrimaryButton label={emptyActionLabel} onPress={onEmptyAction} />
              ) : null}
            </View>
          ) : (
            <ScrollView style={styles.list}>
              <View style={styles.group}>
                {ordered.map((item, index) => (
                  <View key={item.id}>
                    {index > 0 ? <View style={styles.separator} /> : null}
                    <ListRow
                      title={item.label}
                      subtitle={item.fileName}
                      meta={formatBytes(item.fileSizeBytes)}
                      onPress={() => onSelect(item)}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {extraLabel && onExtra && ordered.length > 0 ? (
            <PrimaryButton
              label={extraLabel}
              variant="secondary"
              onPress={onExtra}
              style={styles.extra}
            />
          ) : null}

          <PrimaryButton label="Cancelar" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.scrim,
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.group,
    borderTopRightRadius: radius.group,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: "78%",
    gap: spacing.md,
  },
  title: {
    ...type.title3,
    color: colors.ink,
  },
  spinner: {
    marginVertical: spacing.xl,
  },
  list: {
    maxHeight: 320,
  },
  group: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.group,
    overflow: "hidden",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: spacing.lg,
  },
  empty: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
  },
  extra: {
    marginTop: spacing.xs,
  },
});
