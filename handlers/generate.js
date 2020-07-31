const { validationResult } = require('express-validator');
const puppeteer = require('puppeteer');
const config = require('../config');
const baseURL = config('BASE_URL');
const expiresIn = config('EXPIRES_IN');

module.exports = async function(req, res) {
    console.log(req.body)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: true,
            errors: errors
        });
    };

    const timestamp = Math.round(Date.now() / 1000);
    const randomID = `${timestamp}-${revisedRandId()}`;
    const pdfOptions = {
        path: `static/exports/${randomID}.pdf`,
        format: 'A4',
        margin: {
            top: 10,
            right: 0,
            bottom: 10,
            left: 0
        },
        displayHeaderFooter: true,
        footerTemplate: "<div style=\"text-align: right;width: 297mm;font-size: 8px; z-index:1000;\"><span style=\"margin-right: 1cm\"><span class=\"pageNumber\"></span> of <span class=\"totalPages\"></span></span></div>"
    };
    const availableOptions = ['scale', 'displayHeaderFooter', 'headerTemplate', 'footerTemplate', 'printBackground', 'landscape',
    'pageRanges', 'format', 'width', 'height', 'margin.top', 'right', 'margin.bottom', 'margin.left', 'preferCSSPageSize', 'pageNumber',
    'totalPages'];
    const integerOptions = ['scale', 'width', 'height'];
    for (const option of availableOptions) {
        if (req.body[option] && !option.includes('margin')) {
            if (integerOptions.indexOf(option) > -1) {
                pdfOptions[option] = Number(req.body[option]);
            } else {
                pdfOptions[option] = req.body[option];
            }
        }

        if (req.body[option] && option.includes('margin')) {
            pdfOptions.margin[option.replace('margin.', '')] = req.body[option];
        }
    }

    if (!global.browser) {
        await reGenerateBrowser();
    }
    const page = await getNewPageFromBrowser();
    page.setDefaultNavigationTimeout(0);
    if (req.body.url) {
        await page.goto(req.body.url);
    } else if (req.body.html) {
        await page.setContent(req.body.html);
    } else if (req.body.file) {
        const file = req.body.file;
        const htmlContent = require('../templates/'+file.template);
        await page.setContent(htmlContent(file));
    }
    await page.pdf(pdfOptions);

    await page.close();

    return res.status(200).json({
        success: true,
        url: `${baseURL}/exports/${randomID}.pdf`,
        path: `/exports/${randomID}.pdf`,
        expires: timestamp + expiresIn
    });
}

async function getNewPageFromBrowser() {
    const newPage = await global.browser.newPage().catch( (e) => {
        console.log("Browser instance seems to be dead.")
    })

    if (newPage) {
        return newPage;
    } else {
        await reGenerateBrowser();
        console.log("Created a new page instance.");
        return await global.browser.newPage()
    }

}

async function reGenerateBrowser() {
    global.browser = await puppeteer.launch({ args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'] });
    console.log('Browser instance regenerated.')
}

function revisedRandId() {
     return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(2, 10);
}
