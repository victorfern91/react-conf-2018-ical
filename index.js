/**
 *
 */

const fs = require("fs");
const { promisify } = require('util');
const puppeteer = require("puppeteer");
const REACT_CONF_SCHEDULE_URL = "https://conf.reactjs.org";
const SCHEDULE_URL = `${REACT_CONF_SCHEDULE_URL}/schedule.html`;

// Promisify methods
const writeFile = promisify(fs.writeFile);

/**
 *
 */
try {
    (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Enables the request interception
        await page.setRequestInterception(true);

        // Abort the images, css and font request in order to get the information in a faster way
        page.on("request", (request) => {
            if ([ "image", "stylesheet", "font" ].indexOf(request.resourceType()) !== -1) {
                request.abort();
            } else {
                request.continue();
            }
        });

        await page.goto(SCHEDULE_URL);

        // Gets the basic information about the react conf event
        const schedule = await page.evaluate(() => [...document.querySelectorAll("article")].map((event) => ({
                day: Number.parseInt(event.parentElement.id.replace(/[a-z]/g,"")),
                time: event.querySelector("time").innerText,
                host: event.querySelector(".event-person") ? event.querySelector(".event-person").innerText : null,
                title: event.querySelector(".event-title") ? event.querySelector(".event-title").innerText : null,
                location: event.querySelector(".event-location") ? event.querySelector(".event-location").innerText : null,
                descriptionUrl: event.querySelector("a") ? event.querySelector("a").href : null
            }))
        );


        /*Promise.all()

        await schedule.map((event) => {
            if (event.descriptionUrl) {
                await page.goto(event.descriptionUrl);
                await page.screenshot({ path: `files/${event.title}.png` })
            }

            return event;
        });*/

        await writeFile("files/react-conf-2018-schedule.json", JSON.stringify(schedule, null, 2));

        await page.screenshot({path: "files/react.png"})
        await browser.close()
    })();
} catch(err) {
    console.log(err);
}
