'use strict';

var UserConversations = function(user){
    var _list;
    var _localStorage = new userConversationsLocalStorage(this);
    this.user = user;
    this.updatedAt = globalMinDate;
    this.remote = new userConversationsRemote(this);

    this.init = function() {
        _list = _localStorage.getList(this.user.id + '_userConversations');
        for (var k in _list) {
            var userConversation = this.createUserConversation(_list[k]);
            _list[k] = userConversation;
            if(this.updatedAt < userConversation.updatedAt)
                this.updatedAt = userConversation.updatedAt;
        }
    }
    /**
     * 获取用户会话
     * @param type['p2p','group']:会话场景类型
     * @param targetId[user.id,session.id]会话目标Id
     * type=='p2p':targetId=user.id(对方用户);
     * type=='group':targetId=session.id(会话id)
     * @returns userConversation
     */
    this.get = function(type, targetId){
        return _list[type + '-' + targetId];
    }
    this.createUserConversation = function(obj){
        return new UserConversation(this, obj);
    }
    /**
     * 获取用户会话列表
     * @param type['p2p','group',undefined]
     * @returns [userConversation]
     */
    this.getUserConversations = function(type){
        var foo = [];
        for(var k in _list){
            if(!_list[k].isDelete && (!type || (type && _list[k].type == type)))
                foo.push(_list[k]);
        }

        for(var i=0;i<foo.length;i++){
            for(var j=i+1;j<foo.length;j++){
                var a=foo[i],b=foo[j];
                var aUpdatedAt= a.updatedAt+ (a.top?a.updatedAt:0);
                var bUpdatedAt= b.updatedAt+ (b.top?b.updatedAt:0);
                if( (aUpdatedAt < bUpdatedAt)){
                    foo[i]=b;
                    foo[j]=a;
                }
            }
        }

        //foo.splice(0,1,new UserConversation(this,{
        //    //this.id = obj['id'];
        //    //this.name = obj['name'];
        //    //this.avatarUrl = obj['avatarUrl'] || ' ';
        //    //if(this.avatarUrl.indexOf('/images/default.jpg') >= 0)
        //    //    this.avatarUrl = ' ';
        //    //this.targetId = obj['targetId'];
        //    //this.unread = obj['unread'];
        //    //this.type = obj['type'];
        //    //this.isDelete = obj['isDelete'];
        //    //this.createdAt = new Date(obj['createdAt']).getTime();
        //    //this.updatedAt = new Date(obj['updatedAt']).getTime();
        //    //this.visiable = obj['visiable'];
        //    //this.top = obj['top'];
        //    id:'0',
        //    name:'',
        //}));


        return foo;
        //return quickSort(foo, 'updatedAt', true);
    };
    this.addUserConversations = function(list){
        for(var i = 0; i < list.length; i++){
            var userConversation = this._add(list[i]);
            if(this.updatedAt < userConversation.updatedAt)
                this.updatedAt = parseInt(userConversation.updatedAt);
        }
        if(list.length > 0)
            _localStorage.setList(_list);
    }
    this._add = function(obj){
        var userConversation = _list[obj.type + '-' + obj.targetId];
        if(!userConversation)
            userConversation = this.createUserConversation(obj);
        else
            userConversation.update(obj);
        _list[userConversation.type + '-' + userConversation.targetId] = userConversation;
        return userConversation;
    }
    this.updateCache_List = function(){
        _localStorage.setList(_list);
    }
}
var userConversationsLocalStorage = function(userConversations){
    this.userConversations = userConversations;
}
userConversationsLocalStorage.prototype.getList = function(){
    var list = localStorage.getItem(this.userConversations.user.id + '_userConversations');
    if(!list)
        return {};
    return JSON.parse(list);
}
userConversationsLocalStorage.prototype.setList = function(list){
    localStorage.setItem(this.userConversations.user.id + '_userConversations', JSON.stringify(list));
};
var userConversationsRemote = function(userConversations) {
    this.userConversations = userConversations;
};
userConversationsRemote.prototype.sync = function(cb) {
    cb = cb || nop;
    var that = this;
    var url = 'users/' + that.userConversations.user.id + '/userConversations';
    baseRequest.get(url, that.userConversations.updatedAt, that.userConversations.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        that.userConversations.addUserConversations(data.entries);
        cb(null, data.entries.length);
    });
};
/**
 * 修改用户会话
 * @param userConversation
 * @param cb
 */
userConversationsRemote.prototype.store = function(userConversation, cb){
    var that = this;
    cb = cb || nop;
    var url = 'users/' + that.userConversations.user.id + '/userConversations/' + userConversation.id;
    var params = {
        targetId: userConversation.targetId,
        name: userConversation.name,
        type: userConversation.type,
        avatarUrl: userConversation.avatarUrl
    }
    baseRequest.put(url, params, that.userConversations.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
}
/**
 * 置顶和取消置顶
 * @param userConversation
 * @param cb
 */
userConversationsRemote.prototype.updateTop = function(userConversation, cb){
    var that = this;
    cb = cb || nop;
    var url = 'users/' + that.userConversations.user.id + '/userConversations/' + userConversation.id;
    var params = {
        targetId: userConversation.targetId,
        name: userConversation.name,
        type: userConversation.type,
        top: userConversation.top
    };
    baseRequest.put(url, params, that.userConversations.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
}
/**
 * 删除用户会话
 * @param userConversationId:用户会话id
 * @param cb
 */
userConversationsRemote.prototype.remove = function(userConversationId, cb){
    var that = this;
    cb = cb || nop;
    var url = 'users/' + that.userConversations.user.id + '/userConversations/' + userConversationId;
    baseRequest.delete(url, null, that.userConversations.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
};

var UserConversation = function(userConversations, obj){
    this.userConversations = userConversations;
    this.id = obj['id'];
    this.name = obj['name'];
    this.avatarUrl = obj['avatarUrl'] || ' ';
    if(this.avatarUrl.indexOf('/images/default.jpg') >= 0)
        this.avatarUrl = ' ';
    this.targetId = obj['targetId'];
    this.unread = obj['unread'];
    this.type = obj['type'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.visiable = obj['visiable'];
    this.top = obj['top'];
    if(this.type == 'p2p'){
        var user = Users.getInstance().get(this.targetId);
        if (user === undefined)
            Users.getInstance().create(this.targetId, this.name, null, this.avatarUrl);
    }
    this.firstGetLastMessges = true;
    this.lastMessage = obj['lastMessage'];
    if(this.lastMessage) {
        this.lastMessage.scene = this.type;
        try {
            this.lastMessage.content = JSON.parse(this.lastMessage.content);
        }
        catch (e) {}
        if(this.type == 'p2p') {
            var user = Users.getInstance().get(this.targetId);
            if(this.lastMessage.sender == this.userConversations.user.id) {
                this.lastMessage.from = this.userConversations.user;
                this.lastMessage.to = user;
            }
            else{
                this.lastMessage.from = user;
                this.lastMessage.to = this.userConversations.user;
            }
        }
        else if(this.type == 'group'){
            this.lastMessage.from = null;
            if(this.lastMessage && this.lastMessage.sender)
                this.lastMessage.from = Users.getInstance().get(this.lastMessage.sender);
            this.lastMessage.to = null;
        }
    }
}
UserConversation.prototype.update = function(obj){
    this.name = obj['name'];
    this.avatarUrl = obj['avatarUrl'] || ' ';
    if(this.avatarUrl.indexOf('/images/default.jpg') >= 0)
        this.avatarUrl = ' ';
    this.unread = obj['unread'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.visiable = obj['visiable'];
    this.top = obj['top'];
    this.lastMessage = obj['lastMessage'];
    if(this.lastMessage) {
        this.lastMessage.scene = this.type;
        try {
            this.lastMessage.content = JSON.parse(this.lastMessage.content);
        }
        catch (e) {}
        if(this.type == 'p2p') {
            var user = Users.getInstance().get(this.targetId);
            if (user === undefined)
                user = Users.getInstance().create(this.targetId, this.name, null, this.avatarUrl);
            if(this.lastMessage.sender == this.userConversations.user.id) {
                this.lastMessage.from = this.userConversations.user;
                this.lastMessage.to = user;
            }
            else{
                this.lastMessage.from = user;
                this.lastMessage.to = this.userConversations.user;
            }
        }
        else if(this.type == 'group'){
            this.lastMessage.from = null;
            if(this.lastMessage && this.lastMessage.sender)
                this.lastMessage.from = Users.getInstance().get(this.lastMessage.sender);
            this.lastMessage.to = null;
        }
    }
}
UserConversation.prototype.toJSON = function(){
    var obj = {
        id: this.id,
        name: this.name,
        avatarUrl: this.avatarUrl,
        targetId: this.targetId,
        unread: this.unread,
        type: this.type,
        isDelete: this.isDelete,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        visiable: this.visiable,
        top: this.top,
        firstGetLastMessges: this.firstGetLastMessges
    }
    if(this.lastMessage){
        obj.lastMessage = {
            scene: this.lastMessage.scene,
            sender: this.lastMessage.sender,
            content: this.lastMessage.content,
            type: this.lastMessage.type
        }
    }
    return obj;
}
/**
 * 获取名称
 * @returns name
 */
UserConversation.prototype.getName = function(){
    if(this.type == 'p2p'){
        var contact = this.userConversations.user.contacts.get(this.targetId);
        if(contact)
            return contact.getName();
        return Users.getInstance().get(this.targetId).name;
    }
    return this.name;
}
/**
 * 获取头像
 * @returns url
 */
UserConversation.prototype.getAvatarUrl = function(){
    if(this.type == 'p2p') {
        var contact = this.userConversations.user.contacts.get(this.targetId);
        if(contact)
            return contact.getAvatarUrl();
        return Users.getInstance().get(this.targetId).getAvatarUrl();
    }

    if(this.avatarUrl && $.trim(this.avatarUrl).length>5)
        return Util.parseAttachmentUrl(this.avatarUrl,this.userConversations.user.token,"");
    return null;
};
/**
 * 获取目标会话
 * @param cb
 */
UserConversation.prototype.getSession = function(cb){
    this.userConversations.user.sessions.get(this.targetId, this.type, cb);
}
/**
 * 同步消息
 * @param force[true|false]:强制同步
 * @param cb
 */
UserConversation.prototype.syncMessages = function(force, cb){
    if(!cb){
        cb = force || nop;
        force = false;
    }
    var that = this;
    this.getSession(function(err, session){
        if(err){
            cb(err);
            return;
        }
        if(force || that.updatedAt > session.messages.updatedAt){
            session.messages.remote.sync(function(err, messages){
                if(err){
                    cb(err);
                    return;
                }
                cb(null, messages);
            })
        }
        else
            cb(null, []);
    })
}
/**
 * 获取历史消息
 * @param cb
 */
UserConversation.prototype.getLastMessages = function(cb){
    cb = cb || nop;
    var that = this;
    this.getSession(function(err, session){
        if(err){
            cb(err);
            return;
        }
        session.messages.remote.getLastMessages(function(err, messages){
            if(err){
                cb(err);
                return;
            }
            that.firstGetLastMessges = false;
            cb(null, messages);
        })
    })
}
/**
 * 清除已读数量
 */
UserConversation.prototype.clearUnread = function(){
    this.unread = 0;
    this.userConversations.updateCache_List();
}