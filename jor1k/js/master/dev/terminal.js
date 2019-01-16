// -------------------------------------------------
// --------------- Terminal Emulator ---------------
// -------------------------------------------------
// http://lxr.free-electrons.com/source/drivers/tty/vt/vt.c



var UTF8 = require('../../lib/utf8');
var message = require('../messagehandler');

var Colors = new Array(
    // standard colors
    "#000000", "#BB0000", "#00BB00", "#BBBB00",
    "#0000BB", "#BB00BB", "#00BBBB", "#BBBBBB",
    // brighter colors
    "#555555", "#FF5555", "#55FF55", "#FFFF55",
    "#5555FF", "#FF55FF", "#55FFFF", "#FFFFFF",
    // dimmed colors
    "#000000", "#770000", "#007700", "#777700",
    "#000077", "#770077", "#007777", "#777777"
);
var ColorsExt = {
    16:"#000000", 17:"#00005f", 18:"#000087", 19:"#0000af",
    20:"#0000d7", 21:"#0000ff", 22:"#005f00", 23:"#005f5f",
    24:"#005f87", 25:"#005faf", 26:"#005fd7", 27:"#005fff",
    28:"#008700", 29:"#00875f", 30:"#008787", 31:"#0087af",
    32:"#0087d7", 33:"#0087ff", 34:"#00af00", 35:"#00af5f",
    36:"#00af87", 37:"#00afaf", 38:"#00afd7", 39:"#00afff",
    40:"#00d700", 41:"#00d75f", 42:"#00d787", 43:"#00d7af",
    44:"#00d7d7", 45:"#00d7ff", 46:"#00ff00", 47:"#00ff5f",
    48:"#00ff87", 49:"#00ffaf", 50:"#00ffd7", 51:"#00ffff",
    52:"#5f0000", 53:"#5f005f", 54:"#5f0087", 55:"#5f00af",
    56:"#5f00d7", 57:"#5f00ff", 58:"#5f5f00", 59:"#5f5f5f",
    60:"#5f5f87", 61:"#5f5faf", 62:"#5f5fd7", 63:"#5f5fff",
    64:"#5f8700", 65:"#5f875f", 66:"#5f8787", 67:"#5f87af",
    68:"#5f87d7", 69:"#5f87ff", 70:"#5faf00", 71:"#5faf5f",
    72:"#5faf87", 73:"#5fafaf", 74:"#5fafd7", 75:"#5fafff",
    76:"#5fd700", 77:"#5fd75f", 78:"#5fd787", 79:"#5fd7af",
    80:"#5fd7d7", 81:"#5fd7ff", 82:"#5fff00", 83:"#5fff5f",
    84:"#5fff87", 85:"#5fffaf", 86:"#5fffd7", 87:"#5fffff",
    88:"#870000", 89:"#87005f", 90:"#870087", 91:"#8700af",
    92:"#8700d7", 93:"#8700ff", 94:"#875f00", 95:"#875f5f",
    96:"#875f87", 97:"#875faf", 98:"#875fd7", 99:"#875fff",
    100:"#878700", 101:"#87875f", 102:"#878787", 103:"#8787af",
    104:"#8787d7", 105:"#8787ff", 106:"#87af00", 107:"#87af5f",
    108:"#87af87", 109:"#87afaf", 110:"#87afd7", 111:"#87afff",
    112:"#87d700", 113:"#87d75f", 114:"#87d787", 115:"#87d7af",
    116:"#87d7d7", 117:"#87d7ff", 118:"#87ff00", 119:"#87ff5f",
    120:"#87ff87", 121:"#87ffaf", 122:"#87ffd7", 123:"#87ffff",
    124:"#af0000", 125:"#af005f", 126:"#af0087", 127:"#af00af",
    128:"#af00d7", 129:"#af00ff", 130:"#af5f00", 131:"#af5f5f",
    132:"#af5f87", 133:"#af5faf", 134:"#af5fd7", 135:"#af5fff",
    136:"#af8700", 137:"#af875f", 138:"#af8787", 139:"#af87af",
    140:"#af87d7", 141:"#af87ff", 142:"#afaf00", 143:"#afaf5f",
    144:"#afaf87", 145:"#afafaf", 146:"#afafd7", 147:"#afafff",
    148:"#afd700", 149:"#afd75f", 150:"#afd787", 151:"#afd7af",
    152:"#afd7d7", 153:"#afd7ff", 154:"#afff00", 155:"#afff5f",
    156:"#afff87", 157:"#afffaf", 158:"#afffd7", 159:"#afffff",
    160:"#d70000", 161:"#d7005f", 162:"#d70087", 163:"#d700af",
    164:"#d700d7", 165:"#d700ff", 166:"#d75f00", 167:"#d75f5f",
    168:"#d75f87", 169:"#d75faf", 170:"#d75fd7", 171:"#d75fff",
    172:"#d78700", 173:"#d7875f", 174:"#d78787", 175:"#d787af",
    176:"#d787d7", 177:"#d787ff", 178:"#d7af00", 179:"#d7af5f",
    180:"#d7af87", 181:"#d7afaf", 182:"#d7afd7", 183:"#d7afff",
    184:"#d7d700", 185:"#d7d75f", 186:"#d7d787", 187:"#d7d7af",
    188:"#d7d7d7", 189:"#d7d7ff", 190:"#d7ff00", 191:"#d7ff5f",
    192:"#d7ff87", 193:"#d7ffaf", 194:"#d7ffd7", 195:"#d7ffff",
    196:"#ff0000", 197:"#ff005f", 198:"#ff0087", 199:"#ff00af",
    200:"#ff00d7", 201:"#ff00ff", 202:"#ff5f00", 203:"#ff5f5f",
    204:"#ff5f87", 205:"#ff5faf", 206:"#ff5fd7", 207:"#ff5fff",
    208:"#ff8700", 209:"#ff875f", 210:"#ff8787", 211:"#ff87af",
    212:"#ff87d7", 213:"#ff87ff", 214:"#ffaf00", 215:"#ffaf5f",
    216:"#ffaf87", 217:"#ffafaf", 218:"#ffafd7", 219:"#ffafff",
    220:"#ffd700", 221:"#ffd75f", 222:"#ffd787", 223:"#ffd7af",
    224:"#ffd7d7", 225:"#ffd7ff", 226:"#ffff00", 227:"#ffff5f",
    228:"#ffff87", 229:"#ffffaf", 230:"#ffffd7", 231:"#ffffff",
    232:"#080808", 233:"#121212", 234:"#1c1c1c", 235:"#262626",
    236:"#303030", 237:"#3a3a3a", 238:"#444444", 239:"#4e4e4e",
    240:"#585858", 241:"#626262", 242:"#6c6c6c", 243:"#767676",
    244:"#808080", 245:"#8a8a8a", 246:"#949494", 247:"#9e9e9e",
    248:"#a8a8a8", 249:"#b2b2b2", 250:"#bcbcbc", 251:"#c6c6c6",
    252:"#d0d0d0", 253:"#dadada", 254:"#e4e4e4", 255:"#eeeeee",
}

Terminal.prototype.getFgColor = function(c) {
    if(c & 0xFF0000) {
        ext_color = (c >> 16) & 0xFF
        return ColorsExt[ext_color];
    }else{
        return Colors[c & 0x1F];
    }
}
Terminal.prototype.getBgColor = function(c) {
    if(c & 0xFF000000) {
        ext_color = (c >> (24)) & 0xFF
        return ColorsExt[ext_color];
    }else{
        return Colors[(c >>> 8) & 0x1F];
    }
}

// constructor
function Terminal(nrows, ncolumns, elemId) {
    this.nrows = nrows;
    this.ncolumns = ncolumns;

    var ele = document.getElementById(elemId);
    if (ele.tagName == "CANVAS") {
        this.canvas = ele;
        this.context = this.canvas.getContext("2d");
        this.context.font = "13px courier,fixed,swiss,monospace,sans-serif";
    } else {
        this.Table = ele;
        this.rowelements = new Array(this.nrows);
        for (var i = 0; i < nrows; i++) {
            var TR = this.Table.insertRow(0);
            var TD = document.createElement("td");
            this.rowelements[i] = TD;
            TR.appendChild(TD);
        }
    }

    this.cursorvisible = false;
    this.cursordisabled = false;
    this.escapetype = 0;
    this.escapestring = "";
    this.cursorx = 0;
    this.cursory = 0;
    this.scrolltop = 0;
    this.cursortype = 1;
    this.scrollbottom = this.nrows-1;

    this.attr_color = 0x7;
    this.attr_reverse = false;
    this.attr_italic = false;
    this.attr_intensity = 0x1;

    this.pauseblink = false;
    this.OnCharReceived = function (){};

    this.framerequested = false;
    this.timeout = 30; // the time in ms when the next frame is drawn

    this.updaterow = new Uint8Array(this.nrows);

    this.utf8converter = new UTF8.UTF8StreamToUnicode();

    this.trows = 40;
    this.brows = this.trows - this.nrows;
    this.bufferp = 0;
    this.screen = new Array(this.trows);
    this.color = new Array(this.trows);
    for (var i = 0; i < this.trows; i++) {
        this.updaterow[i] = 1;
        this.screen[i] = new Uint16Array(this.ncolumns);
        this.color[i]  = new Uint32Array(this.ncolumns);

        for (var j = 0; j < this.ncolumns; j++) {
            this.screen[i][j] = 0x20;
            this.color[i][j] = this.attr_color;
        }
    }
    this.deletedScreenRow = this.screen[0];
    this.deletedColorRow = this.color[0];
    //message.Debug("Inside constructor");
    this.UpdateScreen();
    this.Blink();

    //if (!this.canvas) this.Table.addEventListener("wheel", this.UpdateScreenForScroll.bind(this));
}

// Stop blinking cursor when the VM is paused
Terminal.prototype.PauseBlink = function(pause) {
    pause = !! pause;
    this.pauseblink = pause;
    if (this.cursortype) {
        this.cursorvisible = ! pause;
    }
    this.PrepareUpdateRow(this.cursory, this.cursorx);
}

Terminal.prototype.DisableCursor = function() {
    this.cursordisabled = true;
    this.cursorvisible = false;
    this.PrepareUpdateRow(this.cursory, this.cursorx);
}

Terminal.prototype.GetColor = function() {
    var c = this.attr_color;
    if (this.attr_reverse) {
        c = ((c & 0x7) << 8) | ((c >> 8)) & 0x7;
    }
    if (this.attr_intensity == 2) {
        c = c | 0x8;
    } else
    if (this.attr_intensity == 0) {
        c = c | 0x10;
    }
    return c;
}

Terminal.prototype.Blink = function() {
    if (!this.cursordisabled) {
        this.cursorvisible = !this.cursorvisible;
        if(!this.pauseblink) this.PrepareUpdateRow(this.cursory, this.cursorx);
        window.setTimeout(this.Blink.bind(this), 500); // update every half second
    }
};

Terminal.prototype.deepCopy = function(oldObj) {
    var newObj = oldObj;
    if (oldObj && typeof oldObj === 'object') {
        newObj = Object.prototype.toString.call(oldObj) === "[object Array]" ? [] : {};
        for (var i in oldObj) {
            newObj[i] = this.deepCopy(oldObj[i]);
        }
    }
    return newObj;
}

Terminal.prototype.DeleteRow = function(row) {
    var deletedScreenRow = this.deepCopy(this.screen[this.brows + row]);
    var deletedColorRow = this.deepCopy(this.color[this.brows + row]);
    if(row == 23){
        for(var i = 0;i < this.brows - 1;i++){
            this.screen[i] = this.screen[i + 1];
            this.color[i] = this.color[i + 1];
        }
        this.screen[this.brows - 1] = deletedScreenRow;
        this.color[this.brows - 1] = deletedColorRow;
    }
    for (var j = 0; j < this.ncolumns; j++) {
        this.screen[this.brows + row][j] = 0x20;
        this.color[this.brows + row][j] = this.attr_color;
    }
    this.PrepareUpdateRow(row);
};

Terminal.prototype.DeleteArea = function(row, column, row2, column2) {
    for (var i = row; i <= row2; i++) {
        for (var j = column; j <= column2; j++) {
            this.screen[this.brows + i][j] = 0x20;
            this.color[this.brows + i][j] = this.attr_color;
        }
        this.PrepareUpdateRow(i);
    }
};


Terminal.prototype.UpdateRowCanvas = function(row) {
    var y = row << 4;
    var line = this.screen[this.brows + row];
    var c = this.color[this.brows + row][0]|0;
    var n = 0;

    for (var column = 0; column < this.ncolumns; column++) {

        var cnew = this.color[this.brows + row][column]|0;

        if (this.cursorvisible)
        if (row == this.cursory)
        if (column == this.cursorx) {
            cnew |= 0x600;
        }

        if (c != cnew) {
            var x = (column - n) << 3;
            this.context.fillStyle = this.getBgColor(c);
            this.context.fillRect(x, y, n*8, 16);
            this.context.fillStyle = this.getFgColor(c);
            for(var i=0; i<n; i++) {
                this.context.fillText(String.fromCharCode(line[column - n + i]), x+(i<<3), y+12);
            }
            c = cnew;
            n = 0;
        }

        n++;
    }

    var x = (column - n) << 3;
    this.context.fillStyle = this.getBgColor(c);
    this.context.fillRect(x, y, n*8, 16);
    this.context.fillStyle = this.getFgColor(c);
    for(var i=0; i<n; i++) {
        this.context.fillText(String.fromCharCode(line[column - n + i]), x+(i<<3), y+12);
    }

};

Terminal.prototype.GetSpan = function(c, line, idx, n) {
    var html = "<span style=\"color:" + this.getFgColor(c) + ";background-color:" + this.getBgColor(c) + "\">";
    for(var i=0; i<n; i++) {
        switch (line[idx + i])
        {
        case 0x20:
            html += "&nbsp;"; 
            break;

        case 0x26: // '&'
            html += "&amp;"; 
            break;

        case 0x3C: // '<'
            html += "&lt;"; 
            break;

        case 0x3E: // '>'
            html += "&gt;"; 
            break;

        default:        
            html += String.fromCharCode(line[idx + i]);
            break;
        }
    }
    html += "</span>";
    return html;
}


Terminal.prototype.UpdateRowTable = function(row) {
    var y = row << 4;
    var line = this.screen[this.brows + row];
    var c = this.color[this.brows + row][0]|0;
    var n = 0;
    var html = "";

    for (var column = 0; column < this.ncolumns; column++) {

        var cnew = this.color[this.brows + row][column]|0;

        if (this.cursorvisible)
        if (row == this.cursory)
        if (column == this.cursorx) {
            cnew |= 0x600;
        }

        if (c != cnew) {
            html += this.GetSpan(c, line, column - n, n);
            c = cnew;
            n = 0;
        }
        n++;
    }
    html += this.GetSpan(c, line, column - n, n);
    this.rowelements[this.nrows - row - 1].innerHTML = html;

};

Terminal.prototype.UpdateRowTableForScroll = function(row) {
    var y = row << 4;
    var line = this.screen[this.brows + row - this.bufferp];
    var c = this.color[this.brows + row - this.bufferp][0]|0;
    var n = 0;
    var html = "";

    for (var column = 0; column < this.ncolumns; column++) {

        var cnew = this.color[this.brows + row - this.bufferp][column]|0;

        if (this.cursorvisible)
        if (row == this.cursory)
        if (column == this.cursorx) {
            cnew |= 0x600;
        }

        if (c != cnew) {
            html += this.GetSpan(c, line, column - n, n);
            c = cnew;
            n = 0;
        }
        n++;
    }
    html += this.GetSpan(c, line, column - n, n);
    this.rowelements[this.nrows - row - 1].innerHTML = html;

};

Terminal.prototype.UpdateScreen = function() {
    var nupdated = 0,i = 0;
    for (i = 0; i < this.nrows; i++) {
        if (!this.updaterow[i]) continue;
        if (this.canvas) {
            this.UpdateRowCanvas(i);
        } else {
            this.UpdateRowTable(i);
        }
        nupdated++;
        this.updaterow[i] = 0;
    }
    this.framerequested = false;
    if (nupdated >= (this.nrows-1)) {
        this.timeout = 100;
    } else {
        this.timeout = 30;
    }
}

Terminal.prototype.UpdateScreenForScroll = function() {
    var i;
    if(this.bufferp < this.brows) this.bufferp++;
    else this.bufferp = 0; //show the original state before the scrolling started
    for (i = this.nrows - 1; i >= 0; i--){
        this.UpdateRowTableForScroll(i);
    }
}

Terminal.prototype.PrepareUpdateRow = function(row) {
    this.updaterow[row] = 1;
    if (this.framerequested) return;
    window.setTimeout(this.UpdateScreen.bind(this), this.timeout);
    this.framerequested = true;
}

Terminal.prototype.ScrollDown = function(draw) {
    var tempscreen = this.screen[this.brows + this.scrollbottom];
    var tempcolor = this.color[this.brows + this.scrollbottom];

    for (var i = this.scrollbottom-1; i >= this.scrolltop; i--) {
        if (i == this.nrows-1) continue;
        this.screen[this.brows + i + 1] = this.screen[this.brows + i];
        this.color[this.brows + i + 1] = this.color[this.brows + i];
        if (draw) this.PrepareUpdateRow(i+1);
    }
    this.screen[this.brows + this.scrolltop] = tempscreen;
    this.color[this.brows + this.scrolltop] = tempcolor;
    this.DeleteRow(this.scrolltop);
    if (draw) this.PrepareUpdateRow(this.scrolltop);
}

Terminal.prototype.ScrollUp = function(draw) {
    var tempscreen = this.screen[this.brows + this.scrolltop];
    var tempcolor = this.color[this.brows + this.scrolltop];

    for (var i = this.scrolltop+1; i <= this.scrollbottom; i++) {
        if (i == 0) continue;
        this.screen[this.brows + i - 1] = this.screen[this.brows + i];
        this.color[this.brows + i - 1] = this.color[this.brows + i];
        if (draw) this.PrepareUpdateRow(i-1);
    }

    this.screen[this.brows + this.scrollbottom] = tempscreen;
    this.color[this.brows + this.scrollbottom] = tempcolor;
    this.DeleteRow(this.scrollbottom);
    if (draw) this.PrepareUpdateRow(this.scrollbottom);
};

Terminal.prototype.LineFeed = function() {
    if (this.cursory != this.scrollbottom) {
        this.cursory++;
        if (this.cursorvisible) {
            this.PrepareUpdateRow(this.cursory-1); // delete old cursor position
            this.PrepareUpdateRow(this.cursory); // show new cursor position
        }
        return;
    }
    this.ScrollUp(true);
};

Terminal.prototype.ChangeCursor = function(Numbers) {
    switch (Numbers.length) {
    case 0:
        this.cursorx = 0;
        this.cursory = 0;
        break;
    case 1:
        this.cursory = Numbers[0];
        if (this.cursory) this.cursory--;
        break;
    case 2:
    default:
        // TODO check for boundaries
        this.cursory = Numbers[0];
        this.cursorx = Numbers[1];
        if (this.cursorx) this.cursorx--;
        if (this.cursory) this.cursory--;
        break;
    }
    if (this.cursorx >= this.ncolumns) this.cursorx = this.ncolumns - 1;
    if (this.cursory >= this.nrows) this.cursory = this.nrows - 1;
};

Terminal.prototype.ChangeColor = function(Numbers) {
    if (Numbers.length == 0) { // reset;
        this.attr_color = 0x7;
        this.attr_reverse = false;
        this.attr_italic = false;
        this.attr_intensity = 1;
        return;
    }

    var c = this.attr_color;

    if (Numbers.indexOf(5) > -1) {
        var mode_foreground=false;
        var mode_background=false;
        var index=Numbers.indexOf(5);
        Numbers.splice(index, 1);
        index=Numbers.indexOf(48);
        if (index > -1) {
            Numbers.splice(index, 1);
            mode_background=true;
        }
        index=Numbers.indexOf(38);
        if (index > -1) {
            Numbers.splice(index, 1);
            mode_foreground=true;
        }
        if(Numbers.length > 1) {
            console.log("more mode ?");
        }
        var color_value = Numbers[0];
        if(mode_background) {
            c = (color_value << 24)
        }
        if(mode_foreground) {
            c = (color_value << 16)
        }
    }else{
        for (var i = 0; i < Numbers.length; i++) {
            switch (Number(Numbers[i])) {
            case 0: // reset
                c = 0x7;
                this.attr_reverse = false;
                this.attr_italic = false;
                this.attr_intensity = 1;
                break;
            case 1: // brighter foreground color
                this.attr_intensity = 2;
                break;
            case 2: // dimmed foreground color
                this.attr_intensity = 0;
                break;
            case 3: // italic
                this.attr_italic = true;
                break;
            case 4: // underline ignored
                break;
            case 5: // extended colors or blink ignored
                this.extended_color = true;
                break;
            case 7: // reversed
                this.attr_reverse = true;
                break;
            case 8: // hidden ignored
                break;
            case 10: // reset mapping ?
                break;
            case 21:
            case 22:
                this.attr_intensity = 1;
                break;
            case 23:
                this.attr_italic = false;
                break;
            case 27: // no reverse
                this.attr_reverse = false;
                break;

            case 30: case 31: case 32: case 33: case 34: case 35: case 36: case 37:
                c = c & (0xFFF8) | (Numbers[i] - 30) & 0x7;
                break;
            case 40: case 41: case 42: case 43: case 44: case 45: case 46: case 47:
                c = c & (0x00FF) | (((Numbers[i] - 40) & 0x7) << 8);
                break;
            case 39:
                c = c & (0xFF00) | 0x7; // set standard foreground color
                break;
            case 49:
                c = 0x7;
                this.attr_reverse = false;
                this.attr_italic = false;
                this.attr_intensity = 1;
                break;
            default:
                message.Warning("Color " + Numbers[i] + " not found");
                break;
            }
        }
    }
    this.attr_color = c|0;
};

Terminal.prototype.ChangeMode = function(numbers, question, onoff) {

    for(var i=0; i<numbers.length; i++) {
        switch(numbers[i]) {
            case 4: // insert mode
                break;

            case 7: // auto wrap on off
                break;

            case 25: // cursor on/off
                this.cursortype = onoff;
                break;

            case 1000: // 
                break;

            case 1006: // 
                break;

            case 1005: // 
                break;
            
            default:
                message.Warning("Mode term parameter " + this.escapestring + " unknown");
                break;
        }
    }
}

Terminal.prototype.ChangeCursorType = function(numbers, question) {
    if (!question) {
        message.Warning("cursor parameter unknown");
        return;
    }
 
    for(var i=0; i<numbers.length; i++) {
        switch(numbers[i]) {
            case 0:
                //this.cursorvisible = false;
                //this.cursortype = 0;
                break; 
            case 1:
                //this.cursortype = 1;
                break;
            default:
                message.Warning("Term parameter " + this.escapestring + " unknown");
                break;
        }
    }
}


Terminal.prototype.HandleEscapeSequence = function() {
    //message.Debug("Escape sequence:'" + this.escapestring+"'");
    var i = 0;
    if (this.escapestring == "[J") {
        this.DeleteArea(this.cursory, this.cursorx, this.cursory, this.ncolumns - 1);
        this.DeleteArea(this.cursory + 1, 0., this.nrows - 1, this.ncolumns - 1);
        return;
    } else
    if (this.escapestring == "M") {
        this.ScrollDown(true);
        return;
    }
    // Testing for [x;y;z
    var s = this.escapestring;

    if (s.charAt(0) != "[") {
        message.Warning("Short escape sequence unknown:'" + this.escapestring + "'");
        return; // the short escape sequences must be handled earlier
    }

    s = s.substr(1); // delete first sign

    var lastsign = s.substr(s.length - 1); // extract command
    s = s.substr(0, s.length - 1); // remove command

    var question = false;
    if (s.charAt(0) == '?') {
        question = true;
        s = s.substr(1); // delete question mark
    }

    var numbers = s.split(";"); // if there are multiple numbers, split them
    if (numbers[0].length == 0) {
        numbers = [];
    }


    // the array must contain of numbers and not strings. Make this sure
    for (i=0; i<numbers.length; i++) {
        numbers[i] = Number(numbers[i]);
    }

    var oldcursory = this.cursory; // save current cursor position
    var count = 0;
    switch(lastsign) {

        case 'l':
            this.ChangeMode(numbers, question, true);
            return;

        case 'h':
            this.ChangeMode(numbers, question, false);
            return;

        case 'c':
            this.ChangeCursorType(numbers, question);
            return;
    }

    if (question) {
        message.Warning("Escape sequence unknown:'" + this.escapestring + "'");
        return;
    }

    switch(lastsign) {
        case 'm': // colors
            this.ChangeColor(numbers);
            return;

        case 'A': // move cursor up
            count = numbers.length ? numbers[0] : 1;
            if (count == 0) count = 1;
            this.cursory -= count;
            break;

        case 'B': // move cursor down
            count = numbers.length ? numbers[0] : 1;
            if (count == 0) count = 1;
            this.cursory += count;
            break;

        case 'C': // move cursor right
            count = numbers.length ? numbers[0] : 1;
            if (count == 0) count = 1;
            this.cursorx += count;
            break;

        case 'D': // move cursor left
            count = numbers.length ? numbers[0] : 1;
            if (count == 0) count = 1;
            this.cursorx -= count;
            if (this.cursorx < 0) this.cursorx = 0;
            break;

        case 'E': // move cursor down
            count = numbers.length ? numbers[0] : 1;
            this.cursory += count;
            this.cursorx = 0;
            break;

        case 'F': // move cursor up
            count = numbers.length ? numbers[0] : 1;
            this.cursory -= count;
            if (this.cursory < 0) this.cursory = 0;
            this.cursorx = 0;
            break;

        case 'G': // change cursor column
            count = numbers.length ? numbers[0] : 1;
            this.cursorx = count;
            if (this.cursorx) this.cursorx--;
            break;

        case 'H': // cursor position
        case 'd':
        case 'f':
            this.ChangeCursor(numbers);
            break;

        case 'K': // erase
            count = numbers.length ? numbers[0] : 1;
            if (!numbers.length) {
                this.DeleteArea(this.cursory, this.cursorx, this.cursory, this.ncolumns - 1);
            } else 
            if (numbers[0] == 1) {
                this.DeleteArea(this.cursory, 0., this.cursory, this.cursorx);
            } else
            if (numbers[0] == 2) {
                this.DeleteRow(this.cursory);
            }
            break;

        case 'L': // scroll down
            count = numbers.length ? numbers[0] : 1;
            if (count == 0) count = 1;
            var top = this.scrolltop;
            this.scrolltop = this.cursory;
            if (count == 1) {
                this.ScrollDown(true);
            } else {
                for (var j = 0; j < count-1; j++) {
                    this.ScrollDown(false);
                }
                this.ScrollDown(true);
            }
            this.scrolltop = top;
            break;

        case 'M': // scroll up
            count = numbers.length ? numbers[0] : 1;
            if (count == 0) count = 1;
            var top = this.scrolltop;
            this.scrolltop = this.cursory;
            if (count == 1) {
                this.ScrollUp(true);
            } else {
                for (var j = 0; j < count-1; j++) {
                    this.ScrollUp(false);
                }
                this.ScrollUp(true);
            }
            this.scrolltop = top;
            break;

        case 'P': /* shift left from cursor and fill with zero */
            count = numbers.length ? numbers[0] : 1;
            if (count == 0) count = 1;
            var n = 0;
            for (var j = this.cursorx+count; j < this.ncolumns; j++) {
                this.screen[this.brows + this.cursory][this.cursorx+n] = this.screen[this.brows + this.cursory][j];
                this.color[this.brows + this.cursory][this.cursorx+n] = this.color[this.brows + this.cursory][j];
                n++;
            }
            this.DeleteArea(this.cursory, this.ncolumns-count, this.cursory, this.ncolumns-1);
            this.PrepareUpdateRow(this.cursory);
            break;

        case 'r': // set scrolling region
            if (numbers.length == 0) {
                this.scrolltop = 0;
                this.scrollbottom = this.nrows-1;
            } else {
                this.scrolltop = numbers[0];
                this.scrollbottom = numbers[1];
                if (this.scrolltop) this.scrolltop--;
                if (this.scrollbottom) this.scrollbottom--;
            }
            return;

        case 'X': // erase only number of characters in current line    
            count = numbers.length ? numbers[0] : 1;
            if (count == 0) count = 1;
            for (var j = 0; j < count; j++) {
                this.screen[this.brows + this.cursory][this.cursorx+j] = 0x20;
                this.color[this.brows + this.cursory][this.cursorx+j] = this.GetColor();
            }
            this.PrepareUpdateRow(this.cursory);
            break;    

        default:
            message.Warning("Escape sequence unknown:'" + this.escapestring + "'");
        break;
    }

     if (this.cursorvisible) {
        this.PrepareUpdateRow(this.cursory);
        if (this.cursory != oldcursory) {
            this.PrepareUpdateRow(oldcursory);
        }
    }
};



Terminal.prototype.PutChar = function(c) {
    var i = 0;
    //message.Debug("Char:" + c + " " +  String.fromCharCode(c));
    // escape sequence (CS)
    if (this.escapetype == 2) {
        this.escapestring += String.fromCharCode(c);
        if ((c >= 64) && (c <= 126)) {
            this.HandleEscapeSequence();
            this.escapetype = 0;
        }
        return;
    }

    // escape sequence
    if ((this.escapetype == 0) && (c == 0x1B)) {
        this.escapetype = 1;
        this.escapestring = "";
        return;
    }

    // starting escape sequence
    if (this.escapetype == 1) {
        this.escapestring += String.fromCharCode(c);
        // Control Sequence Introducer ([)
        if (c == 0x5B) {
            this.escapetype = 2;
            return;
        }
        this.HandleEscapeSequence();
        this.escapetype = 0;
        return;
    }
    switch (c) {
    case 0xA:
        // line feed
        this.LineFeed();
        this.OnCharReceived("\n");
        return;
    case 0xD:
        // carriage return
        this.cursorx = 0;
        this.PrepareUpdateRow(this.cursory);
        return;
    case 0x7:
        // beep
        return;
    case 0x8:
        // back space
        this.cursorx--;
        if (this.cursorx < 0) {
            this.cursorx = 0;
        }
        this.PrepareUpdateRow(this.cursory);
        return;
    case 0x9:
        // horizontal tab
        var spaces = 8 - (this.cursorx&7);
        do
        {
            if (this.cursorx >= this.ncolumns) {
                this.PrepareUpdateRow(this.cursory);
                this.LineFeed();
                this.cursorx = 0;
            }
            this.screen[this.brows + this.cursory][this.cursorx] = 0x20;
            this.color[this.brows + this.cursory][this.cursorx] = this.attr_color;  
            this.cursorx++;
        } while(spaces--);
        this.PrepareUpdateRow(this.cursory);
        return;

    case 0x00:  case 0x01:  case 0x02:  case 0x03:
    case 0x04:  case 0x05:  case 0x06:  case 0x0B:
    case 0x0C:  case 0x0E:  case 0x0F:
    case 0x10:  case 0x11:  case 0x12:  case 0x13:
    case 0x14:  case 0x15:  case 0x16:  case 0x17:
    case 0x18:  case 0x19:  case 0x1A:  case 0x1B:
    case 0x1C:  case 0x1D:  case 0x1E:  case 0x1F:
    case 0x7F:
        message.Warning("unknown character " + c);
        return;
    }

    if (this.cursorx >= this.ncolumns) {
        this.LineFeed();
        this.cursorx = 0;
    }

    c = this.utf8converter.Put(c);
    if (c == -1) return;
    var cx = this.cursorx;
    var cy = this.cursory;
    this.screen[this.brows + cy][cx] = c;

    this.color[this.brows + cy][cx] = this.GetColor();
    this.cursorx++;
    //message.Debug("Write: " + String.fromCharCode(c));
    this.PrepareUpdateRow(cy);

    this.OnCharReceived(String.fromCharCode(c));
};

module.exports = Terminal;
