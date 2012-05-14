(function() {
  var node_fs, node_path, url;

  node_path = require('path');

  node_fs = require('fs');

  url = require('url');

  exports.Fapi = (function() {

    function Fapi(file_root, is_secure, show_hidden) {
      if (is_secure == null) is_secure = false;
      this.show_hidden = show_hidden != null ? show_hidden : false;
      if (is_secure) {
        this.protocol = 'https://';
      } else {
        this.protocol = 'http://';
      }
      this.file_root = node_path.resolve(file_root);
      console.log("Fapi created with file root: " + this.file_root + ", protocol: " + this.protocol);
    }

    Fapi.prototype.error = function(req, res, http_code, message, current) {
      if (message == null) message = "";
      if (current == null) current = null;
      console.log("ERROR: " + http_code + " - " + message);
      return res.json({
        error: true,
        current: current || this.current_url(req),
        message: message,
        http_code: http_code
      }, http_code);
    };

    Fapi.prototype.success = function(req, res, message, data_object, http_code) {
      if (message == null) message = null;
      if (data_object == null) data_object = {};
      if (http_code == null) http_code = 200;
      data_object.current = this.current_url(req);
      data_object.error = false;
      if (message) data_object.message = message;
      data_object.http_status = http_code;
      return res.json(data_object, http_code);
    };

    Fapi.prototype.resolve = function(file_path) {
      return node_path.normalize(node_path.resolve(node_path.join(this.file_root, file_path)));
    };

    Fapi.prototype.current_url = function(req) {
      return url.resolve("" + this.protocol + (req.header('host')), req.url);
    };

    Fapi.prototype._r_mkdirs = function(current, to_make, complete) {
      var _this = this;
      if (to_make === null || to_make.length === 0) return complete();
      current = node_path.join(current, to_make.pop());
      return node_fs.mkdir(current, function() {
        return _this._r_mkdirs(current, to_make, complete);
      });
    };

    Fapi.prototype.mkdir_p = function(dirname, complete) {
      var new_dirname, to_create;
      if (dirname.indexOf(this.file_root) === 0) {
        to_create = [];
        while (dirname !== this.file_root && dirname.length > this.file_root.length + 1) {
          new_dirname = node_path.dirname(dirname);
          to_create.push(dirname.slice(new_dirname.length + 1));
          dirname = new_dirname;
        }
        return this._r_mkdirs(this.file_root, to_create, complete);
      } else {
        return complete();
      }
    };

    Fapi.prototype.prepare_target = function(req, res, file_path, ensure_exists, on_prepared) {
      var raw_web_target, target,
        _this = this;
      raw_web_target = "" + this.protocol + (req.header('host')) + req.url;
      target = this.resolve(file_path);
      if (target.indexOf(this.file_root) === 0) {
        if (ensure_exists) {
          return node_path.exists(target, function(exists) {
            if (exists) {
              return on_prepared(req, res, target);
            } else {
              return _this.error(req, res, 404, 'Can\'t find.', raw_web_target);
            }
          });
        } else {
          return on_prepared(req, res, target);
        }
      } else {
        return this.error(req, res, 403, 'No chance matey.', raw_web_target);
      }
    };

    Fapi.prototype._r_get_directory = function(root, files, files_desc, dir_url, complete) {
      var file,
        _this = this;
      if (files === null || files.length === 0) return complete();
      file = files.pop();
      if (this.show_hidden || file[0] !== '.') {
        return node_fs.stat(node_path.join(root, file), function(err, stats) {
          if (!err) {
            console.log("dir_url: " + dir_url + ", file: " + file);
            files_desc[file] = {
              link: "" + dir_url + file,
              directory: stats.isDirectory()
            };
          }
          return _this._r_get_directory(root, files, files_desc, dir_url, complete);
        });
      } else {
        return this._r_get_directory(root, files, files_desc, dir_url, complete);
      }
    };

    Fapi.prototype.get_directory = function(req, res, file_path) {
      var _this = this;
      return node_fs.readdir(file_path, function(err, files) {
        var dir_url, file_list, parsed_url, up_url;
        if (err) {
          return _this.error(req, res, 500, 'Can\'t read.');
        } else {
          dir_url = _this.current_url(req);
          if (dir_url.length > 1 && dir_url[dir_url.length - 1] !== '/') {
            dir_url = dir_url + '/';
          }
          parsed_url = url.parse(dir_url);
          parsed_url.pathname = node_path.resolve(parsed_url.pathname, '..');
          up_url = url.format(parsed_url);
          file_list = {
            up: up_url,
            ls: {}
          };
          return _this._r_get_directory(file_path, files, file_list.ls, dir_url, function() {
            return _this.success(req, res, null, file_list);
          });
        }
      });
    };

    Fapi.prototype.get = function(req, res, web_path) {
      var _this = this;
      return this.prepare_target(req, res, web_path, true, function(req, res, file_path) {
        return node_fs.stat(file_path, function(err, stats) {
          if (err) {
            return _this.error(req, res, 500, 'Can\'t stat.');
          } else {
            if (stats.isFile()) {
              return res.download(file_path, node_path.basename(file_path));
            } else if (stats.isDirectory()) {
              return _this.get_directory(req, res, file_path);
            } else {
              return _this.error(req, res, 403, 'I don\'t like the look of that. Go away.');
            }
          }
        });
      });
    };

    Fapi.prototype.post_file = function(req, res, file_path, success_code) {
      var _this = this;
      if (success_code == null) success_code = 200;
      return this.mkdir_p(node_path.dirname(file_path), function() {
        return node_fs.writeFile(file_path, req.body.data, function(err) {
          if (err) {
            return _this.error(req, res, 500, err.message || "Wat?");
          } else {
            return _this.success(req, res, "Wrote file.", null, success_code);
          }
        });
      });
    };

    Fapi.prototype.post = function(req, res, web_path) {
      var _this = this;
      return this.prepare_target(req, res, web_path, false, function(req, res, file_path) {
        return node_fs.stat(file_path, function(err, stats) {
          if (err) {
            return _this.post_file(req, res, file_path, 201);
          } else {
            if (stats.isFile()) {
              return _this.post_file(req, res, file_path);
            } else {
              return _this.error(req, res, 405, "Can't POST to that resource.");
            }
          }
        });
      });
    };

    return Fapi;

  })();

}).call(this);
