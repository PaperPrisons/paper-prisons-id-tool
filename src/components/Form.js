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
    current && setQuestionStack(questionStack.slice(0, -1));
    setEnd(false);
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
      {questionStack.length > 1 && !end && (
        <button className="dynamic-form-go-back-button" onClick={onPrevious}>
          Go Back
        </button>
      )}
      {!end &&
        current &&
        React.createElement(fieldComponents[current.type], {
          ...current,
          onChange,
          value: result[current.id],
        })}
      {end && (
        <div className="dynamic-form-output">
          {data.raw.map((question) => {
            const resultOption = result[question.id];
            const outputQuestion = output[question.id];
            if (resultOption && outputQuestion) {
              return (
                <div key={question.id} className="dynamic-form-output-item">
                  <p
                    className="dynamic-form-output-item-title"
                    dangerouslySetInnerHTML={{ __html: question.title }}
                  ></p>
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
        </div>
      )}
    </div>
  );
};

export default Form;
