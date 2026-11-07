// src/components/PageTransition.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Replays a short enter animation whenever the route pathname changes.
 * The keyed wrapper remounts so CSS animations restart on navigation.
 */
export default function PageTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
