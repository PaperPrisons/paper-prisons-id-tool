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

  const onChange = (id, value) => {
    setResult({
      ...result,
      [id]: value,
    });
    const staticId = data.dynamic[id].staticId;
    if (staticId < data.static.length - 1) {
      setPrev(current);
      setCurrent(data.static[staticId + 1]);
    } else {
      console.log("Finished static questions");
    }
  };

  useEffect(() => {
    const staticQuestions = data.static?.filter((q) => q.flowType === "Static");
    console.log(staticQuestions);
    if (staticQuestions && staticQuestions.length > 0) {
      setCurrent(staticQuestions[0]);
    }
  }, [data]);

  return (
    <div className="dynamic-form">
      {current &&
        React.createElement(fieldComponents[current.type], {
          ...current,
          onChange,
        })}
    </div>
  );
};

export default Form;
