/**
 * 聊天相关信息
 * @type {Object}
 */
var chatInfo = function(){
    this.visible = false;
    this.removable = false;
    this.$chatMembersUI = [];

    this.$btnChatInfo = $('#btnChatInfo');
    this.$chatInfoPanel = $('#chatInfo');
    this.$chatMembers = $('#chatMembers');
    this.$addChatMembers = $('#addChatMembers');
    this.$removeChatMembers = $('#removeChatMembers');
    this.$chatFavorite = $('#chatFavorite');
    this.$btnChatFavorite = this.$chatFavorite.find('.switch');
    this.$chatQuit = $('#chatQuit');
    this.$btnChatQuit = $('#btnChatQuit');
    //修改联系人备注
    this.$editContactTitle = $('#editContactTitle');

    this.$chatGroupNickName = $('#chatGroupNickName');
    this.$chatGroupNickNameText = $('#chatGroupNickNameText');
    this.$chatGroupNickNameInput = $('#chatGroupNickNameInput');
    this.$chatGroupNickNameEditor = $('#chatGroupNickNameEditor');

    this.$btnChatInfo.on('click', this.toggleChatInfo.bind(this));
}
chatInfo.prototype.getRight = function(){
    var right = {
        canAddChatMembers: false,
        canRemoveChatMembers: false,
        canFavorite: false,
        canEditGroupNickName: false,
        canEditContactTitle: false,
        canQuit: false
    }

    if(currentUser.currentSession.type == 'p2p'){
        right.canAddChatMembers = true;
        right.canRemoveChatMembers = false;
        right.canEditContactTitle = true;
        right.canQuit = true;
    }
    else if(currentUser.currentSession.type == 'group'){
        var sessionMember = currentUser.currentSession.members.getMember(currentUser.id);
        if(!sessionMember.isDelete && (sessionMember.role == 'master' || sessionMember.role == 'admin')){
            right.canAddChatMembers = true;
            right.canRemoveChatMembers = true;
        }
        else if(!sessionMember.isDelete && sessionMember.role == 'user'){
            right.canAddChatMembers = true;
        }
        right.canFavorite = true;
        if(!right.isDelete) {
            right.canEditGroupNickName = true;
            right.canQuit = true;
        }
    }
    return right;
}
chatInfo.prototype.show = function(){
    var that = this;
    this.$btnChatInfo.addClass('on');
    var right = this.getRight();
    if(right.canAddChatMembers)
        this.$addChatMembers.removeClass('hide').on('click', this.addChatMembers.bind(this));
    if(right.canRemoveChatMembers)
        this.$removeChatMembers.removeClass('hide').on('click', this.toggleRemoveChatMember.bind(this));
    if(right.canFavorite) {
        this.$chatFavorite.removeClass('hide');
        var userSession = currentUser.userSessions.get(currentUser.currentSession.id);
        if(!userSession || userSession.isDelete)
            this.$btnChatFavorite.addClass('off').removeClass('on');
        else
            this.$btnChatFavorite.removeClass('off').addClass('on');
        this.$btnChatFavorite.on('click', this.toggleFavorite.bind(this));
    }
    //修改联系人备注
    if(right.canEditContactTitle){
        var user = currentUser.currentSession.members.getP2POtherSideMember(currentUser.id).user;
        var contact = currentUser.contacts.get(user.id);
        var userConversation = currentUser.userConversations.get('p2p', user.id);
        var title = contact ? contact.title : userConversation.name;
        this.$editContactTitle.removeClass('hide');
        this.$editContactTitle.find('span.text').removeClass('hide').text(title);
        this.$editContactTitle.find('button.editor').removeClass('hide').on('click', this.editChatInfo.bind(that, this.$editContactTitle, this.editContactTitle));
    }
    if(right.canEditGroupNickName){
        //this.$chatGroupNickName.removeClass('hide');
        //var currentMember = currentSession.members.get(currentUser.id);
        //var name = !currentMember.name || $.trim(currentMember.name) === '' ? currentUser.name : currentMember.name;
        //this.$chatGroupNickNameText.removeClass('hide').text(name);
        //this.$chatGroupNickNameInput.addClass('hide').val('');
    }
    var quitText;
    if(currentUser.currentSession.type == 'p2p')
        quitText = '删除该联系人';
    else if(currentUser.currentSession.type == 'group')
        quitText = '退出该会话/群';

    if(right.canQuit){
        this.$chatQuit.removeClass('hide');
        this.$btnChatQuit.text(quitText).removeClass('hide').on('click', function(){
            that.quit();
        });
    }

    var members = currentUser.currentSession.members.getMembers();
    for(var i = 0; i < members.length; i++){
        if(members[i].user.id != currentUser.id) {
            var $dom = this.buildChatMemberUI(members[i]);
            this.$chatMembersUI.push($dom);
            this.$chatMembers.append($dom[0]);
        }
    }
    this.$chatInfoPanel.removeClass('hide');
    this.visible = true;
}
chatInfo.prototype.hide = function(){
    this.$btnChatInfo.removeClass('on');
    this.$chatInfoPanel.addClass('hide');
    this.$addChatMembers.addClass('hide').off('click');
    this.$removeChatMembers.addClass('hide').off('click');
    for(var i = 0; i < this.$chatMembersUI.length; i++){
        this.$chatMembersUI[i].remove();
    }
    this.$chatMembersUI.splice(0);
    this.$chatFavorite.addClass('hide');
    this.$btnChatFavorite.addClass('off').off('click');
    this.$chatGroupNickName.addClass('hide');
    this.$chatGroupNickNameText.removeClass('hide').text('');
    this.$chatGroupNickNameInput.addClass('hide').val('');
    this.$chatQuit.addClass('hide');
    this.$btnChatQuit.addClass('hide').text('').off('click');

    this.$editContactTitle.addClass('hide');
    this.$editContactTitle.find('input').addClass('hide').val('');
    this.$editContactTitle.find('button.editor').addClass('hide').off('click');
    this.$editContactTitle.find('button.ok').addClass('hide').off('click');
    this.$editContactTitle.find('button.cancel').addClass('hide').off('click');

    this.visible = false;
    this.removable = false;
}
chatInfo.prototype.toggleChatInfo = function(){
    if(this.visible)
        this.hide();
    else
        this.show();
}
chatInfo.prototype.buildChatMemberUI = function(member){
    var name, avatarUrl;
    if(member.sessionMembers.session.type == 'p2p'){
        var contact = member.sessionMembers.session.sessions.user.contacts.get(member.userId);
        if(contact) {
            name = contact.getName();
            avatarUrl = contact.getAvatarUrl();
        }
        else{
            var user = Users.getInstance().get(member.userId);
            name = user.name;
            avatarUrl = user.getAvatarUrl();
        }
    }
    else{
        name = member.name;
        avatarUrl = member.getAvatarUrl();
    }
    var html = '<div class="chat-member" userId="' + member.userId + '"><span class="remove hide"></span><span class="avatar avatar-chat-member';
    if(avatarUrl && avatarUrl!= ''){
        html += '"><img src="' + avatarUrl + '"/>';
    }
    else{
        var id = member.user.id.toString();
        var index = id.substr(id.length - 1);
        html += ' avatar-random-bg-' + index % avatarRandomBGColorCount + '"><img src="' + defaultContactImageUrl + '"/>';
    }
    html += '</span><span class="name">' + name + '</span></div>';
    var $dom = $(html);
    return $dom;
}
/**
 * 创建新群组会话（p2p->group）
 * @param obj
 */
chatInfo.prototype.gotoNewUserConversation = function(obj){
    //1.创建Session
    var type = 'group';
    var name = currentUser.name;
    for (var i = 0; i < obj.selected.length; i++) {
        name += ', ' + obj.selected[i].name;
    }
    var secureType = 'private';
    var avatarUrl = ' ';
    currentUser.sessions.remote.add(type, name, secureType, avatarUrl, function (err, session) {
        if (err) {
            console.error(err);
            return;
        }
        //2.添加SessionMember
        var list = [];
        list.push(currentUser);
        for(var i = 0; i < obj.selected.length; i++){
            list.push(obj.selected[i]);
        }
        async.mapSeries(list, function (user, cb) {
            if(user.id == currentUser.id)
                session.members.remote.add(user.id, user.name, 'master', user.avatarUrl, 'active', cb);
            else
                session.members.remote.add(user.id, user.name, 'user', user.avatarUrl, 'active', cb);

        }, function (err) {
            if (err) {
                console.error(err);
                return;
            }
            //3.重新获取Session
            currentUser.sessions.get(session.id, session.type, function(err, session){
                if(err){
                    console.error(err);
                    return;
                }
                //4.发送通知
                var imSession = currentUser.y2wIMBridge.transToIMSession(session);
                var syncs = [{ type: currentUser.y2wIMBridge.syncTypes.userConversation }];
                currentUser.y2wIMBridge.sendMessage(imSession, syncs);
                //5.同步UserConversation
                currentUser.userConversations.remote.sync(function (err) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    //刷新会话
                    if(y2w.tab.curTabType == y2w.tab.tabType.userConversation)
                        y2w.tab.userConversationPanel.render();

                    //打开会话
                    y2w.openChatBox(session.id, 'group');
                })
            })
        })
    })
}
chatInfo.prototype.gotoUserConversation = function(id, type){
    y2w.openChatBox(id, type);
}
chatInfo.prototype.removeUserSession = function(id, cb){
    cb = cb || nop;
    var userSession = currentUser.userSessions.get(id);
    if(!userSession)
        cb();
    else{
        currentUser.userSessions.remote.remove(userSession.id, function(err){
            if(err){
                cb(err);
                return;
            }
            currentUser.userSessions.remote.sync(function(err){
                if(err){
                    cb(err);
                    return;
                }
                cb();
            })
        });
    }
}

/**
 * 添加群组会话成员
 * @param obj
 */
chatInfo.prototype.gotoAddChatMembers = function(obj){
    //1.添加SessionMember
    async.map(obj.selected, function (user, cb) {
        currentUser.currentSession.members.remote.add(user.id, user.name, 'user', user.avatarUrl, 'active', cb);
    }, function (err) {
        if (err) {
            console.error(err);
            return;
        }
        //2.同步Session
        var targetId = currentUser.currentSession.sessions.getTargetId(currentUser.currentSession.id, currentUser.currentSession.type);
        currentUser.currentSession.sessions.remote.sync(targetId, currentUser.currentSession.type, function(err){
            if(err){
                console.error(err);
                return;
            }
            //3.发送通知
            var imSession = currentUser.y2wIMBridge.transToIMSession(currentUser.currentSession);
            var syncs = [
                {type: currentUser.y2wIMBridge.syncTypes.userConversation},
                {type: currentUser.y2wIMBridge.syncTypes.message, sessionId: imSession.id}
            ]
            currentUser.y2wIMBridge.sendMessage(imSession, syncs);
            //4.同步UserConversation
            currentUser.userConversations.remote.sync(function (err) {
                if (err) {
                    console.error(err);
                    return;
                }

                if (y2w.tab.curTabType == y2w.tab.tabType.userConversation)
                    y2w.tab.userConversationPanel.render();
                //5.同步界面消息
                var userConversation = currentUser.userConversations.get(currentUser.currentSession.type, currentUser.currentSession.id);
                y2w.syncMessages(userConversation);
                //修改会话标题
                y2w.$chatTitle.find('#chatName').text(currentUser.currentSession.name);
                //刷新会话
                if (y2w.tab.curTabType == y2w.tab.tabType.userConversation)
                    y2w.tab.userConversationPanel.render();
            })
        })
    })
}
/**
 * 邀请加入群聊 
 * @param obj
 */
chatInfo.prototype.addgroup_Members = function (scene,obj,mode) {
    var y2wVideo = new RTCManager();
    y2wVideo.createVideo(currentUser.id, currentUser.imToken, function (error, channelId) {
        if (error) {
            return;
        }
        var receiverIds=[];
        if (scene === 'p2p') {
            receiverIds[receiverIds.length] = obj;
        }else{
            for (var i = 0; i < obj.selected.length; i++) {
                receiverIds[receiverIds.length] = obj.selected[i].id;
            }
        }
        //发送通知
        y2w.sendVideoMessage(scene, receiverIds, mode, channelId);
        window.open("../web/videoAudio.html?userid=" + currentUser.id + "&channelId=" + channelId + "&type=" + mode, "_blank");
    });
}

chatInfo.prototype.addChatMembers = function(){
    this.toggleChatInfo();
    var that = this;
    var selected = {},
        hidden = {},
        selectorConf = {};
    if(currentUser.currentSession.type == 'p2p') {
        var members = currentUser.currentSession.members.getMembers();
        for (var i = 0; i < members.length; i++) {
            if (members[i].user.id != currentUser.id) {
                selected[members[i].user.id] = true;
            }
        }
        hidden[currentUser.id] = true;
        selectorConf = {
            title: '发起聊天',
            tabs: [
                {
                    type: y2w.selector.tabType.contact,
                    selection: y2w.selector.selection.multiple,
                    hidden: hidden,
                    selected: selected
                },
                {
                    type: y2w.selector.tabType.group,
                    selection: y2w.selector.selection.single
                }
            ],
            onSelected: function (obj) {
                if (obj.type == y2w.selector.tabType.contact) {
                    if (obj.selected.length > 1)
                        that.gotoNewUserConversation(obj);
                    else
                        that.gotoUserConversation(obj.selected[0].id, 'p2p');
                }
                else if (obj.type == y2w.selector.tabType.group) {
                    that.gotoUserConversation(obj.selected[0], 'group');
                }
            }
        }
    }
    else if(currentUser.currentSession.type == 'group'){
        var members = currentUser.currentSession.members.getMembers();
        for (var i = 0; i < members.length; i++) {
            if (members[i].user.id != currentUser.id) {
                hidden[members[i].user.id] = true;
            }
        }
        selectorConf = {
            title: '添加会话成员',
            tabs: [
                {
                    type: y2w.selector.tabType.contact,
                    selection: y2w.selector.selection.multiple,
                    hidden: hidden,
                    selected: selected
                }
            ],
            onSelected: function (obj) {
                that.gotoAddChatMembers(obj);
            }
        }
    }
    y2w.selector.show(selectorConf);
}
chatInfo.prototype.callGroupMembers = function (scene, mode,userid) {
    var that = this;
    if (scene === 'p2p') {
        that.addgroup_Members(scene, userid, mode);
    }else{
    var selected = {},
        hidden = {},
        selectorConf = {};
    //var members = currentUser.currentSession.members.session.members.getMembers();
    //var mycontacts = currentUser.currentSession.members.getMembers();
    //for (var i = 0; i < members.length; i++) {
    //    if (members[i].user.id != currentUser.id) {
    //            hidden[members[i].user.id] = true;
    //    }
    //}
    hidden[currentUser.id] = true;
    selectorConf = {
        title: '添加群聊成员',
        tabs: [
            {
                type: y2w.selector.tabType.groupmembers,
                selection: y2w.selector.selection.multiple,
                hidden: hidden,
                selected: selected
            }
        ],
        onSelected: function (obj) {
            that.addgroup_Members(scene,obj, mode);
        }
    }
    y2w.selector.show(selectorConf);
    }
}
chatInfo.prototype.gotoRemoveChatMembers = function(userId){
    //var that = this;
    var member = currentUser.currentSession.members.getMember(userId);
    var imSession = currentUser.y2wIMBridge.transToIMSession(currentUser.currentSession);
    //1.删除群成员
    currentUser.currentSession.members.remote.remove(member.id, function(err) {
        if (err) {
            console.error(err);
            return;
        }
        //2.同步Session
        var targetId = currentUser.currentSession.sessions.getTargetId(currentUser.currentSession.id, currentUser.currentSession.type);
        currentUser.currentSession.sessions.remote.sync(targetId, currentUser.currentSession.type, function(err){
            if(err){
                console.error(err);
                return;
            }
            //3.发送通知
            var syncs = [
                {type: currentUser.y2wIMBridge.syncTypes.userConversation},
                {type: currentUser.y2wIMBridge.syncTypes.message, sessionId: imSession.id}
            ]
            currentUser.y2wIMBridge.sendMessage(imSession, syncs);
            //4.同步用户会话
            currentUser.userConversations.remote.sync(function (err) {
                if (err) {
                    console.error(err);
                    return;
                }
                //5.同步界面消息
                var userConversation = currentUser.userConversations.get(currentUser.currentSession.type, currentUser.currentSession.id);
                y2w.syncMessages(userConversation);
                //修改会话标题
                y2w.$chatTitle.find('#chatName').text(currentUser.currentSession.name);
                //刷新会话
                if (y2w.tab.curTabType == y2w.tab.tabType.userConversation)
                    y2w.tab.userConversationPanel.render();
            })
        });
    })
}
chatInfo.prototype.toggleRemoveChatMember = function(){
    var that = this;
    if(this.removable){
        for(var i = 0; i < this.$chatMembersUI.length; i++){
            var $dom = this.$chatMembersUI[i];
            var userId = $dom.attr('data');
            if(userId != currentUser.id){
                $dom.find('.remove').off('click').addClass('hide');
            }
        }
        this.removable = false;
    }
    else{
        for(var i = 0; i < this.$chatMembersUI.length; i++){
            var $dom = this.$chatMembersUI[i];
            var userId = $dom.attr('userId');
            if(userId != currentUser.id){
                $dom.find('.remove').off('click').removeClass('hide').on('click', function(){
                    that.gotoRemoveChatMembers($(this).parent().attr('userId'));
                    that.toggleChatInfo();
                })
            }
        }
        this.removable = true;
    }
}
chatInfo.prototype.toggleFavorite = function(){
    var that = this;
    var userSession = currentUser.userSessions.get(currentUser.currentSession.id);
    if(!userSession || userSession.isDelete){
        //收藏
        currentUser.userSessions.remote.add(currentUser.currentSession.id, currentUser.currentSession.name, currentUser.currentSession.avatarUrl, function(err){
            if(err){
                console.error(err);
                return;
            }
            currentUser.userSessions.remote.sync(function(err) {
                if (err) {
                    console.error(err);
                    return;
                }
                if(y2w.tab.curTabType == y2w.tab.tabType.group)
                    y2w.tab.groupPanel.render();
                that.$btnChatFavorite.removeClass('off').addClass('on');
            });
        })
    }
    else{
        //取消收藏
        currentUser.userSessions.remote.remove(userSession.id, function(err){
            if(err){
                console.error(err);
                return;
            }
            currentUser.userSessions.remote.sync(function(err) {
                if (err) {
                    console.error(err);
                    return;
                }
                if(y2w.tab.curTabType == y2w.tab.tabType.group)
                    y2w.tab.groupPanel.render();
                that.$btnChatFavorite.addClass('off').removeClass('on');
            });
        })
    }
}
chatInfo.prototype.quit = function(){
    if(currentUser.currentSession.type == 'p2p'){
        if (!confirm('确认删除该联系人?'))
            return;
        this.gotoRemoveContact(this);
    }
    else if(currentUser.currentSession.type == 'group') {
        if (!confirm('确认退出该会话/群?'))
            return;
        this.gotoQuitGroup(this);
    }
}
chatInfo.prototype.removeContact = function(contact, cb){
    if (!contact) {
        cb();
        return;
    }
    currentUser.contacts.remote.remove(contact.id, function (err) {
        if (err) {
            cb(err);
            return;
        }
        currentUser.contacts.remote.sync(function (err) {
            if (err) {
                cb(err);
                return;
            }

            if(y2w.tab.curTabType == y2w.tab.tabType.contact)
                y2w.tab.contactPanel.render();

            cb();
        });
    })
}
chatInfo.prototype.removeUserConversation = function(userConversation, cb){
    if (!userConversation){
        cb();
        return;
    }
    currentUser.userConversations.remote.remove(userConversation.id, function(err){
        if(err){
            cb(err);
            return;
        }

        currentUser.userConversations.remote.sync(function(err){
            if(err){
                cb(err);
                return;
            }
            if(y2w.tab.curTabType == y2w.tab.tabType.userConversation)
                y2w.tab.userConversationPanel.render();

            cb();
        });
    })
}
chatInfo.prototype.gotoRemoveContact = function(){
    var that = this;
    var userId = currentUser.currentSession.members.getP2POtherSideMember(currentUser.id).user.id;
    var contact = currentUser.contacts.get(userId);
    //1.删除并同步联系人
    this.removeContact(contact, function(err){
        if(err){
            console.error(err);
            return;
        }
        //2.删除并同步userConversation
        var userConversation = currentUser.userConversations.get('p2p', userId);
        that.removeUserConversation(userConversation, function(err){
            if(err){
                console.error(err);
                return;
            }
            //清除本地数据
            currentUser.sessions.remove(currentUser.currentSession);
            currentUser.currentSession = null;
            y2w.$rightPanel.find('.chat-box').addClass('hide');
        })
    })
}
/**
 * 退群
 * @param that
 */
chatInfo.prototype.gotoQuitGroup = function(){
    var that = this;
    var member = currentUser.currentSession.members.getMember(currentUser.id);
    var imSession = currentUser.y2wIMBridge.transToIMSession(currentUser.currentSession);
    //1.SessionMember中删除自己
    currentUser.currentSession.members.remote.remove(member.id, function(err) {
        if (err) {
            console.error(err);
            return;
        }
        //2.发送通知
        var syncs = [
            {type: currentUser.y2wIMBridge.syncTypes.userConversation},
            {type: currentUser.y2wIMBridge.syncTypes.message, sessionId: imSession.id}
        ]
        currentUser.y2wIMBridge.sendMessage(imSession, syncs);
        //3.删除userSession
        that.removeUserSession(currentUser.currentSession.id, function(err){
            if(err){
                console.error(err);
                return;
            }
            if(y2w.tab.curTabType == y2w.tab.tabType.group)
                y2w.tab.groupPanel.render();
            //4.删除并同步userConversation
            var userConversation = currentUser.userConversations.get(currentUser.currentSession.type, currentUser.currentSession.id);
            currentUser.userConversations.remote.remove(userConversation.id, function(err){
                if(err){
                    console.error(err);
                    return;
                }
                currentUser.userConversations.remote.sync(function(err) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    if (y2w.tab.curTabType == y2w.tab.tabType.userConversation)
                        y2w.tab.userConversationPanel.render();

                    //5.清除currentSession,并关闭聊天框
                    currentUser.sessions.remove(currentUser.currentSession);
                    currentUser.currentSession = null;
                    y2w.$rightPanel.find('.chat-box').addClass('hide');
                })
            })
        })
    })
}
chatInfo.prototype.editContactTitle = function(that, status, value){
    if(status == 'ok' && that.$editContactTitle.find('span.text').text() != value){
        var user = currentUser.currentSession.members.getP2POtherSideMember(currentUser.id).user;
        var contact = currentUser.contacts.get(user.id);
        contact.title = value;
        //保存联系人
        currentUser.contacts.remote.store(contact, function(err){
            if(err){
                console.error(err);
                return;
            }
            //同步联系人
            currentUser.contacts.remote.sync(function(err){
                if(err){
                    console.error(err);
                    return;
                }
                //保存用户会话
                var userConversation = currentUser.userConversations.get('p2p', user.id);
                userConversation.name = value;
                currentUser.userConversations.remote.store(userConversation, function(err){
                    if(err){
                        console.error(err);
                        return;
                    }
                    //同步用户会话
                    currentUser.userConversations.remote.sync(function(err){
                        if(err){
                            cb(err);
                            return;
                        }

                        that.$editContactTitle.find('span.text').text(contact.title);
                        that.$chatMembers.find('[userId=' + user.id + '].chat-member .name').text(contact.title);
                        y2w.$chatName.text(contact.title);

                        if(y2w.tab.curTabType == y2w.tab.tabType.userConversation)
                            y2w.tab.userConversationPanel.render();
                        else if(y2w.tab.curTabType == y2w.tab.tabType.contact)
                            y2w.tab.contactPanel.render();

                        //发送通知给自己的其它设备
                        //currentUser.sessions.get(currentUser.id, 'single', function(err, session){
                        //    if(err){
                        //        console.error(err);
                        //        return;
                        //    }
                        //    currentUser.y2wIMBridge.editContact(session);
                        //})
                    });
                });
            });
        })
    }
}
chatInfo.prototype.editChatInfo = function($li, cb){
    var that = this;
    var $text = $li.find('span.text');
    var $input = $li.find('input');
    var $editor = $li.find('button.editor');
    var $ok = $li.find('button.ok');
    var $cancel = $li.find('button.cancel');
    $text.addClass('hide');
    $input.val($text.text()).removeClass('hide');
    $editor.addClass('hide');
    $ok.removeClass('hide').off('click').on('click', function(){
        var value = $input.val();
        $input.val('').addClass('hide');
        $text.removeClass('hide');
        $editor.removeClass('hide');
        $ok.addClass('hide');
        $cancel.addClass('hide');
        cb(that, 'ok', value);
    });
    $cancel.removeClass('hide').off('click').on('click', function(){
        $input.val('').addClass('hide');
        $text.removeClass('hide');
        $editor.removeClass('hide');
        $ok.addClass('hide');
        $cancel.addClass('hide');
        cb(that, 'cancel');
    });
}