express = require 'express'
fapi = new require(process.env.FAPI_ROOT || './fapi')

app = express.createServer(express.logger())
app.use express.bodyParser()
app.use express.static("#{__dirname}/../public")

FAPI_FILES_ROOT = 'fake_plugins'

app.get /^\/fapi\/(.*)/, (req, res) ->
  new fapi.Fapi(FAPI_FILES_ROOT).get req, res, req.params[0]

app.post /^\/fapi\/(.*)/, (req, res) ->
  new fapi.Fapi(FAPI_FILES_ROOT).post req, res, req.params[0]

app.get '/fapi', (req, res) ->
  res.redirect '/fapi/'

app.get '/', (req, res) ->
  res.redirect '/index.html'

# Startup the server
port = process.env.PORT || 3000
app.listen port, ->
  console.log "Listening on #{port}"
