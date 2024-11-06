import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Upload from './components/Upload';
import Translation from './components/Translation';
import { TranslationProvider } from './context/TranslationContext';

function App() {
  return (
    <TranslationProvider>
      <BrowserRouter>
        <div className="flex min-h-screen bg-gray-900">
          <Sidebar />
          <main className="flex-1 p-8">
            <Routes>
              <Route path="/" element={<Upload />} />
              <Route path="/translation/:id" element={<Translation />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TranslationProvider>
  );
}

export default App;