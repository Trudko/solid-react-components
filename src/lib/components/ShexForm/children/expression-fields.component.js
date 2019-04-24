import React, { Fragment, useState } from "react";
import { shexFormLabel, findAnnotation, allowNewFields } from "@utils";
import styled from "styled-components";
const InputWrapper = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  position: relative;
`;
const DeleteButton = styled.button`
display: ${({ show }) => (show ? "flex" : "none")}
position: absolute;
right: 8px;
color: red;
border: none;
background: none;
cursor: pointer;
`;
type FieldsProps = {
  formValues: Object,
  onChange: Function,
  data: Object
};



const ExpressionFields = (props: FieldsProps) => {
  const {
    data,
    onChange,
    onDelete,
    formValues,
    addNewShexField,
    updateShexJ,
    parent
  } = props;
  const label = shexFormLabel(data);

  const canDelete = data.min === undefined || data.min === 1 ? data._formValues.length > 1 : true;

  return (
    <Fragment>
      <label>{label}</label>
      <ul>
        {data._formValues &&
          data._formValues.map((value, i) => (
            <li key={i}>
              <Field
                {...{
                  data,
                  fieldData: value,
                  inputData:
                    formValues[value._formFocus.name] || value._formFocus,
                  onChange,
                  onDelete,
                  updateShexJ,
                  parent,
                  canDelete
                }}
              />
            </li>
          ))}
      </ul>
      {allowNewFields(data) && !parent && (
        <button type="button" onClick={() => addNewShexField(data, parent)}>
          Add new {label}
        </button>
      )}
    </Fragment>
  );
};

type FieldProps = {
  data: Object,
  inputData: Object,
  onChange: (e: Event) => {}
};

const Field = ({
  data,
  fieldData,
  inputData,
  onChange,
  onDelete,
  updateShexJ,
  canDelete,
  parent
}: FieldProps) => {
  const [hover, setHover] = useState(false);
  const inputType = data.valueExpr.values ? "select" : "text";
  const predicate = data.predicate;
  const subject = fieldData._formFocus.parentSubject;
  const defaultValue = fieldData._formFocus.value;
  const annotation = findAnnotation("layoutprefix", data.annotations);
  const hasPrefix = annotation && annotation.object.value;
  const onMouseEnter = () => setHover(true);

  const onMouseLeave = () => setHover(false);

  return (
    <InputWrapper onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {inputType === "text" ? (
        <input
          type="text"
          value={inputData.value}
          name={inputData.name}
          onChange={onChange}
          data-predicate={predicate}
          data-subject={subject}
          data-default={defaultValue}
          data-prefix={hasPrefix}
          data-parent-predicate={
            parent && parent.predicate ? parent.predicate : null
          }
          data-parent-subject={parent && parent._formValues[0]._formFocus.parentSubject}
        />
      ) : (
        <select
          value={inputData.value}
          name={inputData.name}
          onChange={onChange}
          data-predicate={predicate}
          data-subject={subject}
          data-default={defaultValue}
          data-prefix={hasPrefix}
          data-parent-predicate={
            parent && parent.predicate ? parent.predicate : null
          }
        >
          {data.valueExpr.values.map(value => (
            <option value={value} key={value}>
              {value.split("#")[1]}
            </option>
          ))}
        </select>
      )}
      {!parent && canDelete && (
        <DeleteButton
          type="button"
          show={hover}
          onClick={() =>
            onDelete({ ...fieldData, predicate }, null, updateShexJ)
          }
        >
          X
        </DeleteButton>
      )}
    </InputWrapper>
  );
};

export default ExpressionFields;
