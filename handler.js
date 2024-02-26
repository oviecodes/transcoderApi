"use strict"
const app = require("./src/app")
const serverless = require("serverless-http")
const transcodeService = require("./src/services/transcode_video")

// const hello = serverless(app)

// Use this code if you don't use the http event with the LAMBDA-PROXY integration
// return { message: 'Go Serverless v1.0! Your function executed successfully!', event };

const transcode = async (event) => {
  const bucket = event.Records[0].s3.bucket.name
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  )

  console.log("key", key)
  console.log("bucketname", bucket)
  const params = {
    Bucket: bucket,
    Key: key,
  }
  try {
    // const { ContentType } = await s3.headObject(params).promise()
    // console.log("CONTENT TYPE:", ContentType)

    return await transcodeService.formatVideo(key, bucket)
  } catch (err) {
    console.log(err)
    const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`
    console.log(message)
    throw new Error(message)
  }
}

module.exports = {
  // hello,
  transcode,
}
