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

        if (question.id === "SSN" || question.id === "Citizenship") {
          supportingItems.push(html);
        } else {
          summaryItems.push(html);
        }
      });
    }

    return {
      summaryItems,
      supportingItems,
      contactSection: CONTACT_PLACEHOLDER,
    };
  }, [end, data.raw, output, result]);

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

  return (
    <div className="dynamic-form">
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
                return (
                  <div key={question.id} className="dynamic-form-output-item">
                    {debug && (
                      <p
                        className="dynamic-form-output-item-title"
                        dangerouslySetInnerHTML={{ __html: question.title }}
                      ></p>
                    )}
                    <p
                      dangerouslySetInnerHTML={{
                        __html: outputQuestion.options[resultOption],
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
                return (
                  <div key={question.id} className="dynamic-form-output-item">
                    {debug && (
                      <p
                        className="dynamic-form-output-item-title"
                        dangerouslySetInnerHTML={{ __html: question.title }}
                      ></p>
                    )}
                    <p
                      dangerouslySetInnerHTML={{
                        __html: outputQuestion.options[resultOption],
                      }}
                    />
                  </div>
                );
              }
              return null;
            })}
          <div className="dynamic-form-output-item">
            <p className="dynamic-form-output-item-title">
              Send the result to as email:
            </p>
            <div className="email-form-wrapper">
              <input
                type="text"
                id="email"
                name="email"
                placeholder="Email"
                className="email-field"
              />
              <input
                type="submit"
                value="Submit"
                className="dynamic-form-button active"
              />
            </div>
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
