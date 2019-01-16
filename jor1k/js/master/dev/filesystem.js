var message = require('../messagehandler');
var download = require('../../lib/download');
var utils = require('../utils');



function Filesystem(syncURL, userid) {
    this.syncURL = syncURL;
    this.userid = userid;
    message.Register("OnFSLoaded", function(){
      this.RestoreFromLocalStorage();
      this.TrackLocalStorageChanges();
    }.bind(this));
}

Filesystem.prototype.TAR = function(name,path) {
    message.Register("tar", function(d){download(d, name+".tar", "application/x-tar");} );
    message.Send("tar", path);
}

Filesystem.prototype.Sync = function(path) {
    message.Register("sync", this.OnSync.bind(this));
    message.Send("sync", path);
}

Filesystem.prototype.OnSync = function(d) {
    utils.UploadBinaryResource(this.syncURL, this.userid + ".tar", d,
        function(response) {
            alert(
                "Message from Server:" + response + "\n" +
                "The home folder '/home/user' has been synced with the server\n" +
                "In order to access the data at a later date,\n" +
                "start the next session with the current url with the user id\n" +
                "The folder size is currently limited to 1MB. Note that the feature is experimental.\n" +
                "The content can be downloaded under http://jor1k.com/sync/tarballs/" + this.userid+".tar.bz2"
            );
            }.bind(this),
        function(msg) {alert(msg);}
    );
}

Filesystem.prototype.UploadExternalFile = function(f) {
    var reader = new FileReader();
    reader.onload = function(e) {
        message.Send("MergeFile",
        {name: "home/user/"+f.name, data: new Uint8Array(reader.result)});
    }.bind(this);
    reader.readAsArrayBuffer(f);
}

Filesystem.prototype.MergeFile = function(fileName, data) {
  function stringToUint(string) {
    var charList = string.split(''),
        uintArray = [];
    for (var i = 0; i < charList.length; i++) {
        uintArray.push(charList[i].charCodeAt(0));
    }
    return new Uint8Array(uintArray);
  }
  message.Send("MergeFile", {name: fileName, data: stringToUint(data)});
}

Filesystem.prototype.MergeBinaryFile = function(fileName, data) {
  message.Send("MergeFile", {name: fileName, data: data});
}

Filesystem.prototype.CreateDirectory = function(dirctoryName) {
    message.Send("CreateDirectory", {name:dirctoryName} );
}

Filesystem.prototype.ReadFile = function(fileName, callback) {
  message.Register("ReadFile", callback);
  message.Send("ReadFile", { name: fileName });
}
Filesystem.prototype.FilesInDirectory = function(fileName, callback) {
  message.Register("FilesInDirectory", callback);
  message.Send("FilesInDirectory", { name: fileName });
}

//deletes contents of specified directory.
Filesystem.prototype.DeleteDirContents = function(dirPath) {
    message.Send("DeleteDirContents", dirPath);
}

//deletes file, recursively deletes dir
Filesystem.prototype.DeleteNode = function(nodeName) {
    message.Send("DeleteNode", nodeName);
}

Filesystem.prototype.Rename = function(oldPath, newPath) {
    message.Send("Rename", {oldPath:oldPath, newPath: newPath});
}

Filesystem.prototype.WatchFile = function(fileName, callback) {
  message.Register("WatchFileEvent", callback);
  message.Send("WatchFile", { name: fileName });
}

Filesystem.prototype.WatchDirectory = function(directoryPath, callback) {
  message.Register("WatchDirectoryEvent", callback);
  message.Send("WatchDirectory", { name: directoryPath });
}

Filesystem.prototype.WatchAllChange = function(callback) {
  message.Register("WatchAllFSEvent", callback);
}

Filesystem.prototype.RestoreFromLocalStorage = function() {
    for(var i=0, len=window.localStorage.length; i<len; i++) {
        var key = window.localStorage.key(i);
        var value = window.localStorage[key];
        file = JSON.parse(value);
        if(file.type == "dir") {
            message.Send("CreateDirectory", {
                name:key,
                atime:file.atime,
                mtime:file.mtime,
                ctime:file.ctime,
                uid:file.uid,
                gid:file.gid,
                mode:file.mode,
            });
        }else if (file.type == "file") {
            var bufView = new Uint8Array(file.size);
            for (var j=0; j<file.size; j++) {
                bufView[j] = file.data[j];
            }

            message.Send("MergeFile", {
                name: key,
                data: bufView,
                atime:file.atime,
                mtime:file.mtime,
                ctime:file.ctime,
                uid:file.uid,
                gid:file.gid,
                mode:file.mode,
            });
        }
    }
}

Filesystem.prototype.removeFromLocalStorage = function(file) {
  window.localStorage.removeItem(file);
}
Filesystem.prototype.saveFileToLocalStorage = function(file) {
    if (file !== null) {
        size = file.size;
        data = Array.prototype.slice.call(file.data);
        if (file.type == "file" && file.url == "") {
            window.localStorage.setItem(file.name,JSON.stringify({
                data:data,
                size:size,
                atime:file.atime,
                mtime:file.mtime,
                ctime:file.ctime,
                uid:file.uid,
                gid:file.gid,
                mode:file.mode,
                type:file.type,
            }));
        }else if (file.type == "dir") {
            window.localStorage.setItem(file.name,JSON.stringify({
                atime:file.atime,
                mtime:file.mtime,
                ctime:file.ctime,
                uid:file.uid,
                gid:file.gid,
                mode:file.mode,
                type:file.type,
            }));
        }
    }
}

Filesystem.prototype.TrackLocalStorageChanges = function() {
  console.log("start tracking changes");
  var fsChangeCallback = (function(info) {
      var event = info.event;
      var path = info.path;
      var opts = info.info;
      switch(event) {
        case "newfile":
        case "write":
        case "newdir":
          this.ReadFile(path, this.saveFileToLocalStorage);
          break;
        case "delete":
          this.removeFromLocalStorage(path);
          break;
        case "rename":
          this.removeFromLocalStorage(opts.oldpath);
          this.ReadFile(path, this.saveFileToLocalStorage);
          break;
        default:
          console.log("Unhandled FS event => event="+event+" path="+path);

      }
  });
  this.WatchAllChange(fsChangeCallback.bind(this));
}
module.exports = Filesystem;
