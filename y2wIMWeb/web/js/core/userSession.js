var UserSessions = function(user){
    var _list;
    var _localStorage = new userSessionsLocalStorage(this);
    this.user = user;
    this.updatedAt = globalMinDate;
    this.remote = new userSessionsRemote(this);

    this.init = function(){
        _list = _localStorage.getList();
        for(var k in _list){
            var userSession = this.createUserSession(_list[k]);
            _list[k] = userSession;
            if(this.updatedAt < userSession.updatedAt)
                this.updatedAt = userSession.updatedAt;
        }
    }
    /**
     * 获取群组
     * @param sessionId:会话Id
     * @returns userSession
     */
    this.get = function(sessionId){
        return _list[sessionId];
    }
    this.createUserSession = function(obj){
        return new UserSession(this, obj);
    }
    /**
     * 获取群组列表
     * @returns [userSession]
     */
    this.getUserSessions = function(){
        var foo = [];
        for(var k in _list){
            if(_list[k].isDelete)
                continue;
            foo.push(_list[k]);
        }
        return foo;
    }
    this.addUserSessions = function(list){
        for(var i = 0; i < list.length; i++){
            var userSession = this._add(list[i]);
            if(this.updatedAt < userSession.updatedAt)
                this.updatedAt = parseInt(userSession.updatedAt);
        }
        if(list.length > 0)
            _localStorage.setList(_list);
    }
    this._add = function(obj){
        var userSession = _list[obj.sessionId];
        if(!userSession)
            userSession = this.createUserSession(obj);
        else
            userSession.update(obj);
        _list[userSession.sessionId] = userSession;
        return userSession;
    }
}
var userSessionsLocalStorage = function(userSessions){
    this.userSessions = userSessions;
}
userSessionsLocalStorage.prototype.getList = function(){
    var list = localStorage.getItem(this.userSessions.user.id + '_userSessions');
    if(!list)
        return {};
    return JSON.parse(list);
}
userSessionsLocalStorage.prototype.setList = function(list){
    localStorage.setItem(this.userSessions.user.id + '_userSessions', JSON.stringify(list));
}
var userSessionsRemote = function(userSessions){
    this.userSessions = userSessions;
}
/**
 * 收藏群组
 * @param sessionId:会话Id
 * @param name:群组名称
 * @param avatarUrl:群组头像
 * @param cb
 */
userSessionsRemote.prototype.add = function(sessionId, name, avatarUrl, cb){
    var that = this;
    cb = cb || nop;
    var url = 'users/' + that.userSessions.user.id + '/userSessions';
    var params = {
        sessionId: sessionId,
        name: name,
        avatarUrl: avatarUrl
    }
    baseRequest.post(url, params, that.userSessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
}
/**
 * 取消收藏群组
 * @param userSessionId:群组id
 * @param cb
 */
userSessionsRemote.prototype.remove = function(userSessionId, cb){
    var that = this;
    cb = cb || nop;
    var url = 'users/' + that.userSessions.user.id + '/userSessions/' + userSessionId;
    var params = {}
    baseRequest.delete(url, params, that.userSessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null);
    })
}
/**
 * 同步群组
 * @param cb
 */
userSessionsRemote.prototype.sync = function(cb){
    cb = cb || nop;
    var that = this;
    var url = 'users/' + that.userSessions.user.id + '/userSessions';
    baseRequest.get(url, that.userSessions.updatedAt, that.userSessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        that.userSessions.addUserSessions(data.entries);
        cb(null, data.entries.length);
    })
}

var UserSession = function(userSessions, obj){
    this.userSessions = userSessions;
    this.id = obj['id'];
    this.sessionId = obj['sessionId'];
    this.name = obj['name'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.avatarUrl = obj['avatarUrl'] || ' ';
    if(this.avatarUrl && this.avatarUrl.indexOf('/images/default.jpg') >= 0)
        this.avatarUrl = ' ';
}
UserSession.prototype.update = function(obj){
    this.name = obj['name'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.avatarUrl = obj['avatarUrl'] || ' ';
    if(this.avatarUrl && this.avatarUrl.indexOf('/images/default.jpg') >= 0)
        this.avatarUrl = ' ';
}
UserSession.prototype.toJSON = function(){
    return {
        id: this.id,
        sessionId: this.sessionId,
        name: this.name,
        isDelete: this.isDelete,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        avatarUrl: this.avatarUrl
    }
}
UserSession.prototype.getAvatarUrl = function(){
    if(this.avatarUrl && $.trim(this.avatarUrl) != '')
        return config.baseUrl + this.avatarUrl + '?access_token=' + this.userSessions.user.token;
    return null;
}