(function() {
  var node_fs, node_path, url;

  node_path = require('path');

  node_fs = require('fs');

  url = require('url');

  exports.Fapi = (function() {

    function Fapi(file_root, is_secure) {
      if (is_secure == null) is_secure = false;
      if (is_secure) {
        this.protocol = 'https://';
      } else {
        this.protocol = 'http://';
      }
      this.file_root = node_path.resolve(file_root);
      console.log("Fapi created with file root: " + this.file_root + ", protocol: " + this.protocol);
    }

    Fapi.prototype.resolve = function(file_path) {
      return node_path.normalize(node_path.resolve(node_path.join(this.file_root, file_path)));
    };

    Fapi.prototype.current_url = function(req) {
      return url.resolve("" + this.protocol + (req.header('host')), req.url);
    };

    Fapi.prototype.prepare_target = function(req, res, file_path, on_prepared) {
      var target, web_target,
        _this = this;
      web_target = "" + this.protocol + (req.header('host')) + req.url;
      target = this.resolve(file_path);
      if (target.indexOf(this.file_root) === 0) {
        return node_path.exists(target, function(exists) {
          if (exists) {
            return on_prepared(req, res, target);
          } else {
            return res.json({
              current: web_target,
              message: "" + web_target + " does not exist. Crazy."
            }, 404);
          }
        });
      } else {
        return res.json({
          current: web_target,
          message: "Sorry dude, you aren't allowed to visit " + web_target
        }, 403);
      }
    };

    Fapi.prototype.get_file = function(req, res, file_path) {
      return res.download(file_path, node_path.basename(file_path));
    };

    Fapi.prototype.get_directory = function(req, res, file_path) {
      var _this = this;
      return node_fs.readdir(file_path, function(err, files) {
        var file, file_list, _i, _len;
        if (err) {
          return res.json({
            current: _this.current_url(req),
            message: "Failed to read directory " + (_this.current_url(req))
          }, 500);
        } else {
          file_list = {};
          file_list.current = _this.current_url(req);
          file_list.files = {};
          for (_i = 0, _len = files.length; _i < _len; _i++) {
            file = files[_i];
            file_list.files[file] = url.resolve(file_list.current, file);
          }
          return res.json(file_list);
        }
      });
    };

    Fapi.prototype.get = function(req, res, web_path) {
      var _this = this;
      return this.prepare_target(req, res, web_path, function(req, res, file_path) {
        return node_fs.stat(file_path, function(err, stats) {
          if (err) {
            return res.json({
              current: _this.current_url(req),
              message: "Whoops, could not stat " + (_this.current_url(req))
            }, 500);
          } else {
            if (stats.isFile()) {
              return _this.get_file(req, res, file_path);
            } else if (stats.isDirectory()) {
              return _this.get_directory(req, res, file_path);
            } else {
              return res.json({
                current: _this.current_url(req),
                message: "Not really sure what to do with " + (_this.current_url(req)) + " so you aren't getting it"
              }, 403);
            }
          }
        });
      });
    };

    return Fapi;

  })();

}).call(this);
