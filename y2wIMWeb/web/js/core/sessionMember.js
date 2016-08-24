var SessionMembers = function(session){
    var _list;
    var _localStorage = new sessionMembersLocalStorage(this);
    this.session = session;
    this.createdAt = globalMinDate;
    this.updatedAt = globalMinDate;
    this.init = function(){
        _list = _localStorage.getList();
        for(var k in _list){
            var sessionMember = this.createSessionMember(_list[k]);
            _list[k] = sessionMember;
            if(this.createdAt < sessionMember.createdAt)
                this.createdAt = sessionMember.createdAt;
            if(this.updatedAt < sessionMember.updatedAt)
                this.updatedAt = sessionMember.updatedAt;
        }
    }
    this.remove = function(userId){
        delete _list[userId];
        _localStorage.setList(_list);
    }
    this.addSessionMembers = function(list){
        for(var i = 0; i < list.length; i++){
            var sessionMember = this._add(list[i]);
            if(this.createdAt < sessionMember.createdAt)
                this.createdAt = sessionMember.createdAt;
            if(this.updatedAt < sessionMember.updatedAt)
                this.updatedAt = sessionMember.updatedAt;
        }
        if(list.length > 0)
            _localStorage.setList(_list);
    }
    this._add = function(obj){
        var sessionMember = _list[obj['userId']];
        if(!sessionMember)
            sessionMember = this.createSessionMember(obj);
        else
            sessionMember.update(obj);
        _list[sessionMember.userId] = sessionMember;
        return sessionMember;
    }
    this.createSessionMember = function(obj){
        return new SessionMember(this, obj);
    }
    /**
     * 获取会话成员
     * @param userId:用户id
     * @returns sessionMember
     */
    this.getMember = function(userId){
        return _list[userId];
    }
    /**
     * 获取会话成员列表
     * @returns [sessionMember]
     */
    this.getMembers = function(){
        var foo = [];
        for(var k in _list){
            if(!_list[k].isDelete)
                foo.push(_list[k]);
        }
        return foo;
    }
    /**
     * 获取p2p会话相对方的会话成员对象
     * @param userId
     * @returns sessionMember
     */
    this.getP2POtherSideMember = function(userId){
        for(var k in _list){
            if(k != userId)
                return _list[k];
        }
        return null;
    };
    this.remote = new sessionMembersRemote(this);
    this.init();
}
var sessionMembersLocalStorage = function(sessionMembers){
    this.sessionMembers = sessionMembers;
}
sessionMembersLocalStorage.prototype.getList = function(){
    var list = localStorage.getItem(this.sessionMembers.session.sessions.user.id + '_' + this.sessionMembers.session.id + '_sessionMembers');
    if(!list)
        return {};
    return JSON.parse(list);
}
sessionMembersLocalStorage.prototype.setList = function(list){
    localStorage.setItem(this.sessionMembers.session.sessions.user.id + '_' + this.sessionMembers.session.id + '_sessionMembers', JSON.stringify(list));
}
var sessionMembersRemote = function(sessionMembers) {
    this.sessionMembers = sessionMembers;
}
sessionMembersRemote.prototype.sync = function(cb) {
    cb = cb || nop;
    var that = this;
    var url = 'sessions/' + that.sessionMembers.session.id + '/members';
    baseRequest.get(url, that.sessionMembers.updatedAt, that.sessionMembers.session.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        that.sessionMembers.addSessionMembers(data.entries);
        cb();
    })
}
/**
 * 添加会话成员
 * @param userId:用户id
 * @param name:用户名称
 * @param role['master'|'admin'|'user']:会话成员角色，master:群主;admin:管理员;user:一般成员
 * @param avatarUrl:头像
 * @param status['active'|'封禁']:用户状态，active:有效;inactive:封禁
 * @param cb
 */
sessionMembersRemote.prototype.add = function(userId, name, role, avatarUrl, status, cb) {
    var that = this;
    cb = cb || nop;
    var url = 'sessions/' + that.sessionMembers.session.id + '/members';
    var params = {
        userId: userId,
        name: name,
        role: role,
        avatarUrl: avatarUrl,
        status: status
    }
    baseRequest.post(url, params, that.sessionMembers.session.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
};
/**
 * 删除会话成员
 * @param memberId:会话成员id
 * @param cb
 */
sessionMembersRemote.prototype.remove = function(memberId, cb){
    var that = this;
    cb = cb || nop;
    var url = 'sessions/' + that.sessionMembers.session.id + '/members/' + memberId;
    baseRequest.delete(url, null, that.sessionMembers.session.sessions.user.token, function(err){
        if(err){
            cb(err);
            return;
        }
        cb(null);
    })
};
sessionMembersRemote.prototype.update = function(memberId,userId,name,role,avatarUrl,status, cb){
    var that = this;
    cb = cb || nop;
    var url = 'sessions/' + that.sessionMembers.session.id + '/members/'+memberId;
    var params = {
        userId: userId,
        name: name,
        role: role,
        avatarUrl: avatarUrl,
        status: status
    };
    baseRequest.put(url, params, that.sessionMembers.session.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
};

var SessionMember = function(sessionMembers, obj){
    this.sessionMembers = sessionMembers;
    this.id = obj['id'];
    this.name = obj['name'];
    this.pinyin = obj['pinyin'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.userId = obj['userId'];
    this.isDelete = obj['isDelete'];
    this.role = obj['role'];
    this.status = obj['status'];
    this.user = Users.getInstance().get(this.userId);
    if(!this.user && this.userId && this.userId.length)
        this.user = Users.getInstance().create(obj['userId'], obj['name'], obj['email'], obj['avatarUrl']);
}
SessionMember.prototype.update = function(obj){
    this.name = obj['name'];
    this.pinyin = obj['pinyin'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.isDelete = obj['isDelete'];
    this.role = obj['role'];
    this.status = obj['status'];
}
SessionMember.prototype.toJSON = function(){
    return {
        id: this.id,
        name: this.name,
        pinyin: this.pinyin,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        userId: this.userId,
        isDelete: this.isDelete,
        role: this.role,
        status: this.status
    }
}
/**
 * 获取头像
 * @returns url
 */
SessionMember.prototype.getAvatarUrl = function(){
    return this.user.getAvatarUrl();
}
