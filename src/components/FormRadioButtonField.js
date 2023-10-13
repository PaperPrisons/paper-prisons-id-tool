import React from "react";

const FormRadioButtonField = ({
  label,
  checked = false,
  onChange = () => {}
}) => {
  return (
    <div className={"dynamic-form-field dynamic-form-checkbox-field"}>
      <label>
        <input
          type="radio"
          placeholder={label}
          onChange={(e) => onChange(label)}
          checked={checked}
        />
        <span className={"dynamic-form-checkbox-field-checkmark"} />
        <span
          className={"dynamic-form-checkbox-field-label-text"}
          dangerouslySetInnerHTML={{ __html: label }}
        />
      </label>
    </div>
  );
};

export default FormRadioButtonField;
