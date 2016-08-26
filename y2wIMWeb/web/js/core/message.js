'use strict';

var Messages = function(session){
    this.session = session;
    this._list = [];
    this.more = true;
    this.updatedAt = globalMinDate;
    this.topDate = globalMaxDate;
    this.sessionUpdatedAt = globalMinDate;
    this.remote = new messagesRemote(this);
    this._dic = {};
}
/**
 * 获取消息数量
 * @returns {Number}
 */
Messages.prototype.count = function(){
    return this._list.length;
}
/**
 * 获取消息列表
 * @returns [messages]
 */
Messages.prototype.getMessages = function(){
    return this._list;
}
Messages.prototype.get = function(id){
    return this._dic[id];
}
Messages.prototype.exist = function(id){
    return this._dic[id];
}
/**
 * 创建消息对象
 * @param obj
 * @returns message
 */
Messages.prototype.createMessage = function(obj){
    return new Message(this, obj);
}
Messages.prototype.add = function(message){
    if(!this._dic[message.id])
        this._dic[message.id] = message;
    this._list.push(message);
}
Messages.prototype.insert = function(index, message){
    if(!this._dic[message.id])
        this._dic[message.id] = message;
    this._list.splice(index, 0, message);
}
var messagesRemote = function(messages) {
    this.messages = messages;
}
messagesRemote.prototype.store = function(message, cb) {
    cb = cb || nop;
    var that = this;
    var url = 'sessions/' + that.messages.session.id + '/messages';
    var params = {
        sender: message.sender,
        content: JSON.stringify(message.content),
        type: message.type
    }
    baseRequest.post(url, params, that.messages.session.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            message.status = 'storefailed';
            //that.messages.add(message);
            return;
        }
        message.id = data.id;
        message.createdAt = new Date(data.createdAt).getTime();
        message.updatedAt = new Date(data.updatedAt).getTime();
        message.status = 'stored';
        cb(null, message);
    })
};
messagesRemote.prototype.update = function(message, cb) {
    cb = cb || nop;
    var that = this;
    var url = 'sessions/' + that.messages.session.id + '/messages/'+message.id;
    var params = {
        sender: message.sender,
        content: JSON.stringify(message.content),
        type: message.type
    };
    baseRequest.put(url, params, that.messages.session.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            message.status = 'storefailed';
            //that.messages.add(message);
            return;
        }
        message.id = data.id;
        message.createdAt = new Date(data.createdAt).getTime();
        message.updatedAt = new Date(data.updatedAt).getTime();
        message.status = 'stored';
        cb(null, message);
    })
};
/**
 * 消息同步
 * 1. 获取同步消息
 * 2. 从后往前查询消息标志位存在的本地消息(带标志位的为本地消息，同步消息不包含此属性)，并设置索引，当未查询到此状态时，表示找到了上次同步后最后一条索引
 * 3. 将同步消息插入到索引位置
 * 4. 删除标志位为stored的本地消息
 * 5. 返回同步回来的消息
 * @param cb
 */
messagesRemote.prototype.sync = function(cb) {
    cb = cb || nop;
    var that = this;
    var url = 'sessions/' + that.messages.session.id + '/messages';
    baseRequest.get(url, that.messages.updatedAt, that.messages.session.sessions.user.token, function(err, data){
        if(err){
            //无权限同步消息
            if(err.status == '403'){
                var userConversation = that.messages.session.getConversation();
                that.messages.updatedAt = userConversation.updatedAt;
                var targetId = that.messages.session.sessions.getTargetId(that.messages.session.id, that.messages.session.type);
                that.messages.session.sessions.remote.sync(targetId, that.messages.session.type, function(err){
                    if(err){
                        cb(err);
                        return;
                    }
                    cb();
                })
            }
            else
                cb(err);
        }
        else {
            var tmpList = that.messages.getMessages();
            var insertIndex = tmpList.length;
            for (var i = tmpList.length - 1; i >= 0; i--) {
                if (!tmpList[i].status)
                    break;
                else
                    insertIndex = i;
            }
            var list = [];
            for (var i = 0; i < data.entries.length; i++) {
                var message = that.messages.createMessage(data.entries[i]);
                list.push(message);
                var exist=that.messages.exist(message.id);
                if(exist){
                    var omsg=that.messages.get(message.id);
                    for(var index in message)
                        omsg[index]=message[index];
                    continue;
                }

                that.messages.insert(insertIndex++, message);

                if (that.messages.updatedAt < message.updatedAt)
                    that.messages.updatedAt = message.updatedAt;
            }
            if (that.messages.updatedAt == globalMinDate)
                that.messages.updatedAt = globalMinSyncDate;
            tmpList = that.messages.getMessages();
            for (var i = tmpList.length - 1; i >= insertIndex; i--) {
                if (tmpList[i].status == 'stored')
                    tmpList.splice(i, 1);
            }
            //如果服务端session已更新，同步session
            if(that.messages.session.updatedAt < new Date(data['sessionUpdatedAt']).getTime()) {
                var targetId = that.messages.session.sessions.getTargetId(that.messages.session.id, that.messages.session.type);
                that.messages.session.sessions.remote.sync(targetId, that.messages.session.type, function(err){
                    if(err){
                        cb(err);
                        return;
                    }
                    cb(null, list);
                });
            }
            else
                cb(null, list);
        }
    })
};
messagesRemote.prototype.getLastMessages = function(cb){
    cb = cb || nop;
    var that = this;
    var limit = 20;
    var url = 'sessions/' + that.messages.session.id + '/messages/history?limit=' + limit;
    baseRequest.get(url, that.messages.topDate, that.messages.session.sessions.user.token, function(err, datas){
        if(err){
            cb(err);
            return;
        }
        var list = [];
        for(var i = 0; i < datas.length; i++){
            var message = that.messages.createMessage(datas[i]);
            that.messages.insert(0, message);
            list.splice(0, 0, message);
            if(that.messages.updatedAt < message.updatedAt)
                that.messages.updatedAt = message.updatedAt;
            if(that.messages.topDate > message.updatedAt)
                that.messages.topDate = message.updatedAt;
        }
        if(that.messages.updatedAt == globalMinDate)
            that.messages.updatedAt = globalMinSyncDate;
        if(datas.length < limit)
            that.messages.more = false;
        else
            that.messages.more = true;
        cb(null, list);
    })
};

var Message = function(messages, obj){
    this.messages = messages;
    this.id = obj['id'] || guid();
    this.sender = obj['sender'];
    this.from;
    this.to;
    if(this.messages.session.type == 'p2p'){
        var member = this.messages.session.members.getMember(this.sender);
        if(member)
            this.from = member.user;
        if(this.from) {
            member = this.messages.session.members.getP2POtherSideMember(this.from.id);
            if (member)
                this.to = member.user;
        }
    }
    else if(this.messages.session.type == 'group'){
        this.from = this.messages.session.members.getMember(this.sender);
        this.to = this.messages.session;
    }
    this.type = obj['type'];
    try {
        this.content = JSON.parse(obj['content']);
    }
    catch(e){
        this.content = obj['content'];
    }
    this.createdAt = obj['createdAt'] ? new Date(obj['createdAt']).getTime() : globalMinDate;
    this.updatedAt = obj['updatedAt'] ? new Date(obj['updatedAt']).getTime() : globalMinDate;
    this.isDelete = obj['isDelete'];
    this.status = obj['status'] || '';
}