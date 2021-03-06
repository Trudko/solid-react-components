import React from 'react';

import { UI, RDF, UITypes, VOCAB } from '@constants';

type Props = {
  data: object,
  updateData: (string, string) => void,
  mapper: object,
  addNewField: string => void,
  deleteField: string => void,
  savingData: {
    autosaveIndicator: React.Component,
    running: boolean,
    names: Array<string>,
    error: boolean
  }
};

export const Group = (props: Props) => {
  const { data, updateData, mapper, savingData, addNewField, deleteField } = props;

  return (
    <div>
      {Object.entries(data).map(([, part]) => {
        const { [RDF.TYPE]: type, [UI.NAME]: name } = part;
        const Component = mapper[type];

        if (!Component) return null;

        /* if this component is being saved right now */
        const savingThis = savingData.names.some((componentName: string) => name === componentName);
        const componentData = type === VOCAB.UI.Group ? part[UI.PARTS] : part;

        let Indicator = () => null;
        if (savingData.running && savingThis) Indicator = savingData.autosaveIndicator;

        return (
          <div key={name}>
            <Component
              {...{
                key: name,
                id: name,
                data: componentData,
                updateData,
                addNewField,
                deleteField,
                mapper,
                savingData
              }}
            />
            <Indicator {...{ errored: savingData.error, running: savingData.running }} />
          </div>
        );
      })}
    </div>
  );
};
