const express = require("express")
const routes = express.Router()
const createError = require("http-errors")

const transcoder = require("../services/transcode_video")

routes.post("/transcode", async (req, res, next) => {
  const { video } = req.files

  console.log(req.files)

  try {
    await transcoder.formatVideo(video.tempFilePath)
    return
  } catch (e) {
    console.log(e)
    next(createError(e.statusCode, e.message))
  }
})

module.exports = routes
