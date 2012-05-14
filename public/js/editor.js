var FAPI_ENDPOINT = "/fapi"
var RE_FAPI_ROOT = new RegExp("http:\/\/.*?" + FAPI_ENDPOINT.replace('/','\/'));
var active_file_location = null;

function _el_file(filename, link, icon, link_handler) {
  var el = $("<li><a id=\"_file_\"" + filename +  " href=\"" + link + "\"><i class=\"" + icon + "\"></i>" + filename +  "</a></li>");
  if (link_handler) {
    el.click(function(e) {
      link_handler(link);
      e.preventDefault();
    })
  }
  return el;
}

function revertFile() {
  if (active_file_location) {
    showFile(active_file_location)
  }
}

function saveFile() {
  if (active_file_location) {
    $.post(active_file_location, {'data': editor.getSession().getValue()}, function(data, textStatus, jqXHR) {
      if (console && console.info) {
        console.log("Saved file", data, textStatus, jqXHR);
      }
    }, 'text')
  }
}

function showFile(location) {
  $.get(location, function(data, textStatus, jqXHR) {
    active_file_location = location;
    editor.getSession().setValue(data);
  });
}

function showDirectory(location) {
  $.getJSON(location, function(data, textStatus, jqXHR) {
    var filelist = $('#files');
    filelist.empty();
    console.log( "Dir list", data)
    if (RE_FAPI_ROOT.test(data.up)) {
      filelist.append(_el_file('..', data.up, 'icon-circle-arrow-left', showDirectory));
    }
    for(var file in data.ls) {
      var info = data.ls[file];
      if (info.directory) {
        filelist.append(_el_file(file, info.link, 'icon-folder-close', showDirectory));
      } else {
        filelist.append(_el_file(file, info.link, 'icon-file', showFile));
      }
    }
  });
}

$(function() {
  editor = ace.edit("editor");
  editor.setTheme("ace/theme/solarized_dark");
  editor.setShowInvisibles(false);

  editor.getSession().setMode("ace/mode/coffee");
  editor.getSession().setTabSize(4);
  editor.getSession().setUseSoftTabs(true);

  editor.getSession().setValue("# Select a plugin from the left to start editing");

  $('#action-revert').click(function(e) {
    revertFile();
  });
  $('#action-save').click(function(e) {
    saveFile();
  });

  showDirectory(FAPI_ENDPOINT);
});
