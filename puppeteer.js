const puppeteer = require('puppeteer');
const config = require('./config');
const headlessState = true;

puppeteer.launch({ headless: headlessState, args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'] }).then(function(browser) {
    global.browser = browser;
    console.log('browser ready');
});
