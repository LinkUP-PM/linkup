import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Job } from "@linkup/shared";
import {
  JOB_CONTRACT_TYPE_LABELS,
  JOB_SENIORITY_LABELS,
  WORK_MODEL_LABELS,
} from "@linkup/shared";
import { formatBrazilMoneyFromReais } from "../lib/money";
import { colors, fonts, radius, spacing, type } from "../theme/tokens";

type PreviewJob = Pick<
  Job,
  | "title"
  | "description"
  | "lookingFor"
  | "seniority"
  | "contractType"
  | "openings"
  | "pcdExclusive"
  | "workModel"
  | "city"
  | "state"
  | "responsibilities"
  | "requirements"
  | "niceToHave"
  | "benefits"
  | "salaryMin"
  | "salaryMax"
  | "additionalInfo"
  | "stages"
>;

function formatSalary(min: number | null, max: number | null): string | null {
  if (min == null || max == null) return null;
  const lo = formatBrazilMoneyFromReais(min);
  const hi = formatBrazilMoneyFromReais(max);
  if (!lo || !hi) return null;
  if (min === max) return lo;
  return `${lo} – ${hi}`;
}

function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

export function JobPreview({ job }: { job: PreviewJob }) {
  const location =
    job.workModel === "REMOTE" || job.workModel === "FLEXIBLE"
      ? job.workModel
        ? WORK_MODEL_LABELS[job.workModel]
        : null
      : [job.city, job.state].filter(Boolean).join(", ") || null;

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const requirements =
    job.requirements.length > 0
      ? job.requirements
      : job.lookingFor
        ? job.lookingFor.split(";").map((s) => s.trim()).filter(Boolean)
        : [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{job.title || "Sem título"}</Text>

      <View style={styles.pills}>
        {job.seniority ? <MetaPill label={JOB_SENIORITY_LABELS[job.seniority]} /> : null}
        {job.contractType ? (
          <MetaPill label={JOB_CONTRACT_TYPE_LABELS[job.contractType]} />
        ) : null}
        {job.workModel ? <MetaPill label={WORK_MODEL_LABELS[job.workModel]} /> : null}
        {location && job.workModel !== "REMOTE" && job.workModel !== "FLEXIBLE" ? (
          <MetaPill label={location} />
        ) : null}
        {job.openings > 1 ? <MetaPill label={`${job.openings} posições`} /> : null}
        {job.pcdExclusive ? <MetaPill label="Exclusiva PCD" /> : null}
      </View>

      {job.description.trim() ? (
        <Section title="Sobre a vaga">
          <Text style={styles.body}>{job.description}</Text>
        </Section>
      ) : null}

      {job.responsibilities.trim() ? (
        <Section title="Atribuições">
          <Text style={styles.body}>{job.responsibilities}</Text>
        </Section>
      ) : null}

      {requirements.length > 0 ? (
        <Section title="Requisitos">
          {requirements.map((item) => (
            <Text key={item} style={styles.bullet}>
              • {item}
            </Text>
          ))}
        </Section>
      ) : null}

      {job.niceToHave.length > 0 ? (
        <Section title="Desejável">
          {job.niceToHave.map((item) => (
            <Text key={item} style={styles.bullet}>
              • {item}
            </Text>
          ))}
        </Section>
      ) : null}

      {job.benefits.length > 0 || salary ? (
        <Section title="Oferta">
          {salary ? <Text style={styles.body}>{salary}</Text> : null}
          {job.benefits.length > 0 ? (
            <View style={styles.pills}>
              {job.benefits.map((b) => (
                <MetaPill key={b} label={b} />
              ))}
            </View>
          ) : null}
        </Section>
      ) : null}

      {job.additionalInfo.trim() ? (
        <Section title="Informações adicionais">
          <Text style={styles.body}>{job.additionalInfo}</Text>
        </Section>
      ) : null}

      {job.stages.length > 0 ? (
        <Section title="Etapas do processo">
          {job.stages.map((stage, index) => (
            <View key={`${stage.label}-${index}`} style={styles.stage}>
              <Text style={styles.stageLabel}>
                {index + 1}. {stage.label}
              </Text>
              {stage.note.trim() ? (
                <Text style={styles.stageNote}>{stage.note}</Text>
              ) : null}
            </View>
          ))}
        </Section>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  title: {
    ...type.title2,
    color: colors.ink,
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  pill: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillText: {
    ...type.footnote,
    fontFamily: fonts.bodySemi,
    color: colors.accent,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...type.footnote,
    fontFamily: fonts.bodySemi,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  body: {
    ...type.body,
    color: colors.ink,
  },
  bullet: {
    ...type.body,
    color: colors.ink,
  },
  stage: {
    gap: 2,
    paddingVertical: spacing.xs,
  },
  stageLabel: {
    ...type.callout,
    fontFamily: fonts.bodySemi,
    color: colors.ink,
  },
  stageNote: {
    ...type.subhead,
    color: colors.muted,
  },
});
