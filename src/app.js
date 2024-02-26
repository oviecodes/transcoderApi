const express = require("express")
const app = express()

const morgan = require("morgan")
const fileUpload = require("express-fileupload")

const cors = require("cors")

require("dotenv").config()

// configure app to use bodyParser() and multer()s
// this will let us get the data from a POST
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(
  fileUpload({
    limits: { fileSize: 200 * 1024 * 1024 },
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
)

//We want to access the api from on another domain
app.use(cors())

const port = process.env.PORT || 3000

app.use(morgan("dev"))

// INCLUDE API ROUTES
// =============================================================================
const routes = require("./routes")

//  Connect all our routes to our application
app.use("/", routes)

// START THE SERVER
// =============================================================================
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

module.exports = app
