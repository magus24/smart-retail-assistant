import React from 'react';
import Header from './components/Header';
import ChatBox from './components/ChatBox';
import AdminKnowledgeBase from './components/AdminKnowledgeBase';

function App() {
  const path = window.location.pathname.replace(/\/+$/, '');

  if (path === '/admin') {
    return <AdminKnowledgeBase />;
  }

  return (
    <div className="app-container">
      <Header />
      <ChatBox />
    </div>
  );
}

export default App;
