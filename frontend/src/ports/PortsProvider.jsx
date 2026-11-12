import { useEffect } from 'react';
import { loadPorts } from '../data/ports';

// Loads the port list once when the app starts. Pages read it through usePorts().
export default function PortsProvider({ children }) {
  useEffect(() => {
    loadPorts();
  }, []);
  return children;
}
