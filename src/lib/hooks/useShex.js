import { useCallback, useState, useEffect } from 'react';
import data from '@solid/query-ldflex';
import shexParser from '@shexjs/parser';
import shexCore from '@shexjs/core';
import unique from 'unique-string';
import { findAnnotation } from "@utils";
// import {namedNode} from '@rdfjs/data-model';

export const useShex = (fileShex: String, documentUri: String) => {
    const [shexData, setShexData] = useState({});
    let shapes = [];

    const fetchShex = useCallback(async () => {
        const rootShex = await fetch(fileShex, {
            headers: {
                'Content-Type': 'text/plain',
            },
        });
        const rootShexText = await rootShex.text();

        return rootShexText.toString();
    });

    const fetchDocument = async () => {
        const document = await data[documentUri];

        return document;
    };

    const isLink = valueExpr => {
        return typeof valueExpr === 'string' || null;
    };

    const fieldValue = (annotations: Array<Object>, value: String) => {
        const hasPrefix = findAnnotation('layoutprefix', annotations);
        if (hasPrefix) {
            return value.split(hasPrefix.object.value).pop();
        }

        return value;
    };

    const getFormFocusObject = (
      subject: String,
      valueEx: String,
      annotations?: Array<Object>
    ) => {
      let value = valueEx;
      if (annotations) {
        value = fieldValue(annotations, valueEx);
      }

      return subject
        ? { value, parentSubject: subject, name: unique() }
        : { value, name: unique() };
    };

    const isDropDown = (expression: Object) => {
        if (Array.isArray(expression.values)) {
            return { values: expression.values };
        }
        return null;
    }

    const createIdNode = () => {
        const id = `${documentUri.split('#')[0]}#id${Date.parse (new Date ())}`;
        return id;
    }

    const addLinkExpression = (currentShape, parent, idLink) => {
        if (parent) {
            const {shexJ: {shapes}} = shexData;
            const shape = shapes.find(shape => shape.id.includes(parent.valueExpr));
            let updatedExpressions = [];

            if (shape && shape.expression && shape.expression.expressions) {
                updatedExpressions = shape.expression.expressions.map(exp => {
                    return {
                        ...exp,
                        _formValues: [{
                            ...exp.valueExpr,
                            _formFocus: {
                                value: '',
                                parentSubject: idLink || documentUri,
                                name: unique()
                            },
                        }]
                    };
                });

            }
            return {
                currentShape,
                expression: { expressions: updatedExpressions},
                ...isDropDown(currentShape),
                _formFocus: {
                    value: currentShape.predicate,
                    parentSubject: currentShape.predicate || parent.predicate
                }
            }
        }
        return null;
    }

    const buildExpression = (parentExpresion: Object) => {
        return parentExpresion ? { id: parentExpresion.valueExpr, type: parentExpresion.type } : null
    }

    const findParentExpression = (parentExpresion, expression) => {
        if (parentExpresion && parentExpresion._formFocus && parentExpresion._formFocus.value) {
            return parentExpresion._formFocus.value;
        }
        return documentUri;

    };

    const updateShexJObject = (shexJ: Object, expression: Object, parentExpresion: Object) => {
        let found = false;


        return shexJ.expression.expressions.map(exp => {
            const currentPredicate = parentExpresion ? parentExpresion.predicate : expression.predicate;
            if(exp.predicate === currentPredicate) {
                const childExpresion = buildExpression(parentExpresion);
                const idLink = parentExpresion && !expression.values ? createIdNode() :  '';
                const parentSubject = findParentExpression(parentExpresion, expression);
                found = true;

                return {
                    ...exp,
                    _formValues: [
                        ...exp._formValues,
                        {
                            ...childExpresion,
                            ...addLinkExpression(expression, parentExpresion, idLink),
                            _formFocus: {
                                value: idLink,
                                name: unique(),
                                parentSubject,
                            },
                        }
                    ]
                };
            } else if (!found) {
                if ( exp._formValues.length > 0 && exp._formValues.expression) {
                    return {
                        ...exp,
                        expression: {
                            expressions: updateShexJObject(exp._formValues, expression, parentExpresion)
                        }
                    };
                }
            }
            return exp;
        });
    }

    const addNewExpression = (expression: Object, parentExpresion: Object) => {
        const { formData, shexJ } = shexData;

        const newFormData = updateShexJObject(formData, expression, parentExpresion);

        setShexData({ shexJ, formData: {...formData, expression: { expressions: newFormData }}});
    }

    const onDeleteExpression = (defaultValue: String) => {
        const { formData, shexJ } = shexData;
        const newFormData = deleteExpression(formData, defaultValue);

        if (newFormData) {
            setShexData({shexJ, formData: {...formData, expression: {expressions: newFormData}}});
        }
    }

    const deleteExpression = (formData: Object, defaultValue: String) => {
        if (formData && formData.expression) {
            return formData.expression.expressions.map(expression => {
                if (isLink(expression.valueExpr)) {
                    const _formValues = expression._formValues.filter(childExpression => {
                        if (childExpression._formFocus.value === defaultValue) {
                            return null;
                        }
                       return deleteExpression(childExpression, defaultValue);

                    });

                    return {
                      ...expression,
                        _formValues: _formValues
                    };

                } else {

                    const _formValues = expression._formValues.filter(childExpression => {
                        if (childExpression._formFocus.value === defaultValue) {
                            return null;
                        }
                        return childExpression;
                    });

                    return {
                        ...expression,
                        _formValues: [..._formValues],
                    }
                }
            });
        }

        return formData;
    }


    const fillFormData = async (rootShape: Object, document: Object) => {
        const currentShape = shapes.find(shape => shape.id.includes(rootShape.id));
        let newExpressions = [];

        if (currentShape && currentShape.expression) {
            for await (let currentExpression of currentShape.expression.expressions) {
                let newExpression = {...currentExpression};

                if (!newExpression._formValues) newExpression._formValues = [];
                for await (let node of document[currentExpression.predicate]) {
                    const value = node.value;

                    if (isLink(currentExpression.valueExpr)) {
                        const childExpression = await fillFormData(
                          {
                            id: newExpression.valueExpr,
                            linkValue: value,
                            parentSubject:
                              newExpression.predicate,
                            annotations:
                              newExpression.annotations
                          },
                          data[value]
                        );
                        const dropDownValues = isDropDown(
                          childExpression
                        );
                        const currentSubject = dropDownValues
                          ? rootShape.linkValue ||
                            documentUri
                          : rootShape.parentSubject;

                        newExpression._formValues = [
                            ...newExpression._formValues,
                            {
                                id: childExpression.id,
                                type: childExpression.type,
                                ...dropDownValues,
                                _formFocus: getFormFocusObject(
                                    currentSubject,
                                    value,
                                    currentExpression.annotations),
                                expression: childExpression.expression
                            }];
                    } else {
                        newExpression = {
                          ...newExpression,
                          _formValues: [
                            ...newExpression._formValues,
                            {
                              ...newExpression.valueExpr,
                              _formFocus: getFormFocusObject(
                                rootShape.linkValue ||
                                  documentUri,
                                value,
                                newExpression.annotations
                              )
                            }
                          ]
                        };
                    }
                }

                if (newExpression._formValues.length === 0) {
                    const parentSubject = rootShape.linkValue || documentUri;
                    const currentShape = shapes.find(shape => shape.id.includes(newExpression.valueExpr));
                    const dropDown = currentShape && isDropDown(currentShape);

                    newExpression = {
                      ...newExpression,
                      _formValues: [
                        {
                            ...dropDown,
                          _formFocus: getFormFocusObject(
                            parentSubject,
                            "",
                            newExpression.annotations
                          )
                        }
                      ]
                    };
                }

                newExpressions = [...newExpressions, newExpression];
            }
        }
        const newShape = {...currentShape, expression: { expressions: newExpressions}}
        return newShape;
    }

    const findRootShape = (shexJ: Object) => {
        return shexJ.start.split('#').pop();
    };



    const toShexJS = useCallback(async () => {
        const shexString = await fetchShex();
        const parser = shexParser.construct(window.location.href);
        const podDocument = await fetchDocument();
        const shexJ = shexCore.Util.AStoShExJ(parser.parse(shexString));

        shapes = shexJ.shapes;

        if (shapes.length > 0) {
            const formData = await fillFormData(
                { id: findRootShape(shexJ) },
                podDocument
            );
            setShexData({ shexJ, formData });
        }
    });

    useEffect(() => {
        toShexJS();
    }, [fileShex, documentUri]);

    return {
        shexData,
        addNewExpression,
        onDeleteExpression
    };
};
