// -------------------------------------------------
// -------------------- Timer ----------------------
// -------------------------------------------------
// Simple Timer running with the CPU frequency (20MHz) used to synchronize the cpu timers
// the syncing is done directly in the cpu, so we can return zero here.


var CMD_GET_VERSION = 0x0001;
var CMD_LOAD_TA     = 0x0002;
var CMD_TA_MESSAGE  = 0x0003;
var CMD_UNLOAD_TA   = 0x0004;
var CMD_CHECK_LUM   = 0x0005;
var CMD_CHECK_KEY   = 0x0006;

var utils = require('./utils');
var message = require('./messagehandler');
var ELF = require('./elf-advenced');
var RISCVCPU = require('./riscv/safecpu');
var RAM = require('./ram');
var Timer = require('./timer');
var SHA = require('../lib/sha256');
var bcrypt = require('../lib/bcrypt');
var config = require('../config_without_data');
var AES = require('../lib/aes');

var debug = 0;

// REGISTER NAMES
var a0 = 10;
var a1 = 11;
var a2 = 12;
var a3 = 13;
var a4 = 14;
var a7 = 17;

// SYSCALL
var SYS_write       = 0x1
var SYS_readkey     = 0x2
var SYS_writekey    = 0x3
var SYS_AES_decrypt = 0x4
var SYS_HMAC        = 0x5

function String2Uint8Array(str) {
	var buf = new ArrayBuffer(str.length);
	var bufView = new Uint8Array(buf);
	for (var i=0, strLen=str.length; i<strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return bufView;
}
function Uint8Array2String(buf) {
	return String.fromCharCode.apply(null, buf);
}

/* Load an Uint8Array from the Int32 main memory */
function GetBuffer(ram,addr,size) {
	var retbuffer = new Uint8Array(size);
	for(var i=0; i<size; i++) {
		retbuffer[i]=ram.Read8(addr+i);
	}
	return retbuffer;
}

/* Load a string from the main memory */
function GetStrBuffer(ram,addr,size) {
	var retbuffer = new Uint8Array(size);
	for(var i=0; i<size; i++) {
		retbuffer[i]=ram.Read8(addr+i);
		if(retbuffer[i] == 0) {
			break;
		}
	}
	return Uint8Array2String(retbuffer);
}

jsOS.prototype.loadKey = function (name,value) {
	this.keystore[name] = value;
	this.PrintOk("Key \""+name+"\" stored in TEE keystore");
}
jsOS.prototype.getKey = function (name) {
	if(name in this.keystore) {
		return this.keystore[name];
	}else{
		this.PrintError("Key \""+name+"\" not in TEE keystore");
		return new Uint8Array();
	}
}

/* Handle Syscalls */
jsOS.prototype.syscallHandler = function (ram,r) {
	var n    = r[a7]; // syscalll number in a7
	var arg0 = r[a0];
	var arg1 = r[a1];
	var arg2 = r[a2];
	var arg3 = r[a3];
	switch (n) {
		case SYS_write:
			/*
			 * arg0 is the FD (not implemented here)
			 * arg1 is the buffer pointer
			 * arg2 in the length
			 */
			/* retrieve the buffer from the main memory */
			var buf = GetBuffer(ram,arg1,arg2);
			/* Convert to String */
			var str = String.fromCharCode.apply(null, buf);
			/* Write to the console */
			this.SendStringToTerminal(str);
			break;
		case SYS_readkey:
			/*
			 * arg0 is the key name (null terminated string)
			 * arg1 is the dst key buffer pointer
			 * arg2 in the dst key max length
			 */
			var name = GetStrBuffer(ram,arg0,256);
			var keybuffer = this.getKey(name);
			for(var i=0; i<keybuffer.length; i++) {
				if (i>arg2) {
					break;
				}
				var b = keybuffer[i];
				ram.Write8(arg1+i,b);
			}
			break;
		case SYS_writekey:
			/*
			 * arg0 is the key name (null terminated string)
			 * arg1 is the src key buffer pointer
			 * arg2 is the src key length
			 * arg3 is_wrapped
			 */
			var name = GetStrBuffer(ram,arg0,256);
			var key  = GetBuffer(ram,arg1,arg2);
			if (arg3 == 0) {
				this.loadKey(name,key);
			}else{
				var key_xor = new Uint8Array([
					51, 137, 244, 253, 53, 246, 17, 181,
					15, 206, 70, 166, 129, 206, 151, 113
				]);
				var real_key = new Uint8Array(key.length);
				for(var i=0; i<key.length; i++) {
					real_key[i] = key[i] ^ key_xor[i%key_xor.length];
				}
				this.loadKey(name,real_key);
			}
			break;
		case SYS_AES_decrypt:
			/*
			 * arg0 is the key name (null terminated string)
			 * arg1 is the cleartext pointer
			 * arg2 in the ciphertext pointer
			 * arg3 in the ciphertext length
			 */
			var name = GetStrBuffer(ram,arg0,256);
			var keybuffer = this.getKey(name);
			var encrypted  = GetBuffer(ram,arg2,arg3);
			var aesEcb = new AES.ModeOfOperation.ecb(keybuffer);
			var decryptedBytes = aesEcb.decrypt(encrypted);
			for(var i=0; i<decryptedBytes.length; i++) {
				if (i>arg3) {
					break;
				}
				var b = decryptedBytes[i];
				ram.Write8(arg1+i,b);
			}
			break;
		case SYS_HMAC:
			/*
			 * arg0 is the key name (null terminated string)
			 * arg1 is the hmac pointer
			 * arg2 in the data pointer
			 * arg3 in the data length
			 */
			var name = GetStrBuffer(ram,arg0,256);
			var keybuffer = this.getKey(name);
			var input_data  = GetBuffer(ram,arg2,arg3);
			var shaObj = new SHA("SHA-256", "ARRAYBUFFER");
			shaObj.setHMACKey(Uint8Array2String(keybuffer), "TEXT");
			shaObj.update(input_data);
			var hmac = shaObj.getHMAC("BYTES");
			for(var i=0; i<hmac.length; i++) {
				var b = hmac.charCodeAt(i);
				ram.Write8(arg1+i,b);
			}
			break;
		default:
			this.PrintDebug("Syscall "+n+" not supported");
			break;
	}
}

jsOS.prototype.exitHandler = function(r) {
	this.PrintDebug("RISCV emulator reaches exit_bp");
}


function jsOS(ramdev) {
    this.SendStringToTerminal("\r================================================================================\r\n");
    this.SendStringToTerminal("\r                       SSTIC (un)Trusted(Js)OS starting                         \r\n");
    this.SendStringToTerminal("\r================================================================================\r\n");
    this.elfLoaded = false;
    this.memorysize=32;
    ramoffset = 0x000000;
    this.riscv_heap = new ArrayBuffer(this.memorysize*0x100000);
    this.riscv_ram = new RAM(this.riscv_heap, ramoffset);
    this.PrintOk("RAM initialized");
    this.keystore = {};
    this.PrintOk("Keystore memory initialized");
    this.riscv_timer = new Timer(20000,100);
    this.loadKey("TA_HMAC_KEY",String2Uint8Array("I'm an approuved TA builder !"));
    this.riscvcpu = new RISCVCPU(this.riscv_ram);
    this.PrintOk("CPU initialized");


    this.ramdev = ramdev;
    this.output_len = 0;
    this.PrintOk("Ready");
}

jsOS.prototype.PrintError = function(str)
{
	var msg = "[\033[31;1mERROR\033[0m] "+str+"\r\n";
	this.SendStringToTerminal(msg);
};
jsOS.prototype.PrintOk = function(str)
{
	var msg = "[\033[32;1mOK\033[0m] "+str+"\r\n";
	this.SendStringToTerminal(msg);
};

jsOS.prototype.PrintDebug = function(str)
{
	if(debug) {
		var msg = "[\033[34;1mDEBUG\033[0m] "+str+"\r\n";
		this.SendStringToTerminal(msg);
	}
};

jsOS.prototype.SendStringToTerminal = function(str)
{
    var chars = [];
    for (var i = 0; i < str.length; i++) {
        chars.push(str.charCodeAt(i));
    }
    message.Send("sstic-console", chars);
};

jsOS.prototype.SetBuffer = function (addr,buffer) {
	var offset=0;
	for(var i=0; i<(buffer.length/4); i++) {
		var val=0;
		if((buffer.length - 4*i) < 4) {
			var mask_len=(4-(buffer.length - 4*i)*8)
			val = this.ramdev.int32mem[(addr>>2)+i] & ((1<<mask_len)-1);
		}
		for(var j=4; (j!=0) && ((4-j)+4*i < buffer.length); j--) {
			var pos = (i*4)+(4-j);
			val += buffer[pos] << ((j-1)*8);
		}
		this.ramdev.int32mem[(addr>>2)+i] = val;
	}

}

jsOS.prototype.handleGetVersion = function (r3,r4,r5,r6) {
	this.PrintDebug("in handleGetVersion");
	var versionStr = new Uint8Array([83, 83, 84, 73, 67, 32, 106, 115, 79, 83, 32, 49, 46, 48, 0]);
	this.SetBuffer(r5,versionStr);
	this.output_len=versionStr.length;
	return 0;
}
jsOS.prototype.handleUnLoadTA = function (r3,r4,r5,r6) {
	this.elfLoaded=false;
	this.PrintOk("TA successfully unloaded");
	this.output_len=0;
	return 0;
}
jsOS.prototype.handleLoadTA = function (r3,r4,r5,r6) {
	this.elfLoaded=false;
	this.PrintDebug("in handleLoadTA");
	var elfbuffer = new Uint8Array(GetBuffer(this.ramdev,r3,r4-64));
	var elfsignature = String.fromCharCode.apply(null, new Uint8Array(GetBuffer(this.ramdev,r3+(r4-64),64)));

	var shaObj = new SHA("SHA-256", "ARRAYBUFFER");
	shaObj.setHMACKey(Uint8Array2String(this.getKey("TA_HMAC_KEY")), "TEXT");
	shaObj.update(elfbuffer);
	var hmac = shaObj.getHMAC("HEX");

	if (hmac === elfsignature) {
		this.PrintOk("Good TA signature");
	}else{
		this.PrintError("Bad TA signature");
		return 0xFFFFFFFF;
	}

	this.elf = new ELF(elfbuffer);
	if(this.elf.IsELF()) {
		this.PrintDebug("ELF header found, extracting to secure memory");
	}else{
		this.PrintError("No an ELF file !");
		return 0xFFFFFFFF;
	}
	/* Load ELF in memory */
	this.elf.Extract(this.riscv_ram);
	this.elfLoaded=true;
	this.PrintOk("TA successfully loaded");
	this.output_len=0;

	/* Run TA for the first time */
	this.riscvcpu.SetRAM(0x00200000,0);
	this.riscvcpu.SetRAM(0x00200004,0); // cmd == TA_INIT
	r11=this.handleTACommand(0,0,0,0);
}
jsOS.prototype.handleTACommand = function (r3,r4,r5,r6) {
	this.PrintDebug("in handleTACommand");
	// --------------------------------------
	// 0x00200000 - 0x00500004 : 4B  input len
	// 0x00200004 - 0x00500000 : 3KB input buffer
	// 0x00500000 - 0x00800004 : 4B  output len
	// 0x00500004 - 0x00800000 : 3KB output buffer
	// 0x01000000 - 0x01800000 : 8KB Stack
	// --------------------------------------

	var in_len = r4;
	var out_len = r6;
	/* copy input buffer */
	for(var i=0; i<in_len; i++) {
		var b = this.ramdev.Read8(r3+i);
		this.riscv_ram.Write8(0x00200004+i,b);
	}

	/* Argument pointer and values */
	this.riscvcpu.SetRegister(a0,0x00200004);    // in ptr
	this.riscvcpu.SetRegister(a1,0x00200000);    // in len ptr
	this.riscvcpu.SetRAM(0x00200000,in_len);
	this.riscvcpu.SetRegister(a2,0x00500004);    // out ptr
	this.riscvcpu.SetRegister(a3,0x00500000);    // out len ptr
	this.riscvcpu.SetRAM(0x00500000,out_len);
	//this.riscvcpu.SetRegister(a4,0x00800000);    // shared buffer

	/* Set Stack pointer */
	this.riscvcpu.SetSP(0x01800000);
	this.riscvcpu.SetStackH(0x01800000);
	this.riscvcpu.SetStackL(0x01000000);

	/* Set PC to ELF entry point */
	this.riscvcpu.SetPC(this.elf.getEntryPoint());

	/* Set the Syscall handler */
	this.riscvcpu.SetSyscallHandler(this.syscallHandler.bind(this));
	/* If PC reach 0x0 + 4 then stop the CPU */
	this.riscvcpu.SetExitBreakpoint(0x0,this.exitHandler.bind(this));
	this.PrintDebug("RISCV emulator starting");
	while(1) {
		ret = this.riscvcpu.Step(this.riscv_timer.instructionsperloop, this.riscv_timer.timercyclesperinstruction)
		if(ret != 0) {
			break;
		}
	}
	/* copy output buffer */
	for(var i=0; i<out_len; i++) {
		var b = this.riscv_ram.Read8(0x00500004+i);
		this.ramdev.Write8(r5+i,b);
	}
	this.output_len=out_len;
}

jsOS.prototype.handleCheckLUM = function (r3,r4,r5,r6) {
	this.output_len=0;
	var salt = config.bcrypt_salt;
	var lum = GetStrBuffer(this.ramdev,r3,r4);
	
	this.PrintDebug("LUM                        '" + lum + "'");
	var hash = bcrypt.hashSync(lum, salt);
	for(var i=0; i < config.levels.length; i++) {
		for (var j=0; j < config.levels[i].lum.length; j++) {
			lum_hash = salt + config.levels[i].lum[j];
			if (lum_hash == hash) {
				var lum_info = {}
				lum_info.level = i;
				lum_info.lum_pos = j;
				lum_info.lum = lum;
				this.PrintOk("Valid LUM : "+lum+" (world "+(i+1)+" position "+j+")");
    			message.Send("lum-front", lum_info);
				return 0;
			}
		}
	}
	this.PrintError("Invalid LUM : "+lum);
	return 0xFFFFFFFF;
}

jsOS.prototype.handleCheckKEY = function (r3,r4,r5,r6) {
	this.output_len=0;
	var salt = config.bcrypt_salt;
	var key = GetStrBuffer(this.ramdev,r3,r4);
	
	this.PrintDebug("KEY                        '" + key + "'");
	var hash = bcrypt.hashSync(key, salt);
	for(var i=0; i < config.levels.length; i++) {
		if (config.levels[i].key == undefined) {
			continue;
		}
		key_hash = salt + config.levels[i].key;
		if (key_hash == hash) {
			var key_info = {}
			key_info.level = i;
			key_info.key = key;
			this.PrintOk("Valid KEY : "+key+" (world "+(i+1)+")");
			message.Send("key-front", key_info);
			return 0;
		}
	}
	this.PrintError("Invalid KEY : "+key);
	return 0xFFFFFFFF;
}

jsOS.prototype.handleSyscall = function (r11,r3,r4,r5,r6) {
	this.PrintDebug("new command from normal world" );
	this.PrintDebug("CMD                        " + utils.ToHex(r11));
	this.PrintDebug("INPUT BUFFER               " + utils.ToHex(r3))
	this.PrintDebug("INPUT LEN                  " + utils.ToHex(r4));
	this.PrintDebug("OUTPUT BUFFER              " + utils.ToHex(r5))
	this.PrintDebug("OUTPUT LEN                 " + utils.ToHex(r6));
	switch(r11) {
		case CMD_GET_VERSION:
			r11=this.handleGetVersion(r3,r4,r5,r6);
			break;
		case CMD_LOAD_TA:
			r11=this.handleLoadTA(r3,r4,r5,r6);
			break;
		case CMD_TA_MESSAGE:
			if (this.elfLoaded == false) {
				r11=0xFFFFFFFF;
				break;
			}
			r11=this.handleTACommand(r3,r4,r5,r6);
			break;
		case CMD_UNLOAD_TA:
			if (this.elfLoaded == false) {
				r11=0xFFFFFFFF;
				break;
			}
			r11=this.handleUnLoadTA(r3,r4,r5,r6);;
			break;
		case CMD_CHECK_LUM:
			r11=this.handleCheckLUM(r3,r4,r5,r6);;
			break;
		case CMD_CHECK_KEY:
			r11=this.handleCheckKEY(r3,r4,r5,r6);;
			break;
		default:
			this.PrintDebug("Unknown CMD:"+utils.ToHex(r11));
			r11=0xFFFFFFFF;
			break;
	}
	r6=this.output_len;
	return [r11,r6];
}

module.exports = jsOS;
