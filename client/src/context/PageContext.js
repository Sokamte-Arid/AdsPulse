import React, { createContext, useContext, useState } from 'react';

// Safe default so hooks don't crash if Provider is missing
const PageContext = createContext({
  pageTitle:    '',
  pageSubtitle: '',
  setPageTitle:    () => {},
  setPageSubtitle: () => {},
});

export function PageProvider({ children }) {
  const [pageTitle,    setPageTitle]    = useState('');
  const [pageSubtitle, setPageSubtitle] = useState('');
  return (
    <PageContext.Provider value={{ pageTitle, pageSubtitle, setPageTitle, setPageSubtitle }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePageTitle() {
  return useContext(PageContext);
}

export function useSetPageTitle(title, subtitle) {
  const { setPageTitle, setPageSubtitle } = useContext(PageContext);
  React.useEffect(() => {
    if (typeof setPageTitle === 'function') setPageTitle(title || '');
    if (typeof setPageSubtitle === 'function') setPageSubtitle(subtitle || '');
    return () => {
      if (typeof setPageTitle === 'function') setPageTitle('');
      if (typeof setPageSubtitle === 'function') setPageSubtitle('');
    };
  }, [title, subtitle, setPageTitle, setPageSubtitle]);
}