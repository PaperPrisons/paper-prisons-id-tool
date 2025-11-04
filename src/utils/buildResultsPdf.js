import React from "react";

// Convert the guidance HTML (authored in Google Sheets) into plain text so the
// PDF renderer receives predictable, newline-delimited content when we fall
// back to a text-only representation.
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

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

const normalizeInlineText = (text = "") =>
  text.replace(/\u00a0/g, " ").replace(/\s+/g, " ");

const decodeEntities = (value = "") =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&bull;/gi, "•");

const normalizePlainText = (input = "") =>
  decodeEntities(input)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r?\n[\s]*/g, "\n")
    .replace(/[\t ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const buildSegmentsWithRegex = (html = "") => {
  const segments = [];
  if (!html) {
    return segments;
  }

  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let lastIndex = 0;
  const source = decodeEntities(html);

  const pushText = (fragment) => {
    const hasLeadingSpace = /^[\t ]/.test(fragment);
    const hasTrailingSpace = /[\t ]$/.test(fragment);
    let text = normalizePlainText(fragment);
    if (text) {
      if (hasLeadingSpace && !text.startsWith(" ")) {
        text = ` ${text}`;
      }
      if (hasTrailingSpace && !text.endsWith(" ")) {
        text = `${text} `;
      }
      segments.push({ type: "text", text });
    }
  };

  let match;
  while ((match = anchorRegex.exec(source)) !== null) {
    if (match.index > lastIndex) {
      pushText(source.slice(lastIndex, match.index));
    }

    const href = decodeEntities(match[1] || "");
    const label = normalizePlainText(match[2] || "");
    if (label) {
      segments.push({ type: "link", text: label, href });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    pushText(source.slice(lastIndex));
  }

  return segments;
};

const fallbackParseHtmlBlocks = (html = "") => {
  const segments = buildSegmentsWithRegex(html);
  if (segments.length === 0) {
    const text = normalizePlainText(html);
    return text
      ? [
          {
            type: "paragraph",
            segments: [{ type: "text", text }],
          },
        ]
      : [];
  }

  return [
    {
      type: "paragraph",
      segments,
    },
  ];
};

const canUseDocument = typeof document !== "undefined";
const canUseDomParser =
  typeof window !== "undefined" && typeof window.DOMParser !== "undefined";

const createContainerFromHtml = (html = "") => {
  if (!html || !html.trim()) {
    return null;
  }

  if (canUseDocument) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return wrapper;
  }

  if (canUseDomParser) {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
    return doc && doc.body;
  }

  return null;
};

const segmentsContainContent = (segments = []) =>
  segments.some((segment) => {
    if (segment.type === "text" || segment.type === "link") {
      return (segment.text || "").trim().length > 0;
    }
    if (segment.type === "strong" || segment.type === "em") {
      return segmentsContainContent(segment.children);
    }
    return false;
  });

const collectInlineSegments = (node) => {
  const segments = [];

  Array.from(node.childNodes || []).forEach((child) => {
    if (child.nodeType === TEXT_NODE) {
      const text = normalizeInlineText(child.textContent || "");
      if (text.trim()) {
        segments.push({ type: "text", text });
      }
      return;
    }

    if (child.nodeType !== ELEMENT_NODE) {
      return;
    }

    const tag = child.nodeName.toLowerCase();

    if (tag === "br") {
      segments.push({ type: "break" });
      return;
    }

    if (tag === "a") {
      const text = normalizeInlineText(child.textContent || "");
      const href = child.getAttribute("href") || "";
      if (text.trim()) {
        segments.push({ type: "link", text, href });
      }
      return;
    }

    if (tag === "strong" || tag === "b") {
      const children = collectInlineSegments(child);
      if (children.length) {
        segments.push({ type: "strong", children });
      }
      return;
    }

    if (tag === "em" || tag === "i") {
      const children = collectInlineSegments(child);
      if (children.length) {
        segments.push({ type: "em", children });
      }
      return;
    }

    if (tag === "ul" || tag === "ol") {
      // handled separately when constructing list blocks.
      return;
    }

    const nested = collectInlineSegments(child);
    if (nested.length) {
      segments.push(...nested);
    }
  });

  return segments;
};

const parseList = (listNode, level = 0) => {
  const isOrdered = listNode.nodeName.toLowerCase() === "ol";
  const startAttr = parseInt(listNode.getAttribute("start") || "1", 10);
  let counter = Number.isNaN(startAttr) ? 1 : startAttr;
  const items = [];

  Array.from(listNode.children || []).forEach((child) => {
    if (child.nodeType !== ELEMENT_NODE) {
      return;
    }

    if (child.nodeName.toLowerCase() !== "li") {
      return;
    }

    const segments = collectInlineSegments(child);
    if (segmentsContainContent(segments)) {
      items.push({
        level,
        segments,
        listType: isOrdered ? "ordered" : "unordered",
        index: isOrdered ? counter : undefined,
      });
    }

    Array.from(child.childNodes || []).forEach((grandchild) => {
      if (grandchild.nodeType !== ELEMENT_NODE) {
        return;
      }
      const tag = grandchild.nodeName.toLowerCase();
      if (tag === "ul" || tag === "ol") {
        const nestedItems = parseList(grandchild, level + 1);
        if (nestedItems.length) {
          items.push(...nestedItems);
        }
      }
    });

    if (isOrdered) {
      counter += 1;
    }
  });

  return items;
};

const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
]);

const parseHtmlBlocks = (html = "") => {
  const container = createContainerFromHtml(html);

  if (!container) {
    return fallbackParseHtmlBlocks(html);
  }

  const blocks = [];

  const processNode = (node, level = 0) => {
    if (node.nodeType === TEXT_NODE) {
      const text = normalizeInlineText(node.textContent || "");
      if (text.trim()) {
        blocks.push({
          type: "paragraph",
          segments: [{ type: "text", text }],
        });
      }
      return;
    }

    if (node.nodeType !== ELEMENT_NODE) {
      return;
    }

    const tag = node.nodeName.toLowerCase();

    if (BLOCK_TAGS.has(tag)) {
      const segments = collectInlineSegments(node);
      if (segmentsContainContent(segments)) {
        blocks.push({ type: "paragraph", segments });
      }
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const items = parseList(node, level);
      if (items.length) {
        blocks.push({ type: "list", items });
      }
      return;
    }

    if (tag === "br") {
      blocks.push({ type: "paragraph", segments: [{ type: "break" }] });
      return;
    }

    processNodes(node.childNodes, level);
  };

  const processNodes = (nodeList, level = 0) => {
    Array.from(nodeList || []).forEach((child) => {
      processNode(child, level);
    });
  };

  processNodes(container.childNodes, 0);

  const filtered = blocks.filter((block) => {
    if (block.type === "paragraph") {
      return segmentsContainContent(block.segments);
    }
    if (block.type === "list") {
      return block.items.some((item) => segmentsContainContent(item.segments));
    }
    return false;
  });

  if (filtered.length === 0 && /<a\b/i.test(html || "")) {
    return fallbackParseHtmlBlocks(html);
  }

  return filtered;
};

// Lazily import the React PDF runtime, map the prepared sections into a paginated
// document, and resolve the resulting Blob for download.
export const buildResultsPdf = async ({
  summaryItems = [],
  supportingItems = [],
  generatedAt = new Date(),
  contactSection,
  additionalNotes,
} = {}) => {
  const { pdf, Document, Page, Text, View, StyleSheet, Link } = await import(
    "@react-pdf/renderer"
  );

  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 12,
      fontFamily: "Helvetica",
      color: "#111111",
      lineHeight: 1.5,
    },
    header: {
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 12,
    },
    subHeader: {
      fontSize: 12,
      color: "#4b5563",
      marginBottom: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      color: "#1f2933",
    },
    introCard: {
      backgroundColor: "#eef3ff",
      borderLeft: "3pt solid #274b9f",
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
    },
    card: {
      backgroundColor: "#f5f7ff",
      borderLeft: "3pt solid #0c63d6",
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
    },
    cardContent: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
    },
    paragraph: {
      fontSize: 12,
      lineHeight: 1.5,
      color: "#1f2933",
      marginBottom: 8,
      textAlign: "left",
    },
    listRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 6,
    },
    listBullet: {
      width: 14,
      marginRight: 6,
      fontWeight: 700,
      textAlign: "center",
      color: "#0c63d6",
    },
    listContent: {
      flex: 1,
      fontSize: 12,
      lineHeight: 1.5,
      color: "#1f2933",
      textAlign: "left",
    },
    link: {
      color: "#0c63d6",
      textDecoration: "underline",
    },
    linkAnnotation: {
      fontSize: 9,
      color: "#4b5563",
    },
    boldText: {
      fontWeight: 700,
      color: "#161e2e",
    },
    italicText: {
      fontStyle: "italic",
    },
    footer: {
      fontSize: 9,
      color: "#6b7280",
      borderTop: "1pt solid #d1d5db",
      paddingTop: 10,
      marginTop: 24,
      textAlign: "left",
    },
  });

  const mapSectionsToCards = (items = [], keyPrefix = "card") =>
    items
      .map((item, index) => {
        const blocks = parseHtmlBlocks(item);
        if (!blocks.length) {
          return null;
        }
        return {
          key: `${keyPrefix}-${index}`,
          blocks,
        };
      })
      .filter(Boolean);

  const introBlocks = summaryItems.slice(0, 2).flatMap((item) =>
    parseHtmlBlocks(item)
  );

  const summaryCards = mapSectionsToCards(summaryItems.slice(2), "summary");
  const supportingCards = mapSectionsToCards(supportingItems, "support");
  const contactCards = mapSectionsToCards(
    contactSection ? [contactSection] : [],
    "contact"
  );
  const notesCards = mapSectionsToCards(
    additionalNotes ? [additionalNotes] : [],
    "notes"
  );

  const renderInlineSegments = (segments = [], keyPrefix = "segment") => {
    const elements = [];

    segments.forEach((segment, index) => {
      const key = `${keyPrefix}-${index}`;

      if (segment.type === "text") {
        elements.push(
          <Text key={key}>{segment.text || ""}</Text>
        );
        return;
      }

      if (segment.type === "link") {
        const href = (segment.href || "").trim();
        const label = segment.text || href;
        if (href) {
          elements.push(
            <Link key={`${key}-anchor`} src={href} style={styles.link}>
              {label || href}
            </Link>
          );
          if (!label.includes(href)) {
            elements.push(
              <Text key={`${key}-anchor-hint`} style={styles.linkAnnotation}>
                {` (${href})`}
              </Text>
            );
          }
        } else if (segment.text) {
          elements.push(
            <Text key={`${key}-text`}>{segment.text}</Text>
          );
        }
        return;
      }

      if (segment.type === "strong") {
        elements.push(
          <Text key={`${key}-strong`} style={styles.boldText}>
            {renderInlineSegments(segment.children, `${key}-strong`)}
          </Text>
        );
        return;
      }

      if (segment.type === "em") {
        elements.push(
          <Text key={`${key}-em`} style={styles.italicText}>
            {renderInlineSegments(segment.children, `${key}-em`)}
          </Text>
        );
        return;
      }

      if (segment.type === "break") {
        elements.push(
          <Text key={`${key}-break`}>{"\n"}</Text>
        );
      }
    });

    return elements;
  };

  const renderBlocks = (blocks = [], keyPrefix = "block") =>
    blocks.map((block, blockIndex) => {
      const baseKey = `${keyPrefix}-${blockIndex}`;

      if (block.type === "paragraph") {
        return (
          <Text
            key={`${baseKey}-paragraph`}
            style={[
              styles.paragraph,
              blockIndex === blocks.length - 1 ? { marginBottom: 0 } : null,
            ].filter(Boolean)}
          >
            {renderInlineSegments(block.segments, `${baseKey}-paragraph`)}
          </Text>
        );
      }

      if (block.type === "list") {
        return (
          <View key={`${baseKey}-list`}>
            {block.items.map((item, itemIndex) => (
              <View
                key={`${baseKey}-list-${itemIndex}`}
                style={[
                  styles.listRow,
                  item.level > 0 ? { marginLeft: item.level * 12 } : null,
                  blockIndex === blocks.length - 1 &&
                  itemIndex === block.items.length - 1
                    ? { marginBottom: 0 }
                    : null,
                ].filter(Boolean)}
              >
                <Text style={styles.listBullet}>
                  {item.listType === "ordered" && item.index !== undefined
                    ? `${item.index}.`
                    : "•"}
                </Text>
                <Text style={styles.listContent}>
                  {renderInlineSegments(
                    item.segments,
                    `${baseKey}-list-${itemIndex}`
                  )}
                </Text>
              </View>
            ))}
          </View>
        );
      }

      return null;
    });

  const doc = (
    <Document title="Paper Prisons ID Tool Results">
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.section}>
          <Text style={styles.header}>Reentry ID Tool Results</Text>
          <Text style={styles.subHeader}>
            Generated on {formatTimestamp(generatedAt)}
          </Text>
        </View>

        {(introBlocks.length > 0 || summaryCards.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Steps</Text>
            {introBlocks.length > 0 && (
              <View style={styles.introCard}>
                <View style={styles.cardContent}>
                  {renderBlocks(introBlocks, "summary-intro")}
                </View>
              </View>
            )}
            {summaryCards.map((card) => (
              <View key={card.key} style={styles.card}>
                <View style={styles.cardContent}>
                  {renderBlocks(card.blocks, card.key)}
                </View>
              </View>
            ))}
          </View>
        )}

        {supportingCards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Guidance</Text>
            {supportingCards.map((card) => (
              <View key={card.key} style={styles.card}>
                <View style={styles.cardContent}>
                  {renderBlocks(card.blocks, card.key)}
                </View>
              </View>
            ))}
          </View>
        )}

        {contactCards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            {contactCards.map((card) => (
              <View key={card.key} style={styles.card}>
                <View style={styles.cardContent}>
                  {renderBlocks(card.blocks, card.key)}
                </View>
              </View>
            ))}
          </View>
        )}

        {notesCards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            {notesCards.map((card) => (
              <View key={card.key} style={styles.card}>
                <View style={styles.cardContent}>
                  {renderBlocks(card.blocks, card.key)}
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          This PDF is generated for reference only. Confirm requirements with
          your state agency before applying.
        </Text>
      </Page>
    </Document>
  );

  const instance = pdf(doc);
  return instance.toBlob();
};

// Exported helper for tests/future features that need the same sanitised text.
export const plainTextFromHtml = (html) =>
  normalizeWhitespace(htmlToPlainText(html));
