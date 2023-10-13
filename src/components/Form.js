import React, { useEffect, useState } from "react";

import FormCheckboxQuestion from "./FormCheckboxQuestion";
import FormRadioButtonQuestion from "./FormRadioButtonQuestion";
import FormDropDownQuestion from "./FormDropDownQuestion";
import FormText from "./FormText";

const fieldComponents = {
  checkbox: FormCheckboxQuestion,
  radio: FormRadioButtonQuestion,
  dropdown: FormDropDownQuestion,
  text: FormText
};

const Form = ({ data = [], onSubmit = () => {}, questionFlow = {} }) => {
  const [current, setCurrent] = useState("");
  const [surveyResult, setSurveyResult] = useState({});
  const onChange = (id, value) => {
    setSurveyResult({
      ...surveyResult,
      [id]: value
    });
  };

  useEffect(() => {
    setCurrent(data[0]?.id);
  }, [data]);

  const onNext = () => {
    setCurrent(questionFlow.next[current][surveyResult[current]]);
  };
  // setCurrent(
  //   surveyResult.current
  // );

  const onPrevious = () => setCurrent(questionFlow.prev[current]);
  return (
    <div className="dynamic-form">
      {data.map((q, index) =>
        q.id === current ? (
          <div className="questionWrapper">
            <img
              alt="logo"
              src="https://paperprisons.org/images/logo.png"
              className="logo"
            />
            {React.createElement(fieldComponents[q.type], {
              ...q,
              key: q.id,
              value: surveyResult[q.id] || null,
              onChange
            })}
            <div className="dynamic-form-buttons">
              {current !== data[0].id && (
                <button onClick={onPrevious}>Previous</button>
              )}
              {/* {current !== data[data.length - 1].id &&
                surveyResult[data[current]?.id]?.length > 0 && ( */}
              {questionFlow.next[current][surveyResult[current]] && (
                <button onClick={onNext}>Next</button>
              )}
              {/* {current === data[data.length - 1].id &&
                surveyResult[data[current]?.id]?.length > 0 && (
                  <button onClick={() => onSubmit(surveyResult)}>Submit</button>
                )} */}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
};

export default Form;
