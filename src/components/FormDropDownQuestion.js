import React, { useState, useEffect, useRef } from "react";

const FormDropDownQuestion = ({
  id = "",
  title = "",
  description = "",
  options = [],
  value = "",
  onChange = () => {},
}) => {
  const selectRef = useRef(null);
  const [active, setActive] = useState(false);
  const [checked, setChecked] = useState(value);
  const onOptionSelected = (v, o) => {
    setChecked(o);
    setActive(false);
    onChange(id, v, o);
  };
  const onOptionsToggle = () => setActive(!active);

  const handleClickOutside = (event) => {
    if (selectRef.current && !selectRef.current.contains(event.target)) {
      setActive(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={selectRef}
      className={"dynamic-form-field dynamic-form-dropdown-question"}
    >
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
      <div className="dynamic-form-dropdown-question-options-wrapper">
        <label onClick={onOptionsToggle}>
          {checked
            ? options.filter((o) => o.option === checked)[0].label
            : "Please select an option"}
        </label>
        {active && (
          <ul className="dynamic-form-select-field-options">
            {options.map((v, index) => (
              <li
                key={index}
                onClick={() => onOptionSelected(v.value, v.option)}
                className={
                  checked === v.option
                    ? "dynamic-form-select-field-option-active"
                    : ""
                }
              >
                {v.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FormDropDownQuestion;
