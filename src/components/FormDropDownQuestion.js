import React, { useState } from "react";

const FormDropDownQuestion = ({
  id = "",
  title = "",
  options = [],
  value = "",
  onChange = () => {}
}) => {
  const [active, setActive] = useState(false);
  const [checked, setChecked] = useState(value);
  const onOptionSelected = (v) => {
    setChecked(v);
    setActive(false);
    onChange(id, v);
  };
  const onOptionsToggle = () => setActive(!active);

  return (
    <div className={"dynamic-form-field dynamic-form-dropdown-question"}>
      <p
        dangerouslySetInnerHTML={{ __html: title }}
        className="questionTitle"
      />
      <label onClick={onOptionsToggle}>
        {checked || "Please select an option"}
      </label>
      {active && (
        <ul className="dynamic-form-select-field-options">
          {options.map((v, index) => (
            <li
              key={index}
              onClick={() => onOptionSelected(v)}
              className={
                checked === v ? "dynamic-form-select-field-option-active" : ""
              }
            >
              {v}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FormDropDownQuestion;
