import React, { useState, useEffect } from "react";
import FormRadioButtonField from "./FormRadioButtonField";

const FormRadioButtonQuestion = ({
  id = "",
  title = "",
  description = "",
  options = [],
  value = "",
  onChange = () => {},
}) => {
  const [checked, setChecked] = useState(value);
  const onCheckedHandler = (v, o) => {
    setChecked(v);
    onChange(id, v, o);
  };
  useEffect(() => {
    setChecked(value);
  }, [value, id]);
  return (
    <div className={"dynamic-form-field dynamic-form-radio-question"}>
      <p
        dangerouslySetInnerHTML={{ __html: title }}
        className="dynamic-form-field-question-title"
      />
      {description && (
        <p
          dangerouslySetInnerHTML={{ __html: description }}
          className="dynamic-form-field-question-description"
        />
      )}
      {options.map((option) => {
        return (
          <FormRadioButtonField
            key={option.label}
            label={option.label}
            value={option.value}
            option={option.option}
            checked={checked === option.option}
            onChange={onCheckedHandler}
          />
        );
      })}
    </div>
  );
};

export default FormRadioButtonQuestion;
