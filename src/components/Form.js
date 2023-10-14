import React, { useEffect, useState } from "react";

import FormRadioButtonQuestion from "./FormRadioButtonQuestion";
import FormDropDownQuestion from "./FormDropDownQuestion";

const fieldComponents = {
  Radio: FormRadioButtonQuestion,
  Dropdown: FormDropDownQuestion,
};

const Form = ({ data = {}, onSubmit = () => {} }) => {
  const [end, setEnd] = useState(false);
  const [prev, setPrev] = useState(null);
  const [current, setCurrent] = useState();
  const [result, setResult] = useState({});
  const [nextDynamicId, setNextDynamicId] = useState(null);

  const onChange = (id, value) => {
    setResult({
      ...result,
      [id]: value,
    });
    const question = data.dynamic[id];
    console.log(data.dynamic);
    const staticId = question.staticId;
    let nextDynamicIdFromCurrent = null;
    if (question.isStatic && data.dynamic[value]) {
      nextDynamicIdFromCurrent = value;
    } else if (
      !question.isStatic &&
      data.dynamic[`${id}${data.dynamic[value]}`]
    ) {
      nextDynamicIdFromCurrent = `${id}${data.dynamic[value]}`;
    }
    if (nextDynamicIdFromCurrent) {
      setNextDynamicId(nextDynamicIdFromCurrent);
    }
    if (staticId < data.static.length - 1) {
      setPrev(current);
      setCurrent(data.static[staticId + 1]);
    } else if (!end && !nextDynamicIdFromCurrent) {
      setPrev(current);
      setCurrent(data.dynamic[nextDynamicIdFromCurrent || nextDynamicId]);
    } else {
      setEnd(true);
    }
  };

  useEffect(() => {
    const staticQuestions = data.static;
    if (staticQuestions && staticQuestions.length > 0) {
      setCurrent(staticQuestions[0]);
    }
  }, [data]);

  return (
    <div className="dynamic-form">
      {!end &&
        current &&
        React.createElement(fieldComponents[current.type], {
          ...current,
          onChange,
        })}
      {end && <pre>{JSON.stringify(result, null, 4)}</pre>}
    </div>
  );
};

export default Form;
