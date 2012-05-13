node_path = require 'path'
node_fs = require 'fs'
url = require 'url'

class exports.Fapi
  constructor: (file_root, is_secure = false) ->
    if is_secure
      @protocol = 'https://'
    else
      @protocol = 'http://'
    @file_root = node_path.resolve file_root
    console.log "Fapi created with file root: #{@file_root}, protocol: #{@protocol}"

  resolve: (file_path) ->
    node_path.normalize(node_path.resolve(node_path.join(@file_root, file_path)))

  current_url: (req) ->
    url.resolve "#{@protocol}#{req.header('host')}", req.url

  prepare_target: (req, res, file_path, ensure_exists, on_prepared) ->
    web_target = "#{@protocol}#{req.header('host')}#{req.url}"
    target = @resolve file_path
    if target.indexOf(@file_root) == 0
      if ensure_exists
        node_path.exists target, (exists) =>
          if exists
            on_prepared req, res, target
          else
            res.json
              current: web_target
              message: "#{web_target} does not exist. Crazy.",
              404
      else
        on_prepared req, res, target
    else
      res.json
        current: web_target
        message: "Sorry dude, you aren't allowed to visit #{web_target}",
        403

  get_file: (req, res, file_path) ->
    # Add these things: http://stackoverflow.com/a/4591335/878127
    res.download file_path, node_path.basename file_path

  get_directory: (req, res, file_path) ->
    node_fs.readdir file_path, (err, files) =>
      if err
        res.json
          current: @current_url req
          message: "Failed to read directory #{@current_url req}",
          500
      else
        file_list = {}
        file_list.current = @current_url req
        file_list.files = {}
        file_list.files[file] = url.resolve file_list.current, file for file in files
        res.json file_list

  get: (req, res, web_path) ->
    # console.log req
    @prepare_target req, res, web_path, true, (req, res, file_path) =>
      node_fs.stat file_path, (err, stats) =>
        if err
          res.json
            current: @current_url req
            message: "Whoops, could not stat #{@current_url req}",
            500
        else
          if stats.isFile()
            @get_file req, res, file_path
          else if stats.isDirectory()
            @get_directory req, res, file_path
          else
            res.json
              current: @current_url req
              message: "Not really sure what to do with #{@current_url req} so you aren't getting it",
              403

  post_file: (req, res, file_path) ->
    node_fs.writeFile file_path, req.body.data, (err) =>
      if err
        res.json
          current: @current_url req
          message: err.message,
          500
      else
        res.json
          current: @current_url req
          message: "Wrote file #{@current_url req}",
          200

  post: (req, res, web_path) ->
    # console.log req
    @prepare_target req, res, web_path, false, (req, res, file_path) =>
      node_fs.stat file_path, (err, stats) =>
        if err
          # Maybe creating a new file, so give it a shot
          @post_file req, res, file_path
        else
          if stats.isFile()
            @post_file req, res, file_path
          else
            res.json
              current: @current_url req
              message: "Not really sure what to do with #{@current_url req} so you aren't POSTing it",
              403
