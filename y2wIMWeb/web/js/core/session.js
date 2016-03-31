'use strict';

var Sessions = function(user){
    this.user = user;
    var _targetList;
    var _sessionList;
    var _localStorage = new sessionsLocalStorage(this);
    this.remote = new sessionsRemote(this);

    this.init = function(){
        _targetList = _localStorage.getList();
        _sessionList = {};
        for(var k in _targetList){
            var session = this.createSession(_targetList[k]);
            _targetList[k] = session;
            _sessionList[session.id] = session;
        }
    }
    this.createSession = function(obj){
        return new Session(this, obj);
    }
    /**
     * 获取会话
     * @param targetId:会话目标id
     * type=='p2p':targetId=user.id(对方用户);
     * type=='group':targetId=session.id(会话id)
     * @param type['p2'|'group']:会话场景类型
     * @param cb
     */
    this.get = function(targetId, type, cb){
        var that = this;
        cb = cb || nop;
        if(type != 'p2p' && type != 'group' && type != 'single'){
            cb('session type is invalid');
            return;
        }
        if(_targetList[type + '-' + targetId]){
            cb(null, _targetList[type + '-' + targetId]);
            return;
        }
        this.remote.sync(targetId, type, function(err){
            if(err){
                cb(err);
                return;
            }
            var session = _targetList[type + '-' + targetId];
            if(session) {
                cb(null, session);
            }
            else if(type == 'single'){
                that.remote.add('single', that.user.name, 'private', that.user.avatarUrl, function(err, session){
                    if(err){
                        cb(err);
                        return;
                    }
                    that.add(that.user.id, session);
                    cb(null, session);
                })
            }
            else
                cb();
        })
    }
    /**
     * 根据SessionId获取本地会话
     * @param id
     * @returns {*}
     */
    this.getById = function(id){
        return _sessionList[id];
    }
    /**
     * 获取会话目标id
     * type=='p2p':targetId=user.id(对方用户);
     * type=='group':targetId=session.id(会话id)
     * @param id:会话Id
     * @param type['p2p|'group']:会话场景类型
     * @returns targetId
     */
    this.getTargetId = function(id, type){
        for(var k in _targetList){
            if(_targetList[k].id == id && _targetList[k].type == type)
                return k.replace(type + '-', '');
        }
        throw "targetId is not exist";
    }
    this.add = function(targetId, obj){
        var session = _targetList[obj.type + '-' + targetId];
        if(!session)
            session = this.createSession(obj);
        else
            session.update(obj);
        _targetList[obj.type + '-' + targetId] = session;
        _sessionList[session.id] = session;
        _localStorage.setList(_targetList);
        return session;
    }
    this.remove = function(session){
        var targetId = this.getTargetId(session.id, session.type);
        delete _targetList[session.type + '-' + targetId];
        delete _sessionList[session.id];
        _localStorage.setList(_targetList);
    }
}
var sessionsLocalStorage = function(sessions){
    this.sessions = sessions;
}
sessionsLocalStorage.prototype.getList = function(){
    var list = localStorage.getItem(this.sessions.user.id + '_sessions');
    if(!list)
        return {};
    return JSON.parse(list);
}
sessionsLocalStorage.prototype.setList = function(list){
    localStorage.setItem(this.sessions.user.id + '_sessions', JSON.stringify(list));
}
var sessionsRemote = function(sessions) {
    this.sessions = sessions;
}
/**
 * 同步会话
 * @param targetId:会话目标id
 * type=='p2p':targetId=user.id(对方用户);
 * type=='group':targetId=session.id(会话id)
 * @param type['p2p|'group']:会话场景类型
 * @param type
 * @param cb
 */
sessionsRemote.prototype.sync = function(targetId, type, cb){
    var that = this;
    cb = cb || nop;
    if(type != 'p2p' && type != 'group' && type != 'single'){
        cb('session type is invalid');
        return;
    }
    var url;
    if(type == 'p2p')
        url = 'sessions/p2p/' + that.sessions.user.id + '/' + targetId;
    else if(type == 'group')
        url = 'sessions/' + targetId;
    else
        url = 'sessions/p2p/' + that.sessions.user.id + '/' + targetId;
    baseRequest.get(url, null, that.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        var session = that.sessions.add(targetId, data);
        session.members.remote.sync(function(err){
            if(err){
                cb(err);
                return;
            }
            cb(null, session);
        })
    })
}
/**
 * 添加会话
 * @param type:['p2p'|'group']:会话场景类型
 * @param name:名称
 * @param secureType['public'|'private']:安全类型，通常使用private
 * @param avatarUrl:头像
 * @param cb
 */
sessionsRemote.prototype.add = function(type, name, secureType, avatarUrl, cb){
    var that = this;
    cb = cb || nop;
    var url = 'sessions';
    var params = {
        type: type,
        name: name,
        secureType: secureType,
        avatarUrl: avatarUrl
    }
    baseRequest.post(url, params, that.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        var session = that.sessions.createSession(data);
        cb(null, session);
    })
}
/**
 * 更新会话信息
 * @param session
 * @param cb
 */
sessionsRemote.prototype.store = function(session, cb){
    var that = this;
    var targetId = this.sessions.getTargetId(session.id, session.type);
    cb = cb || nop;
    var url = 'sessions/' + session.id;
    var params = {
        name: session.name,
        secureType: session.secureType,
        avatarUrl: session.avatarUrl
    }
    baseRequest.put(url, params, that.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        var session = that.sessions.add(targetId, data);
        session.members.remote.sync(function(err){
            if(err){
                cb(err);
                return;
            }
            cb(null, session);
        });
    })
}

var Session = function(sessions, obj){
    this.sessions = sessions;
    this.id = obj['id'];
    this.name = obj['name'];
    this.nameChanged = obj['nameChanged'];
    this.secureType = obj['secureType'];
    this.type = obj['type'];
    this.description = obj['description'];
    this.avatarUrl = obj['avatarUrl'] || ' ';
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.members = new SessionMembers(this);
    this.messages = new Messages(this);
}
Session.prototype.update = function(obj){
    this.name = obj['name'];
    this.nameChanged = obj['nameChanged'];
    this.secureType = obj['secureType'];
    this.type = obj['type'];
    this.description = obj['description'];
    this.avatarUrl = obj['avatarUrl'] || ' ';
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
}
Session.prototype.toJSON = function(){
    return {
        id: this.id,
        name: this.name,
        nameChanged: this.nameChanged,
        secureType: this.secureType,
        type: this.type,
        description: this.description,
        avatarUrl: this.avatarUrl,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    }
}
/**
 * 获取用户会话对象
 * @returns userConversation
 */
Session.prototype.getConversation = function(){
    if(this.type == 'p2p'){
        var member = this.members.getP2POtherSideMember(this.sessions.user.id);
        return this.sessions.user.userConversations.get(this.type, member.user.id);
    }
    else if(this.type == 'group'){
        return this.sessions.user.userConversations.get(this.type, this.id);
    }
    else
        return null;
}



