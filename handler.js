'use strict';
const chromium = require('chrome-aws-lambda');
const puppeteer = chromium.puppeteer;

module.exports.index = async (event, context) => {
  let browser = null;
  const request = getRequestPayload(event);

  const viewport = {
    width: request.width || 1920,
    height: request.height || 1080,
    deviceScaleFactor: request.scale || 2
  };

  if (!request.address && !request.html) {
    return {
      statusCode: 400,
      body: JSON.stringify({message: 'Address or HTML must be specified'})
    }
  }

  try {
    browser = await puppeteer.launch({
      defaultViewport: viewport,
      headless: true,
      executablePath: await chromium.executablePath,
      args: chromium.args,
    });

    let page = await browser.newPage();

    if (request.address) {
      await page.goto(request.address, {
        waitUntil: ['domcontentloaded', 'networkidle0'],
      });
    } else {
      await page.setContent(request.html, {
        waitUntil: ['domcontentloaded', 'networkidle0'],
      })
    }

    if (request.selector) {
      page = await page.$(request.selector)

      if (!page) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: `Selector ${request.selector} not found on the received page`

          })
        }
      }
    }

    const image = await page.screenshot({
      encoding: 'base64'
    });

    return {
      statusCode: 200,
      body: image,
      headers: {
        'Content-Type': 'image/png',
      },
      isBase64Encoded: true
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500
    };
  }
  finally{
    if(browser)
      await browser.close();
  }
};

function getRequestPayload(event) {
  try {
    let payload = Buffer.from(event.body || '', 'base64').toString();
    return payload ? JSON.parse(payload): {};
  } catch (e) {
    console.warn(e)
    return {}
  }
}
