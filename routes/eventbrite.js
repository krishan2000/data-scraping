const puppeteer = require('puppeteer');
const express = require('express');
const router = express.Router();
var db = require('../db_funtion');

router.get("/eventbrite", async (req, res) => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const endPage = parseInt(req.query.endPage) || 1;
    const statPage = parseInt(req.query.statPage) || 1;
    
    try {
        for (let i = statPage; i <= endPage; i++) {
            let results = [];
            const url = `https://www.eventbrite.com/d/ca--los-angeles/all-events?page=${i}`;
            await page.goto(url, { waitUntil: 'networkidle2' });
            
            // Function to scrape event links from the current page
            const scrapeCurrentPage = async () => {
                return await page.evaluate(() => {
                    const data = [];
                    const selectedElem = document.querySelectorAll('ul.SearchResultPanelContentEventCardList-module__eventList___2wk-D li');
                    for (let item of selectedElem) {
                        const detailLink = item.querySelector('.event-card-link')?.href;
                        if (detailLink) {
                            data.push(detailLink);
                        }
                    }
                    return data;
                });
            };

            // Function to scrape details from each event page
            const scrapeDetailPage = async (detailLink) => {
                const detailPage = await browser.newPage();
                await detailPage.goto(detailLink, { waitUntil: 'networkidle2' });
            
                const detailData = await detailPage.evaluate(() => {
                    const title = document.querySelector('.event-title')?.innerText?.trim()
                    const fullDateTime = document.querySelector('.date-info__full-datetime')?.innerText || '';
                    var image = document.querySelector('.css-6dsmqv picture img').src;
                    var location = document.querySelector('.location-info__address')?.innerText?.split('\n')
                    var vanue = location ? location[0] : "";
                    var address = location ? location[2]?.split(',')[0] : "";
                    var zipCode = location ? location[2]?.split(',')[1].match(/\d+/g)[0] : "";
                    var state = location ? location[2]?.split(',')[1].match(/[a-zA-Z]+/g)[0] : ""
                    var country = location ? location[2]?.split(',')[1]?.match(/[a-zA-Z]+/g)[1] + " " + location[2]?.split(',')[1]?.match(/[a-zA-Z]+/g)[2] : ""
                    var organizer = document.querySelector('.descriptive-organizer-info-mobile__name')?.innerText;
                    var description = document.querySelector('.has-user-generated-content')?.innerHTML;
                    var price = document.querySelector('.conversion-bar__panel-info')?.innerText?.trim()?.replace(/\$/g, '') || "";
                    return { title, fullDateTime, image, vanue, address, zipCode, state, country, description, organizer, price };
                });
            
                await detailPage.close();
                return detailData;
            };

            // Scrape event links from the current page
            const eventLinks = await scrapeCurrentPage();

            // Collect details from each event link
            const childData = [];
            for (const link of eventLinks) {
                const detailData = await scrapeDetailPage(link);
                childData.push(detailData);
            };
            results.push(...childData);
            var data = results;
            console.log(data.length);
            
            for (let i = 0; i < data.length; i++) {
                const event = data[i];
                //title, fullDateTime, image, vanue, address, zipCode, state, country, description, organizer, price
                var postData = {
                    event_title : event.title,
                    start_time :event.fullDateTime,
                    address : event.address || "",
                    event_desc : event.description || "",
                    city : event.city || "",
                    state : event.state || "",
                    zipcode : event.zipCode || "",
                    country : event.country || "",
                    event_image : event.image,
                    venue : event.vanue,
                    organizer : event.organizer,
                    site_event : "eventbrite"
                };
                try {
                    db.insertData('sss_events', postData).then(function(result) {
                        console.log("Event added successfully");
                    })
                } catch (error) {

                    console.log(error);
                };
            };
        };
    } catch (error) {
        console.error("Error scraping data:", error);
        return res.status(500).json({ error: 'Error scraping data' });
    } finally {
        await browser.close();
    };
    return res.status(200).json({ result: results });
});

module.exports = router;
