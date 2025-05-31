import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Snackbar, Fade } from '@mui/material';
import App from './Selector';
import Pdf from './Pdf';

async function main() {
  if (typeof unsafeWindow != 'undefined') {
    unsafeWindow.alert = function (...args: any[]) {
      function handleClose() {
        container.remove();
      }
      const body = document.body;
      const container = document.createElement('div');
      const root = createRoot(container);
      root.render(
        <Snackbar
          open
          onClose={handleClose}
          message={args}
          autoHideDuration={3000}
          TransitionComponent={Fade}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />
      );
      body?.appendChild(container);
      return true;
    };
  }
  if (window.location.href.match(/\/allSearch\/searchDetail/) || process.env.NODE_ENV === 'development') {
    const body =
      document.querySelector('.SZZY2018_Book')?.parentElement || document.querySelector('.GYYD2019_Book')?.parentElement || document.body;
    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(<App />);
    body?.appendChild(container);

    try {
      document.body.classList.add('transition-all');
      document.querySelector('.FenXiang')?.remove();
      document.querySelector('.YMH2019_New_Book_Main')?.classList.add('rounded-2xl');
      document.querySelector('.XiangXi')?.classList.add('rounded-2xl');
      document.querySelectorAll('.ul2 > li').forEach(ele => {
        ele.classList.add('!bg-white');
        ele.classList.add('rounded-md');
        ele.classList.add('py-1');
        ele.classList.add('transition-all');
        ele.classList.add('hover:!bg-gray-100');
        let url = ele.innerHTML.match(/href="([^"]*)"/)![1]!;
        url = htmlDecode(url);
        if (ele.querySelector('.aa')) {
          (ele.querySelector('.aa')! as HTMLLinkElement).href = url;
          (ele.querySelector('.aa')! as HTMLLinkElement).target = '_blank';
        }
        ele.querySelector('.aa')?.classList.add('hover:!text-blue-600');
        ele.querySelector('.aa')?.classList.add('!pr-8');
        ele.querySelector('.aa')?.classList.add('!mr-0');
        ele.querySelector('.a1')?.remove();
        ele.querySelector('.a2')?.classList.add('rounded-sm');
        ele.querySelector('.a2')?.classList.add('hover:!text-white');
      });
      document.querySelector('.YMH2019_New_ft')?.remove();
      document.querySelector('.YMH2019_New_Book_Main + .YMH2019_New_Book_module1 .more')?.remove();
      document.querySelector('.YMH2019_New_Book_Main + .YMH2019_New_Book_module1 .Z_clearfix')?.classList.add('!max-h-none');
    } catch (e) {
      console.error(e);
    }
    const callback = function (mutationsList: any[], observer: MutationObserver) {
      document.querySelector('#multiple')?.classList.add('!block');
      // document.querySelectorAll('a:not([class="hover:!text-blue-600"]').forEach(ele => {
      //   ele.classList.add('hover:!text-blue-600');
      //   ele.classList.add('!no-underline');
      // });
      document.querySelectorAll('.pic:not([class="!rounded-lg"]),.pic:not([class="!rounded-lg"]) *').forEach(ele => {
        ele.classList.add('!rounded-lg');
      });
    };
    const observer = new MutationObserver(callback);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  if (window.location.href.match(/\/OutOpenBook\/OpenObjectBook/)) {
    try {
      document.body.innerHTML = '';
      document.documentElement.style.height = '100%';
      document.body.style.height = '100%';
      const container = document.createElement('div');
      container.style.height = '100%';
      const root = createRoot(container);
      root.render(<Pdf />);
      document.body.appendChild(container);
      if (typeof unsafeWindow != 'undefined') {
        unsafeWindow.$ = undefined;
        unsafeWindow.event = { keyCode: -114 };
      }
    } catch (e) {
      console.error(e);
    }
  }
}
document.addEventListener('DOMContentLoaded', () => {
  main();
  if (typeof unsafeWindow != 'undefined') unsafeWindow.DisableDevtool.isSuspend = true;
});

function htmlDecode(text: string): string {
  let tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  let output = tempDiv.textContent as string;
  return output;
}

foo();
setInterval(() => {
  foo();
}, 1000);
function foo() {
  document.oncontextmenu = function (e) {
    return true;
  };
  document.onkeydown =
    document.onkeyup =
    document.onkeypress =
      function (e) {
        return true;
      };
  document.onmousedown = function (e) {
    return true;
  };
}

if (window.location.href.match(/\/OutOpenBook\/OpenObjectBook/)) {
  try {
    // window.stop();
    document.body.remove();
    let body = document.createElement('body');
    document.documentElement.appendChild(body);
  } catch (e) {
    console.error(e);
  }
}
if (window.location.href.match(/\/pdfReader\//)) {
  try {
    // window.stop();
    document.documentElement.innerHTML = '';

    const pdfjs_html = require('./pdf-js.html');
    document.documentElement.innerHTML = pdfjs_html.default;
    let script = document.createElement('script');
    script.src = 'https://mozilla.github.io/pdf.js/build/pdf.mjs';
    script.type = 'module';
    script.addEventListener('load', () => {
      script = document.createElement('script');
      script.src = 'https://mozilla.github.io/pdf.js/web/viewer.mjs';
      script.type = 'module';
      document.head.appendChild(script);
    });
    document.head.appendChild(script);
  } catch (e) {
    console.error(e);
  }
}
