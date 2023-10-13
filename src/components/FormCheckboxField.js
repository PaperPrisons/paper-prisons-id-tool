import React from "react";

const FormCheckboxField = ({ label, checked = false, onChange = () => {} }) => {
  return (
    <div className={"dynamic-form-field dynamic-form-checkbox-field"}>
      <label>
        <input
          type="checkbox"
          placeholder={label}
          onChange={(e) => onChange(label)}
          checked={checked}
        />
        <span
          className={"dynamic-form-checkbox-field-label-text"}
          dangerouslySetInnerHTML={{ __html: label }}
        />
      </label>
    </div>
  );
};

export default FormCheckboxField;
