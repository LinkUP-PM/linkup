import { StyleSheet, Text, View } from "react-native";
import type { AnalysisResult, Role } from "@linkup/shared";
import { Card } from "./Card";
import { DimensionCard } from "./DimensionCard";
import { SectionHeader } from "./SectionHeader";
import { colors, fonts, spacing } from "../theme/tokens";

type Props = {
  result: AnalysisResult;
  role: Role;
};

/** Filtra o mesmo AnalysisResult conforme o papel (sem segunda chamada de IA). */
export function DossierAnalysis({ result, role }: Props) {
  const showAttention = role === "CANDIDATE" || role === "RECRUITER";
  const showSuggestions = role === "CANDIDATE";
  const showStructureClarity = role === "CANDIDATE";
  const showKeywords = role === "CANDIDATE" || role === "RECRUITER";

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Pontos fortes" tone="strengths" count={result.strengths.length} />
      {result.strengths.map((item) => (
        <Card key={item.title} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>{item.detail}</Text>
        </Card>
      ))}

      {showAttention ? (
        <>
          <SectionHeader
            title="Pontos de atenção"
            tone="attention"
            count={result.attentionPoints.length}
          />
          {result.attentionPoints.map((item) => (
            <Card key={item.title} style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.detail}</Text>
            </Card>
          ))}
        </>
      ) : null}

      {showSuggestions ? (
        <>
          <SectionHeader title="Sugestões" tone="suggestions" count={result.suggestions.length} />
          {result.suggestions.map((item) => (
            <Card key={item.action} style={styles.card}>
              <Text style={styles.cardTitle}>{item.action}</Text>
              <Text style={styles.cardBody}>{item.why}</Text>
              {item.example ? <Text style={styles.example}>Ex.: {item.example}</Text> : null}
            </Card>
          ))}
        </>
      ) : null}

      {showStructureClarity || showKeywords || role === "EMPLOYER" || role === "RECRUITER" ? (
        <SectionHeader
          title={role === "EMPLOYER" ? "Competências" : "Leitura por dimensão"}
          tone="neutral"
        />
      ) : null}

      {showStructureClarity ? (
        <>
          <DimensionCard title="Estrutura" summary={result.dimensions.structure.summary} />
          <DimensionCard title="Clareza" summary={result.dimensions.clarity.summary} />
        </>
      ) : null}

      <DimensionCard
        title="Competências"
        summary={result.dimensions.skills.summary}
        present={result.dimensions.skills.identified}
        missing={role === "CANDIDATE" ? result.dimensions.skills.missing : undefined}
        presentLabel="Identificadas"
        missingLabel="Em falta"
      />

      {showKeywords ? (
        <DimensionCard
          title="Palavras-chave"
          summary={result.dimensions.keywords.summary}
          present={result.dimensions.keywords.present}
          missing={role === "CANDIDATE" ? result.dimensions.keywords.missing : undefined}
          presentLabel="Presentes"
          missingLabel="Pouco visíveis"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  cardTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 17,
    color: colors.ink,
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
  },
  example: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
});
