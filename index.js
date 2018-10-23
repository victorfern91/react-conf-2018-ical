/**
 *
 */

const fs = require("fs");
const { promisify } = require("util");
const timediff = require("timediff");
const ics = require("ics");
const convertTime = require("convert-time");
const puppeteer = require("puppeteer");
const REACT_CONF_SCHEDULE_URL = "https://conf.reactjs.org";
const SCHEDULE_URL = `${REACT_CONF_SCHEDULE_URL}/schedule.html`;

// Promisify methods
const writeFile = promisify(fs.writeFile);

function convertJSONtoICS(event, index, array) {
    const year = 2018;
    const month = 10;
    const day = 24 +  event.day;
    let duration = { hours: 1 };


    if (index < array.length - 1) {
        const nextEvent = array[index + 1];

        duration = timediff(
            `${year}-${month}-${day} ${convertTime(event.time)}`,
            `${year}-${month}-${day} ${convertTime(nextEvent.time)}`,
            "Hm"
        );

        duration = { hours: duration.hour, minutes: duration.minutes };
    }


    return {
        start: [ 2018, 10, 24 +  event.day, convertTime(event.time, "hh"), convertTime(event.time, "mm") ],
        duration,
        title: `${event.title}${event.host ? " - " + event.host : ""}`,
        location: "The Westin Lake Las Vegas",
        url: SCHEDULE_URL,
        geo: { lat: 36.1142318, lon: -114.9233787 }
    };
}

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

        await browser.close();

        await writeFile("files/react-conf-2018-schedule.json", JSON.stringify(schedule, null, 2));

        const events = schedule.map(convertJSONtoICS);

        const { error, value } = ics.createEvents(events);

        console.log(value, error);

        await writeFile("files/react-conf-2018-schedule.ics", value);
    })();
} catch(err) {
    console.log(err);
}
