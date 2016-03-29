var avatarRandomBGColorCount = 5;
var defaultContactImageUrl = 'images/contact_avatar.png';
var defaultGroupImageUrl = 'images/group_avatar.png';
var addEvent = function(node, type, callback){
    if(window.addEventListener){
        node.addEventListener(type, callback, false);
    }else{
        node.attachEvent("on" + type, callback);
    }
}
/**
 * 时间戳转化为日期（用于消息列表）
 * @return {string} 转化后的日期
 */
var transTime = (function(){
    var getDayPoint = function(time){
        time.setMinutes(0);
        time.setSeconds(0);
        time.setMilliseconds(0);
        time.setHours(0);
        var today = time.getTime();
        time.setMonth(1);
        time.setDate(1);
        var yearDay = time.getTime();
        return [today,yearDay];
    }
    return function(time){
        var check = getDayPoint(new Date());
        if (time>=check[0]){
            return dateFormat(time,"HH:mm")
        }else if(time<check[0]&&time>=check[1]){
            return dateFormat(time,"MM-dd HH:mm")
        }else{
            return dateFormat(time,"yyyy-MM-dd HH:mm")
        }
    }
})();
/**
 * 时间戳转化为日期(用于左边会话面板)
 * @return {string} 转化后的日期
 */
var transTime2 = (function(){
    var getDayPoint = function(time){
        time.setMinutes(0);
        time.setSeconds(0);
        time.setMilliseconds(0);
        time.setHours(0);
        var today = time.getTime();
        time.setMonth(1);
        time.setDate(1);
        var yearDay = time.getTime();
        return [today,yearDay];
    }
    return function(time){
        if(typeof time === 'string')
            time = new Date(time).getTime();
        var check = getDayPoint(new Date());
        if (time>=check[0]){
            return dateFormat(time,"HH:mm")
        }else if(time>=check[0]-60*1000*60*24){
            return "昨天";
        }else if(time>=(check[0]-2*60*1000*60*24)){
            return "前天";
        }else if(time>=(check[0]-7*60*1000*60*24)){
            return "星期"+dateFormat(time,"w");
        }else if(time>=check[1]){
            return dateFormat(time,"M/d")
        }else{
            return dateFormat(time,"yy/M/d")
        }
    }
})();
/**
 * 日期格式化
 * @return string
 */
var dateFormat = (function(){
    var _map = {i:!0,r:/\byyyy|yy|MM|cM|eM|M|dd|d|HH|H|mm|ms|ss|m|s|w|ct|et\b/g},
        _12cc = ['上午','下午'],
        _12ec = ['A.M.','P.M.'],
        _week = ['日','一','二','三','四','五','六'],
        _cmon = ['一','二','三','四','五','六','七','八','九','十','十一','十二'],
        _emon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
    var _fmtnmb = function(_number){
        _number = parseInt(_number)||0;
        return (_number<10?'0':'')+_number;
    };
    var _fmtclc = function(_hour){
        return _hour<12?0:1;
    };
    return function(_time,_format,_12time){
        if (!_time||!_format)
            return '';
        _time = new Date(_time);
        _map.yyyy = _time.getFullYear();
        _map.yy   = (''+_map.yyyy).substr(2);
        _map.M    = _time.getMonth()+1;
        _map.MM   = _fmtnmb(_map.M);
        _map.eM   = _emon[_map.M-1];
        _map.cM   = _cmon[_map.M-1];
        _map.d    = _time.getDate();
        _map.dd   = _fmtnmb(_map.d);
        _map.H    = _time.getHours();
        _map.HH   = _fmtnmb(_map.H);
        _map.m    = _time.getMinutes();
        _map.mm   = _fmtnmb(_map.m);
        _map.s    = _time.getSeconds();
        _map.ss   = _fmtnmb(_map.s);
        _map.ms   = _time.getMilliseconds();
        _map.w    = _week[_time.getDay()];
        var _cc   = _fmtclc(_map.H);
        _map.ct   = _12cc[_cc];
        _map.et   = _12ec[_cc];
        if (!!_12time){
            _map.H = _map.H%12;
        }
        return _$encode(_map,_format);
    };
})();
var _$encode = function(_map,_content){
    _content = ''+_content;
    if (!_map||!_content){
        return _content||'';
    }
    return _content.replace(_map.r,function($1){
        var _result = _map[!_map.i?$1.toLowerCase():$1];
        return _result!=null?_result:$1;
    });
};
var _$escape = (function(){
    var _reg = /<br\/?>$/,
        _map = {
            r:/\<|\>|\&|\r|\n|\s|\'|\"/g,
            '<':'&lt;','>':'&gt;','&':'&amp;',' ':'&nbsp;',
            '"':'&quot;',"'":'&#39;','\n':'<br/>','\r':''
        };
    return function(_content){
        _content = _$encode(_map,_content);
        return _content.replace(_reg,'<br/><br/>');
    };
})();
//数组功能扩展
Array.prototype.each = function(fn){
    fn = fn || Function.K;
    var a = [];
    var args = Array.prototype.slice.call(arguments, 1);
    for(var i = 0; i < this.length; i++){
        var res = fn.apply(this,[this[i],i].concat(args));
        if(res != null) a.push(res);
    }
    return a;
};

//数组是否包含指定元素
Array.prototype.contains = function(suArr){
    for(var i = 0; i < this.length; i ++){
        if(this[i] == suArr){
            return true;
        }
    }
    return false;
};
//不重复元素构成的数组
Array.prototype.uniquelize = function(){
    var ra = new Array();
    for(var i = 0; i < this.length; i ++){
        if(!ra.contains(this[i])){
            ra.push(this[i]);
        }
    }
    return ra;
};
//两个数组的补集
Array.complement = function(a, b){
    return Array.minus(Array.union(a, b),Array.intersect(a, b));
};
//两个数组的交集
Array.intersect = function(a, b){
    return a.uniquelize().each(function(o){return b.contains(o) ? o : null});
};
//两个数组的差集
Array.minus = function(a, b){
    return a.uniquelize().each(function(o){return b.contains(o) ? null : o});
};
//两个数组并集
Array.union = function(a, b){
    return a.concat(b).uniquelize();
};
var guid = function() {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}