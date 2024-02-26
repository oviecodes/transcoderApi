// const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path
const ffmpegStatic = require("ffmpeg-static")
const ffmpeg = require("fluent-ffmpeg")
// ffmpeg.setFfmpegPath(ffmpegPath)

// ffmpeg.setFfmpegPath(ffmpegStatic)
// ffmpeg.setFfmpegPath('/opt/local/bin/ffmpeg');
ffmpeg.setFfmpegPath("/opt/ffmpeg/ffmpeg")

const fs = require("fs")
const path = require("path")
// const s3 = require("../connectors/s3")

//try transcoding then immediately writing

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
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

console.log(REGION, accessKeyId, secretAccessKey)

const { Readable } = require("stream")

// const mp4FileName = "video1.mp4"
const hlsFolder = "hls"
let content_buffer

const formatVideo = async (key, srcBucket) => {
  console.log("Starting script", srcBucket)

  //   key = "Sintel - Open Movie by Blender Foundation.mkv"

  //   console.time("req_time")
  try {
    const resolutions = [
      {
        resolution: "320x180",
        videoBitrate: "500k",
        audioBitrate: "64k",
      },
      {
        resolution: "854x480",
        videoBitrate: "1000k",
        audioBitrate: "128k",
      },
      {
        resolution: "1280x720",
        videoBitrate: "2500k",
        audioBitrate: "192k",
      },
    ]

    const params = {
      Key: key,
      Bucket: aws_bucket,
    }

    // var response = await s3Client.send(new GetObjectCommand(params))
    // var stream = response.Body

    const workdir = process.cwd()

    console.log("downloading file")
    const dir = "/tmp/hls"

    // console.log(__dirname, __filename)
    // console.log(process.cwd())
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
    const writeStream = fs.createWriteStream(`${dir}/original.mp4`)
    const readStream = await s3Client.send(new GetObjectCommand(params))
    readStream.Body.pipe(writeStream)
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve("File download successful"))
      writeStream.on("error", reject("File download Error"))
    })

    console.log("Downloaded s3 mp4 file locally")

    // console.log("after response", await stream.toArray())

    // Convert stream to buffer to pass to sharp resize function.
    // if (stream instanceof Readable) {
    //   content_buffer = Buffer.concat(await stream.toArray())
    // } else {
    //   throw new Error("Unknown object stream type")
    // }

    console.log("proceeding to ffmpeg")

    const variantPlaylists = []
    for (const { resolution, videoBitrate, audioBitrate } of resolutions) {
      //   console.log(stream)
      console.log(`HLS conversion starting for ${resolution}`)
      key = key.replace(/-/g, "")
      key = key.replace(/  /g, " ")
      key = key.replace(/ /g, "_")
      key = key.replace(".", "_")
      console.log(key)
      //   return
      const outputFileName = `${key}_${resolution}.m3u8`
      const segmentFileName = `${key}_${resolution}_%03d.ts`

      const outputFilePath = path.join(workdir, `${dir}/${outputFileName}`)
      const outputSegmentPath = path.join(workdir, `${dir}/${segmentFileName}`)
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(`${dir}/original.mp4`)
          .outputOptions([
            `-c:v h264`,
            `-b:v ${videoBitrate}`,
            `-c:a aac`,
            `-b:a ${audioBitrate}`,
            `-vf scale=${resolution}`,
            `-f hls`,
            `-hls_time 10`,
            `-hls_list_size 0`,
            `-hls_segment_filename ${dir}/${segmentFileName}`,
          ])
          .output(`${dir}/${outputFileName}`)
          .on("end", () => resolve())
          .on("error", (err) => {
            console.log("rejected from ffmpeg")
            reject(err)
          })
          .run()
      })
      const variantPlaylist = {
        resolution,
        outputFileName,
      }
      variantPlaylists.push(variantPlaylist)
      console.log(`HLS conversion done for ${resolution}`)
    }
    console.log(`HLS master m3u8 playlist generating`)
    let masterPlaylist = variantPlaylists
      .map((variantPlaylist) => {
        const { resolution, outputFileName } = variantPlaylist
        const bandwidth =
          resolution === "320x180"
            ? 676800
            : resolution === "854x480"
            ? 1353600
            : 3230400
        return `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}\n${outputFileName}`
      })
      .join("\n")
    masterPlaylist = `#EXTM3U\n` + masterPlaylist

    const masterPlaylistFileName = `${key}_master.m3u8`
    const masterPlaylistPath = `${dir}/${masterPlaylistFileName}`

    fs.writeFileSync(masterPlaylistPath, masterPlaylist)
    console.log(`HLS master m3u8 playlist generated`)

    console.log(`Deleting locally downloaded s3 mp4 file`)

    // fs.unlinkSync("local.mp4")
    // console.log(`Deleted locally downloaded s3 mp4 file`)

    console.log(`Uploading media m3u8 playlists and ts segments to s3`)

    const files = fs.readdirSync(hlsFolder)
    for (const file of files) {
      if (!file.startsWith(key)) {
        continue
      }
      const filePath = path.join(`${dir}`, file)
      const fileStream = fs.createReadStream(filePath)

      const uploadParams = {
        Key: `${key}/${file}`,
        Body: fileStream,
        ContentType: file.endsWith(".ts")
          ? "video/mp2t"
          : file.endsWith(".m3u8")
          ? "application/x-mpegURL"
          : null,
        ACL: "public-read",
        Bucket: aws_bucket,
      }

      await s3Client.send(new PutObjectCommand(uploadParams))
      // await s3.upload(uploadParams).promise()
      fs.unlinkSync(filePath)
    }
    fs.unlinkSync(`${dir}/original.mp4`)
    console.log(
      `Uploaded media m3u8 playlists and ts segments to s3. Also deleted locally`
    )

    console.log("Success. Time taken: ")
    // console.timeEnd("req_time")
  } catch (error) {
    console.error("Error:", error)
  }
}

module.exports = {
  formatVideo,
}

// main()
