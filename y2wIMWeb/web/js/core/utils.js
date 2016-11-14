function nop() {}

var globalMinDate = new Date(2000, 0, 1).getTime();
var globalMaxDate = new Date(3000, 0, 1).getTime();
var globalMinSyncDate = new Date(2000, 0, 2).getTime();

function guid() {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

function baseRequest(){

}

baseRequest.get = function(url, ts, token, cb){
    if(!cb)
        cb = nop;
    var that=this;
    $.ajax({
        url: config.baseUrl + url,
        type: 'GET',
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        beforeSend: function (req) {
            if(ts)
                req.setRequestHeader('Client-Sync-Time', ts);
            if(token)
                req.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        success: function(data) {
            cb(null, data);
        },
        error: function(e) {
            if(e.status == 401){
                //alert('您登录的信息已过期,请重新登录!');
                //y2w.logout();
                y2w.relogin(function(error,token){
                    that.get(url,ts,token,cb);
                });
                return;
            }
            cb(e);
        }
    });
};

baseRequest.post = function(url, params, token, cb){
    if(!cb)
        cb = nop;
    var that=this;
    $.ajax({
        url: config.baseUrl + url,
        type: 'POST',
        data: params,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        beforeSend: function (req) {
            if(token)
                req.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        success: function(data) {
            cb(null, data);
        },
        error: function(e) {
            if(e.status == 401){
                //alert('您登录的信息已过期,请重新登录!');
                //y2w.logout();
                y2w.relogin(function(error,token){
                    that.post(url,params,token,cb);
                });
                return;
            }
            cb(e);
        }
    });
}

baseRequest.delete = function(url, params, token, cb){
    if(!cb)
        cb = nop;
    var that=this;
    $.ajax({
        url: config.baseUrl + url,
        type: 'DELETE',
        data: params,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        beforeSend: function (req) {
            if(token)
                req.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        success: function(data) {
            cb(null, data);
        },
        error: function(e) {
            if(e.status == 401){
                //alert('您登录的信息已过期,请重新登录!');
                //y2w.logout();
                y2w.relogin(function(error,token){
                    that.delete(url,params,token,cb);
                });
                return;
            }
            cb(e);
        }
    });
}

baseRequest.put = function(url, params, token, cb){
    if(!cb)
        cb = nop;
    var that=this;
    $.ajax({
        url: config.baseUrl + url,
        type: 'PUT',
        data: params,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        beforeSend: function (req) {
            if(token)
                req.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        success: function(data) {
            cb(null, data);
        },
        error: function(e) {
            if(e.status == 401){
                //alert('您登录的信息已过期,请重新登录!');
                //y2w.logout();
                y2w.relogin(function(error,token){
                    that.put(url,params,token,cb);
                });
                return;
            }
            cb(e);
        }
    });
}

baseRequest.uploadBase64 = function(url, type,fileName, imageData, token, cb){
    if(!cb)
        cb = nop;
    var that=this;
    var boundaryKey = Math.random().toString(16);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", config.baseUrl + url);// + '?fileName=' + fileName);
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.overrideMimeType("application/octet-stream");
    xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary='+boundaryKey+'');
    var data_0 = '--' + boundaryKey + '\r\n';
    data_0 += 'Content-Type: '+type+'\r\n';
    data_0 += 'Content-Disposition: form-data; name="pic"; filename="' + fileName + '"\r\n';
    data_0 += 'Content-Transfer-Encoding: binary\r\n\r\n';
    var bytes0 = transTextToBytes(data_0);
    var bytes1 = transBase64ToBytes(imageData);
    var data_2  = '\r\n--' + boundaryKey + '--';
    var bytes2 = transTextToBytes(data_2);

    var bytes = new Uint8Array(bytes0.length + bytes1.length + bytes2.length);
    for (var i = 0; i < bytes0.length; i++)
        bytes[i] = bytes0[i];
    for (var i = 0; i < bytes1.length; i++)
        bytes[bytes0.length + i] = bytes1[i];
    for (var i = 0; i < bytes2.length; i++)
        bytes[bytes0.length + bytes1.length + i] = bytes2[i];

    xhr.send(bytes.buffer);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                cb(null, JSON.parse(xhr.responseText));
            }
            else if(xhr.status == 401){
                //alert('您登录的信息已过期,请重新登录!');
                //y2w.logout();
                y2w.relogin(function(error,token){
                    that.uploadBase64(url, type,fileName, imageData, token, cb);
                });
                return;
            }
            else{
                cb(xhr.responseText);
            }
        }
    }
}

function transTextToBytes(text){
    var data = new ArrayBuffer(text.length);
    var ui8a = new Uint8Array(data, 0);
    for (var i = 0; i < text.length; i++)
        ui8a[i] = (text.charCodeAt(i) & 0xff);
    return ui8a;
}

function transBase64ToBytes(text){
    var index = text.indexOf(';base64,');
    var foo = window.atob(text.substring(index + 8));
    var ui8a = new Uint8Array(foo.length);
    for (var i = 0; i < foo.length; i++)
        ui8a[i] = foo.charCodeAt(i);
    return ui8a;
}

function y2wAuthorizeRequest(){

}

y2wAuthorizeRequest.post = function(url, params, token, cb){
    if(!cb)
        cb = nop;
    var that=this;
    $.ajax({
        url: config.y2wAutorizeUrl + url,
        type: 'POST',
        data: params,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        beforeSend: function (req) {
            if(token)
                req.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        success: function(data) {
            cb(null, data);
        },
        error: function(e) {
            //if(e.status == 400){
            //
            //    //appKey或secret不正确，重新登录
            //    //alert('您登录的信息已过期,请重新登录!');
            //    //y2w.logout();
            //    y2w.relogin(function(error,token){
            //        that.post(url, params, token, cb);
            //    });
            //    return;
            //}
            cb(e);
        }
    });
};

function swap(items, firstIndex, secondIndex){
    var temp = items[firstIndex];
    items[firstIndex] = items[secondIndex];
    items[secondIndex] = temp;
};
function partition(items, attr, left, right, desc) {
    var pivot   = items[Math.floor((right + left) / 2)],
        i       = left,
        j       = right;
    while (i <= j) {
        if(desc){
            while (items[i][attr] > pivot[attr]) {
                i++;
            }
            while (items[j][attr] < pivot[attr]) {
                j--;
            }
        }
        else {
            while (items[i][attr] < pivot[attr]) {
                i++;
            }
            while (items[j][attr] > pivot[attr]) {
                j--;
            }
        }
        if (i <= j) {
            swap(items, i, j);
            i++;
            j--;
        }
    }
    return i;
};
function quickSortAlgo(items, attr, left, right, desc) {
    var index;
    if (items.length > 1) {
        index = partition(items, attr, left, right, desc);
        if (left < index - 1) {
            quickSortAlgo(items, attr, left, index - 1, desc);
        }
        if (index < right) {
            quickSortAlgo(items, attr, index, right, desc);
        }

    }
    return items;
};
function quickSort(items, attr, desc){
    return quickSortAlgo(items, attr, 0, items.length - 1, desc);
};

function parseAttachmentUrl(src,token,name){
    if(!src)
        return "#";
    name=name?"/"+encodeURIComponent(name):"";
    token=token||"";
    if(src.indexOf("http://")>=0 || src.indexOf("https://")>=0)
        return src;

    if(src.indexOf("/content")>=0)
        return config.baseUrl + src + name+'?access_token=' + token;
    return config.baseUrl+src+name;
};
function parseCapacity(num){
    if(typeof num=="string")
        num=parseInt(num);

    if(num<1024*1024)
        return (num*1.0/1024).toFixed(2)+"KB";

    return (num*1.0/1024/1024).toFixed(2)+"MB"
};


var HttpClient=function(){
    this.baseUrl=config.baseUrl;
};

HttpClient.prototype.when401=function(cb){
    y2w.relogin(cb);
};
HttpClient.prototype.when0=function(cb){
    var error="网络异常,无法连接!";
    cb(error);

    if(this.onConnectionStatusChanged){
        this.onConnectionStatusChanged(null,'disConnected');
    }
};
HttpClient.prototype.whenSuccess=function(){

    if(this.onConnectionStatusChanged){
        this.onConnectionStatusChanged(null,'connected');
    }

};

HttpClient.prototype.request=function(url,type,params,ts,token,cb){
    if(!cb)
        cb = nop;
    var that=this;
    $.ajax({
        url: url,
        type: type,
        data: params,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        beforeSend: function (req) {
            if(ts)
                req.setRequestHeader('Client-Sync-Time', ts);
            if(token)
                req.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        success: function(data) {
            cb(null, data);
            that.whenSuccess();
        },
        error: function(e) {
            if(e.status == 401){
                that.when401(function(error,token){
                    that.get(url,ts,token,cb);
                });
                return;
            }
            else if(e.status==0){
                return that.when0(cb);
            }
            var txt= e.responseText;
            try{
                var obj=JSON.parse(txt);
                cb(obj.message);
            }
            catch(ex){
                cb(txt);
            }
        }
    });
};
HttpClient.prototype.get=function(url,ts,token,cb){
    this.request(this.baseUrl+url,"GET",{},ts,token,cb);
};
HttpClient.prototype.post=function(url,params,token,cb){
    this.request(this.baseUrl+url,"POST",params,null,token,cb);
};
HttpClient.prototype.delete=function(url,params,token,cb){
    this.request(this.baseUrl+url,"DELETE",params,null,token,cb);
};
HttpClient.prototype.put=function(url,params, token, cb){
    this.request(this.baseUrl+url,"PUT",params,null,token,cb);
};
HttpClient.prototype.uploadBase64 = function(url, type,fileName, imageData, token, cb){
    if(!cb)
        cb = nop;
    var that=this;
    var boundaryKey = Math.random().toString(16);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", config.baseUrl + url);// + '?fileName=' + fileName);
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    //xhr.setRequestHeader('Content-MD5', 'efg');
    xhr.overrideMimeType("application/octet-stream");
    xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary='+boundaryKey+'');
    var data_0 = '--' + boundaryKey + '\r\n';
    data_0 += 'Content-Type: '+type+'\r\n';
    data_0 += 'Content-Disposition: form-data; name="pic"; filename="' + fileName + '"\r\n';
    data_0 += 'Content-Transfer-Encoding: binary\r\n\r\n';
    var bytes0 = transTextToBytes(data_0);
    var bytes1 = transBase64ToBytes(imageData);
    var data_2  = '\r\n--' + boundaryKey + '--';
    var bytes2 = transTextToBytes(data_2);

    var bytes = new Uint8Array(bytes0.length + bytes1.length + bytes2.length);
    for (var i = 0; i < bytes0.length; i++)
        bytes[i] = bytes0[i];
    for (var i = 0; i < bytes1.length; i++)
        bytes[bytes0.length + i] = bytes1[i];
    for (var i = 0; i < bytes2.length; i++)
        bytes[bytes0.length + bytes1.length + i] = bytes2[i];

    xhr.send(bytes.buffer);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                cb(null, JSON.parse(xhr.responseText));
            }
            else if(xhr.status == 401){
                //alert('您登录的信息已过期,请重新登录!');
                //y2w.logout();
                that.when401(function(error,token){
                    that.uploadBase64(url, type,fileName, imageData, token, cb);
                });
            }
            else if(xhr.status==0){
                that.when0(cb);
            }
            else{
                cb(xhr.responseText);
            }
        }
    }
};

baseRequest=new HttpClient();
var Util={};
Util.guid=guid;
Util.parseAttachmentUrl=parseAttachmentUrl;
Util.parseCapacity=parseCapacity;
Util.quickSort=quickSort;
Util.httpClient=baseRequest;


