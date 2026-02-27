import React, { useCallback, useEffect, useMemo, useState } from "react";

import FormRadioButtonQuestion from "./FormRadioButtonQuestion";
import FormDropDownQuestion from "./FormDropDownQuestion";

const fieldComponents = {
  Radio: FormRadioButtonQuestion,
  Dropdown: FormDropDownQuestion,
};

// Shared results copy for both screen i.e. on the results screen and inside the PDF so both stay aligned.
const THANK_YOU_MESSAGE =
  "Thank you for using our ID tool! If you follow the instructions below, you'll be another step closer to getting your ID:";
const INSTRUCTION_INTRO = "Here is what you need to do:";
const CONTACT_PLACEHOLDER = "Placeholder for test";
const FONT_SCALE_STORAGE_KEY = "paper-prisons-font-scale";
const DEFAULT_FONT_SCALE = 1;
const FONT_SCALE_MIN = 0.9;
const FONT_SCALE_MAX = 1.3;
const FONT_SCALE_STEP = 0.05;

const sanitizeHtmlToText = (html = "") =>
  html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

const normalizeResultMarkup = (html = "") =>
  html
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/\sstyle='[^']*'/gi, "")
    .replace(/<span[^>]*>\s*<\/span>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/\sclass="[^"]*"/gi, "")
    .trim();

const hasVisibleContent = (html = "") =>
  sanitizeHtmlToText(normalizeResultMarkup(html)).length > 0;

const escapeHtml = (text = "") =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getParameterValueByName = (name) => {
  name = name.replace(/[[]/, "\\[").replace(/[\]]/, "\\]");
  const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  const results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
};

const Form = ({ data = {}, output = {} }) => {
  const [end, setEnd] = useState(false);
  const [questionStack, setQuestionStack] = useState([]);
  const [current, setCurrent] = useState();
  const [result, setResult] = useState({});
  const [nextDynamicId, setNextDynamicId] = useState(null);
  const [debug, setDebug] = useState(false);
  const [fontScale, setFontScale] = useState(DEFAULT_FONT_SCALE);
  // Controls the feedback/loading state for the one-click PDF export button.
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const onChange = (id, value, option) => {
    setResult({
      ...result,
      [id]: option,
    });

    const endSurvey = value === "#End";
    const question = data.dynamic[id];
    const staticId = question.staticId;
    let nextDynamicIdFromCurrent = nextDynamicId;
    if (question.isStatic && data.dynamic[value]) {
      nextDynamicIdFromCurrent = value;
    } else if (!question.isStatic && data.dynamic[`${id}${value}`]) {
      nextDynamicIdFromCurrent = `${id}${value}`;
    }
    if (nextDynamicIdFromCurrent) {
      setNextDynamicId(!endSurvey ? nextDynamicIdFromCurrent : null);
    }
    if (staticId < data.static.length - 1 && !endSurvey) {
      setCurrent(data.static[staticId + 1]);
      setQuestionStack(data.static.slice(0, staticId + 2));
    } else if (!endSurvey && nextDynamicIdFromCurrent) {
      setCurrent(data.dynamic[nextDynamicIdFromCurrent]);
      setQuestionStack([
        ...questionStack,
        data.dynamic[nextDynamicIdFromCurrent],
      ]);
    } else {
      setCurrent(null);
      setEnd(true);
    }
  };

  const onPrevious = () => {
    setCurrent(questionStack[questionStack.length - (current ? 2 : 1)]);
    if (current) {
      const newQuestionStack = questionStack.slice(0, -1);
      const newResult = JSON.parse(JSON.stringify(result));
      Object.keys(result).forEach((id) => {
        let flag = false;
        newQuestionStack.forEach((question) => {
          if (question.id == id) {
            flag = true;
          }
        });
        if (!flag) {
          delete newResult[id];
        }
      });
      setResult(newResult);
      setQuestionStack(newQuestionStack);
    }

    setEnd(false);
  };

  const onStartOver = () => {
    window.location.reload();
  };

  useEffect(() => {
    const staticQuestions = data.static;
    if (staticQuestions && staticQuestions.length > 0) {
      setCurrent(staticQuestions[0]);
      setQuestionStack([staticQuestions[0]]);
    }
  }, [data]);

  useEffect(() => {
    setDebug(!!getParameterValueByName("debug"));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    if (!stored) {
      return;
    }
    const parsed = parseFloat(stored);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.min(
        Math.max(parsed, FONT_SCALE_MIN),
        FONT_SCALE_MAX
      );
      setFontScale(clamped);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty(
        "--font-scale",
        fontScale.toString()
      );
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        FONT_SCALE_STORAGE_KEY,
        String(fontScale)
      );
    }
  }, [fontScale]);

  // list of guidance blocks to print in the PDF so we work with
  // plain arrays of HTML strings when the results screen is visible.
  const pdfContent = useMemo(() => {
    if (!end) {
      return {
        summaryItems: [],
        supportingItems: [],
        contactSection: null,
      };
    }

    const summaryItems = [THANK_YOU_MESSAGE, INSTRUCTION_INTRO];
    const supportingItems = [];

    if (Array.isArray(data?.raw)) {
      // Mirror the on-screen split between primary steps and supporting notes.
      data.raw.forEach((question) => {
        const resultOption = result[question.id];
        const outputQuestion = output[question.id];
        if (!resultOption || !outputQuestion) {
          return;
        }

        const html = outputQuestion.options[resultOption];
        if (!html) {
          return;
        }

        const cleanedHtml = normalizeResultMarkup(html);
        if (!hasVisibleContent(cleanedHtml)) {
          return;
        }

        if (question.id === "SSN" || question.id === "Citizenship") {
          supportingItems.push(cleanedHtml);
        } else {
          summaryItems.push(cleanedHtml);
        }
      });
    }

    return {
      summaryItems,
      supportingItems,
      contactSection: CONTACT_PLACEHOLDER,
    };
  }, [end, data.raw, output, result]);

  // NEW: Build a plain-text email body from the same pdfContent
  const emailBody = useMemo(() => {
    if (!end) return "";

    const parts = [];

    const pushClean = (value) => {
      const text = sanitizeHtmlToText(value || "");
      if (text) {
        parts.push(text);
      }
    };

    // Intro
    pushClean(THANK_YOU_MESSAGE);
    pushClean(INSTRUCTION_INTRO);

    // Main guidance
    if (Array.isArray(pdfContent.summaryItems)) {
      pdfContent.summaryItems.forEach((item) => {
        // Avoid duplicating the static intro strings
        if (
          item === THANK_YOU_MESSAGE ||
          item === INSTRUCTION_INTRO
        ) {
          return;
        }
        pushClean(item);
      });
    }

    // Supporting info
    if (
      Array.isArray(pdfContent.supportingItems) &&
      pdfContent.supportingItems.length > 0
    ) {
      parts.push("Additional notes:");
      pdfContent.supportingItems.forEach((item) => pushClean(item));
    }

    // Contact section
    if (pdfContent.contactSection) {
      parts.push("Contact:");
      pushClean(pdfContent.contactSection);
    }

    // Final assembled email text
    return [
      "Hello,",
      "",
      "Here is your Paper Prisons ID guidance based on your answers:",
      "",
      ...parts,
      "",
      "If you have questions or need help, please reach out to the Paper Prisons team.",
      "",
      "- Paper Prisons Project",
    ].join("\n");
  }, [end, pdfContent]);

  const emailHtml = useMemo(() => {
    if (!end) return "";

    const renderGuidanceHtml = (item) => {
      if (!item) return "";
      if (typeof item !== "string") {
        return "";
      }
      const trimmed = item.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("<")) {
        const cleaned = normalizeResultMarkup(trimmed);
        return hasVisibleContent(cleaned)
          ? cleaned
          : `<p>${escapeHtml(sanitizeHtmlToText(trimmed))}</p>`;
      }
      return `<p>${escapeHtml(trimmed)}</p>`;
    };

    const renderSection = (title, items = []) => {
      const htmlItems = items
        .map(renderGuidanceHtml)
        .filter(Boolean)
        .join("");
      if (!htmlItems) {
        return "";
      }
      return `
        <section style="margin-bottom:24px;">
          <h3 style="margin:0 0 12px;font-size:18px;color:#111827;">${escapeHtml(
            title
          )}</h3>
          ${htmlItems}
        </section>
      `;
    };

    const summaryItems = [];
    summaryItems.push(`<p>${escapeHtml(THANK_YOU_MESSAGE)}</p>`);
    summaryItems.push(`<p>${escapeHtml(INSTRUCTION_INTRO)}</p>`);

    if (Array.isArray(pdfContent.summaryItems)) {
      pdfContent.summaryItems.forEach((item) => {
        if (item === THANK_YOU_MESSAGE || item === INSTRUCTION_INTRO) {
          return;
        }
        const rendered = renderGuidanceHtml(item);
        if (rendered) {
          summaryItems.push(rendered);
        }
      });
    }

    const supportingItems = Array.isArray(pdfContent.supportingItems)
      ? pdfContent.supportingItems
          .map(renderGuidanceHtml)
          .filter((item) => !!item)
      : [];

    const contactItems = pdfContent.contactSection
      ? [renderGuidanceHtml(pdfContent.contactSection)].filter(
          (item) => !!item
        )
      : [];

    const sections = [
      renderSection("Your guidance", summaryItems),
      renderSection("Additional notes", supportingItems),
      renderSection("Contact", contactItems),
    ]
      .filter(Boolean)
      .join("");

    if (!sections) {
      return "";
    }

    return `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Paper Prisons ID Guidance</title>
        </head>
        <body style="font-family:Inter,Arial,sans-serif;color:#111827;background-color:#f8fafc;margin:0;padding:24px;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
            <h2 style="margin-top:0;color:#0f172a;font-size:22px;">Your Paper Prisons ID results</h2>
            ${sections}
            <p style="color:#334155;font-size:14px;margin-top:24px;">
              If you have questions or need help, please reply to this email and the Paper Prisons team will assist you.
            </p>
          </div>
        </body>
      </html>`;
  }, [end, pdfContent]);

  const emailEndpoint =
    process.env.NEXT_PUBLIC_EMAIL_ENDPOINT || "http://localhost:8888/send_email.php";

  // Triggers lazy-imported PDF rendering, streams the result to the browser,
  // and provides minimal UX messaging when generation fails.
  const handleDownloadPdf = useCallback(async () => {
    if (!end || isGeneratingPdf) {
      return;
    }

    setPdfError("");
    setIsGeneratingPdf(true);

    try {
      const { buildResultsPdf } = await import("../utils/buildResultsPdf");
      const blob = await buildResultsPdf({
        summaryItems: pdfContent.summaryItems,
        supportingItems: pdfContent.supportingItems,
        contactSection: pdfContent.contactSection,
        generatedAt: new Date(),
      });
      // Use a temporary anchor to prompt the browser download without navigating away.
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `paper-prisons-id-results-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      setPdfError(
        "Sorry, we couldn't create the PDF. Please try again in a moment."
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [end, isGeneratingPdf, pdfContent]);

  const handleFontScaleChange = useCallback((event) => {
    setFontScale(Number(event.target.value));
  }, []);

  const handleFontScaleReset = useCallback(() => {
    setFontScale(DEFAULT_FONT_SCALE);
  }, []);

  const fontScalePercent = Math.round(fontScale * 100);

  return (
    <div className="dynamic-form">
      <div
        className="font-scale-controls"
        role="group"
        aria-labelledby="font-scale-label"
      >
        <label id="font-scale-label" htmlFor="font-scale-range">
          <span>Adjust text size</span>
          <span className="font-scale-value" aria-live="polite">
            {fontScalePercent}%
          </span>
        </label>
        <div className="font-scale-controls-actions">
          <input
            id="font-scale-range"
            className="font-scale-range"
            type="range"
            min={FONT_SCALE_MIN}
            max={FONT_SCALE_MAX}
            step={FONT_SCALE_STEP}
            value={fontScale}
            onChange={handleFontScaleChange}
            onInput={handleFontScaleChange}
            aria-valuemin={FONT_SCALE_MIN}
            aria-valuemax={FONT_SCALE_MAX}
            aria-valuenow={fontScale}
            aria-valuetext={`${fontScalePercent}% text size`}
            aria-describedby="font-scale-help"
          />
          <button
            type="button"
            className="font-scale-reset"
            onClick={handleFontScaleReset}
          >
            Reset
          </button>
        </div>
        <p id="font-scale-help" className="font-scale-value">
          Use the slider or arrow keys to choose the font size that feels most
          comfortable.
        </p>
      </div>
      {debug && (
        <pre
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(result, null, 4),
          }}
        />
      )}
      {debug && (
        <pre
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(output, null, 4),
          }}
        />
      )}
      {!end && current && (
        <div className="question-item-wrapper">
          {questionStack.length > 1 && !end && (
            <>
              {/* <button
                className="dynamic-form-button  arrow"
                onClick={onPrevious}
              >
                <span className="hide-on-mobile">Go Back</span>
                <span className="hide-on-desktop">&larr;</span>
              </button> */}
              <button
                className="dynamic-form-button  arrow"
                onClick={onStartOver}
              >
                <span className="hide-on-mobile">Start Over</span>
                <span className="hide-on-desktop">&larr;</span>
              </button>
            </>
          )}
          <img
            className="question-item-logo"
            src="https://paperprisons.org/images/logo.png"
            alt="Paper Prisons Logo"
          />
          {React.createElement(fieldComponents[current.type], {
            ...current,
            onChange,
            value: result[current.id],
          })}
        </div>
      )}
      {end && (
        <div className="dynamic-form-output">
          {/* Grouping the call-to-action buttons so the layout stays consistent across breakpoints. */}
          <div className="dynamic-form-output-actions">
            <button
              className="dynamic-form-button start-over-button"
              onClick={onStartOver}
            >
              Start Over
            </button>
            <button
              className="dynamic-form-button active"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? "Generating PDF..." : "Download PDF"}
            </button>
          </div>
          {pdfError && (
            <p className="dynamic-form-output-message error">{pdfError}</p>
          )}
          <img
            className="question-item-logo"
            src="https://paperprisons.org/images/logo.png"
            alt="Paper Prisons Logo"
          />
          <div className="dynamic-form-output-item">
            <p className="dynamic-form-output-item-title">
              {THANK_YOU_MESSAGE}
            </p>
            <p className="dynamic-form-output-item-title">
              {INSTRUCTION_INTRO}
            </p>
          </div>
          {data.raw
            .filter((q) => q.id != "SSN" && q.id != "Citizenship")
            .map((question) => {
              const resultOption = result[question.id];
              const outputQuestion = output[question.id];
              if (resultOption && outputQuestion) {
                const html = normalizeResultMarkup(
                  outputQuestion.options[resultOption]
                );
                if (!hasVisibleContent(html)) {
                  return null;
                }
                return (
                  <div key={question.id} className="dynamic-form-output-item">
                    {debug && (
                      <p
                        className="dynamic-form-output-item-title"
                        dangerouslySetInnerHTML={{ __html: question.title }}
                      ></p>
                    )}
                    <div
                      className="dynamic-form-output-item-content"
                      dangerouslySetInnerHTML={{
                        __html: html,
                      }}
                    />
                  </div>
                );
              }
              return null;
            })}
          {data.raw
            .filter((q) => q.id == "SSN" || q.id == "Citizenship")
            .map((question) => {
              const resultOption = result[question.id];
              const outputQuestion = output[question.id];
              if (resultOption && outputQuestion) {
                const html = normalizeResultMarkup(
                  outputQuestion.options[resultOption]
                );
                if (!hasVisibleContent(html)) {
                  return null;
                }
                return (
                  <div key={question.id} className="dynamic-form-output-item">
                    {debug && (
                      <p
                        className="dynamic-form-output-item-title"
                        dangerouslySetInnerHTML={{ __html: question.title }}
                      ></p>
                    )}
                    <div
                      className="dynamic-form-output-item-content"
                      dangerouslySetInnerHTML={{
                        __html: html,
                      }}
                    />
                  </div>
                );
              }
              return null;
            })}

          {/* NEW: Email me my results section */}
          <div className="dynamic-form-output-item">
            <p className="dynamic-form-output-item-title">
              Send these results to my email:
            </p>

            <form
              className="email-form-wrapper"
              method="POST"
              action={emailEndpoint}
            >
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                className="email-field"
                required
              />

              {/* Hidden field sends the guidance text to the PHP mailer */}
              <input
                type="hidden"
                name="message"
                value={emailBody}
                readOnly
              />

              <input
                type="hidden"
                name="subject"
                value="Your Paper Prisons ID results"
                readOnly
              />

              <input
                type="hidden"
                name="message_html"
                value={emailHtml}
                readOnly
              />

              <input
                type="submit"
                value="Email me my guidance"
                className="dynamic-form-button active"
                disabled={!emailBody}
              />
            </form>

            {/* Optional helper text for the user */}
            <p className="dynamic-form-output-message">
              We’ll email exactly what you see in the results above. No extra
              data is shared.
            </p>
          </div>

          <div className="dynamic-form-output-item">
            <p className="dynamic-form-output-item-title">Contact</p>
            {CONTACT_PLACEHOLDER}
          </div>
        </div>
      )}
    </div>
  );
};

export default Form;
