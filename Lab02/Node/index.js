const express = require('express');
const app = express();

app.use(express.json({extended: false}));  
app.use(express.static('./views'))
app.set('view engine', 'ejs');
app.set('views', './views');

app.get('/', (req, res) => {
    return res.render('index');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});