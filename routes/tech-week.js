const puppeteer = require('puppeteer');
const express = require('express');
const router = express.Router();

router.get("/tech-week", async (req, res) => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080 });

    let results = [];
    try {
        const url = `https://www.tech-week.com/calendar`;
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Fill in the email input and submit the form
        await new Promise(resolve => setTimeout(resolve, 3000))
        await page.type('input[name="email"]', 'abc@gmail.com');
        await Promise.all([
            page.click('input[type="submit"]'),
            await new Promise(resolve => setTimeout(resolve, 15000)),
            page.waitForSelector('#calendar-container .calendar-flex-item', { timeout: 5000 })
        ]);

        // Function to scrape data
        const scrapeCurrentPage = async () => {
            return await page.evaluate(async () => {
                const data = [];
                    var selectedElem = document.querySelectorAll('#calendar-container .calendar-flex-item');
                    for (let item of selectedElem) {
                        const title = item.querySelector('.calendar-headline')?.innerText?.trim();
                        const detailLink = item.querySelector('.calendar-headline')?.href;
                        const timeInfo = item.querySelector('.info-flex .calendar-time').innerText;
                        const dayName = timeInfo.match(/[a-zA-Z]+/g)[0].toLowerCase();
                        const date = dayName;
                        const timeArray = timeInfo.match(/\d+/g);
                        var timeFormat = timeInfo.includes('PM');
                        const time = (timeFormat ? parseInt(timeArray[0])+12 : timeArray[0]) + ":" + timeArray[1];
                        const host = item.querySelector('.sub-info-flex .calendar-hosts').innerText;
                        const venue = item.querySelector('.super-info-flex .calendar-time').innerText;
                    data.push({title,detailLink,date,time,host,venue});
                }                
                return data;
            });
        };
        // Scrape data from the current page
        function getNextDateForDay(dayName) {
            const daysOfWeek = {
               sunday: 0,
               monday: 1,
               tuesday: 2,
               wednesday: 3,
               thursday: 4,
               friday: 5,
               saturday: 6
           };
       
           const today = new Date();
           const todayDay = today.getDay();
           const targetDay = daysOfWeek[dayName];
       
           // Calculate the number of days until the next occurrence of the target day
           let daysUntilNext = (targetDay - todayDay + 7) % 7; // % 7 ensures it's always non-negative
           if (daysUntilNext === 0) {
               daysUntilNext = 7; // If today is the target day, get the next week's date
           }
       
           // Get the date of the next target day
           const nextDate = new Date(today);
           nextDate.setDate(today.getDate() + daysUntilNext);
       
           return nextDate;
       }
        const newResults = await scrapeCurrentPage();
        results.push(...newResults);
        if (await page.$('#LA') !== null) {
            await page.click('#LA');
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for the page to load
            const additionalResults = await scrapeCurrentPage();
            results.push(...additionalResults);
        }
            const uniqueEvents = results.filter((event, index, self) =>
                index === self.findIndex((e) => (
                    e.title === event.title && e.time === event.time && e.date === event.date
                ))
            );
        // }
    } catch (error) {
        console.error("Error scraping data:", error);
        return res.status(500).json({ error: 'Error scraping data' });
    } finally {
        await browser.close();
    }
    return res.status(200).json({ result: uniqueEvents });
});
module.exports = router;
