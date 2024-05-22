import React, { useEffect, useState } from "react";

import FormRadioButtonQuestion from "./FormRadioButtonQuestion";
import FormDropDownQuestion from "./FormDropDownQuestion";

const fieldComponents = {
  Radio: FormRadioButtonQuestion,
  Dropdown: FormDropDownQuestion,
};

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
            <button className="dynamic-form-button  arrow" onClick={onPrevious}>
              <span className="hide-on-mobile">Go Back</span>
              <span className="hide-on-desktop">&larr;</span>
            </button>
          )}
          <img
            className="question-item-logo"
            src="https://paperprisons.org/images/logo.png"
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
          <button className="dynamic-form-button arrow" onClick={onPrevious}>
            <span className="hide-on-mobile">Go Back</span>
            <span className="hide-on-desktop">&larr;</span>
          </button>
          <button
            className="dynamic-form-button start-over-button"
            onClick={onStartOver}
          >
            Start Over
          </button>
          <img
            className="question-item-logo"
            src="https://paperprisons.org/images/logo.png"
          />
          <div className="dynamic-form-output-item">
            <p className="dynamic-form-output-item-title">
              Thank you for using our ID tool! If you follow the instructions
              below, you'll be another step closer to getting your ID:
            </p>
            <p className="dynamic-form-output-item-title">
              Here is what you need to do:
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
            Placeholder for test
          </div>
        </div>
      )}
    </div>
  );
};

export default Form;
