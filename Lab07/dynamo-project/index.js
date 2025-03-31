const express = require('express');
const app = express();
require('dotenv').config()

app.use(express.json({extended: false}));  
app.use(express.static('./views'))
app.set('view engine', 'ejs');
app.set('views', './views');

const AWS = require('aws-sdk');
const config = new AWS.Config({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey:process.env.SECRET_ACCESS_KEY,
    region:"ap-southeast-2"
})
AWS.config = config;

const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = "Products";
const multer = require('multer');
const upload = multer();

app.get('/', (req, res) => {
   const params = {
        TableName: tableName
   };
   docClient.scan(params, (err, data) => {
        if(err) {
            res.send(err);
        } else {
            res.render('index', {data: data.Items.sort((a, b) => a.id - b.id)});
        }
    });
});

app.post("/", upload.fields([]), (req, res) => {
    const {id, name, qty } = req.body;
    const params = {
        TableName: tableName,
        Item: {
            "id": id,
            "name": name,
            "qty": qty
        }
    };
    docClient.put(params, (err, data) => {
        if(err) {
            res.send(err);
        } else {
            res.redirect('/');
        }
    });
});

app.post("/delete", upload.fields([]), (req, res) => {
    const listItem = Object.keys(req.body);
    if(listItem.length == 0)    
        return res.redirect('/');
    
    function onDeleteItem(index){
        const params = {
            TableName: tableName,
            Key: {
                "id": listItem[index]
            }
        };

        docClient.delete(params, (err, data) => {
            if(err) {
                return res.send(err);
            } else {
                if(index > 0){
                    onDeleteItem(index - 1);
                } else {
                    return res.redirect('/');
                }
            }
        });
    }
    onDeleteItem(listItem.length - 1);
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});