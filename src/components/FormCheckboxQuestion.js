import React, { useState } from "react";
import FormCheckboxField from "./FormCheckboxField";

const FormCheckboxQuestion = ({
  id = "",
  title = "",
  options = [],
  value = [],
  onChange = () => {}
}) => {
  const [checked, setChecked] = useState(value || []);
  const onCheckedHandler = (v) => {
    const idx = checked.indexOf(v);
    let newValue = [...checked, v];
    if (idx !== -1) {
      newValue = [...checked.slice(0, idx), ...checked.slice(idx + 1)];
    }
    onChange(id, newValue);
    setChecked(newValue);
  };
  return (
    <div className={"dynamic-form-field dynamic-form-checkbox-question"}>
      <h2
        dangerouslySetInnerHTML={{ __html: title }}
        className="questionTitle"
      />
      {options.map((option, idx) => {
        if (typeof option === "string" || option instanceof String) {
          return (
            <FormCheckboxField
              key={`${idx}`}
              label={option}
              checked={checked.indexOf(option) > -1}
              onChange={onCheckedHandler}
            />
          );
        }
        return (
          <div key={`${idx}`}>
            <p
              className="sectionTitle"
              dangerouslySetInnerHTML={{ __html: option.title }}
            />
            {option.options.map((oop, idxx) => (
              <FormCheckboxField
                key={`${idxx}`}
                label={oop}
                checked={checked.indexOf(oop) > -1}
                onChange={onCheckedHandler}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default FormCheckboxQuestion;
