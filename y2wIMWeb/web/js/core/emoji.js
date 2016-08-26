'use strict';

var Emojis = function(user){
    var _list;
    var _localStorage = new emojisLocalStorage(this);
    this.user = user;
    this.updatedAt = globalMinDate;
    this.remote = new emojisRemote(this);

    this.init = function(){
        _list = _localStorage.getList();
        for(var k in _list){
            var emoji = this.createEmoji(_list[k]);
            _list[k] = emoji;
            if(this.updatedAt < emoji.updatedAt)
                this.updatedAt = emoji.updatedAt;
        }
    }
    /**
     * 获取表情
     * @param name:用户id
     * @returns emoji
     */
    this.get = function(name){
        return _list[name];
    };
    this.createEmoji = function(obj){
        return new Emoji(this, obj);
    };
    this.getPackages = function(){
        var foo = [];
        for(var k in _list){
            if(_list[k].isDelete )
                continue;
            var pkg=_list[k].package;
            if(foo.indexOf(pkg)>=0)
                continue;
            foo.push(_list[k].package);
        }
        return foo;
    };
    /**
     * 获取表情列表
     * @returns [emoji]
     */
    this.getEmojis = function(pkg){
        var foo = [];
        for(var k in _list){
            if(_list[k].isDelete || _list[k].package!=pkg)
                continue;
            foo.push(_list[k]);
        }
        return foo;
    };
    this.addEmojis = function(list){
        for(var i = 0; i < list.length; i++){
            var emoji = this._add(list[i]);
            if(this.updatedAt < emoji.updatedAt)
                this.updatedAt = parseInt(emoji.updatedAt);
        }
        if(list.length > 0)
            _localStorage.setList(_list);
    };
    this._add = function(obj){
        var emoji = _list[obj['name']];
        if(!emoji)
            emoji = this.createEmoji(obj);
        else
            emoji.update(obj);
        _list[emoji.name] = emoji;
        return emoji;
    };
};
var emojisLocalStorage = function(emojis){
    this.emojis = emojis;
};
emojisLocalStorage.prototype.getList = function(){
    var list = localStorage.getItem(this.emojis.user.id + '_emojis');
    if(!list)
        return {};
    return JSON.parse(list);
};
emojisLocalStorage.prototype.setList = function(list){
    localStorage.setItem(this.emojis.user.id + '_emojis', JSON.stringify(list));
};
var emojisRemote = function(emojis) {
    this.emojis = emojis;
};
emojisRemote.prototype.sync = function(cb) {
    cb = cb || nop;
    var that = this;
    var url = 'emojis';
    baseRequest.get(url, that.emojis.updatedAt, that.emojis.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        that.emojis.addEmojis(data.entries);
        cb(null, data.entries.length);
    })
};
/**
 * 添加表情
 * @param name:用户id
 * @param name:用户姓名
 * @param cb
 */
emojisRemote.prototype.add = function(pkg,type,name,eurl,width,height, cb) {
    cb = cb || nop;
    var that = this;
    var url = 'emojis';
    var params = {
        package: pkg,
        type: type,
        name: name,
        url: url,
        width: width,
        height: height
    };
    baseRequest.post(url, params, that.emojis.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    });
};
/**
 * 修改表情
 * @param emoji
 * @param cb
 */
emojisRemote.prototype.store = function(emoji, cb){
    cb = cb || nop;
    var that = this;
    var url = 'emojis/' + emoji.id;
    var params = {
        package: emoji.package,
        type: emoji.type,
        name: emoji.name,
        url: emoji.url,
        width: emoji.width,
        height: emoji.height
    };
    baseRequest.put(url, params, that.emojis.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
};
/**
 * 删除表情
 * @param emojiId
 * @param cb
 */
emojisRemote.prototype.remove = function(emojiId, cb){
    cb = cb || nop;
    var that = this;
    var url = 'emojis/' + emojiId;
    baseRequest.delete(url, null, that.emojis.user.token, function(err){
        if(err){
            cb(err);
            return;
        }
        cb();
    })
}

var Emoji = function(emojis, obj){
    this.emojis = emojis;
    this.id = obj['id'];
    this.name = obj['name'];
    this.package = obj['package'];
    this.type = obj['type'];
    this.width = obj['width'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.height = obj['height'];
    this.url = obj['url'];
};
Emoji.prototype.update = function(obj){
    this.name = obj['name'];
    this.package = obj['package'];
    this.type = obj['type'];
    this.width = obj['width'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.height = obj['height'];
    this.url = obj['url'];
};
Emoji.prototype.toJSON = function(){
    return {
        id: this.id,
        name: this.name,
        package: this.package,
        type: this.type,
        width: this.width,
        height: this.height,
        isDelete: this.isDelete,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        url: this.url
    }
};
/**
 * 获取头像
 * @returns url
 */
Emoji.prototype.getUrl = function(){
    return config.baseUrl.replace('v1/','')+ this.url;
};