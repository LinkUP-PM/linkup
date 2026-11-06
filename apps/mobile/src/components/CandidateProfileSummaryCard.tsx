import { StyleSheet, Text, View } from "react-native";
import type { CandidateProfileSummary } from "@linkup/shared";
import { EDUCATION_LEVEL_LABELS } from "@linkup/shared";
import { colors, fonts, spacing, type } from "../theme/tokens";

type Props = {
  profile: CandidateProfileSummary;
  email?: string | null;
};

export function CandidateProfileSummaryCard({ profile, email }: Props) {
  const location =
    profile.city && profile.state
      ? `${profile.city}/${profile.state}`
      : profile.city || profile.state || null;
  const education = profile.latestEducation
    ? `${EDUCATION_LEVEL_LABELS[profile.latestEducation.level]} · ${profile.latestEducation.course} · ${profile.latestEducation.institution}`
    : null;
  const experience = profile.latestExperience
    ? `${profile.latestExperience.role} · ${profile.latestExperience.company}`
    : null;

  return (
    <View style={styles.box}>
      <Text style={styles.name}>{profile.fullName}</Text>
      {location ? <Text style={styles.meta}>{location}</Text> : null}
      {email ? <Text style={styles.meta}>{email}</Text> : null}
      {profile.objective ? <Text style={styles.objective}>{profile.objective}</Text> : null}
      {education ? (
        <Text style={styles.line}>
          <Text style={styles.label}>Formação: </Text>
          {education}
        </Text>
      ) : null}
      {experience ? (
        <Text style={styles.line}>
          <Text style={styles.label}>Experiência: </Text>
          {experience}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 4,
    marginBottom: spacing.sm,
  },
  name: {
    ...type.title3,
    color: colors.ink,
    fontFamily: fonts.bodySemi,
  },
  meta: {
    ...type.caption1,
    color: colors.muted,
  },
  objective: {
    ...type.body,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  line: {
    ...type.caption1,
    color: colors.muted,
    marginTop: 2,
  },
  label: {
    fontFamily: fonts.bodySemi,
    color: colors.muted,
  },
});
