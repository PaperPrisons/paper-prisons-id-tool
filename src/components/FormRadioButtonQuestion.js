import React, { useState } from "react";
import FormRadioButtonField from "./FormRadioButtonField";

const FormRadioButtonQuestion = ({
  id = "",
  title = "",
  options = [],
  value = "",
  onChange = () => {},
}) => {
  const [checked, setChecked] = useState(value);
  const onCheckedHandler = (v) => {
    setChecked(v);
    onChange(id, v);
  };
  return (
    <div className={"dynamic-form-field dynamic-form-radio-question"}>
      <p
        dangerouslySetInnerHTML={{ __html: title }}
        className="questionTitle"
      />
      {options.map((option) => {
        return (
          <FormRadioButtonField
            key={option.label}
            label={option.label}
            checked={checked === option.value}
            onChange={onCheckedHandler}
          />
        );
      })}
    </div>
  );
};

export default FormRadioButtonQuestion;
