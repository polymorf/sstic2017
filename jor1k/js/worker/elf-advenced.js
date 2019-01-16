var utils = require('./utils');
var message = require('./messagehandler');
var marshall = require('./dev/virtio/marshall');

function ELF(srcbuffer) {
    this.srcbuffer = srcbuffer;
    if ( this.IsELF() ) {
        this.ExtractHeader();
        this.section_headers = this.ExtractSectionHeader();
        //this.symbols_table = this.ExtractDynsymHeader();
        //this.exported_functions = this.getExportedFunctions();
    }
}
ELF.prototype.IsELF = function() {
    if ((this.srcbuffer[0] == 0x7F) && 
        (this.srcbuffer[1] == 0x45) && 
        (this.srcbuffer[2] == 0x4C) && 
        (this.srcbuffer[3] == 0x46)) 
        return true;
    console.log(this.srcbuffer);
    return false;
}
ELF.prototype.get16bitsValue = function(value) {
    if(this.ei_data==2) {
        return utils.Swap16(value);
    }
    return value;
}

ELF.prototype.get32bitsValue = function(value) {
    if(this.ei_data==2) {
        return utils.Swap32(value);
    }
    return value;
}
ELF.prototype.ExtractHeader = function() {
    var offset = 0;
    var output = [];
    output = marshall.Unmarshall(["w", "b", "b", "b", "b"], this.srcbuffer, offset);
    this.ei_class = output[1];
    if (this.ei_class != 1) {
        message.Debug("Error reading elf binary: 64-Bit not supported");
        message.Abort();
    }
/*
    output[0] // magic
    output[1] // ei_class  1 -> 32 bit, 2 -> 64 bit
    output[2] // ei_data    1 little end, 2 big end
    output[3] // ei_version  currently always 1
    output[4] // ei_pad   marks beginning of padding
*/
    this.e_magic    = output[0];
    this.ei_class   = output[1];
    this.ei_data    = output[2];
    this.ei_version = output[3];
    this.ei_pad     = output[4];

    /*message.Debug("e_entry: " +  utils.ToHex(e_magic));*/
    /*message.Debug("ei_class: " +  utils.ToHex(ei_class));*/
    /*message.Debug("ei_data: " +  utils.ToHex(ei_data));*/
    /*message.Debug("ei_version: " +  utils.ToHex(ei_version));*/
    /*message.Debug("ei_pad: " +  utils.ToHex(ei_pad));*/

    offset = 0x10;
    output = marshall.Unmarshall(["h", "h", "w", "w", "w", "w"], this.srcbuffer, offset);
    this.e_entry = this.get32bitsValue(output[3]); // virtual address of entry point into program
    this.e_phoff = this.get32bitsValue(output[4]); // offset for program header
    this.e_shoff = this.get32bitsValue(output[5]); // offset for section header
    /*message.Debug("e_entry: " +  utils.ToHex(e_entry));*/
    /*message.Debug("e_phoff: " +  utils.ToHex(e_phoff));*/
    /*message.Debug("e_shoff: " +  utils.ToHex(e_shoff));*/

    offset = 0x2E;
    output = marshall.Unmarshall(["h", "h", "h"], this.srcbuffer, offset);
    this.e_shentsize = this.get16bitsValue(output[0]); // size of each individual entry in section header table
    this.e_shnum     = this.get16bitsValue(output[1]); // number of entries in section header table
    this.e_shstrndx  = this.get16bitsValue(output[2]); // section header string table index
    /*message.Debug("e_shentsize: " +  utils.ToHex(e_shentsize));*/
    /*message.Debug("e_shnum: " +  utils.ToHex(e_shnum));*/
    /*message.Debug("e_shstrndx: " +  utils.ToHex(e_shstrndx));*/
}


ELF.prototype.getSectionName = function(stridx,strtaboff) {
    var name="";
    var pos=0;
    while(1) {
        if(this.srcbuffer[strtaboff+stridx+pos] == 0) {
            break;
        }
        name+=String.fromCharCode(this.srcbuffer[strtaboff+stridx+pos]);
        pos++;
    }
    return name;
}
ELF.prototype.ExtractSectionHeader = function() {
    var section_headers = [];
    for (var i = 0; i < this.e_shnum; i++) {

        offset = this.e_shoff + i*this.e_shentsize;
        output = marshall.Unmarshall(["w", "w", "w", "w", "w", "w", "w", "w", "w", "w"], this.srcbuffer, offset);

        var section = {};
        section.name  = this.get32bitsValue(output[0]);
        section.type  = this.get32bitsValue(output[1]);
        section.flags = this.get32bitsValue(output[2]);
        section.addr  = this.get32bitsValue(output[3]);
        section.offs  = this.get32bitsValue(output[4]);
        section.size  = this.get32bitsValue(output[5]);
        section.entsize  = this.get32bitsValue(output[9]);
        section_headers.push(section);
    }
    /* resolv names with strtable */
    for (var i = 0; i < this.e_shnum; i++) {
        section_headers[i].name = this.getSectionName(section_headers[i].name,section_headers[this.e_shstrndx].offs);
        section = section_headers[i];
    }
    return section_headers;
}
/*
good doc : http://llvm.org/docs/doxygen/html/Support_2ELF_8h_source.html
 struct Elf32_Sym {
   Elf32_Word    st_name;  // Symbol name (index into string table)
   Elf32_Addr    st_value; // Value or address associated with the symbol
   Elf32_Word    st_size;  // Size of the symbol
   unsigned char st_info;  // Symbol's type and binding attributes
   unsigned char st_other; // Must be zero; reserved
   Elf32_Half    st_shndx; // Which section (header table index) it's defined in
 }
*/
ELF.prototype.ExtractDynsymHeader = function() {
    section = this.getSectionByName(".symtab");
    str_section = this.getSectionByName(".strtab");
    var symbols_table = [];
    for (var i = 0; i<(section.size/section.entsize); i++) {
        offset = section.offs + i*section.entsize;
        output = marshall.Unmarshall(["w", "w", "w", "b", "b", "h"], this.srcbuffer, offset);
        var symbol = {};
        symbol.name = this.get32bitsValue(output[0]);
        /* resolv name */
        symbol.name = this.getSectionName(symbol.name,str_section.offs);
        symbol.value = this.get32bitsValue(output[1]);
        symbol.size = this.get32bitsValue(output[2]);
        symbol.info = output[3];
        symbol.other = output[4];
        symbol.shndx = this.getSectionNameById(this.get16bitsValue(output[5]));
        symbols_table.push(symbol);
    }
    return symbols_table;
}

ELF.prototype.getEntryPoint = function() {
    return this.e_entry;
}

ELF.prototype.getExportedFunctions = function() {
    exported= [];
    for (var i = 0; i<this.symbols_table.length; i++) {
        symbol = this.symbols_table[i];
        var exported_function = {};
        if (symbol.info == 18 && symbol.shndx == ".text") {
            exported_function.name = symbol.name
            exported_function.addr = symbol.value
            exported_function.size = symbol.size
            exported.push(exported_function)
        }
    }
    return exported;
}
ELF.prototype.getSSTICExportedFunctions = function() {
    exported= [];
    for (var i = 0; i<this.symbols_table.length; i++) {
        symbol = this.symbols_table[i];
        var exported_function = {};
        if (symbol.info == 18 && symbol.shndx == ".text" && symbol.name.startsWith("SSTIC")) {
            exported_function.name = symbol.name
            exported_function.addr = symbol.value
            exported_function.size = symbol.size
            exported.push(exported_function)
        }
    }
    return exported;
}


ELF.prototype.getSectionNameById = function(id) {
    if(id < this.section_headers.length)
	return this.section_headers[id].name;
    return "";
}
ELF.prototype.getSectionByName = function(name) {
    for (var i = 0; i < this.e_shnum; i++) {
        if (this.section_headers[i].name == name ) {
            return this.section_headers[i];
        }
    }
}
ELF.prototype.setRAM = function(ram,addr,value) {
	ram.Write8(addr,value);
}


ELF.prototype.Extract = function(ram) {
    // copy necessary data into memory
    for (var i = 0; i < this.section_headers.length; i++) {
        // check for allocate flag (bit #1) and type != 8 (aka NOT NOBITS)
        if ((((this.section_headers[i].flags >> 1) & 0x1) == 0x1) && (this.section_headers[i].type != 8)) {
            for (var j = 0; j < this.section_headers[i].size; j++) {
                this.setRAM(ram,(this.section_headers[i].addr + j),this.srcbuffer[this.section_headers[i].offs + j]);
            }
        } else if ((((this.section_headers[i].flags >> 1) & 0x1) == 0x1) && (this.section_headers.type == 8)) {
            // for .bss, load in zeroes, since it's not actually stored in the elf
            for (var j = 0; j < this.section_headers[i].size; j++) {
                this.setRAM(ram,(this.section_headers[i].addr + j),0x0);
            }
        }
    }
}

module.exports = ELF;
