// Will be filled in after the initial call to get the directory
var FAPI_ENDPOINT = null;
var RE_FAPI_ROOT = null;
var _active_dir = {
  location: null
}

// Will be filled in the first time a file is edited
var _active_file = {
  location: null,
  dir: null
};
var last_active_element = null;

// Accessors /////////////////////////////////////////////////////////////////
function setActiveFileLocation(location, dir) {
  _active_file.location = location;
  _active_file.dir = dir;
  $('#active-file-location').text(location.replace(RE_FAPI_ROOT, ''));
}

function getActiveFileLocation() {
  return _active_file.location;
}

function getActiveFileDirLocation() {
  return _active_file.dir;
}

function setActiveDir(dir) {
  _active_dir.location = dir;
}

function getActiveDir() {
  return _active_dir.location;
}

////////////////////////////////////////
// Creates a jquery safe ID for a file
// link
function makeFileID(location) {
  return "___FID_" + location.replace(/(:|\.)/g,'__');
}

////////////////////////////////////////
// Creates a new string suitable for
// generating an element from for the
// file list
function _el_file(filename, link, icon, link_handler) {
  var el = $("<li><a id=\"" + makeFileID(filename) +  "\" href=\"" + link + "\"><i class=\"" + icon + "\"></i>" + filename +  "</a></li>");
  if (link_handler) {
    el.click(function(e) {
      link_handler(link, el);
      e.preventDefault();
    })
  }
  return el;
}

////////////////////////////////////////
// Reverts the current file in the editor
function revertFile() {
  if (getActiveFileLocation()) {
    showFile(getActiveFileLocation())
  }
}

////////////////////////////////////////
// Indicates if the plugin name is valid
function validPluginName(name) {
  return /^[a-z0-9-_]+$/i.test(name);
}

////////////////////////////////////////
// Validates the plugin name, adjusting
// the UI as appropriate
function validateNewPluginName() {
  if(validPluginName($('#new-plugin-name').val())) {
    $('#create-new-plugin').removeClass('disabled');
    $('#alert-invalid-plugin-name').css('display', 'none');
  } else {
    $('#create-new-plugin').addClass('disabled');
    $('#alert-invalid-plugin-name').css('display', 'block');
  }
}

////////////////////////////////////////
// Creates a new plugin using the data
// contained in the plugin template file
function newPlugin() {
  var name = $('#new-plugin-name').val();
  var shortname = name;
  if (validPluginName(name)) {
    name = name  + '.plugin.coffee';
    var dir = getActiveDir();
    if (dir[dir.length - 1] != '/') {
      dir = dir + '/';
    }
    var location = dir + name;
    var id = makeFileID(name);
    var existing = $('#' + id);
    if(existing.length != 0) {
      // Already exists, just load it
      existing.click();
    } else {
      _UIHintValidFileBeingShown();
      setActiveFileLocation(location, dir);
      if (last_active_element) {
        last_active_element.removeClass('active');
      }
      last_active_element = _el_file(name, location, 'icon-file', showFile);
      last_active_element.addClass('active');
      $('#files').append(last_active_element);
      var initial_caps_name = shortname.charAt(0).toUpperCase() + (shortname.length > 1 ? shortname.substr(1) : "");
      var template_values = {
        name: shortname,
        initial_caps_name: initial_caps_name
      }
      editor.getSession().setValue(Mustache.render(PLUGIN_TEMPLATE, template_values));
      saveFile();
    }
    $('#new-file-dialog').modal('hide');
  }
}

////////////////////////////////////////
// Saves current file being edited. If
// the file doesn't exist on the server
// then it will be created
function saveFile() {
  if (getActiveFileLocation()) {
    $.post(getActiveFileLocation(), {'data': editor.getSession().getValue()}, function(data, textStatus, jqXHR) {
      if (console && console.info) {
        console.info("Saved file", data, textStatus, jqXHR);
      }
    }, 'text')
  }
}

////////////////////////////////////////
// Shows various UI elements which
// inform the user of the current file
// being edited.
function _UIHintValidFileBeingShown() {
  $('#action-save').removeClass('disabled');
  $('#action-revert').removeClass('disabled');
  $('#active-file-location').css('display', 'inline');
  $('#label-active-file-location').css('display', 'inline');
}

////////////////////////////////////////
// Loads the file from the specified
// location and displays it in the
// editor
function showFile(location, el) {
  if (el == last_active_element) {
    return;
  }
  _UIHintValidFileBeingShown();
  if (last_active_element) {
    last_active_element.removeClass('active');
  }
  last_active_element = el;
  el.addClass('active');
  var dir = new String(getActiveDir());
  $.get(location, function(data, textStatus, jqXHR) {
    setActiveFileLocation(location, dir);
    editor.getSession().setValue(data);
  });
}

////////////////////////////////////////
// Appends an array of items to the
// file list
function _appendFileItems(items, icon, click) {
  items.sort(function (a, b) {
    return a.file.localeCompare(b.file);
  });
  var filelist = $('#files');
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var el = _el_file(item.file, item.link, icon, click);
    filelist.append(el);
    if(item.active) {
      el.addClass('active');
    }
  }
}

////////////////////////////////////////
// Shows the specified directory in the
// file listing
function showDirectory(location) {
  $.getJSON(location, function(data, textStatus, jqXHR) {
    setActiveDir(data.current);
    if(FAPI_ENDPOINT == null) {
      FAPI_ENDPOINT = data.current;
      if (FAPI_ENDPOINT[FAPI_ENDPOINT.length - 1] == '/') {
        FAPI_ENDPOINT = FAPI_ENDPOINT.substr(0, FAPI_ENDPOINT.length - 1);
      }
      RE_FAPI_ROOT = new RegExp("^" + FAPI_ENDPOINT.replace('/','\/'));
    }
    last_active_element = null;
    var filelist = $('#files');
    filelist.empty();
    if (RE_FAPI_ROOT.test(data.up)) {
      filelist.append(_el_file('..', data.up, 'icon-circle-arrow-left', showDirectory));
    }

    // Add all directories
    var dirs = [];
    for(var file in data.ls) {
      var info = data.ls[file];
      if (info.directory) {
        dirs.push({file: file, link: info.link});
      }
    }

    // Add all files
    var files = [];
    var activeID = null;
    for(var file in data.ls) {
      var info = data.ls[file];
      if (!info.directory) {
        files.push({file: file, link: info.link, active: info.link == getActiveFileLocation()});
      }
    }

    _appendFileItems(dirs, 'icon-folder-close', showDirectory);
    _appendFileItems(files, 'icon-file', showFile);
  });
}

////////////////////////////////////////
// Initialise and hook up things
$(function() {
  editor = ace.edit("editor");
  editor.setTheme("ace/theme/solarized_dark");
  editor.setShowInvisibles(false);

  editor.getSession().setMode("ace/mode/coffee");
  editor.getSession().setTabSize(4);
  editor.getSession().setUseSoftTabs(true);

  editor.getSession().setValue("# Select a plugin from the left to start editing or click NEW");

  $('#action-revert').click(function(e) {
    revertFile();
  });
  $('#action-save').click(function(e) {
    saveFile();
  });
  $('#create-new-plugin').click(function(e) {
    newPlugin();
  });

  $('#new-file-dialog').on('shown', function() {
    $('#new-plugin-name').focus();
    $('#new-plugin-name').select();
    validateNewPluginName();
  });

  $('#active-file-location').click(function(e) {
    if(getActiveFileLocation()) {
      showDirectory(getActiveFileDirLocation());
    }
    e.preventDefault();
  });

  $('#new-plugin-name').change(function () {
    validateNewPluginName();
  });
  $('#new-plugin-name').keyup(function (e) {
    validateNewPluginName();
    if( e.keyCode==13 ) {
      newPlugin();
    }
  });

  showDirectory("/fapi");
});
