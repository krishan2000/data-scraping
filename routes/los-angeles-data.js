const puppeteer = require('puppeteer');
const express = require('express');
const router = express.Router();

router.get("/los-angeles", async (req, res) => {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage();

    // Replace with the URL you want to scrape
    // https://los-angeles.events/sports/
    const baseURL = 'https://los-angeles.events';
    await page.goto(baseURL, { waitUntil: 'networkidle2' });

    let results = [];
    let scrapedItems = new Set();
    // Function to scrape the current visible content
    const scrapeCurrentPage = async () => {
        return await page.evaluate(() => {
            let data = [];
            var aa = document.querySelectorAll('ul.dates-list .date-row');
            for (let i = 0; i < aa.length; i++) {
                var item = aa[i];
                var image = item.querySelector('img').src;
                var title = item.querySelector('.venue > div').innerText.split('\n')[0];
                var ss = item.querySelector('.date').innerText.replaceAll('\n', ' ');
                var format = new Date(ss);
                var startDate =  format.getFullYear() + '-' + parseInt(format.getMonth()+1) + '-' + format.getDate();
                var nextDayFormat = format;
                nextDayFormat.setDate(nextDayFormat.getDate()+1);
                var endDate =  nextDayFormat.getFullYear() + '-' + parseInt(nextDayFormat.getMonth()+1) + '-' + (nextDayFormat.getDate());
                var timeInfo = item.querySelector('.time').innerText.trim();
                const [timePart, modifier] = timeInfo.split(" ");
                let [hours, minutes] = timePart.split(":");
                if (modifier === "PM" && hours !== "12") {
                    hours = parseInt(hours, 10) + 12;
                } else if (modifier === "AM" && hours === "12") {
                    hours = "00";
                };
                const time = hours + ":" + minutes;
                var place = item.querySelector('.date-desc').innerText.split('|')[0].trim();
                var zipCode = item.querySelector('.location').innerText.split(',')[0].trim();
                var address = item.querySelector('.location').innerText.split(',')[1].trim();
                var city = item.querySelector('.location').innerText.split(',')[2].trim();
                var state = item.querySelector('.location').innerText.split(',')[3].trim();
                var country = item.querySelector('.location').innerText.split(',')[4].trim();;
                var startPrice = item.querySelector('.from-price').innerText.match(/\d+/g)[0];
                var endPrice = item.querySelector('.from-price').innerText.match(/\d+/g)[1];
                var price = startPrice + '-' + endPrice;
                const ticketLink = item.querySelector('.date-row > a')?.href || "";
                var peopleCount = item.querySelectorAll('.tickets-avail')[1].innerText.match(/\d+/g)[0]
                var website = item.querySelector('.venue > div > a').href
                data.push({ image, title, startDate, endDate, time, place, address, zipCode, city, state, country, price, ticketLink, peopleCount, website });

            }
            return data;
        });
    };

    // Initial scraping before clicking "Load More"
    // results = results.concat(await scrapeCurrentPage());

    let hasMore = true;

    while (hasMore) {
        try {

            // Scrape data from the current page
            const newResults = await scrapeCurrentPage();

            // Avoid adding duplicates using the Set
            newResults.forEach((item) => {
                const uniqueKey = `${item.title}-${item.date}-${item.time}`;
                if (!scrapedItems.has(uniqueKey)) {
                    results.push(item);
                    scrapedItems.add(uniqueKey);
                };
            });

            // Check if the "Load More" button exists
            const loadMoreButton = await page.$('.gsb-show-more', { visible: true, });
            if (loadMoreButton) {
                // Click the "Load More" button
                await page.waitForSelector('.gsb-show-more', { visible: true, timeout: 10000 });

                await Promise.all([
                    loadMoreButton.click(),
                    await new Promise(resolve => setTimeout(resolve, 5000)),// Wait for 2 second
                    page.waitForFunction(
                        `document.querySelectorAll('ul.dates-list .date-row').length > ${results.length}`,
                        { visible: true, timeout: 50000 }
                    ) // Wait until new rows are added
                ]);
            } else {
                hasMore = false; // If no more "Load More" button, stop scraping
            };
        } catch (err) {
            console.error('Error clicking "Load More":', err);
            hasMore = false; // Exit the loop if there's an error
        };
    };
    await browser.close();
    const today = new Date();
    const nextThreeMonths = new Date(today);
    nextThreeMonths.setMonth(today.getMonth() + 3);
    const filteredData = results.filter(item => {
        const itemDate = new Date(item.startDate);
        return itemDate >= today && itemDate <= nextThreeMonths;
    });

    const uniqueEvents = filteredData.filter((event, index, self) =>
        index === self.findIndex((e) => (
            e.title === event.title && e.time === event.time && e.startDate === event.startDate
        ))
    );
    var data = uniqueEvents;
    return res.status(200).json({
        length : data.length,
        result: data
    });
});


module.exports = router;
