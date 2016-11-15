'use strict';

var y2wIMBridge = function(user, opts){
    this.user = user;
    this._client;
    var that = this;
    var clearIndex = 0;
    this.reSendTimes = 0;

    this.connectionStatus = {
        connecting: 0,
        connected: 1,
        reconnecting: 2,
        networkDisconnected: 3,
        disconnected: 100
    };

    this.connectionReturnCode = {
        identifierRejected: 2,
        unacceptableProtocolVersion: 3,
        uidIsInvalid: 4,
        tokenIsInvalid: 5,
        tokenHasExpired: 6,
        authenticationServerError: 7,
        kicked: 10,
        acceptConnect: 11,
        requestGateError: 101,
        serverUnavailable: 99,
        serverInternalError: 100
    };

    this.sendReturnCode = {
        success: 20,
        timeout: 21,
        cmdIsInvalid: 22,
        sessionIsInvalid: 23,
        sessionIdIsInvalid: 24,
        sessionMTSIsInvalid: 25,
        sessionOnServerIsNotExist: 26,
        sessionMTSOnClientHasExpired: 27,
        sessionMTSOnServerHasExpired: 28,
        sessionMembersIsInvalid: 29,
        invalidFormatOfJSONContent: 30,
        sessionMembersIsNull: 31
    };

    this.sendList = [];
    this.sendTypes = {
        text: 0,
        file: 1,
        singleavcall: 2,//单人 音视频 
        groupacall: 3,//多人音视频
        system:10,
        copy:11
    };

    this.syncTypes = {
        userConversation: 0,
        message: 1,
        contact: 2,
        userSession: 3
    };
    this.syncList = [];
    this.syncDic = {};
    this.syncStatus = {
        none: 0,
        syncing: 1,
        repeat: 2
    };
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
    };
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
    };
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
    };
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
    };
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
    };
    this.handleMessage = function(){
        var that = this;
        if(this.syncList.length > 0){
            var syncObj = this.syncList[0];
            switch (syncObj.type){
                case this.syncTypes.contact:
                    this.handleSync_Contact(syncObj, function(){
                        if(that.syncList.length > 0)
                            that.handleMessage();
                    });
                    break;
                case this.syncTypes.userConversation:
                    this.handleSync_UserConversation(syncObj, function(){
                        if(that.syncList.length > 0)
                            that.handleMessage();
                    });
                    break;
                case this.syncTypes.message:
                    this.handleSync_Message(syncObj, function(){
                        if(that.syncList.length > 0)
                            that.handleMessage();
                    });
                    break;
                default :
                    break;
            }
        }
    };

    var onDisconnected = function (returnCode) {
        switch (returnCode) {
            case that.connectionReturnCode.tokenIsInvalid:
            case that.connectionReturnCode.tokenHasExpired:
                if(returnCode == that.connectionReturnCode.tokenIsInvalid)
                    console.error('disconnected: token is invalid');
                else
                    console.info('disconnected: token has expired');
                that.user.remote.syncIMToken(function(err){
                    if(err){
                        console.error(err);
                        setTimeout(function(){
                            that.reconnect(that.user.imToken);
                        }, 10 * 1000);
                        return;
                    }
                    console.info('sync token success');
                    that.reconnect(that.user.imToken);
                });
                break;
            case that.connectionReturnCode.kicked:
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
            case that.connectionStatus.connecting:
                if(msg)
                    console.log('connecting region:' + msg.region);
                else
                    console.log('connecting');
                if(opts.onStatusChanged)
                    opts.onStatusChanged('disConnected');
                break;
            case that.connectionStatus.connected:
                console.log('connected at ' + Util.dateFormat(new Date(), 'yyyy-MM-dd HH:mm:ss'));
                if(opts.onStatusChanged)
                    opts.onStatusChanged('connected');
                break;
            case that.connectionStatus.reconnecting:
                console.log('reconnecting(' + msg + ')');
                if(opts.onStatusChanged)
                    opts.onStatusChanged('disConnected');
                break;
            case that.connectionStatus.networkDisconnected:
                console.warn('unable to connect to the network');
                if(opts.onStatusChanged)
                    opts.onStatusChanged('disConnected');
                break;
            case that.connectionStatus.disconnected:
                onDisconnected(msg);
                if(opts.onStatusChanged)
                    opts.onStatusChanged('disConnected');
                break;
            default:
                if(opts.onStatusChanged)
                    opts.onStatusChanged('disConnected');
                break;
        }
    };
    this.onUpdateSession = {
        onSuccess: function(session, message){
            console.log('update session and send message success');
            that.reSendTimes = 0;
        },
        onFailure: function(returnCode, session, message){
            switch (returnCode) {
                case that.sendReturnCode.sessionIsInvalid:
                    console.error('update session error: session is invalid');
                    break;
                case that.sendReturnCode.sessionIdIsInvalid:
                    console.error('update session error: session.id is invalid');
                    break;
                case that.sendReturnCode.sessionMTSIsInvalid:
                    console.error('update session error: session.mts is invalid');
                    break;
                case that.sendReturnCode.cmdIsInvalid:
                    console.error('update session error: cmd is invalid');
                    break;
                case that.sendReturnCode.invalidFormatOfJSONContent:
                    console.error('send error: send content\'s format is not a valid json');
                    break;
                case that.sendReturnCode.sessionMTSOnClientHasExpired:
                    console.error('update session error: session mts on client has expired');
                    break;
                case that.sendReturnCode.timeout:
                    console.error('update session timeout, update session again');
                    if(that.reSendTimes > 10)
                        that.connect();
                    else {
                        //重新发送消息
                        that.reSendTimes++;
                        that._client.updateSession(session, message, that.onUpdateSession);
                    }
                    break;
                default:
                    console.log(returnCode);
                    break;
            }
        }
    };
    this.onSendMessage = {
        onSuccess: function () {
            console.log('send success');
            that.reSendTimes = 0;
        },
        onFailure: function (returnCode, session, message, data) {
            switch (returnCode) {
                case that.sendReturnCode.sessionIsInvalid:
                    console.error('send error: session is invalid');
                    break;
                case that.sendReturnCode.sessionIdIsInvalid:
                    console.error('send error: session.id is invalid');
                    break;
                case that.sendReturnCode.sessionMTSIsInvalid:
                    console.error('send error: session.mts is invalid');
                    break;
                case that.sendReturnCode.cmdIsInvalid:
                    console.error('send error: cmd is invalid');
                    break;
                case that.sendReturnCode.invalidFormatOfJSONContent:
                    console.error('send error: send content\'s format is not a valid json');
                    break;
                case that.sendReturnCode.sessionOnServerIsNotExist:
                    console.error('send error: session on server is not exist, update server session and resend message');
                    //更新服务器Session后重新发送消息
                    var foo = session.id.split('_');
                    var imSession;
                    if(foo[0] == that.getY2wIMAppSessionPrefix())
                        imSession = that.transToIMSessionForY2wIMApp(foo[1], true);
                    else{
                        var busiSession = that.user.sessions.getById(foo[1]);
                        imSession = that.transToIMSession(busiSession, true);
                    }
                    that._client.updateSession(imSession, message, that.onUpdateSession);
                    break;
                case that.sendReturnCode.sessionMTSOnClientHasExpired:
                    console.error('send error: session mts on client has expired, get new client session and resend message');
                    //客户端获取Session后重新发送消息
                    var foo = session.id.split('_');
                    var targetId = that.user.sessions.getTargetId(foo[1], foo[0]);
                    that.user.sessions.remote.sync(targetId, foo[0], function(err, busiSession){
                        if(err){
                            console.error(err);
                            return;
                        }
                        busiSession.tryTime=busiSession.tryTime||0;
                        if(busiSession.tryTime>3){
                            busiSession.tryTime=0;
                            var imSession = that.transToIMSession(busiSession, true, data, true);
                            that._client.updateSession(imSession, message, that.onUpdateSession);
                        }
                        else{
                            busiSession.tryTime++;
                            var imSession = that.transToIMSession(busiSession);
                            that._client.sendMessage(imSession, message, that.onSendMessage);
                        }
                        console.log(busiSession.id+"==="+(busiSession.tryTime++));
                    });
                    break;
                case that.sendReturnCode.sessionMTSOnServerHasExpired:
                    console.error('send error: session mts on server has expired, update server session and resend message');
                    //更新服务器Session后重新发送消息
                    var foo = session.id.split('_');
                    var busiSession = that.user.sessions.getById(foo[1]);
                    if(busiSession) {
                        var imSession = that.transToIMSession(busiSession, true, data);
                        that._client.updateSession(imSession, message, that.onUpdateSession);
                    }
                    else
                        console.error('session is no exist');
                    break;
                case that.sendReturnCode.timeout:
                    console.error('send message timeout, send message again');
                    if(that.reSendTimes > 10)
                        that.connect();
                    else {
                        //重新发送消息
                        that.reSendTimes++;
                        that._client.sendMessage(session, message, that.onSendMessage);
                    }
                    break;
                default:
                    console.log(returnCode);
                    break;
            }
        }
    };
    this.onMessage = function(obj){
        var that = currentUser.y2wIMBridge;
        var message = obj.message;
        if(obj.cmd == 'sendMessage'){
            var showNoti = false;
            for(var i = 0; i < message.syncs.length; i++){
                var syncObj = message.syncs[i];
                if (syncObj.type == 1) {
                    showNoti = true;
                }
                if (syncObj.type == "groupavcall" || syncObj.type == "singleavcall") {
                    var receiversIds = syncObj.content.receiversIds;
                    if (receiversIds) {
                        for (var j = 0; j < receiversIds.length; j++) {
                            if (receiversIds[j] == currentUser.id) {
                                y2w.receive_AV_Mesage(syncObj);
                                break;
                            }
                        }
                    }
                    break;
                }
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

            if (Notification.permission == 'granted' && showNoti) {
                var n = new Notification('yun2win', {body: '您有一条新消息'});
                n.onshow = function() {
                    setTimeout(function() {
                        n.close();
                    }, 5000);
                };
            }
        }
    };

    if (Notification.permission != 'granted') {
        Notification.requestPermission();
    }

    this.connect();
};
y2wIMBridge.prototype.connect = function(){
    var that = this;
    var opts = {
        appKey: this.user.appKey,
        token: this.user.imToken,
        uid: this.user.id.toString(),
        onConnectionStatusChanged: this.onConnectionStatusChanged,
        onMessage: this.onMessage
    };
    y2wIM.connect(opts, function (client) {
        that._client = client;
    });
};
y2wIMBridge.prototype.reconnect = function(token){
    this._client.reconnect(token);
};
y2wIMBridge.prototype.disconnect = function(cb){
    cb = cb || nop;
    if(this._client && this._client.connected)
        this._client.disconnect(cb);
    else
        cb();
};
y2wIMBridge.prototype.transToIMSession = function(busiSession, withMembers, time, force){
    var session = {};
    session.id = busiSession.type + '_' + busiSession.id;
    session.mts = busiSession.members.createdAt;
    session.force = !!force;
    if(withMembers) {
        session.members = [];
        var busiMembers = busiSession.members.getAllMembers();
        for (var i = 0; i < busiMembers.length; i++) {
            if(force){
                session.members.push({
                    uid: busiMembers[i].userId,
                    isDel: busiMembers[i].isDelete
                });
            }
            else if(!time) {
                if(!busiMembers[i].isDelete)
                    session.members.push({
                        uid: busiMembers[i].userId
                    })
            }
            else{
                //if(busiMembers[i].updatedAt > time) {
                if(busiMembers[i].createdAt > time) {
                    session.members.push({
                        uid: busiMembers[i].userId,
                        isDel: busiMembers[i].isDelete
                    });
                }
            }
        }
    }
    return session;
};
y2wIMBridge.prototype.getY2wIMAppSessionPrefix = function(){
    return 'y2wIMApp';
}
y2wIMBridge.prototype.getY2wIMAppMTS = function(){
    return 1264953600000;
}
y2wIMBridge.prototype.transToIMSessionForY2wIMApp = function(to, withMembers){
    var session = {
        id: this.getY2wIMAppSessionPrefix() + '_' + to,
        mts: this.getY2wIMAppMTS()
    };
    if(withMembers)
        session.members = [ { uid: to, isDel: false } ];
    return session;
}
y2wIMBridge.prototype.sendMessage = function(imSession, sync){
    var message = {
        syncs: sync
    };
    for(var i = 0; i < message.syncs.length; i++){
        if(message.syncs[i].type == this.syncTypes.message){
            message.pns = { msg: '您有一条新消息' };
            break;
        }
    }
    this._client.sendMessage(imSession, message, this.onSendMessage);
};

y2wIMBridge.prototype.addToSendList = function(obj){
    if(!obj.id)
        obj.id=guid();
    this.sendList.push(obj);
    if(this.sendList.length == 1){
        this.handleSendMessage();
    }
};
y2wIMBridge.prototype.handleSendMessage = function(){
    var that = this;
    if(this.sendList.length > 0){
        var sendObj = this.sendList[0];
        switch (sendObj.type){
            case this.sendTypes.text:
                this.handleSendTextMessage(sendObj, function(){
                    if(that.sendList.length > 0)
                        that.handleSendMessage();
                });
                break;
            case this.sendTypes.system:
                this.handleSendSystemMessage(sendObj, function(){
                    if(that.sendList.length > 0)
                        that.handleSendMessage();
                });
                break;
            case this.sendTypes.file:
                this.handleSendFileMessage(sendObj, function(){
                    if(that.sendList.length > 0)
                        that.handleSendMessage();
                });
                break;
            case this.sendTypes.singleavcall:
                this.handleSendCallMessage(sendObj, function () {
                    if (that.sendList.length > 0)
                        that.handleSendMessage();
                });
                break;
            case this.sendTypes.groupacall:
                this.handleSendCallMessage(sendObj, function () {
                    if (that.sendList.length > 0)
                        that.handleSendMessage();
                });
                break;
            case this.sendTypes.copy:
                this.handleSendCopyMessage(sendObj,function(){
                    if(that.sendList.length > 0)
                        that.handleSendMessage();
                });
                break;
            default:
                break;
        }
    }
};
y2wIMBridge.prototype.handleSendCopyMessage = function(sendObj, cb){

    if(!sendObj.obj)
        return cb();

    var targetId = sendObj.targetId,
        scene = sendObj.scene,
        content = sendObj.obj.content,
        type = sendObj.obj.type,
        options = sendObj.options || nop,
        msgId=sendObj.id ,
        that = this;
    this.user.sessions.get(targetId, scene, function (err, session) {
        //创建消息对象
        var message = session.messages.getOrCreateMessage({
            id:msgId,
            sender: sendObj.sender || that.user.id,
            to: targetId,
            type: type,
            content: content,
            status: 'storing'
        },true);
        //session.messages.add(message);
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
                var obj=that.sendList.splice(0, 1);
                that.onMsgStoreError(obj);
                cb();
                return;
            }

            //发送通知
            var imSession = that.transToIMSession(session);
            var syncs = [
                { type: that.syncTypes.userConversation },
                { type: that.syncTypes.message, sessionId: imSession.id }
            ];
            that.sendMessage(imSession, syncs);

            if(options.storeMsgDone)
                options.storeMsgDone(id, session.type, targetId, msg);

            that.sendList.splice(0, 1);
            cb();
        })
    });
};
y2wIMBridge.prototype.handleSendTextMessage = function(sendObj, cb){
    var targetId = sendObj.targetId,
        scene = sendObj.scene,
        text = sendObj.text,
        options = sendObj.options || nop,
        msgId=sendObj.id ,
        that = this;
    this.user.sessions.get(targetId, scene, function (err, session) {
        //创建消息对象
        var message = session.messages.getOrCreateMessage({
            id:msgId,
            sender: sendObj.sender || that.user.id,
            to: targetId,
            type: 'text',
            content: { text: text },
            status: 'storing'
        },true);
        //session.messages.add(message);
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
                var obj=that.sendList.splice(0, 1);
                that.onMsgStoreError(obj);
                cb();
                return;
            }

            //发送通知
            var imSession = that.transToIMSession(session);
            var syncs = [
                { type: that.syncTypes.userConversation },
                { type: that.syncTypes.message, sessionId: imSession.id }
            ];
            that.sendMessage(imSession, syncs);

            if(options.storeMsgDone)
                options.storeMsgDone(id, session.type, targetId, msg);

            that.sendList.splice(0, 1);
            cb();
        })
    });
};
y2wIMBridge.prototype.handleSendSystemMessage = function(sendObj, cb){
    var targetId = sendObj.targetId,
        scene = sendObj.scene,
        text = sendObj.text,
        msgId = sendObj.id ,
        options = sendObj.options || nop,
        that = this;
    this.user.sessions.get(targetId, scene, function (err, session) {
        //创建消息对象
        var message = session.messages.getOrCreateMessage({
            id:msgId,
            sender: sendObj.sender || that.user.id,
            to: targetId,
            type: 'system',
            content: { text: text },
            status: 'storing'
        },true);
        //session.messages.add(message);
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
                var obj=that.sendList.splice(0, 1);
                that.onMsgStoreError(obj);
                cb();
                return;
            }

            //发送通知
            var imSession = that.transToIMSession(session);
            var syncs = [
                { type: that.syncTypes.userConversation },
                { type: that.syncTypes.message, sessionId: imSession.id }
            ];
            that.sendMessage(imSession, syncs);

            if(options.storeMsgDone)
                options.storeMsgDone(id, session.type, targetId, msg);

            that.sendList.splice(0, 1);
            cb();
        })
    });
};
y2wIMBridge.prototype.handleSendCallMessage = function (sendObj, cb) {
    var targetId = sendObj.targetId,
       scene = sendObj.scene,
       text = sendObj.content,
       that = this;
    var msgtype;
    if (scene === 'p2p') {
        msgtype = "singleavcall";
    } else {
        msgtype = "groupavcall";
    }
    this.user.sessions.get(targetId, scene, function (err, session) {
        //发送通知
        var imSession = that.transToIMSession(session);
        var syncs = [
                { type: that.syncTypes.userConversation },
                { type: that.syncTypes.message, sessionId: imSession.id },
                 { type: msgtype, content: text }
        ];
        that.sendMessage(imSession, syncs);
        that.sendList.splice(0, 1);
        cb();
    });
};

y2wIMBridge.prototype.handleSendFileMessage = function(sendObj, cb){
    var targetId = sendObj.targetId,
        scene = sendObj.scene,
        file = sendObj.file,
        msgId = sendObj.id ,
        options = sendObj.options || nop;
    if(file.type.match('image')){
        var fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = this.onImageLoadSuccess.bind(this, msgId, targetId, scene, options, cb);
        fileReader.onerror = this.onImageLoadError.bind(this, cb)
    }
    else{
        //throw 'format is invalid';
        var fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = this.onFileLoadSuccess.bind(this, msgId, targetId, scene, options,file.name,file.size, cb);
        fileReader.onerror = this.onFileLoadError.bind(this, cb)
    }
};

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
};
y2wIMBridge.prototype.sendCopyMessage = function(targetId,scene,content,type,options){
    this.addToSendList({
        targetId: targetId,
        scene: scene,
        obj: {content:content,type:type},
        options:options,
        type: this.sendTypes.copy
    });
};

y2wIMBridge.prototype.sendSystemMessage = function(targetId, scene, text, options){
    this.addToSendList({
        sender:"system",
        targetId: targetId,
        scene: scene,
        text: text,
        options: options,
        type: this.sendTypes.system
    });
};

y2wIMBridge.prototype.onImageLoadSuccess = function(msgId, targetId, scene, options, cb, e){
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

            var message  = session.messages.getOrCreateMessage({
                id: msgId,
                sender: that.user.id,
                to: targetId,
                type: 'image',
                content: {base64: e.target.result, width: width, height: height},
                status: 'storing'
            },true);
            //session.messages.add(message);

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
                    var obj=that.sendList.splice(0, 1);
                    that.onMsgStoreError(obj);
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
                    ];
                    that.sendMessage(imSession, syncs);

                    if (options.storeMsgDone)
                        options.storeMsgDone(id, session.type, targetId, msg);

                    currentUser.y2wIMBridge.sendList.splice(0, 1);
                    cb();
                })
            })
        });
    })
};
y2wIMBridge.prototype.onImageLoadError = function(){
    var obj=this.sendList.splice(0, 1);
    var that=this;
    setTimeout(function(){
        that.addToSendList(obj);
    });
    cb();
};
//上传文件完成
y2wIMBridge.prototype.onFileLoadSuccess = function(msgId,targetId, scene, options,name,fileSize, cb, e){
    var that = this;
    options = options || nop;

    that.user.sessions.get(targetId, scene, function (err, session) {
        //创建消息对象
        var message = session.messages.getOrCreateMessage({
            id:msgId,
            sender: that.user.id,
            to: targetId,
            type: 'file',
            content: {base64: e.target.result, name: name, size: fileSize},
            status: 'storing'
        },true);
        //session.messages.add(message);
        var id = message.id;
        //显示消息
        if(options.showMsg)
            options.showMsg(message);
        //上传图片
        var fileName =name;
        that.user.attchments.uploadBase64("application/octet-stream",fileName, e.target.result, function(err, data) {
            if (err) {
                console.error(err);
                if (options.storeMsgFailed)
                    options.storeMsgFailed(id);
                var obj=that.sendList.splice(0, 1);
                that.onMsgStoreError(obj);
                cb();
                return;
            }
            var src = 'attachments/' + data.id + '/content';
            //保存消息对象
            message.content.src = src;
            //message.content.thumbnail = src;
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

                //message.content=msg.content;
                if(options.updateMsg)
                    options.updateMsg(message);

                cb();
            })
        })
    });
};

y2wIMBridge.prototype.onFileLoadError = function(){
    var obj=this.sendList.splice(0, 1);
    var that=this;
    setTimeout(function(){
        that.addToSendList(obj);
    });
    cb();
};
y2wIMBridge.prototype.onMsgStoreError=function(obj){

    if(!obj)
        return;

    if(obj.length)
        obj=obj[0];

    if(obj.time>60)
        return;

    var that=this;
    obj.time=(obj.time||0)+1;
    setTimeout(function(){
        that.addToSendList(obj);
    },5000);
};
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
};
y2wIMBridge.prototype.sendcallVideoMessage = function (targetId, scene, content) {
    var sendType;
    if (scene === 'p2p') {
        sendType = this.sendTypes.singleavcall;
    } else {
        sendType = this.sendTypes.groupacall;
    }

    this.addToSendList({
        targetId: targetId,
        scene: scene,
        content: content,
        type: sendType
    });
};

y2wIMBridge.prototype.sendToOtherDevice=function(syncs){
    var that=this;
    this.user.sessions.get(this.user.id, 'single', function(err, session) {
        if (err) {
            console.error(err);
            return;
        }
        var imSession = that.transToIMSession(session);
        //发送通知
        if(!syncs)
            syncs = [
                {type: that.syncTypes.userConversation}
            ];

        that.sendMessage(imSession, syncs);
    });
};