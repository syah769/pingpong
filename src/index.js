import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import KRKLTournamentSystem from './KRKLTournamentSystem';
import KRKLPublicDisplay from './KRKLPublicDisplay';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<KRKLTournamentSystem />} />
      <Route path="/admin" element={<KRKLTournamentSystem />} />
      <Route path="/public" element={<KRKLPublicDisplay />} />
      <Route path="/display" element={<KRKLPublicDisplay />} />
      <Route path="/audience" element={<KRKLPublicDisplay />} />
    </Routes>
  </BrowserRouter>
);