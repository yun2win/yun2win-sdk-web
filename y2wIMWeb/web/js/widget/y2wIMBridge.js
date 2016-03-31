'use strict';

var y2wIMBridge = function(user){
    this.user = user;
    this._client;
    var that = this;
    var clearIndex = 0;

    this.sendList = [];
    this.sendTypes = {
        text: 0,
        file: 1
    }

    this.syncTypes = {
        userConversation: 0,
        message: 1,
        contact: 2,
        userSession: 3
    }
    this.syncList = [];
    this.syncDic = {};
    this.syncStatus = {
        none: 0,
        syncing: 1,
        repeat: 2
    }
    this.getSyncStatus = function(syncObj){
        var key;
        switch(syncObj.type){
            case this.syncTypes.message:
                key = syncObj.type + '_' + syncObj.sessionId;
                break;
            case this.syncTypes.userConversation:
            case this.syncTypes.contact:
                key = syncObj.type;
                break;
        }
        if(this.syncDic[key] == undefined)
            return this.syncStatus.none;
        return this.syncDic[key];
    }
    this.setSyncStatus = function(syncObj, status){
        var key;
        switch(syncObj.type){
            case this.syncTypes.message:
                key = syncObj.type + '_' + syncObj.sessionId;
                break;
            case this.syncTypes.userConversation:
            case this.syncTypes.contact:
                key = syncObj.type;
                break;
        }
        if(key != undefined) {
            switch (status){
                case this.syncStatus.none:
                    this.syncList.splice(0, 1);
                    delete this.syncDic[key];
                    break;
                case this.syncStatus.syncing:
                    var canAdd = false || this.getSyncStatus(syncObj) == this.syncStatus.none;
                    if(canAdd)
                        this.syncList.push(syncObj);
                    this.syncDic[key] = status;
                    if (canAdd && that.syncList.length == 1)
                        that.handleMessage();
                    break;
                case this.syncStatus.repeat:
                    this.syncDic[key] = status;
                    break;
            }
        }
    }
    /**
     * 处理同步消息
     * @param syncObj
     * @param cb
     */
    this.handleSync_Message = function(syncObj, cb){
        var that = this;
        var foo = syncObj.sessionId.split('_');
        var sessionId = foo[1];
        //如果消息属于当前打开的会话，同步消息
        if(that.user.currentSession && that.user.currentSession.id == sessionId){
            var userConversation = that.user.currentSession.getConversation();
            y2w.syncMessages(userConversation, true, function(err){
                if(err)
                    console.error(err);
                var sessionMember = that.user.currentSession.members.getMember(that.user.id);
                if(sessionMember.isDelete)
                    y2w.buildNoRightMessage();

                if(that.getSyncStatus(syncObj) == that.syncStatus.repeat) {
                    that.setSyncStatus(syncObj, that.syncStatus.syncing);
                    that.handleSync_Message(syncObj, cb);
                }
                else{
                    that.setSyncStatus(syncObj, that.syncStatus.none);
                    cb();
                }
            })
        }
        else{
            this.setSyncStatus(syncObj, this.syncStatus.none);
            cb();
        }
    }
    this.handleSync_UserConversation = function(syncObj, cb){
        var that = this;
        this.user.userConversations.remote.sync(function(err){
            if(err)
                console.error(err);
            if(y2w.tab.curTabType == y2w.tab.tabType.userConversation)
                y2w.tab.userConversationPanel.render();

            if(that.getSyncStatus(syncObj) == that.syncStatus.repeat) {
                that.setSyncStatus(syncObj, that.syncStatus.syncing);
                that.handleSync_UserConversation(syncObj, cb);
            }
            else{
                that.setSyncStatus(syncObj, that.syncStatus.none);
                cb();
            }
        })
    }
    this.handleSync_Contact = function(syncObj, cb){
        var that = this;
        this.user.contacts.remote.sync(function(err){
            if(err)
                console.error(err);
            if(y2w.tab.curTabType == y2w.tab.tabType.contact)
                y2w.tab.contactPanel.render();

            if(that.getSyncStatus(syncObj) == that.syncStatus.repeat) {
                that.setSyncStatus(syncObj, that.syncStatus.syncing);
                that.handleSync_Contact(syncObj, cb);
            }
            else{
                that.setSyncStatus(syncObj, that.syncStatus.none);
                cb();
            }
        })
    }
    this.handleMessage = function(){
        var that = this;
        if(this.syncList.length > 0){
            var syncObj = this.syncList[0];
            switch (syncObj.type){
                case this.syncTypes.contact:
                    this.handleSync_Contact(syncObj, function(){
                        if(that.syncList.length > 0)
                            that.handleMessage();
                    })
                    break;
                case this.syncTypes.userConversation:
                    this.handleSync_UserConversation(syncObj, function(){
                        if(that.syncList.length > 0)
                            that.handleMessage();
                    })
                    break;
                case this.syncTypes.message:
                    this.handleSync_Message(syncObj, function(){
                        if(that.syncList.length > 0)
                            that.handleMessage();
                    })
                    break;
                default :
                    break;
            }
        }
    }

    var onDisconnected = function (returnCode) {
        switch (returnCode) {
            case y2wIM.connectionReturnCode.uidIsInvalid:
                console.error('disconnected: uid is invalid');
                break;
            case y2wIM.connectionReturnCode.tokenIsInvalid:
                console.error('disconnected: token is invalid');
                break;
            case y2wIM.connectionReturnCode.tokenHasExpired:
                console.info('disconnected: token has expired');
                that.user.remote.syncIMToken(function(err){
                    if(err){
                        console.error(err);
                        return;
                    }
                    console.info('sync token success');
                    that.connect();
                })
                break;
            case y2wIM.connectionReturnCode.appKeyIsInvalid:
                console.error('disconnected: appkey is invalid');
                break;
            case y2wIM.connectionReturnCode.kicked:
                console.warn('disconnected: another divice has connected');
                alert('您的帐号在其它地方登录，请重新登录');
                y2w.logout();
                break;
        }
    };
    /**
     * 连接状态变更处理
     * @param status:连接状态
     * @param msg:连接信息
     */
    this.onConnectionStatusChanged = function (status, msg) {
        switch (status) {
            case y2wIM.connectionStatus.connecting:
                console.log('connecting');
                break;
            case y2wIM.connectionStatus.connected:
                console.log('connected');
                break;
            case y2wIM.connectionStatus.reconnecting:
                console.log('reconnecting(' + msg + ')');
                break;
            case y2wIM.connectionStatus.networkDisconnected:
                console.warn('unable to connect to the network');
                break;
            case y2wIM.connectionStatus.disconnected:
                onDisconnected(msg);
                break;
            default:
                break;
        }
    };
    this.onUpdateSession = {
        onSuccess: function(session, message){
            console.log('update session success');
            //重新发送消息
            if (message) {
                that._client.sendMessage(session, message, that.onSendMessage);
            }
        },
        onFailure: function(returnCode, session){
            switch (returnCode) {
                case y2wIM.sendReturnCode.sessionIsInvalid:
                    console.error('update session error: session is invalid');
                    break;
                case y2wIM.sendReturnCode.sessionIdIsInvalid:
                    console.error('update session error: session.id is invalid');
                    break;
                case y2wIM.sendReturnCode.sessionMTSIsInvalid:
                    console.error('update session error: session.mts is invalid');
                    break;
                case y2wIM.sendReturnCode.cmdIsInvalid:
                    console.error('update session error: cmd is invalid');
                    break;
                case y2wIM.sendReturnCode.invalidFormatOfJSONContent:
                    console.error('send error: send content\'s format is not a valid json');
                    break;
                case y2wIM.sendReturnCode.sessionMTSOnClientHasExpired:
                    console.error('update session error: session mts on client has expired');
                    break;
                default:
                    console.log(returnCode);
                    break;
            }
        }
    }
    this.onSendMessage = {
        onSuccess: function () {
            console.log('send success');
        },
        onFailure: function (returnCode, session, message, data) {
            switch (returnCode) {
                case y2wIM.sendReturnCode.sessionIsInvalid:
                    console.error('send error: session is invalid');
                    break;
                case y2wIM.sendReturnCode.sessionIdIsInvalid:
                    console.error('send error: session.id is invalid');
                    break;
                case y2wIM.sendReturnCode.sessionMTSIsInvalid:
                    console.error('send error: session.mts is invalid');
                    break;
                case y2wIM.sendReturnCode.cmdIsInvalid:
                    console.error('send error: cmd is invalid');
                    break;
                case y2wIM.sendReturnCode.invalidFormatOfJSONContent:
                    console.error('send error: send content\'s format is not a valid json');
                    break;
                case y2wIM.sendReturnCode.sessionOnServerIsNotExist:
                    console.error('send error: session on server is not exist, update server session and resend message');
                    //更新服务器Session后重新发送消息
                    var foo = session.id.split('_');
                    var busiSession = that.user.sessions.getById(foo[1]);
                    var imSession = that.transToIMSession(busiSession, true);
                    that._client.updateSession(imSession, message, that.onUpdateSession);
                    break;
                case y2wIM.sendReturnCode.sessionMTSOnClientHasExpired:
                    console.error('send error: session mts on client has expired, get new client session and resend message');
                    //客户端获取Session后重新发送消息
                    var foo = session.id.split('_');
                    var targetId = that.user.sessions.getTargetId(foo[1], foo[0]);
                    that.user.sessions.remote.sync(targetId, foo[0], function(err, busiSession){
                        if(err){
                            console.error(err);
                            return;
                        }
                        var imSession = that.transToIMSession(busiSession);
                        that._client.sendMessage(imSession, message, that.onSendMessage);
                    })
                    break;
                case y2wIM.sendReturnCode.sessionMTSOnServerHasExpired:
                    console.error('send error: session mts on server has expired, update server session and resend message');
                    //更新服务器Session后重新发送消息
                    var foo = session.id.split('_');
                    var busiSession = that.user.sessions.getById(foo[1]);
                    var imSession = that.transToIMSession(busiSession, true, data);
                    that._client.updateSession(imSession, message, that.onUpdateSession);
                    break;
                default:
                    console.log(returnCode);
                    break;
            }
        }
    }
    this.onMessage = function(obj){
        var that = currentUser.y2wIMBridge;
        var message = obj.message;
        if(obj.cmd == 'sendMessage'){
            for(var i = 0; i < message.syncs.length; i++){
                var syncObj = message.syncs[i];
                var status = that.getSyncStatus(syncObj);
                switch (status){
                    case that.syncStatus.none:
                        that.setSyncStatus(syncObj, that.syncStatus.syncing);
                        break;
                    case that.syncStatus.syncing:
                    case that.syncStatus.repeat:
                        that.setSyncStatus(syncObj, that.syncStatus.repeat);
                        break;
                }
            }
        }
    };

    this.connect();
}
y2wIMBridge.prototype.connect = function(){
    var opts = {
        appKey: this.user.appKey,
        token: this.user.imToken,
        uid: this.user.id.toString(),
        onConnectionStatusChanged: this.onConnectionStatusChanged,
        onMessage: this.onMessage
    };
    this._client = y2wIM.connect(opts);
}
y2wIMBridge.prototype.disconnect = function(cb){
    cb = cb || nop;
    this._client.disconnect(cb);
}
y2wIMBridge.prototype.transToIMSession = function(busiSession, withMembers, time){
    var session = {};
    session.id = busiSession.type + '_' + busiSession.id;
    session.mts = busiSession.members.createdAt;
    if(withMembers) {
        session.members = [];
        var busiMembers = busiSession.members.getMembers();
        for (var i = 0; i < busiMembers.length; i++) {
            if(!time) {
                if(!busiMembers[i].isDelete)
                    session.members.push({
                        uid: busiMembers[i].userId
                    })
            }
            else{
                if(busiMembers[i].updatedAt > time) {
                    session.members.push({
                        uid: busiMembers[i].userId,
                        isDel: busiMembers[i].isDelete
                    })
                }
            }
        }
    }
    return session;
}
y2wIMBridge.prototype.sendMessage = function(imSession, sync){
    var message = {
        syncs: sync
    }
    this._client.sendMessage(imSession, message, this.onSendMessage);
}

y2wIMBridge.prototype.addToSendList = function(obj){
    this.sendList.push(obj);
    if(this.sendList.length == 1){
        this.handleSendMessage();
    }
}
y2wIMBridge.prototype.handleSendMessage = function(){
    var that = this;
    if(this.sendList.length > 0){
        var sendObj = this.sendList[0];
        switch (sendObj.type){
            case this.sendTypes.text:
                this.handleSendTextMessage(sendObj, function(){
                    if(that.sendList.length > 0)
                        that.handleSendMessage();
                })
                break;
            case this.sendTypes.file:
                this.handleSendFileMessage(sendObj, function(){
                    if(that.sendList.length > 0)
                        that.handleSendMessage();
                })
                break;
            default :
                break;
        }
    }
}
y2wIMBridge.prototype.handleSendTextMessage = function(sendObj, cb){
    var targetId = sendObj.targetId,
        scene = sendObj.scene,
        text = sendObj.text,
        options = sendObj.options || nop,
        that = this;
    this.user.sessions.get(targetId, scene, function (err, session) {
        //创建消息对象
        var message = session.messages.createMessage({
            sender: that.user.id,
            to: targetId,
            type: 'text',
            content: { text: text },
            status: 'storing'
        });
        session.messages.add(message);
        var id = message.id;
        //显示消息
        if(options.showMsg)
            options.showMsg(message);
        //保存消息对象
        session.messages.remote.store(message, function(err, msg){
            if(err){
                console.error(err);
                if(options.storeMsgFailed)
                    options.storeMsgFailed(id);
                that.sendList.splice(0, 1);
                cb();
                return;
            }

            //发送通知
            var imSession = that.transToIMSession(session);
            var syncs = [
                { type: that.syncTypes.userConversation },
                { type: that.syncTypes.message, sessionId: imSession.id }
            ]
            that.sendMessage(imSession, syncs);

            if(options.storeMsgDone)
                options.storeMsgDone(id, session.type, targetId, msg);

            that.sendList.splice(0, 1);
            cb();
        })
    });
}
y2wIMBridge.prototype.handleSendFileMessage = function(sendObj, cb){
    var targetId = sendObj.targetId,
        scene = sendObj.scene,
        file = sendObj.file,
        options = sendObj.options || nop;
    if(file.type.match('image')){
        var fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = this.onImageLoadSuccess.bind(this, targetId, scene, options, cb);
        fileReader.onerror = this.onImageLoadError.bind(this, cb)
    }
    else{
        throw 'format is invalid';
    }
}

/**
 * 发送文字消息
 * @param targetId:目标Id
 * @param scene:会话场景类型
 * @param text:文字
 * @param options:{
 *  showMsg: showMsg//UI显示消息
 *  storeMsgFailed: storeMsgFailed//消息保存失败
 *  storeMsgDone: storeMsgDone//消息保存成功
 * }
 */
y2wIMBridge.prototype.sendTextMessage = function(targetId, scene, text, options){
    this.addToSendList({
        targetId: targetId,
        scene: scene,
        text: text,
        options: options,
        type: this.sendTypes.text
    });
}

y2wIMBridge.prototype.onImageLoadSuccess = function(targetId, scene, options, cb, e){
    var that = this;
    options = options || nop;
    //获取图片宽高
    var $tempImage = $('<div style="position:absolute; left: -10000px; top: -10000px; z-index:-10000; opacity: 0;"><img src="' + e.target.result + '" /></div>').appendTo($('body'));
    $tempImage.find('img').on('load', function(){
        var width = $tempImage.width();
        var height = $tempImage.height();
        $tempImage.find('img').off('load');
        $tempImage.remove();

        that.user.sessions.get(targetId, scene, function (err, session) {
            //创建消息对象
            var message = session.messages.createMessage({
                sender: that.user.id,
                to: targetId,
                type: 'image',
                content: { base64: e.target.result, width: width, height: height },
                status: 'storing'
            });
            session.messages.add(message);
            var id = message.id;
            //显示消息
            if(options.showMsg)
                options.showMsg(message);
            //上传图片
            var fileName = guid() + '.png';
            that.user.attchments.uploadBase64Image(fileName, e.target.result, function(err, data) {
                if (err) {
                    console.error(err);
                    if (options.storeMsgFailed)
                        options.storeMsgFailed(id);
                    currentUser.y2wIMBridge.sendList.splice(0, 1);
                    cb();
                    return;
                }
                var src = 'attachments/' + data.id + '/content';
                //保存消息对象
                message.content.src = src;
                message.content.thumbnail = src;
                delete message.content.base64;
                session.messages.remote.store(message, function (err, msg) {
                    if (err) {
                        console.error(err);
                        if (options.storeMsgFailed)
                            options.storeMsgFailed(id);
                        currentUser.y2wIMBridge.sendList.splice(0, 1);
                        cb();
                        return;
                    }

                    //发送通知
                    var imSession = that.transToIMSession(session);
                    var syncs = [
                        { type: that.syncTypes.userConversation },
                        { type: that.syncTypes.message, sessionId: imSession.id }
                    ]
                    that.sendMessage(imSession, syncs);

                    if (options.storeMsgDone)
                        options.storeMsgDone(id, session.type, targetId, msg);

                    currentUser.y2wIMBridge.sendList.splice(0, 1);
                    cb();
                })
            })
        });
    })
}
y2wIMBridge.prototype.onImageLoadError = function(){
    this.sendList.splice(0, 1);
    cb();
}
/**
 * 发送文件消息
 * @param targetId:目标Id
 * @param scene:会话场景类型
 * @param file:input.files[0]
 * @param options:{
 *  showMsg: showMsg//UI显示消息
 *  storeMsgFailed: storeMsgFailed//消息保存失败
 *  storeMsgDone: storeMsgDone//消息保存成功
 * }
 */
y2wIMBridge.prototype.sendFileMessage = function(targetId, scene, file, options){
    this.addToSendList({
        targetId: targetId,
        scene: scene,
        file: file,
        options: options,
        type: this.sendTypes.file
    });
}

