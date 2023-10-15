import React from "react";

const FormRadioButtonField = ({
  label,
  value,
  option,
  checked = false,
  onChange = () => {},
}) => {
  return (
    <div
      className={`dynamic-form-field dynamic-form-radio-button-field ${
        checked ? "dynamic-form-radio-button-field-checked" : ""
      }`}
    >
      <label>
        <input
          type="radio"
          placeholder={value}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onChange(value, option);
          }}
          checked={checked}
          onChange={() => {}}
        />
        <span
          className={"dynamic-form-radio-button-field-label-text"}
          dangerouslySetInnerHTML={{ __html: label }}
        />
      </label>
    </div>
  );
};

export default FormRadioButtonField;
