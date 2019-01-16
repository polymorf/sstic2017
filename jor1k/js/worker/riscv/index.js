/* this is a unified, abstract interface (a facade) to the different
 * CPU implementations
 */

"use strict";
var message = require('../messagehandler'); // global variable
var utils = require('../utils');
var imul = require('../imul');

// CPUs
var FastCPU = require('./fastcpu');

var stdlib = {
    Int32Array : Int32Array,
    Int8Array : Int8Array,
    Int16Array : Int16Array,
    Float32Array : Float32Array,
    Float64Array : Float64Array,
    Uint8Array : Uint8Array,
    Uint16Array : Uint16Array,
    Math : Math
};

function createCPU(cpuname, ram, heap, ncores) {
    var cpu = null;
    var foreign = {
        DebugMessage: message.Debug,
        abort : message.Abort,
        imul : Math.imul || imul,
        MathAbs : Math.abs,
        Read32 : ram.Read32Little.bind(ram),
        Write32 : ram.Write32Little.bind(ram),
        Read16 : ram.Read16Little.bind(ram),
        Write16 : ram.Write16Little.bind(ram),
        Read8 : ram.Read8Little.bind(ram),
        Write8 : ram.Write8Little.bind(ram),
    };

    if (cpuname === "asm") {
        cpu = FastCPU(stdlib, foreign, heap, ram);
        cpu.Init();
        return cpu;
    }
    throw new Error("invalid CPU name:" + cpuname);
}

function CPU(cpuname, ram, heap, ncores) {
    this.cpu = createCPU(cpuname, ram, heap, ncores);
    this.name = cpuname;
    this.ncores = ncores;
    this.ram = ram;
    this.heap = heap;
    this.littleendian = true;

    return this;
}

CPU.prototype.switchImplementation = function(cpuname) {
};

CPU.prototype.toString = function() {
    var r = new Int32Array(this.heap, 0x0);
    var csr = new Uint32Array(this.heap, 0x2000);
    var str = '';
    str += "Current state of the machine\n";


    if (this.cpu.pc) {
        str += "PC: " + utils.ToHex(this.cpu.pc) + "\n"; 
    } else {
        str += "PC: " + utils.ToHex(this.cpu.GetPC()) + "\n"; 
    }

    for (var i = 0; i < 32; i += 4) {
        str += "   r" + (i + 0) + ": " +
            utils.ToHex(r[i + 0]) + "   r" + (i + 1) + ": " +
            utils.ToHex(r[i + 1]) + "   r" + (i + 2) + ": " +
            utils.ToHex(r[i + 2]) + "   r" + (i + 3) + ": " +
            utils.ToHex(r[i + 3]) + "\n";
    }
    str += "mstatus: " + utils.ToBin(csr[0x300]) + "\n";
    str += 
        "mcause: " + utils.ToHex(csr[0x342]) + 
        " mbadaddress: " + utils.ToHex(csr[0x343]) + 
        " mepc: " + utils.ToHex(csr[0x341]) + "\n";
    return str;
};

// forward a couple of methods to the CPU implementation
var forwardedMethods = [
    "Reset", 
    "Step",
    "RaiseInterrupt", 
    "Step",
    "SetRegister",
    "SetPC",
    "SetSP",
    "SetExitBreakpoint",
    "SetSyscallHandler",
    "SetRAM",
    "AnalyzeImage",
    "GetTicks",
    "SetStackL",
    "SetStackH",
    "GetTimeToNextInterrupt",
    "ProgressTime", 
    "ClearInterrupt"];
forwardedMethods.forEach(function(m) {
    CPU.prototype[m] = function() {
        return this.cpu[m].apply(this.cpu, arguments);        
    };
});

module.exports = CPU;
