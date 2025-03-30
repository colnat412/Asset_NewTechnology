const express = require('express');
const app = express();
const path = require("path");
require('dotenv').config()
const {v4: uuid} = require("uuid")

app.use(express.json({extended: false}));  
app.use(express.static('./views'))
app.use
app.set('view engine', 'ejs');
app.set('views', './views');

const AWS = require('aws-sdk');
const config = new AWS.Config({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey:process.env.SECRET_ACCESS_KEY,
    region: process.env.REGION
})
AWS.config = config;

const s3 = new AWS.S3();
const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = "Product";
const multer = require('multer');

const storage = multer.memoryStorage({
    destination(req, file, callback){
        callback(null, '');
    },
});

function checkFileType(file, cb){
    const fileTypes = /jpeg|jpg|png|gif/;

    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const minetype = fileTypes.test(file.mimetype);
    console.log("ext:", extname);
    console.log("mine:", minetype);
    if(extname && minetype){
        return cb(null, true);
    }
    return cb("Error: Image only");
}

const upload = multer({
    storage,
    limits:{fileSize:2000000}, // 2MB
    fileFilter(req, file, cb){
        checkFileType(file, cb);
    },
});

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

const CLOUD_FONT_URL = 'https://d1hlz4wppaq9cq.cloudfront.net'

app.post("/", upload.single('image'), (req, res) => {
    const {id, name, qty } = req.body;
    const image = req.file.originalname.split(".");
    const fileType = image[image.length - 1];
    const filePath = `${uuid() + Date.now().toString()}.${fileType}`;
    const params = {
        Bucket: "uploads3-toturial-bucket-loc",
        Key: filePath,
        Body: req.file.buffer
    }

    s3.upload(params, (error, data) => {
        if(error){
            console.log("error=", error);
            return res.send("Internal Server Error");
        }else{
            const newItem = {
                TableName: tableName,
                Item: {
                    "id": id,
                    "name": name,
                    "qty": qty,
                    "image_url":`${CLOUD_FONT_URL}/${filePath}`
                }
            };
            docClient.put(newItem, (err, data) => {
                if(err) {
                    res.send(err);
                } else {
                    res.redirect('/');
                }
            });
        }
    })    
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