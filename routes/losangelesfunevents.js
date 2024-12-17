const puppeteer = require('puppeteer');
const express = require('express');
const router = express.Router();

router.get("/losangelesfunevents", async (req, res) => {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage();

    // Replace with the URL you want to scrape
    // https://los-angeles.events/sports/
    const baseURL = 'https://www.losangelesfunevents.com';
    await page.goto(baseURL, { waitUntil: 'networkidle2' });

    let results = [];
    let scrapedItems = new Set();
    // Function to scrape the current visible content
    const scrapeCurrentPage = async () => {
        return await page.evaluate(() => {
            let data = [];
            var aa = document.querySelectorAll('ul.tfCiE0 li.yIpRkq');
            for (let i = 0; i < aa.length; i++) {
                var item = aa[i];
                var image = item.querySelectorAll('img')[1].src
                var detailLink = item.querySelector('.DjQEyU').href
                var title = item.querySelector('.yuONQy').children.item('a').innerText;
                var dateTime = item.querySelector('.I_kVM1').innerText.split(',')
                var tempDate = dateTime[0] + dateTime[1];
                var fullDate = new Date(tempDate);
                var nextDayFormat = fullDate;
                nextDayFormat.setDate(nextDayFormat.getDate()+1);
                var endDate =  nextDayFormat.getFullYear() + '-' + parseInt(nextDayFormat.getMonth()+1) + '-' + (nextDayFormat.getDate());
                var startDate = fullDate.getFullYear() + '-' + parseInt(fullDate.getMonth()+1) + '-' + fullDate.getDate();
                var str = item.querySelector('.I_kVM1').innerText.split(',')[2];
                var timeArray = str.match(/\d+/g);
                var timeFormat = str.includes('PM');
                var startTime  = (timeFormat ? parseInt(timeArray[0])+12 : timeArray[0]) + ":" +  timeArray[1];
                var endTime  = (timeFormat ? parseInt(timeArray[2])+12 : timeArray[2]) + ":" + timeArray[3]
                var place = item.querySelector('.yT3PPL').innerText.split(',')[0];
                var zipCode = item.querySelector('.yT3PPL').innerText.split(',')[3]?.trim().split(' ')[1] || "90027";
                var address = item.querySelector('.yT3PPL').innerText.split(',')[1]?.trim();
                var city = item.querySelector('.yT3PPL').innerText.split(',')[2]?.trim();
                var state = item.querySelector('.yT3PPL').innerText.split(',')[3]?.trim().split(' ')[0];
                var country = item.querySelector('.yT3PPL').innerText.split(',')[4]?.trim();
                var description = item.querySelector('.MizEne').innerHTML?.trim();
                var socialLinks = item.querySelector('.LE4lF8').children;
                var fbLink = socialLinks[0].href;
                var twitterLink = socialLinks[1].href;
                var linkedinLink = socialLinks[2].href;
                data.push({ image, detailLink, title, startDate, endDate, startTime, endTime, place, address, zipCode, city, state, country, fbLink, twitterLink, linkedinLink, description });
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
            const loadMoreButton = await page.$('.fgHLUq', { visible: true, });
            if (loadMoreButton) {
                // Click the "Load More" button
                await page.waitForSelector('.fgHLUq', { visible: true, timeout: 10000 });

                await Promise.all([
                    loadMoreButton.click(),
                    await new Promise(resolve => setTimeout(resolve, 3000))// Wait for 2 second
                    // page.waitForFunction(
                    //     `document.querySelectorAll('li.yIpRkq').length > ${results.length}`,
                    //     { visible: true, timeout: 5000 }
                    // ) // Wait until new rows are added
                ]);
            } else {
                hasMore = false; // If no more "Load More" button, stop scraping
            };
        } catch (err) {
            console.error('Error clicking "Load More":', err);
            hasMore = false; // Exit the loop if there's an error
        };
    };
    for (let i = 0; i < results.length; i++) {
        const ele = results[i];
        await page.goto(ele.detailLink, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000))
        const showMoreButton = await page.$('.ExrOQi', { visible: true, });
        if (showMoreButton) {
            await Promise.all([
                showMoreButton.click(),
                await new Promise(resolve => setTimeout(resolve, 2000))
            ]);
        };
        const detailData = await page.evaluate(() => {
            var description = document.querySelector('.GcAfO')?.innerHTML?.trim() || "";
            return description ;
        });
        ele['description'] = detailData

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    await browser.close();

    const uniqueEvents = results.filter((event, index, self) =>
        index === self.findIndex((e) => (
            e.title === event.title && e.startTime === event.startTime && e.startDate === event.startDate
        ))
    );
    return res.status(200).json({
        result: uniqueEvents
    });
});



module.exports = router;
