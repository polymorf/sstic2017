/* SSTIC */
var message = require('../messagehandler');
var config = require('../../config_with_data');
var SHA = require('../../lib/sha256');
var AES = require('../../lib/aes');

function b64Decode(str) {
	return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

function toHexString(byteArray) {
  return byteArray.map(function(byte) {
	return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}

function SSTICfront() {
	message.Register("lum-front", this.add_lum.bind(this));
	message.Register("key-front", this.add_key.bind(this));
	if (window.localStorage.lums == undefined)
			window.localStorage.setItem("lums",JSON.stringify({
				type:"lum",
				levels:{},
			}));
	if (window.localStorage.keys == undefined)
			window.localStorage.setItem("keys",JSON.stringify({
				type:"key",
				levels:{},
			}));
	if (window.localStorage.unlocked == undefined)
			window.localStorage.setItem("unlocked",JSON.stringify({
				type:"unlocked",
				levels:[],
			}));
	window.onbeforeunload = function (e) {
		e = e || window.event;
		if (e) {
			e.returnValue = 'Sure?';
		}
		return 'Sure?';
	}
	this.restore_lum();
	this.restore_unlock();
	this.restore_key();
	this.ask_pseudo();
}

SSTICfront.prototype.notify = function (param) {
	if (window.localStorage.pseudo != undefined) {
		var pseudo = window.localStorage.pseudo;
		var pseudo_obj = JSON.parse(pseudo);
		var name = pseudo_obj.name;
		if (name != "") {
			var url = config.notify_url+"?pseudo="+encodeURIComponent(btoa(name))+"&"+param;
			//console.log(url)
			var xmlHttp = new XMLHttpRequest();
			xmlHttp.open("GET", url, true);
			xmlHttp.send(null);
		}
	}
}

SSTICfront.prototype.ChangeTelemetry = function() {
	swal({
	  title: "SSTICsoft telemetry agent",
	  text: "Pour suivre votre avancée dans le challenge, des notifications seront envoyées au serveur de l'organisation lors de la validation d'une épreuve, et lors de la découverte d'un LUM",
	  type: "input",
	  showCancelButton: true,
	  closeOnConfirm: true,
	  confirmButtonText: "valider",
	  cancelButtonText: "ne pas envoyer de notification",
	  animation: "slide-from-top",
	  inputPlaceholder: "Entrez votre nom ou votre pseudo ici"
	},
	function(inputValue){
	  if (inputValue === "" || inputValue === false) {
		window.localStorage.setItem("pseudo",JSON.stringify({
			type:"pseudo",
			name: "",
		}));
		document.getElementById("telemetry").innerText = "telemetry off";
		document.getElementById("telemetry").className = "telemetry-off";
	  }else{
		window.localStorage.setItem("pseudo",JSON.stringify({
			type:"pseudo",
			name: inputValue,
		}));
		document.getElementById("telemetry").innerText = "telemetry on : "+inputValue;
		document.getElementById("telemetry").className = "telemetry-on";
	  }
	  return true;
	});	
}
SSTICfront.prototype.ask_pseudo = function() {
	if (window.localStorage.pseudo == undefined) {
		swal({
		  title: "SSTICsoft telemetry agent",
		  text: "Pour suivre votre avancée dans le challenge, des notifications seront envoyées au serveur de l'organisation lors de la validation d'une épreuve, et lors de la découverte d'un LUM",
		  type: "input",
		  showCancelButton: true,
		  closeOnConfirm: true,
		  confirmButtonText: "valider",
		  cancelButtonText: "ne pas envoyer de notification",
		  animation: "slide-from-top",
		  inputPlaceholder: "Entrez votre nom ou votre pseudo ici"
		},
		function(inputValue){
		  if (inputValue === "" || inputValue === false) {
			window.localStorage.setItem("pseudo",JSON.stringify({
				type:"pseudo",
				name: "",
			}));
			document.getElementById("telemetry").innerText = "telemetry off";
			document.getElementById("telemetry").className = "telemetry-off";
		  }else{
			window.localStorage.setItem("pseudo",JSON.stringify({
				type:"pseudo",
				name: inputValue,
			}));
			document.getElementById("telemetry").innerText = "telemetry on : "+inputValue;
			document.getElementById("telemetry").className = "telemetry-on";
		  }
		  return true;
		});	
	}else{
		var pseudo = window.localStorage.pseudo;
		var pseudo_obj = JSON.parse(pseudo);
		if (pseudo_obj.name == "") {
			document.getElementById("telemetry").innerText = "telemetry off";
			document.getElementById("telemetry").className = "telemetry-off";
		}else{
			document.getElementById("telemetry").innerText = "telemetry on : "+pseudo_obj.name;
			document.getElementById("telemetry").className = "telemetry-on";
		}
	}
}
SSTICfront.prototype.restore_key = function() {
	var keys = window.localStorage.keys;
	var keys_object = JSON.parse(keys);
	for(var i=0; i < config.levels.length; i++) {
		if(keys_object.levels[i] != undefined) {
			if (config.levels[i].completed_img != undefined) {
				document.getElementById("world"+i+"_img").src = config.levels[i].completed_img;
			}
		}
	}
}


SSTICfront.prototype.restore_unlock = function() {
	var keys = window.localStorage.keys;
	var keys_object = JSON.parse(keys);
	this.unlock_levels(keys_object.levels,false);
}

SSTICfront.prototype.restore_lum = function() {
	var lums = window.localStorage.lums;
	lums_object = JSON.parse(lums);
	for(var i=0; i < config.levels.length; i++) {
		var total_lum = config.levels[i].lum.length;
		var validated_lum = 0;
		if (lums_object.levels[i] != undefined) {
			validated_lum = lums_object.levels[i].length;
		}
		if (total_lum != 0) {
			document.getElementById("lum"+i).innerHTML = ""+validated_lum+"/"+total_lum;
		}
	}
}

SSTICfront.prototype.encrypt_key = function(key) {
	var shaObj = new SHA("SHA-256", "TEXT");
	shaObj.update(key);
	var aes_key = Uint8Array.from(shaObj.getHash("BYTES"), c => c.charCodeAt(0))
	var aesEcb = new AES.ModeOfOperation.ecb(aes_key);
	var textBytes = AES.util.convertStringToBytes("_I have the key_");
	var encryptedBytes = aesEcb.encrypt(textBytes);
	return toHexString(encryptedBytes);

}

SSTICfront.prototype.unlock_levels = function(keys,decrypt) {
	var unlocked = window.localStorage.unlocked;
	unlocked_object = JSON.parse(unlocked);
	for(var i=0; i < config.levels.length; i++) {
		if (config.levels[i].require != undefined) {
			//console.log("Level "+i+" needs unlock");
			var unlock = true;
			var aes_key = "";
			for (var j=0; j < config.levels[i].require.length; j++) {
				var required = config.levels[i].require[j];
				if(keys[required] != undefined) {
					aes_key += keys[required];
				}else{
					console.log("required level "+required+" not completed");
					unlock = false;
					break;
				}
			}
			if(unlock && (unlocked_object.levels.indexOf(i) == -1)) {
				//console.log("Level "+i+" can be unlocked
				if (config.levels[i].unlocked_img != undefined) {
					document.getElementById("world"+i+"_img").src = config.levels[i].unlocked_img;
				}
				if (decrypt) {
					var shaObj = new SHA("SHA-256", "TEXT");
					shaObj.update(aes_key);
					var aes_real_key = Uint8Array.from(shaObj.getHash("BYTES"), c => c.charCodeAt(0))
					var iv = b64Decode(config.levels[i].aes_iv);
					var aesCbc = new AES.ModeOfOperation.cbc(aes_real_key, iv);
					var decryptedBytes = aesCbc.decrypt(b64Decode(config.levels[i].data));
					var data_len = config.levels[i].data_len;
					/* todo : padding */
					var bufView = new Uint8Array(data_len);
					for (var j=0; j<data_len; j++) {
						bufView[j] = decryptedBytes[j];
					}

					message.Send("MergeFile", {
						name: config.levels[i].filename,
						data: bufView,
						atime:1481802829,
						mtime:1481802829,
						ctime:1481802829,
						uid:100,
						gid:100,
						mode:33188,
					});
					swal({
						title: "Good job, world "+(i+1)+" unlocked !",
						text: "Next level : "+config.levels[i].filename,
						imageUrl: "images/success.png"
					});
				}
				unlocked_object.levels.push(i);
				window.localStorage.setItem("unlocked",JSON.stringify(unlocked_object));
			}

		}
	}
}


SSTICfront.prototype.add_key = function(keyinfo) {
	var keys = window.localStorage.keys;
	var keys_object = JSON.parse(keys);
	if (keys_object.levels[keyinfo.level] == keyinfo.key) {
		//console.log("Key already added for level "+keyinfo.level);
		return;
	}else{
		keys_object.levels[keyinfo.level] = keyinfo.key;
		if (config.levels[keyinfo.level].completed_img != undefined) {
			document.getElementById("world"+keyinfo.level+"_img").src = config.levels[keyinfo.level].completed_img;
		}
		this.unlock_levels(keys_object.levels,true);
		this.notify("key="+this.encrypt_key(keyinfo.key));
	}
	window.localStorage.setItem("keys",JSON.stringify(keys_object));
}

SSTICfront.prototype.add_lum = function(lum) {
	var lums = window.localStorage.lums;
	var lums_object = JSON.parse(lums);
	if(lums_object.levels[lum.level] == undefined) {
		lums_object.levels[lum.level] = [];
	}
	if (lums_object.levels[lum.level].indexOf(lum.lum_pos) > -1) {
		//console.log("LUM already added for level "+lum.level+" lum "+lum.lum_pos);
		return;
	}else{
		lums_object.levels[lum.level].push(lum.lum_pos);
		var total_lum = config.levels[lum.level].lum.length;
		var validated_lum = lums_object.levels[lum.level].length;
		document.getElementById("lum"+lum.level).innerHTML = ""+validated_lum+"/"+total_lum;
		this.notify("lum="+this.encrypt_key(lum.lum));
	}
	window.localStorage.setItem("lums",JSON.stringify(lums_object));
}

module.exports = SSTICfront;
