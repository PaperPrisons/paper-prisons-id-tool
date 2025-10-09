import React from "react";

// Convert the guidance HTML (authored in Google Sheets) into plain text so the
// PDF renderer receives predictable, newline-delimited content.
const htmlToPlainText = (html = "") =>
  html
    // list items become bullet prefixed lines for readability.
    .replace(/<\/?li>/gi, (tag) => (tag[1] === "/" ? "\n" : "\u2022 "))
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/?p>/gi, "\n")
    .replace(/<\/?strong>/gi, "")
    .replace(/<\/?em>/gi, "")
    .replace(/<\/?ul>/gi, "")
    .replace(/<\/?ol>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

// Collapse blank lines and stray spacing so paragraphs wrap neatly inside a
// single PDF page without unexpected gaps.
const normalizeWhitespace = (input = "") =>
  input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

// Present the generation timestamp in a friendly, localized format.
const formatTimestamp = (date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);

// Lazily import the React PDF runtime, map the prepared sections into a single
// Letter page document, and resolve the resulting Blob for download.
export const buildResultsPdf = async ({
  summaryItems = [],
  supportingItems = [],
  generatedAt = new Date(),
  contactSection,
  additionalNotes,
} = {}) => {
  const { pdf, Document, Page, Text, View, StyleSheet } = await import(
    "@react-pdf/renderer"
  );

  const styles = StyleSheet.create({
    page: {
      padding: 32,
      fontSize: 11,
      fontFamily: "Helvetica",
      color: "#111111",
      lineHeight: 1.35,
    },
    header: {
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 8,
    },
    subHeader: {
      fontSize: 12,
      color: "#555555",
      marginBottom: 16,
    },
    section: {
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 6,
    },
    listItem: {
      marginBottom: 4,
    },
    footer: {
      fontSize: 9,
      color: "#777777",
      borderTop: "1pt solid #dddddd",
      paddingTop: 8,
      marginTop: 12,
    },
  });

  // Strip formatting from each content bucket the UI passes in.
  const cleanSummary = summaryItems
    .map((item) => normalizeWhitespace(htmlToPlainText(item)))
    .filter(Boolean);

  const cleanSupporting = supportingItems
    .map((item) => normalizeWhitespace(htmlToPlainText(item)))
    .filter(Boolean);

  const cleanContact = contactSection
    ? normalizeWhitespace(htmlToPlainText(contactSection))
    : null;

  const cleanNotes = additionalNotes
    ? normalizeWhitespace(htmlToPlainText(additionalNotes))
    : null;

  // Build a single-page document; long strings wrap but stay on the first page
  // because we trim extraneous whitespace above.
  const doc = (
    <Document title="Paper Prisons ID Tool Results">
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.section}>
          <Text style={styles.header}>Reentry ID Tool Results</Text>
          <Text style={styles.subHeader}>
            Generated on {formatTimestamp(generatedAt)}
          </Text>
        </View>

        {cleanSummary.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Steps</Text>
            {cleanSummary.map((item, index) => (
              <Text style={styles.listItem} key={`summary-${index}`}>
                {item}
              </Text>
            ))}
          </View>
        )}

        {cleanSupporting.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Guidance</Text>
            {cleanSupporting.map((item, index) => (
              <Text style={styles.listItem} key={`support-${index}`}>
                {item}
              </Text>
            ))}
          </View>
        )}

        {cleanContact && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <Text style={styles.listItem}>{cleanContact}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          This PDF is generated for reference only. Confirm requirements with
          your state agency before applying.
        </Text>

        {cleanNotes && (
          <Text style={styles.footer}>{cleanNotes}</Text>
        )}
      </Page>
    </Document>
  );

  const instance = pdf(doc);
  return instance.toBlob();
};

// Exported helper for tests/future features that need the same sanitised text.
export const plainTextFromHtml = (html) =>
  normalizeWhitespace(htmlToPlainText(html));
