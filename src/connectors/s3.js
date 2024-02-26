const {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3")

require("dotenv").config()
// Set the AWS Region.
const REGION = process.env.REGION //e.g. "us-east-1"
const accessKeyId = process.env.ACCESS_KEY_ID
const secretAccessKey = process.env.SECRET_ACCESS_KEY
const aws_bucket = process.env.RISEVEST_BUCKET
// Create an Amazon S3 service client object.
const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
})

console.log(accessKeyId)
// export { s3Client }

const upload = async (data, Bucket = aws_bucket) => {
  try {
    const command = new PutObjectCommand({ ...data, Bucket })
    const results = await s3Client.send(command)

    return results
  } catch (e) {
    console.log(e)
  }
}

const downloadFilesFromBucket = async (Key, Bucket = aws_bucket) => {
  // const { Contents } = await s3Client.send(
  //   new ListObjectsCommand({ Bucket: })
  // );
  // const path = await promptForText("Enter destination path for files:");

  // for (let content of Contents) {
  const obj = await s3Client.send(new GetObjectCommand({ Bucket, Key }))
  //   writeFileSync(
  //     `${path}/${content.Key}`,
  //     await obj.Body.transformToByteArray()
  //   );
  // }
  // console.log("Files downloaded successfully.\n");
  return obj
}

const deleteFileFromBucket = async (Key, Bucket = aws_bucket) => {
  await s3Client.send(new DeleteObjectCommand({ Bucket, Key }))

  return
}

const remove = async (name) => {}

// export default {
//   upload,
//   downloadFilesFromBucket,
//   deleteFileFromBucket,
//   remove,
// }

const getObjectFileSize = async (Key, Bucket = aws_bucket) => {
  //build a retry option
  console.log("here")
  const { ContentLength } = await s3Client.send(
    new HeadObjectCommand({
      Key,
      Bucket,
    })
  )

  console.log("done")
  return ContentLength
}

async function* initiateObjectStream(Key, start, end) {
  //build a retry option
  const streamRange = `bytes=${start}-${end}`

  const { Body: chunks } = await s3Client.send(
    new GetObjectCommand({
      Key,
      Bucket,
      Range: streamRange,
    })
  )

  console.log("chuncks length", chunks.length)

  for await (const chunk of chunks) {
    yield chunk
  }
}

module.exports = {
  s3Client,
  upload,
  downloadFilesFromBucket,
  deleteFileFromBucket,
  remove,
  initiateObjectStream,
  getObjectFileSize,
}
