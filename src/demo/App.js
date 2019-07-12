import React, { useEffect } from 'react';
import { useWebId } from '@solid/react';
import styled from 'styled-components';
import SolidImg from '../assets/solid_logo.png';
import { ProviderLogin, Uploader, ProfileUploader, useNotification } from '../lib';
import HandleShexForm from './components';

const HeaderWrapper = styled.section`
  margin-top: 60px;
  text-align: center;
  width: 100%;
`;

const DemoWrapper = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const Headline = styled.h1`
  color: #333;
  font-size: 36px;
  font-weight: 300;
`;

const ShexFormComponent = styled.div`
    border-top: 1px solid black;
    
    input {
      margin: 20px 0;
      padding: 10px;
      width: 100%
      box-sizing: border-box;
   }
`;

const Header = () => {
  return (
    <HeaderWrapper>
      <img src={SolidImg} alt="React logo" width="62" />
      <Headline>Solid React Components</Headline>
    </HeaderWrapper>
  );
};

const App = () => {
  const webId = useWebId();
  const url = webId ? `${webId.split('/profile')[0]}/public/tictactoe/inbox/` : null;
  const { fetchNotification, notification, createNotification, discoveryInbox } = useNotification(
    webId
  );

  const init = async () => {
    const result = await discoveryInbox(webId);

    fetchNotification([{ path: url, inboxName: 'App' }, { path: result, inboxName: 'Global App' }]);
  };

  useEffect(() => {
    if (webId) init();
  }, [notification.notify, webId]);

  return (
    <DemoWrapper>
      <Header />
      <p>{JSON.stringify(notification && notification.notifications)}</p>
      <ProviderLogin callbackUri={`${window.location.origin}/`} />
      <Uploader
        {...{
          fileBase: 'Your POD folder here',
          limitFiles: 1,
          limitSize: 500000,
          accept: 'png,jpg,jpeg',
          onError: error => {
            // eslint-disable-next-line no-console
            console.log(error.statusText);
          },
          onComplete: (recentlyUploadedFiles, uploadedFiles) => {
            // eslint-disable-next-line no-console
            console.log(recentlyUploadedFiles, uploadedFiles);
          },
          render: props => <ProfileUploader {...{ ...props }} />
        }}
      />
      {webId && (
        <ShexFormComponent>
          <HandleShexForm {...{ webId }} />
        </ShexFormComponent>
      )}
      <button
        type="button"
        onClick={() => createNotification({ title: 'App notification', summary: 'Summary App' })}
      >
        Create notification
      </button>
    </DemoWrapper>
  );
};

export default App;
