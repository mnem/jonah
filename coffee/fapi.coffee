node_path = require 'path'
node_fs = require 'fs'
url = require 'url'

class exports.Fapi
  constructor: (file_root, is_secure = false, @show_hidden = false) ->
    if is_secure
      @protocol = 'https://'
    else
      @protocol = 'http://'
    @file_root = node_path.resolve file_root
    console.log "Fapi created with file root: #{@file_root}, protocol: #{@protocol}"

  error: (req, res, http_code, message = "", current = null) ->
      console.log "ERROR: #{http_code} - #{message}"
      res.json
        error: true
        current: current or @current_url req
        message: message
        http_code: http_code,
        http_code

  success: (req, res, message = null, data_object = {}, http_code = 200 ) ->
    data_object.current = @current_url req
    data_object.error = false
    data_object.message = message if message
    data_object.http_status = http_code
    res.json data_object, http_code

  resolve: (file_path) ->
    node_path.normalize(node_path.resolve(node_path.join(@file_root, file_path)))

  current_url: (req) ->
    url.resolve "#{@protocol}#{req.header('host')}", req.url

  _r_mkdirs: (current, to_make, complete) ->
    return complete() if to_make == null or to_make.length == 0
    current = node_path.join current, to_make.pop()
    node_fs.mkdir current, =>
      @_r_mkdirs current, to_make, complete

  mkdir_p: (dirname, complete) ->
    if dirname.indexOf(@file_root) == 0
      # Separate all the bits we have to create
      to_create = []
      while dirname != @file_root and dirname.length > @file_root.length + 1
        new_dirname = node_path.dirname dirname
        to_create.push dirname[new_dirname.length + 1..]
        dirname = new_dirname
      @_r_mkdirs @file_root, to_create, complete
    else
      complete()

  prepare_target: (req, res, file_path, ensure_exists, on_prepared) ->
    raw_web_target = "#{@protocol}#{req.header('host')}#{req.url}"
    target = @resolve file_path
    if target.indexOf(@file_root) == 0
      if ensure_exists
        node_path.exists target, (exists) =>
          if exists
            on_prepared req, res, target
          else
            @error req, res, 404, 'Can\'t find.', raw_web_target
      else
        on_prepared req, res, target
    else
      @error req, res, 403, 'No chance matey.', raw_web_target

  _r_get_directory: (root, files, files_desc, dir_url, complete) ->
    return complete() if files == null or files.length == 0
    file = files.pop()
    if @show_hidden or file[0] != '.'
      node_fs.stat node_path.join(root, file), (err, stats) =>
        if not err
          console.log "dir_url: #{dir_url}, file: #{file}"
          files_desc[file] =
            link: "#{dir_url}#{file}"
            directory: stats.isDirectory()
        @_r_get_directory root, files, files_desc, dir_url, complete
    else
      @_r_get_directory root, files, files_desc, dir_url, complete

  get_directory: (req, res, file_path) ->
    node_fs.readdir file_path, (err, files) =>
      if err
        @error req, res, 500, 'Can\'t read.'
      else
        dir_url = @current_url req
        if dir_url.length > 1 and dir_url[dir_url.length - 1] != '/'
          dir_url = dir_url + '/'
        parsed_url = url.parse dir_url
        parsed_url.pathname = node_path.resolve parsed_url.pathname, '..'
        # This will allow you to change to a directory url above the
        # root. Because I'm not storing state, I'm not sure how to get
        # around that just now.
        up_url = url.format parsed_url
        file_list =
          up: up_url
          ls: {}

        @_r_get_directory file_path, files, file_list.ls, dir_url, =>
          @success req, res, null, file_list

  get: (req, res, web_path) ->
    @prepare_target req, res, web_path, true, (req, res, file_path) =>
      node_fs.stat file_path, (err, stats) =>
        if err
          @error req, res, 500, 'Can\'t stat.'
        else
          if stats.isFile()
            # Add these things: http://stackoverflow.com/a/4591335/878127
            res.download file_path, node_path.basename file_path
          else if stats.isDirectory()
            @get_directory req, res, file_path
          else
            @error req, res, 403, 'I don\'t like the look of that. Go away.'

  post_file: (req, res, file_path, success_code = 200) ->
    @mkdir_p node_path.dirname(file_path), =>
      node_fs.writeFile file_path, req.body.data, (err) =>
        if err
          @error req, res, 500, err.message or "Wat?"
        else
          @success req, res, "Wrote file.", null, success_code

  post: (req, res, web_path) ->
    @prepare_target req, res, web_path, false, (req, res, file_path) =>
      node_fs.stat file_path, (err, stats) =>
        if err
          @post_file req, res, file_path, 201
        else
          if stats.isFile()
            @post_file req, res, file_path
          else
            @error req, res, 405, "Can't POST to that resource."
