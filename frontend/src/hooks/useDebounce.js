import { useEffect, useState } from 'react';

// Waits until the user stops typing before returning the new value,
// so we don't call the server on every single keystroke.
export default function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}