import React from "react";

const FormText = ({ title = "", options = [] }) => {
  return (
    <div className={"dynamic-form-field dynamic-form-checkbox-field"}>
      <h2 className="sectionTitle"> {title}</h2>
      <p dangerouslySetInnerHTML={{ __html: options.join("<br>") }}></p>
    </div>
  );
};

export default FormText;
