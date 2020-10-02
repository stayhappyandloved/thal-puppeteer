const puppeteer = require('puppeteer');
const CREDS = require('./creds');
const mongoose = require('mongoose');
const user = require('./models/user');



async function run(){
	const browser = await puppeteer.launch({
		headless:false
	});
	const page = await browser.newPage();

	//commented out because it is no longer needed
	//await page.goto('https://github.com');
	//await page.screenshot({path: 'screenshots/github.png'});

	await page.goto('https://github.com/login');


	//dom element selectors
	const USERNAME_SELECTOR = '#login_field'
	const PASSWORD_SELECTOR = '#password'
	const BUTTON_SELECTOR = '#login > form > div.auth-form-body.mt-3 > input.btn.btn-primary.btn-block'

	//fill in credentials and login
	await page.click(USERNAME_SELECTOR);
	await page.keyboard.type(CREDS.username);

	await page.click(PASSWORD_SELECTOR);
	await page.keyboard.type(CREDS.password);

	await page.click(BUTTON_SELECTOR);

	await page.waitForNavigation();

	//searching for a user named john
	const userToSearch = 'mark';
	const searchURL='https://github.com/search?q='+ userToSearch;

	await page.goto(searchURL);
	await page.waitFor(2*1000);

	//extracting emails

	//dummy variables
	const LIST_USERNAME_SELECTOR = '#user_search_results > div.user-list > div:nth-child(INDEX) > div.d-flex > div > a';
	const LIST_EMAIL_SELECTOR = '#user_search_results > div.user-list > div:nth-child(INDEX) > div.d-flex > div > ul > li:nth-child(2) > a';
	const numPages = await getNumPages(page);

	console.log('Numpages: ', numPages);

for (let h = 1; h <= numPages; h++) {
    let pageUrl = searchURL + '&p=' + h;
    await page.goto(pageUrl);

    //getting the length of users list
    let listLength = await page.evaluate((sel) => {
      return document.getElementsByClassName(sel).length;
    }, LENGTH_SELECTOR_CLASS);

    for (let i = 1; i <= listLength; i++) {
      // change the index to the next child
      let usernameSelector = LIST_USERNAME_SELECTOR.replace("INDEX", i);
      let emailSelector = LIST_EMAIL_SELECTOR.replace("INDEX", i);

      let username = await page.evaluate((sel) => {
        return document.querySelector(sel).getAttribute('href').replace('/', '');
      }, usernameSelector);

      let email = await page.evaluate((sel) => {
        let element = document.querySelector(sel);
        return element ? element.innerHTML : null;
      }, emailSelector);

      // not all users have emails visible
      if (!email)
        continue;

      console.log(username, ' -> ', email);

      //update or insert to User model
      upsertUser({
        username: username,
        email: email,
        dateCrawled: new Date()
      });
    }
  }

  browser.close();
}

async function getNumPages(page) {
  const NUM_USER_SELECTOR = '#js-pjax-container > div > div.col-12.col-md-9.float-left.px-2.pt-3.pt-md-0.codesearch-results > div > div.d-flex.flex-column.flex-md-row.flex-justify-between.border-bottom.pb-3.position-relative > h3';
  let inner = await page.evaluate((sel) => {
    let html = document.querySelector(sel).innerHTML;

    // format is: "69,803 users"
    return html.replace(',', '').replace('users', '').trim();
  }, NUM_USER_SELECTOR);

  const numUsers = parseInt(inner);

  console.log('numUsers: ', numUsers);

  /**
   * GitHub shows 10 resuls per page, so
   */
  return Math.ceil(numUsers / 10);
}

function upsertUser(userObj) {
  const DB_URL = 'mongodb://localhost/thal_puppeteer';

  if (mongoose.connection.readyState == 0) {
    mongoose.connect(DB_URL);
  }

  // if this email exists, update the entry, don't insert
  const conditions = { email: userObj.email };
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };

  User.findOneAndUpdate(conditions, userObj, options, (err, result) => {
    if (err) {
      throw err;
    }
  });
}



















run();