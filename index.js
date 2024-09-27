'use strict'
import express from 'express';
import puppeteer from 'puppeteer';
import fs from 'fs';
import zlib from 'zlib';
import http from 'http';
import https from 'https';
import { pageSizes } from './page-sizes.js';
import path from 'path';
import { URL } from 'url';
import dotenv from 'dotenv';

const currentDir = path.dirname(new URL(import.meta.url).pathname);
dotenv.config({ path: `${currentDir}/.env.${process.env.NODE_ENV || 'development'}` });
if (!process.env.PORT && !process.env.PORT_RANGE || !process.env.INVOICE_HOST) dotenv.config();

const INVOICE_HOST = process.env.INVOICE_HOST || 'http://localhost:3000';
const IS_DOCKER = process.env.IS_DOCKER ?? (INVOICE_HOST.search('host.docker.internal') !== -1 || false);

// Launch the browser 
const launchOptions = {
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
  // args: ['--disable-dev-shm-usage', '--ignore-certificate-errors'],
  headless: 'shell',
  ignoreDefaultArgs: [],
  timeout: 5000,
};

// Pagedjs viewport
const pageViewport = { width: 1080, height: 1024 };

// Load pagedjs polyfill content from backend server
let pagedjsContent = '';
const pagedjsFile = 'paged.polyfill.js';
try {
  pagedjsContent = await (async () => new Promise((resolve, reject) => {
    (INVOICE_HOST.includes('https') ? https : http).get(INVOICE_HOST + '/js/' + pagedjsFile, {
      insecureHTTPParser: INVOICE_HOST.includes('https') ? false : true
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', () => {
      reject('');
    });
  }))();
  if (pagedjsContent) {
    console.info('Write pagedjs polyfill loaded from: ' + INVOICE_HOST + '/js/' + pagedjsFile);
    fs.writeFileSync('./' + pagedjsFile, pagedjsContent, { encoding: 'utf8' });
  }
} catch (e) {
  console.warn('Failed to write pagedjs polyfill to: ' + './' + pagedjsFile, e);
}

const RegExpLocalhost = new RegExp(/https?:\/\/localhost:\d+/, 'i')
const replaceLocalhost = (str) => IS_DOCKER ? str.replace(new RegExp(RegExpLocalhost, 'ig'), INVOICE_HOST) : str;

const pageLaunch = async (content, { isHtml = false, isDebug = false, onDomContentLoaded = undefined } = {}) => {
  let browser;
  try {
    isDebug && console.log('Server: Launching browser...');
    browser = await puppeteer.launch(launchOptions);
    // Open a new blank page
    isDebug && console.log('Server: Opening new page...');
    const page = await browser.newPage();
    // Set screen size
    await page.setViewport(pageViewport);
    // Log event listener must be register before setContent
    isDebug && page.on('console', msg => {
      console.log('PAGE:', msg.text());
    });

    page.on('domcontentloaded', () => {
      isDebug && console.info('Server: DOMContentLoaded');
      onDomContentLoaded && onDomContentLoaded();
    });

    // For browser can load localhost to outside docker container: replaceLocalhost
    if (isHtml) {
      // Set html content
      await page.setContent(IS_DOCKER ? replaceLocalhost(content) : content);
    } else {
      // Navigate the page to a URL
      await page.goto(content, { timeout: 30000 }); // 30 seconds
      const pageContent = await page.content();
      if (IS_DOCKER && pageContent.search(RegExpLocalhost) !== -1) {
        await page.setContent(replaceLocalhost(pageContent));
      }
    }

    // Define canPrint variale when other page template not defined and override after flow
    await page.evaluate(function () {
      if (window.canPrint === undefined) {
        window.canPrint = false;
        const parentAfter = window.PagedConfig?.after ?? function () { };
        window.PagedConfig = Object.assign(window.PagedConfig ?? {
          auto: true, before: () => {
            console.info('[Pagedjs][default] before flow');
            return new Promise((resolve) => {
              resolve(true);
            });
          },
          after: (flow) => {
            console.info('[Pagedjs][default] after flow');
            parentAfter(flow);
            window.canPrint = true;
          }
        }, {
          after: (flow) => {
            console.info('[Pagedjs][override] after flow');
            parentAfter(flow);
            window.canPrint = true;
          },
        });
      }
    });

    // Has some bugs when using paged.polyfill.js directly in html (out of memory)
    try {
      if (!pagedjsContent) {
        pagedjsContent = fs.readFileSync('./' + pagedjsFile, 'utf8');
      }
    } catch (e) { }

    isDebug && console.info('Server: execute pagedjs content...');
    pagedjsContent && await page.evaluate(pagedjsContent);
    isDebug && console.info('Server: execute pagedjs complete.');

    return { page, browser };
  } catch (err) {
    console.error(err);
    (browser ?? false) && browser.close().then(() => console.log('Page launch. Browser closed with exception!'));
  }
  return null;
};

/**
 * @param {*} content string
 * @param {*} type url | html | options
 * @returns object
 */
const renderPdf = async (content, _options = {}) => {
  let browser;
  try {
    const { type = 'html', header, footer, debug } = typeof _options === 'string' ? { type: _options } : (_options ?? {});

    let domLoaded = false;

    debug && console.info('Server: Start launch...');

    const { page, browser: _browser } = await pageLaunch(content, {
      isHtml: type === 'html',
      isDebug: debug,
      onDomContentLoaded: () => {
        domLoaded = true;
      },
    })

    browser = _browser;

    // get meta tag and its content from the page
    const size = await page.evaluate(el => el?.getAttribute('content'), await page.$('meta[name="size"]'));
    const filename = await page.evaluate(el => el?.getAttribute('content'), await page.$('meta[name="filename"]'))
      ?? await page.evaluate(el => el?.textContent, await page.$('head > title'))
      ?? 'invoice.pdf';
    const direction = await page.evaluate(el => el?.getAttribute('content'), await page.$('meta[name="direction"]'));

    const options = {
      path: filename,
      landscape: direction?.toLocaleLowerCase() === 'landscape',
      preferCSSPageSize: true,
      size: size ?? 'A4', // default size is A4
      width: '210mm',
      height: '297mm',
    }

    if (size) {
      const [width, height] = size.split(/x|\s/i);
      if (width && height) {
        // delete options.size;
        options.width = width;
        options.height = height;
      } else if (Array.from(Object.entries(pageSizes).keys()).includes(size)) {
        // options.size = size;
        options.width = pageSizes[size].width.value + pageSizes[size].width.unit;
        options.height = pageSizes[size].height.value + pageSizes[size].height.unit;
      }
    }

    if (header || footer) {
      options.displayHeaderFooter = true;
      options.headerTemplate = header;
      options.footerTemplate = footer;
      options.margin = {
        ...header ? { top: '10mm' } : null,
        ...footer ? { bottom: '10mm' } : null,
      }
    }

    // Print Option info
    console.info('Server: PDF options', options);
    // debug && console.info('HTML:', content);

    // const pageType = await page.evaluate(() => matchMedia('print').matches);
    // const pdf = await page.pdf({ path: 'invoice.pdf', format: 'A4' });
    // const pdf = await page.pdf({ path: 'invoice.pdf', width: '80mm', height: '114mm' });
    // const pdf = await page.pdf(options);

    // Wait for dom loaded
    debug && console.info('Server: wait for dom loaded');
    await new Promise((resolve) => {
      let resolved = false;
      if (domLoaded) {
        resolved = true;
        resolve(true);
      }
      setTimeout(() => {
        if (!resolved) {
          resolve(false);
        }
      }, 10000);
    });
    // Wait for pagedjs to finish rendering
    debug && console.info('Server: wait for pagedjs render');
    await page.evaluate(function (isDebug) {
      isDebug && console.info('wait for pagedjs canPrint');
      if (window.canPrint === undefined) return;
      // check can print from pagedjs
      isDebug && console.info('wait for pagedjs promise');
      return new Promise(function (resolve) {
        let time = 0;
        const maxTime = 6000;
        const stepTime = 300;
        const interval = window.setInterval(function () {
          isDebug && console.info('promise interval');
          if (window.canPrint) {
            clearInterval(interval);
            resolve(true);
            return;
          }
          if (time > maxTime) {
            isDebug && console.info('promise interval timeout');
            clearInterval(interval);
            resolve(true);
            return;
          }
          time += stepTime;
        }, stepTime);
      });
    }, { isDebug: debug });

    debug && console.info('Server: start render pdf');

    // save as pdf
    // fs.writeFile('invoice2.pdf', pdf, err => {
    //   if (err) throw err;
    //   console.log('PDF saved!');
    // });

    // Not save and stream pdf
    await page.setBypassCSP(true);
    // await page.emulateCPUThrottling(2);
    await page.emulateMediaType('print');
    const pdf = await page.createPDFStream(options);
    const { value } = await pdf.getReader().read();

    browser.close().then(() => console.log('Server: Browser closed.'));

    return {
      pdf: value, // return the pdf buffer
      filename,
      size,
      direction,
    };
  } catch (err) {
    console.error(err);
    (browser ?? false) && browser.close().then(() => console.log('Browser closed with exception!'));
  }
  return {}; // no data to return when error to load
};

const loadPdf = async (req, res, next) => {
  // Stop if load favicon.ico
  if (req.path === '/favicon.ico') {
    res.status(404).send('Not found');
    return;
  }
  if (req.path === '/') {
    res.status(200).send('Welcome to PDF Streamer!');
    return;
  }

  const params = new URLSearchParams(req.query);
  if (params.has('type')) {
    params.delete('type');
  }
  params.append('type', 'pdf');
  const paramsStr = params.toString();
  const url = INVOICE_HOST + req.path.replace('/stream', '') + (paramsStr ? '?' + paramsStr : '');

  const debug = params.has('debug');
  console.info((debug ? `[${new Date().toISOString().replace('T', ' ').replace('Z', '')}] ` : '') + 'Load pdf from url', url);

  req.meta = await renderPdf(url, { type: 'url', debug });
  next();
}

const streamMiddleware = async (req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Encoding', 'gzip');
  try {
    const { pdf } = req.meta;
    if (!pdf) {
      res.send('Sorry, this PDF file cannot load yet. Please try again later.');
      return;
    }
    zlib.gzip(pdf, (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error compressing PDF');
        return;
      }
      res.send(result);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating PDF');
  }
}

const app = express();

/**
 * POST html content to generate PDF
 */
// app.use(express.urlencoded({ extended: false }));
// app.use(express.json());
// app.use(express.text({ type: 'text/html' }));
app.post('/from-html', [express.text({ type: 'text/html' }), express.json({ limit: '10mb' })], async (req, res, next) => {
  console.info('Server: Load pdf from html');
  const html = req.body.html ?? req.body;
  if (!html) {
    res.status(400).send('Missing HTML content');
    return;
  }
  req.meta = await renderPdf(html, {
    header: req.body.header ?? undefined,
    debug: req.query.debug ?? false,
  });
  const asciiFilename = encodeURIComponent(req.meta?.filename || 'invoice.pdf');
  const utfFilename = `UTF-8''${asciiFilename}`; // RFC 5987 Encoding
  res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=${utfFilename}`);
  next();
}, streamMiddleware);

app.use('/stream', loadPdf, (req, res, next) => {
  const asciiFilename = encodeURIComponent(req.meta?.filename || 'invoice.pdf').replace(/\*/g, '%2A');
  const utfFilename = `UTF-8''${asciiFilename}`; // RFC 5987 Encoding
  res.setHeader('Content-Disposition', `inline; filename="${asciiFilename}"; filename*=${utfFilename}`);
  next();
}, streamMiddleware);

app.use('/', loadPdf, (req, res, next) => {
  const asciiFilename = encodeURIComponent(req.meta?.filename || 'invoice.pdf').replace(/\*/g, '%2A');
  const utfFilename = `UTF-8''${asciiFilename}`; // RFC 5987 Encoding
  res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=${utfFilename}`);
  next();
}, streamMiddleware);

const PORT = Number(process.env.PORT || 3000);
const PORT_RANGE = process.env.PORT_RANGE;

let fromPort = PORT;
let maxPort = PORT;

if (PORT_RANGE && PORT_RANGE.includes('-')) {
  const portRange = PORT_RANGE.split('-');
  fromPort = Number(portRange[0]);
  maxPort = Number(portRange[1] ?? portRange[0]);
}

(function runApp(port) {
  if (port > maxPort) {
    return;
  }
  const http = app.listen(port);
  http.on('listening', () => {
    console.log('App listen on port: ' + port);
    runApp(port + 1);
  })
  http.on('close', async () => {
    console.log('Http closed.');
  })
  http.on('error', async (err) => {
    console.log('Error: ' + err.message);
    if (err.message.includes('address already in use')) {
      if (port + 1 > maxPort) {
        throw Error('Max port exceed to run the app.');
      }
      runApp(port + 1);
      return;
    }
    console.log('Http error.');
    throw err;
  });
})(fromPort);
