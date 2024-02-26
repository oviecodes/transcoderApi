const routes = require("express").Router()
const createError = require("http-errors")
const video = require("./video")

routes.all("/", (req, res) => {
  res.status(200).json({
    status: true,
    message: "PAPDESK TRANSCODE API v1.0",
  })
})

// routes.use("/post", post)
routes.use("/video", video)

routes.use(async (req, res, next) => {
  next(createError.NotFound("Route not Found"))
})

routes.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    status: false,
    message: err.message,
  })
})

module.exports = routes
