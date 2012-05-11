express = require 'express'

app = express.createServer(express.logger())

app.get '/', (req, res) ->
  res.send 'Booya'

# Startup the server
port = process.env.PORT || 3000
app.listen port, ->
  console.log "Listening on #{port}"
