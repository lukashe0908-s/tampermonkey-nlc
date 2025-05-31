declare const GM_getValue: (name: string) => any;
declare const GM_setValue: (name: string, value: any) => any;
// https://www.tampermonkey.net/documentation.php#api:GM_cookie.list
declare const GM_cookie: { list: (detail: any, callback: Function) => any };
declare const unsafeWindow: any;
declare const globalthis: any;
