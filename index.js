'use strict';

const http = require('http');
const https = require('https');
const querystring = require('querystring');
const keepAliveAgent = new https.Agent({keepAlive: true});

const AWS = require('aws-sdk');
const S3 = new AWS.S3({
  signatureVersion: 'v4',
  httpOptions: {agent: keepAliveAgent}
});
const Sharp = require('sharp');

exports.handler = async (event, context, callback) => {
  let request = event.Records[0].cf.request;
  let response = event.Records[0].cf.response;
  
  console.log(request)
  console.log(JSON.stringify(response))
  console.log(JSON.stringify(event))
  
  
  
  //check if image is not present
  if (response.status == 403) {

    //Try reading the S3 domain name
    let s3DomainName = request.origin.s3.domainName;

    //remove the s3.amazonaws.com
    let BUCKET = s3DomainName.substring(0,s3DomainName.lastIndexOf(".s3"));

    console.log("Response status code:%s and bucket:%s", response.status,BUCKET);

    
    // read the required path. Ex: uri /image_watermark.jpg
    let path = request.uri;

    //objectname will be filename_watermark, so we extract the filename and retrieve it from S3
    let keys = path.substring(1).split("_")
    let fileExtension = keys[1].split(".")[1]
    
    let objectInS3 = keys[0] + "." + fileExtension
    let newName = keys[0] +"_watermark" + "." + fileExtension
    
    console.log("filename in S3 is " + objectInS3)
    console.log("filename extension is " + fileExtension)
    console.log("new filename created is " + newName)
    
    
    let originalImage = await S3.getObject({ Bucket: BUCKET, Key: objectInS3 }).promise();

    //Sets the logo dimensions to 20% of the original image
    const metadata = await Sharp(originalImage.Body).metadata();
    let watermarkW = Math.round(0.2 * metadata.width)
    let watermarkH = Math.round(0.2 * metadata.height)
      
    let watermark = await Sharp("logo.png")
        .resize(watermarkW, watermarkH)
        .toBuffer();  
    
    let watermarkedOutput = await Sharp(originalImage.Body)
        .composite([{ input: watermark, gravity: 'center' }])
        .toBuffer();
      
    console.log("Writing resized image back to bucket :%s",BUCKET);
    console.log("New Object Name " + newName)
    await S3.putObject({
            Body: watermarkedOutput,
            Bucket: BUCKET,
            ContentType: 'image/jpg',
            CacheControl: 'max-age=31536000',
            Key: newName,
            StorageClass: 'STANDARD'
    }).promise();
    // generate a binary response with resized image
    response.status = 200;
    response.body = watermarkedOutput.toString('base64');
    response.bodyEncoding = 'base64';
    response.headers['content-type'] = [{ key: 'Content-Type', value: 'image/jpg'}];
    callback(null, response);
    // even if there is exception in saving the object we send back the generated
    // image back to viewer below
  } // end of if block checking response statusCode
  else {
    // allow the response to pass through
    console.log("Resized image present.Nothing to do..");
    callback(null, response);
  }
};