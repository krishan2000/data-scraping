var express = require('express');
var bodyparser = require('body-parser');
var dataScrapper = require('./routes/dataScrapper-dola');
var losAngeles = require('./routes/los-angeles-data');
var losangelesfunevents = require('./routes/losangelesfunevents');
var eventbrite = require('./routes/eventbrite');
var techWeek = require('./routes/tech-week');


require('dotenv');
var app = express();
var routes = express.Router();
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
    extended: true
}));
app.use('/web_assets', express.static(__dirname + '/public/front_end/assets'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get(['/', '/home'], (req, res) => {
    res.render('home')
});

app.use('/', routes);
routes.use(dataScrapper);
routes.use(losAngeles);
routes.use(losangelesfunevents);
routes.use(eventbrite);
routes.use(techWeek);

app.listen(3000, function () {
    console.log('Express is working on http://localhost:3000');
});