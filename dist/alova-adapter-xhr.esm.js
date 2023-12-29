/**
  * @alova/adapter-xhr 1.0.2 (https://alova.js.org)
  * Copyright 2023 JOU-amjs. All Rights Reserved
  * Licensed under MIT (https://github.com/alovajs/adapter-xhr/blob/master/LICENSE)
  */

const mockResponseHandler = ({ status, statusText, body, responseHeaders }) => ({
    response: {
        data: body,
        status,
        statusText,
        headers: responseHeaders
    },
    headers: responseHeaders
});

const undefinedValue = undefined, nullValue = null, trueValue = true, falseValue = false;
const noop = () => { };
const instanceOf = (arg, cls) => arg instanceof cls;
const isString = (arg) => typeof arg === 'string';
const isPlainObject = (arg) => Object.prototype.toString.call(arg) === '[object Object]' && arg !== nullValue;
const isSpecialRequestBody = (data) => {
    const dataTypeString = Object.prototype.toString.call(data);
    return (/^\[object (Blob|FormData|ReadableStream)\]$/i.test(dataTypeString) ||
        instanceOf(data, ArrayBuffer) ||
        instanceOf(data, URLSearchParams));
};
const err = (message) => new Error(message);
const data2QueryString = (data) => {
    const ary = [];
    let paths = [];
    let index = 0;
    let refValueAttrCount = 0;
    JSON.stringify(data, (key, value) => {
        if (key !== '') {
            if (typeof value === 'object' && value !== null) {
                paths.push(key);
                refValueAttrCount += Object.keys(value).length;
            }
            else if (value !== undefinedValue) {
                const pathsTransformed = [...paths, key].map((val, i) => (i > 0 ? `[${val}]` : val)).join('');
                ary.push(`${pathsTransformed}=${value}`);
                if (index >= refValueAttrCount - 1) {
                    paths = [];
                    index = refValueAttrCount = 0;
                }
                else {
                    index++;
                }
            }
        }
        return value;
    });
    return ary.join('&');
};
const parseResponseHeaders = (headerString) => {
    const headersMap = {};
    if (headerString === '') {
        return headersMap;
    }
    const headersAry = headerString.trim().split(/[\r\n]+/);
    headersAry.forEach(line => {
        const [headerName, value] = line.split(/:\s*/);
        headersMap[headerName] = value;
    });
    return headersMap;
};

const isBodyData = (data) => isString(data) || isSpecialRequestBody(data);
function requestAdapter() {
    const adapter = ({ type, url, data = null, headers }, method) => {
        const { config } = method;
        const { auth, withCredentials, mimeType } = config;
        let downloadHandler = noop;
        let uploadHandler = noop;
        let xhr;
        const responsePromise = new Promise((resolve, reject) => {
            try {
                xhr = new XMLHttpRequest();
                xhr.open(type, url, trueValue, auth === null || auth === void 0 ? void 0 : auth.username, auth === null || auth === void 0 ? void 0 : auth.password);
                xhr.responseType = config.responseType || 'json';
                xhr.timeout = config.timeout || 0;
                if (withCredentials === trueValue) {
                    xhr.withCredentials = withCredentials;
                }
                if (mimeType) {
                    xhr.overrideMimeType(mimeType);
                }
                let isContentTypeSet = falseValue;
                let isContentTypeFormUrlEncoded = falseValue;
                Object.keys(headers).forEach(headerName => {
                    if (/content-type/i.test(headerName)) {
                        isContentTypeSet = trueValue;
                        isContentTypeFormUrlEncoded = /application\/x-www-form-urlencoded/i.test(headers[headerName]);
                    }
                    xhr.setRequestHeader(headerName, headers[headerName]);
                });
                if (!isContentTypeSet && (data ? data.toString() !== '[object FormData]' : true)) {
                    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
                }
                if (config.enableDownload) {
                    xhr.onprogress = event => {
                        downloadHandler(event.loaded, event.total);
                    };
                }
                if (config.enableUpload) {
                    xhr.upload.onprogress = event => {
                        uploadHandler(event.loaded, event.total);
                    };
                }
                xhr.onload = () => {
                    resolve({
                        status: xhr.status,
                        statusText: xhr.statusText,
                        data: xhr.response,
                        headers: parseResponseHeaders(xhr.getAllResponseHeaders())
                    });
                };
                xhr.onerror = () => {
                    reject(err('Network Error'));
                };
                xhr.ontimeout = () => {
                    reject(err('Network Timeout'));
                };
                xhr.onabort = () => {
                    reject(err('The user aborted a request'));
                };
                let dataSend = data;
                if (isContentTypeFormUrlEncoded && isPlainObject(dataSend)) {
                    dataSend = data2QueryString(dataSend);
                }
                if (dataSend !== nullValue) {
                    dataSend = isBodyData(dataSend) ? dataSend : JSON.stringify(dataSend);
                }
                xhr.send(dataSend);
            }
            catch (error) {
                reject(error);
            }
        });
        return {
            response: () => responsePromise,
            headers: () => responsePromise.then(res => res.headers),
            abort: () => {
                xhr.abort();
            },
            onDownload: handler => {
                downloadHandler = handler;
            },
            onUpload: handler => {
                uploadHandler = handler;
            }
        };
    };
    return adapter;
}

export { mockResponseHandler as xhrMockResponse, requestAdapter as xhrRequestAdapter };
