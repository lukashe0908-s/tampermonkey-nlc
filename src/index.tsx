import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Do required initial work. Gets called every time the URL changes,
// so that elements can be re-inserted as a user navigates a page with
// different routes.
async function main() {
  if (window.location.href.match(/\/allSearch\/searchDetail/)) {
    const body = document.querySelector('.SZZY2018_Book')?.parentElement || document.querySelector('.GYYD2019_Book')?.parentElement;
    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(<App />);
    body?.appendChild(container);
  }
}

// Call `main()` every time the page URL changes, including on first load.
addLocationChangeCallback(() => {
  // Greasemonkey doesn't bubble errors up to the main console,
  // so we have to catch them manually and log them
  main().catch(e => {
    console.error(e);
  });
});
export function addLocationChangeCallback(callback: any) {
  // Run the callback once right at the start
  window.setTimeout(callback, 0);

  // Set up a `MutationObserver` to watch for changes in the URL
  let oldHref = window.location.href;
  const body = document.querySelector('body') as HTMLElement;
  const observer = new MutationObserver(mutations => {
    if (mutations.some(() => oldHref !== document.location.href)) {
      oldHref = document.location.href;
      callback();
    }
  });

  observer.observe(body, { childList: true, subtree: true });
  return observer;
}
