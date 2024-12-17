var express = require('express');
var router = express.Router();
const cheerio = require("cheerio");
const axios = require("axios");

router.get("/dola", async (req, res) => {
    try {
        const results = await webDataScraper();
        const uniqueEvents = results.filter((event, index, self) =>
            index === self.findIndex((e) => (
                e.title === event.title && e.time === event.time && e.date === event.date
            ))
        );
        var data = uniqueEvents;
        //save data in database
        return res.status(200).json({
            result: data,
        });
    } catch (err) {
        return res.status(500).json({
            err: err.toString(),
        });
    };
});

async function webDataScraper() {
    // console.log('parent scraping start');

    var result = [];
    let page = 1;
    var moreResults = true;
    while (moreResults) {
        var baseUrl = "https://dola.com"
        var url = "https://dola.com/events/2024/10/23";
        if (page > 1) {
            url = `https://dola.com/events/2024/10/23?page=${page}`
        }
        try {
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Connection': 'keep-alive'
                }
            });
            const $ = cheerio.load(data);
            if (!$('.ds-next-page').length) {
                moreResults = false;
            }
            var selectedElem = ".ds-main .ds-events-page .ds-events-group .ds-listing"
            $(selectedElem).each((parentIndex, parentElem) => {
                const data = {};
                $(parentElem)
                    .children()
                    .each(async (childId, childElem) => {
                        if ($(childElem).hasClass('ds-cover-image')) {
                            data["image"] = $(childElem).css('background-image').replace("url('", '').replace("')", '').replace(/\"/gi, "");
                        };
                        if ($(childElem).hasClass('ds-listing-event-title')) {
                            data["subTitle"] = $(childElem).children('.ds-byline').text()?.trim();
                            data["title"] = $(childElem).children('.ds-listing-event-title-text').text()?.trim();
                        };
                        if ($(childElem).hasClass('ds-listing-details-container')) {
                            data["location"] = $($(childElem).children().find('.ds-venue-name').find('a')[1]).text()?.trim();
                            var timeInfo = $(childElem).children('.ds-listing-details').children('.dtstart').text()?.trim();
                            let [hours, minutesPart] = timeInfo.split(':');
                            let minutes = minutesPart.slice(0, 2);
                            let period = minutesPart.slice(-2);

                            if (period === 'PM' && hours !== '12') {
                                hours = parseInt(hours, 10) + 12;
                            } else if (period === 'AM' && hours === '12') {
                                hours = '00';
                            }
                            data["time"] = hours + ":" + minutes;
                            var dateStr = $(childElem).children('.ds-listing-details').children('meta').attr('datetime');
                            const date = new Date(dateStr);
                            // Convert to PDT (America/Los_Angeles)
                            const options = {
                                timeZone: 'America/Los_Angeles',
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                            };
                            const formatter = new Intl.DateTimeFormat('en-US', options);
                            const parts = formatter.formatToParts(date);
                            const year = parts.find(part => part.type === 'year').value;
                            const month = parts.find(part => part.type === 'month').value;
                            const day = parts.find(part => part.type === 'day').value;
                            const formattedDate = `${year}-${month}-${day}`;
                            data["date"] = formattedDate
                            data["endDate"] = `${year}-${parseInt(month)+1}-${day}`
                            var location = $($(childElem).children().find('.ds-venue-name').children('span')[0]).children();
                            data["address"] = $(location[0]).attr('content');
                            data["city"] = $(location[2]).attr('content');
                            data["state"] = $(location[1]).attr('content');
                            data["zipCode"] = $(location[3]).attr('content');
                        };
                        if ($(childElem).hasClass('ds-listing-extra')) {
                            data["extraDetails"] = $(childElem).children('p').text().trim();
                        };
                        if ($(childElem).hasClass('ds-listing-event-title')) {
                            var childUrl = baseUrl + $(childElem).attr('href');
                            data["detailLink"] = childUrl;
                            var childData = {};
                            if (childUrl != "" && childUrl !== undefined) {
                                Promise.all([
                                    childData = await webDataScraperchild(childUrl)
                                ]);
                            };
                            data["description"] = childData.description || "";
                            data["price"] = childData.price;
                            data["ticketLink"] = childData.ticketLink;
                        };
                    });
                result.push(data);
            });
        } catch (error) {
            console.error(`Error fetching page ${page}:`, error.message);
            break; // Exit or retry logic here
        }
        page++
    };
    const today = new Date();
    const nextThreeMonths = new Date(today);
    nextThreeMonths.setMonth(today.getMonth() + 3);
    const filteredData = result.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= today && itemDate <= nextThreeMonths;
    });
    return result;
};
async function webDataScraperchild(url) {
    // console.log('child scraping start');
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Connection': 'keep-alive'
        }
    });
    const $ = cheerio.load(data);
    var description = $('.ds-event-description-inner').html()?.trim();
    var priceInfo = $('.ds-ticket-info').text()?.trim()?.match(/\d+/g) || [];
    var ticketLink = $('.ds-buy-tix')?.attr('href') || "";
    var price = priceInfo.length > 1 ? (priceInfo[0] + "." + priceInfo[1]) : priceInfo.length == 1 ? priceInfo[0] : 0;
    return {description, price, ticketLink}
};

module.exports = router