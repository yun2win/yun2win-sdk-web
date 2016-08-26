/**
 * 主要业务逻辑相关
 */

var currentUser = Users.getInstance().getCurrentUser();
var y2w = {
    init: function () {
        var that = this;
        this.initNode();
        this.chatInfo = new chatInfo();
        this.selector = new selector();
        this.userInfo = new userInfo();
        this.maper = new maper();
        this.emojier = new emojier();
        this.addEvent();
        this.tab = new tab();
        this.chooseAvatar = new chooseAvatar();
        //显示自己
        this.showMe();
        //显示用户会话
        this.tab.userConversationPanel.render();
        this.chat = new chat();
        this.chat.contextmenu(this.$chatContent);

        //同步用户会话，联系人与群
        setTimeout(function(){
            async.series([
                    function(cb) {
                        that.syncUserConversations(cb);
                    },
                    function(cb) {
                        that.syncContacts(cb);
                    },
                    function(cb) {
                        that.syncUserSessions(cb);
                    },
                    function(cb) {
                        that.syncEmojis(cb);
                    }],
                function(err, results) {
                    if(err){
                        console.error(err);
                        return;
                    }
                    that.autoOpenChatBox();
                });
        }, 0);

        //连接推送服务
        currentUser.y2wIMInit();
    },
    initNode: function () {
        this.$logout = $('#j-logout');
        this.$myAvatar = $('#myAvatar');
        this.$userName = $('#j-userName');

        this.$rightPanel = $('#rightPanel');
        this.$chatTitle = $('#chatTitle');
        this.$chatName = $('#chatName');
        this.$chatEditor = $('#j-chatEditor');
        this.$chatContentWrap = $('#j-chatContentWrap');
        this.$chatContent = $('#j-chatContent');
        this.$sendBtn = $('#j-sendBtn');
        this.$messageText = $('#j-messageText');
        this.$logoutDialog = $('#j-logoutDialog');
        this.$closeDialog = $('#j-closeDialog');
        this.$cancelBtn = $('#j-cancelBtn');
        this.$okBtn = $('#j-okBtn');
        this.$mask = $('#mask');
        //添加好友
        this.$addFriend = $('#addFriend');
        this.$addFriendBox = $('#addFriendBox');
        //个人信息
        this.$myInfo = $("#myInfo");
        //修改头像
        this.$chooseAvatar = $("#chooseAvatar");
        //用户信息
        this.$personCard = $('#personCard');
        this.$teamInfo = $('#j-teamInfo');
        this.$chooseFileBtn = $('#j-msgType');
        this.$openEmojiBtn = $('#j-emoji');
        this.$fileInput = $('#j-uploadFile');
        this.$cloudMsgContainer = $('#j-cloudMsgContainer');
        this.$devices = $("#j-devices");        
    },
    addEvent: function () {

        this.$chatContent.delegate('.j-img','click',this.showInfoInChat);
        this.$logout.on('click', this.showDialog.bind(this));
        this.$closeDialog.on('click', this.hideDialog.bind(this));
        this.$cancelBtn.on('click', this.hideDialog.bind(this));
        this.$okBtn.on('click', this.logout.bind(this));
        this.$sendBtn.on('click', this.sendTextMessage.bind(this));
        this.$messageText.on('keydown', this.inputMessage);
        this.$chooseFileBtn.on('click', 'a', this.chooseFile.bind(this)); 
        this.$openEmojiBtn.on('click', 'a', this.openEmoji.bind(this));
        this.$fileInput.on('change', this.sendFileMessage.bind(this));

        this.$addFriend.on('click',this.showAddFriend.bind(this));
        this.$addFriendBox.delegate('.close, .j-close', 'click', this.hideAddFriend.bind(this));
        this.$addFriendBox.delegate('.j-search','click',this.searchFriend.bind(this));
        this.$addFriendBox.delegate('.j-back','click',this.resetSearchFriend.bind(this));
        this.$addFriendBox.delegate('.j-add','click',this.addFriend.bind(this));
        this.$addFriendBox.delegate('.j-chat','click',this.beginChat.bind(this));
        this.$addFriendBox.delegate('.j-account','keydown',this.inputAddFriend.bind(this)); 

        this.$personCard.delegate('.close', 'click', this.hideInfoBox.bind(this));
        this.$personCard.delegate('.j-saveAlias', 'click', this.addFriendAlias.bind(this));
        this.$personCard.delegate('.j-add', 'click', this.addFriendInBox.bind(this));
        this.$personCard.delegate('.j-del', 'click', this.removeFriend.bind(this));
        this.$personCard.delegate('.j-chat', 'click', this.doChat.bind(this));
        $("#headImg").on('click',this.showInfo2.bind(this));
        

        $("#j-chatContent").delegate('.j-mbox','click',this.playAudio);



        //我的信息
        this.$myAvatar.on('click',this.showMyInfo.bind(this));
        this.$myInfo.delegate('.close', 'click', this.hideMyInfoBox.bind(this));
        this.$myInfo.delegate('.operate .j-edit', 'click', this.showEditMyInfo.bind(this));
        this.$myInfo.delegate('.operate .j-editPassword', 'click', this.showEditPassword.bind(this));
        this.$myInfo.delegate('.operate .j-cancel', 'click', this.hideEditMyInfo.bind(this));
        this.$myInfo.delegate('.operate .j-save', 'click', this.saveEditMyInfo.bind(this));
        this.$myInfo.delegate('.operate .j-savePassword', 'click', this.saveEditPassword.bind(this));
        this.$myInfo.delegate('.j-modifyAvatar', 'click', this.showModifyAvatar.bind(this));

        $("#datepicker").datepicker({yearRange:"1900:2015"});



        //用户信息
        $("#j-chatContentWrap").on("click",this.showUserInfo.bind(this));
    },

    showUserInfo:function(e){
        var evt = e || window.event,
            target = evt.srcElement || evt.target;
        var doms=$(target).parents(".item-avatar");
        var account=doms.attr("data-account");
        //console.log(account);
        if(!account)
            return;

        this.userInfo.show(e,account);
    },


    //左栏上方自己的信息
    showMe:function(){
        this.$userName.text(currentUser.name);
        var avatarUrl = currentUser.getAvatarUrl();
        if(avatarUrl)
            this.$myAvatar.find('img').attr('src', avatarUrl);
        else {
            var id = currentUser.id.toString();
            var index = id.substr(id.length - 1);
            this.$myAvatar.addClass('avatar-random-bg-' + index % avatarRandomBGColorCount);
            this.$myAvatar.find('img').attr('src', 'images/contact_avatar.png');
        }
        this.$myAvatar.removeClass('hide');
    },
    showMyInfo:function(){

        var id = currentUser.id.toString();
        var index = id.substr(id.length - 1);
        var bgClass = 'avatar-random-bg-' + index % avatarRandomBGColorCount;
        var avatarUrl = currentUser.getAvatarUrl();
        if(avatarUrl && avatarUrl != '') {
            this.$myInfo.find(".u-icon").parent().removeClass(bgClass);
            this.$myInfo.find(".u-icon").attr('src', avatarUrl);
        }
        else{
            this.$myInfo.find(".u-icon").parent().addClass(bgClass);
            this.$myInfo.find(".u-icon").attr('src', defaultContactImageUrl);
        }

        this.$myInfo.find(".j-nick").text(currentUser.name);
        this.$myInfo.find(".j-nickname").text(currentUser.name);
        this.$myInfo.find(".j-username").text("帐号：" + currentUser.account);
        this.$myInfo.find(".j-birth").text(currentUser.birth ===undefined?"--":currentUser.birth||"--")
        this.$myInfo.find(".j-tel").text(currentUser.phone ===undefined?"--":currentUser.phone||"--")
        this.$myInfo.find(".j-email").text(currentUser.email ===undefined?"--":currentUser.email||"--")
        this.$myInfo.find(".j-sign").text(currentUser.sign ===undefined?"--":currentUser.sign||"--")
        this.$myInfo.removeClass('hide');
        this.$mask.removeClass('hide');
    },
    hideMyInfoBox:function(){
        this.$myInfo.addClass('hide');
        this.$myInfo.removeClass('edit');
        this.$mask.addClass('hide');
    },
    showEditPassword:function(){
        this.$myInfo.find(".e-psw").focus();
        this.$myInfo.addClass('editpassword');
        var ttd=this.$myInfo.find(".tt");
        this.$myInfo.attr("tt",ttd.text());
        ttd.text("更改密码");

    },
    showEditMyInfo:function(){
        this.$myInfo.find(".e-nick").val(currentUser.name);
        if(currentUser.phone !==undefined){
            this.$myInfo.find(".e-tel").val(currentUser.phone)
        }
        this.$myInfo.addClass('edit');
    },
    hideEditMyInfo:function(){
        var pname=this.$myInfo.attr("tt");
        if(pname)
            this.$myInfo.find(".tt").text(pname);
        this.$myInfo.removeClass('edit').removeClass('editpassword');
    },

    saveEditMyInfo:function(){
        var that = this;
        var $node = this.$myInfo;
        var nick = $node.find(".e-nick").val().trim();
        if(!nick){
            alert("昵称不能为空");
            return;
        }
        //var gender = $node.find(".e-gender").val();
        //var birth = $node.find(".e-birth").val().trim();
        var tel = $node.find(".e-tel").val().trim();
        //var email = $node.find(".e-email").val().trim();
        //if(email&&!/^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+(.[a-zA-Z0-9_-])+/.test(email)){
        //     alert("email格式不正确");
        //    return;
        //}
        //var sign  = $node.find(".e-sign").val().trim();
        //this.mysdk.updateMyInfo(nick,gender,birth,tel,email,sign,this.cbSaveMyInfo.bind(this));
        currentUser.name = nick;
        currentUser.phone = tel;
        currentUser.remote.store(that.cbSaveMyInfo.bind(that));
    },
    saveEditPassword:function(){
        var that = this;
        var $node = this.$myInfo;
        var psw = $node.find(".e-psw").val().trim();
        var npsw = $node.find(".e-npsw").val().trim();
        var rnpsw = $node.find(".e-rnpsw").val().trim();
        if(!psw){
            alert("原密码不能为空");
            return;
        }
        if(!npsw){
            alert("新密码不能为空");
            return;
        }
        if(rnpsw!=npsw){
            alert("两次输入的新密码不一致");
            return;
        }
        if(npsw.length<6){
            alert("新密码必须6位");
            return;
        }


        currentUser.remote.setPassword(psw,npsw,function(err){
            if(err){
                alert(err);
            }
            else{
                that.showMe();
                that.$myInfo.removeClass("edit").removeClass("editpassword");
                that.showMyInfo();
                alert("密码更改成功!")
            }
        });
    },

    cbSaveMyInfo:function(err,data){
        if(err){
            alert(err);
        }else{
            this.showMe();
            this.$myInfo.removeClass("edit");
            this.showMyInfo();

        }
    },
    //修改头像相关
    showModifyAvatar:function(){
        var that = this;
        this.$myInfo.addClass("hide");
        this.chooseAvatar.show({
            onCancel: that.hideModifyAvatar.bind(this),
            onChange: that.finishModifyAvatar.bind(this)
        });
    },
    hideModifyAvatar:function(){
        this.$myInfo.removeClass("hide");
    },
    finishModifyAvatar: function(){
        this.$myInfo.removeClass("hide");
        this.$myInfo.find('.j-modifyAvatar').attr('src', currentUser.getAvatarUrl());
        this.$myAvatar.find('img').attr('src', currentUser.getAvatarUrl());
    },
    /**
     * 多端登录管理
     * @param  {object} devices 设备
     * @return {void}       
     */
    loginPorts:function(devices){
        var pc,mobile;
        for (var i = devices.length - 1; i >= 0; i--) {
            if(/iOS|Android|WindowsPhone/i.test(devices[i].type)){
                mobile=devices[i];
            }else if(/PC/i.test(devices[i].type)){
                pc = devices[i];
            }
        };
        if((pc&&pc.online)||(mobile&&mobile.online)){
            if((pc&&pc.online)&&(mobile&&mobile.online)){
                $(".m-devices").html("正在使用云信手机版，电脑版")
                $("#j-devices .pc").removeClass("hide");
                $("#j-devices .mobile").removeClass("hide");
                this.mysdk.mobileDeviceId = mobile.deviceId;
                this.mysdk.pcDeviceId = pc.deviceId;
            }else if(pc&&pc.online){
                $(".m-devices").html("正在使用云信电脑版")
                $("#j-devices .pc").removeClass("hide");
                $("#j-devices .mobile").addClass("hide");
                this.mysdk.mobileDeviceId = false;
                this.mysdk.pcDeviceId = pc.deviceId;
            }else{
                $(".m-devices").html("正在使用云信手机版")
                $("#j-devices .mobile").removeClass("hide");
                $("#j-devices .pc").addClass("hide");
                this.mysdk.mobileDeviceId = mobile.deviceId;
                this.mysdk.pcDeviceId = false;
            }
            $(".m-devices").removeClass("hide");
            $(".friends").height(463);
        }else{
            $(".m-devices").addClass("hide");
            $("#j-devices").addClass("hide");
            $("#j-devices .pc").addClass("hide");
            $("#j-devices .mobile").addClass("hide");
            this.mysdk.mobileDeviceId = false;
            this.mysdk.pcDeviceId = false;
            $(".friends").height(504);
        }
    },

    /**
     * 添加好友窗口
     */
    showAddFriend:function(){
        this.friendData = null;
        this.$addFriendBox.removeClass("hide");
        this.$mask.removeClass('hide');
        this.$addFriendBox.find(".j-account").focus();
    },
    hideAddFriend:function(){
        this.resetSearchFriend();
        this.$addFriendBox.addClass("hide");
        this.$mask.addClass('hide');
    },
    searchFriend:function(){
        var account =  $.trim(this.$addFriendBox.find(".j-account").val().toLowerCase());
        if(account!==""){
            Users.getInstance().remote.search(account, currentUser.token, this.cbGetUserInfo.bind(this));
        }
    },
    beginChat:function(){
        var account = $.trim(this.$addFriendBox.find(".j-account").val().toLowerCase());
        this.hideAddFriend();
        this.openChatBox(account,"p2p");
    },
    resetSearchFriend:function(){
        this.$addFriendBox.attr('class',"m-dialog");
        this.$addFriendBox.find(".j-account").val("");
    },
    addFriend:function(){
        var that = this;
        var userId = $.trim(this.$addFriendBox.find(".j-uid").text());
        var name = $.trim(this.$addFriendBox.find(".j-nickname").text());
        //添加联系人
        currentUser.contacts.remote.add(userId, name, function(err){
            if(err){
                console.error(err);
                return;
            }
            //获取session
            currentUser.sessions.get(userId, 'p2p', function(err, session){
                if(err){
                    console.error(err);
                    return;
                }
                var imSession = currentUser.y2wIMBridge.transToIMSession(session);
                //发送通知
                var syncs = [
                    {type: currentUser.y2wIMBridge.syncTypes.userConversation},
                    {type: currentUser.y2wIMBridge.syncTypes.contact},
                    {type: currentUser.y2wIMBridge.syncTypes.message, sessionId: imSession.id}
                ]
                currentUser.y2wIMBridge.sendMessage(imSession, syncs);
                //同步UserConversation
                currentUser.userConversations.remote.sync(function(err){
                    if(err){
                        console.error(err);
                        return;
                    }
                    //同步Contact
                    currentUser.contacts.remote.sync(function(err){
                        if(err){
                            console.error(err);
                            return;
                        }
                        that.cbAddFriend();
                        y2w.tab.contactPanel.render();

                    })
                })
            })
        })
        //currentUser.contacts.remote.add(userId, name, this.cbAddFriend.bind(this))
        //this.mysdk.addFriend(id,this.cbAddFriend.bind(this));
    },
    inputAddFriend:function(evt){
        if(evt.keyCode==13){
            $("#addFriendBox .j-account").blur();
            this.searchFriend();
        }
    },
    cbAddFriend:function(error) {
        if(!error){
            var userId = $.trim(this.$addFriendBox.find(".j-uid").text());
            this.$addFriendBox.find(".tip").html("添加好友成功！");
            this.$addFriendBox.attr('class',"m-dialog done");
            this.hideAddFriend();
            this.openChatBox(userId, 'p2p');
        }else{
            this.$addFriendBox.find(".tip").html("该帐号不存在，请检查你输入的帐号是否正确");
            this.$addFriendBox.attr('class',"m-dialog done");          
        }
        
    },
    cbGetUserInfo:function(err,data){
        if(err){
            alert(err);
        }
        if(!!data){
            var $info = this.$addFriendBox.find(".info"),
                user = data;
            var avatarUrl = user.getAvatarUrl();
            $info.find(".avatar").attr('class', '').addClass('avatar avatar-add-contact');
            if(!avatarUrl || avatarUrl.length == 0){
                var index = user.id.substr(user.id.length - 1) % 5;
                avatarUrl = defaultContactImageUrl;
                $info.find(".avatar").addClass('avatar-random-bg-' + index);
                $info.find("img").attr("src", avatarUrl);
            }
            else{
                $info.find("img").attr("src", user.getAvatarUrl());
            }
            //$info.find("img").attr("src", user.getAvatarUrl());
            $info.find(".j-nickname").html(user.name);
            $info.find(".j-username").html(user.account ? "帐号："+ user.account : '');
            $info.find(".j-uid").html(user.id);
            if(user.id == currentUser.id){
                this.$addFriendBox.find(".tip").html("不能添加自己！");
                this.$addFriendBox.attr('class',"m-dialog done");   
            }else{
                var c=currentUser.contacts.get(user.id);
                var isFriend=!!c;
                if(c.isDelete)
                    isFriend=false;
                this.$addFriendBox.addClass(isFriend?"friend":"noFriend");
            }
            
        }else{
            this.$addFriendBox.find(".tip").html("该帐号不存在，请检查你输入的帐号是否正确");
            this.$addFriendBox.attr('class',"m-dialog done");      
        }
    },
    /**
     * 用户名片
     */
    showInfo:function(account,type){
        if(type=="p2p"){
            var user = y2w.cache.getUserById(account);
            this.showInfoBox(user); 
        }
        
    },

    //从聊天面板点进去
    showInfo2:function(){
        if($('#j-chatEditor').data('type') =="p2p"){
            var account = $('#j-chatEditor').data('to');
            var user = y2w.cache.getUserById(account);
            this.showInfoBox(user); 
        }
    },

    showInfoBox:function(user){
        if(user.account === userUID){
            this.showMyInfo();
            return;
        }
        var isFriend = this.cache.isFriend(user.account);
        var inMutelist = this.cache.inMutelist(user.account);
        var inBlacklist = this.cache.inBlacklist(user.account);
        var $node = this.$personCard.data({account:user.account,inMutelist:inMutelist?true:false,inBlacklist:inBlacklist?true:false});
        $node.find(".u-icon").attr('src', getAvatar(user.avatar));
        $node.find(".j-nickname").text("昵称："+user.nick);
        $node.find(".j-nick").text(getNick(user.account));
        var avatarSrc ="";
        if(user.gender&&user.gender!=="unknown"){
            avatarSrc = 'images/'+user.gender+'.png'
        }else{
            $node.find(".j-gender").addClass("hide");
        }
        $node.find(".j-gender").attr('src',avatarSrc);
        $node.find(".j-username").text("帐号："+user.account);
        $node.find(".j-birth").text(user.birth ===undefined?"--":user.birth)
        $node.find(".j-tel").text(user.tel ===undefined?"--":user.tel)
        $node.find(".j-email").text(user.email ===undefined?"--":user.email)
        $node.find(".j-sign").text(user.sign ===undefined?"--":user.sign)
        if(inMutelist){
             $node.find(".mutelist>.u-switch").addClass('off');
        }
        if(!inBlacklist){
            $node.find(".blacklist>.u-switch").addClass('off');
        }else{
            $node.addClass('blacklist');
        }
        if(!isFriend){
            $node.addClass("notFriend");
        }else{
            var alias = this.cache.getFriendAlias(user.account);
            $node.find(".e-alias").val(alias);
        }
        $node.removeClass('hide');
        this.$mask.removeClass('hide');
    },
    showInfoInChat:function(account,type){
        var account = $(this).attr('data-account'),
            user = y2w.cache.getUserById(account);
        if(account==userUID){
            return;
        }
        y2w.showInfoBox(user);
    },
    hideInfoBox:function(){
        this.$personCard.addClass('hide');
        this.$mask.addClass('hide');
        this.$personCard.removeClass('notFriend');
        this.$personCard.removeClass('blacklist');
        this.$personCard.find(".mutelist .u-switch").removeClass('off');
        this.$personCard.find(".blacklist .u-switch").removeClass('off');
        
    },
    // 好友备注
    addFriendAlias:function(){
        var account = this.$personCard.data("account");
        var alias = this.$personCard.find(".e-alias").val().trim();
        this.mysdk.updateFriend(account,alias,this.cbAddFriendAlias.bind(this));
    },
    cbAddFriendAlias:function(err,data){
        if(!err){
            alert("修改备注成功");
            this.$personCard.find(".e-alias").val(data.alias);
            this.cache.updateFriendAlias(data.account,data.alias);
            this.$personCard.find(".j-nick").text(getNick(data.account));
            if ($('#j-chatEditor').data('to') === data.account) { 
                this.$chatName.text(getNick(data.account));
            }
        }else{
            alert("修改备注失败");
        }
    },
    addFriendInBox:function(){
        // if(this.$personCard.is(".blacklist")){
        //     return;
        // }
        var account = this.$personCard.data("account");
        this.mysdk.addFriend(account,this.cbAddFriendInBox.bind(this));
    },
    cbAddFriendInBox:function(error, params){
        if(!error){
           this.hideInfoBox();
           this.cache.addFriend(params.friend);
       }else{
            alert("添加好友失败")
       }
    },
    removeFriend:function(){
        if(window.confirm("确定要删除")){
            var account = this.$personCard.data("account");
            this.mysdk.deleteFriend(account,this.cbRemoveFriend.bind(this));
        }
        
    },
    cbRemoveFriend:function(error, params){
       if(!error){
           this.hideInfoBox();
           this.cache.removeFriend(params.account);
            if ($('#j-chatEditor').data('to') === params.account) { 
                this.$chatName.text(getNick(params.account));
            }   
       }else{
        alert("删除好友失败")
       }
    },
    doChat:function(){
        var account = this.$personCard.data("account");
        this.hideInfoBox();
        var $container;
        if(!this.$loadConversations.is('.hide')){
            $container = this.$loadConversations;
        }else if(!this.$loadContacts.is('.hide')){
            $container = this.$loadContacts;
        }else{
           this.openChatBox(account,"p2p");
           return;
        }
        var $li = $container.find(".m-panel li[data-account]="+account);
        if($li.length>0){
            $li.find(".count").addClass("hide");
            $li.find(".count").text(0);
        }
        
        this.openChatBox(account,"p2p");
    },


    chooseFile: function () {
       this.$fileInput.click();
    },
    openEmoji: function () {
       this.emojier.show();
    },
    syncUserConversations: function(cb){
        cb = cb || nop
        var that = this;
        currentUser.userConversations.remote.sync(function(err, count){
            if(err){
                cb(err);
                return;
            }
            if(count > 0 && that.tab.curTabType == that.tab.tabType.userConversation)
                that.tab.userConversationPanel.render();
            cb();
        });
    },
    syncMessages: function(userConversation, force, cb){
        force = force || false;
        cb = cb || nop;
        var that = this;
        userConversation.syncMessages(force, function(err, messages){
            if(err){
                cb(err);
                return;
            }
            currentUser.sessions.get(userConversation.targetId, userConversation.type, function(err, session) {
                if (err) {
                    cb(err);
                    return;
                }
                that.clearUnRead(currentUser.currentSession.getConversation());

                if(messages) {
                    //that.appendMsgs(messages);
                    that.updateMessages(messages);
                }

                //that.buildMsgs(session.messages.getMessages());
                cb();
            });
        })
    },
    /**
     *
     */
    syncUserSessions: function(cb){
        cb = cb || nop
        var that = this;
        currentUser.userSessions.remote.sync(function(err, count){
            if(err){
                cb(err);
                return;
            }
            if(count > 0 && that.tab.curTabType == that.tab.tabType.group)
                that.tab.groupPanel.render();
            cb();
        });
    },
    syncEmojis: function(cb){
        cb = cb || nop
        var that = this;
        currentUser.emojis.remote.sync(function(err, count){
            if(err){
                cb(err);
                return;
            }
            cb();
        });
    },
    //发送文字消息
    sendTextMessage: function () {
        var scene = this.$chatEditor.data('type'),
            to = this.$chatEditor.data('to'),
            text = this.$messageText.val().trim(),
            that = this;
        if (!!to && !!text) {
            if (text.length > 500 && text.length === 0) {
                alert('消息内容不能为空，且长度最大为500字符');
                return;
            }
            if (scene == 'group') {
                var sessionMember = currentUser.currentSession.members.getMember(currentUser.id);
                if (sessionMember.isDelete) {
                    alert('您已不在此群中，不能发送消息');
                    that.$messageText.val('').focus();
                    return;
                }
            }
            var options = {
                showMsg: that.showMsg.bind(that),
                storeMsgFailed: that.storeMsgFailed.bind(that),
                storeMsgDone: that.storeMsgDone.bind(that)
            }
            currentUser.y2wIMBridge.sendTextMessage(to, scene, text, options);
            this.$messageText.val('').focus();
            this.$chatContent.find('.no-msg').remove();
        }
    },
    sendSystemMessage:function(message){
        var scene = this.$chatEditor.data('type'),
            to = this.$chatEditor.data('to'),
            text = message,
            that = this;
        if (!!to && !!text) {
            if (text.length > 500 && text.length === 0) {
                alert('消息内容不能为空，且长度最大为500字符');
                return;
            }
            if (scene == 'group') {
                var sessionMember = currentUser.currentSession.members.getMember(currentUser.id);
                if (sessionMember.isDelete) {
                    alert('您已不在此群中，不能发送消息');
                    that.$messageText.val('').focus();
                    return;
                }
            }
            var options = {
                showMsg: that.showMsg.bind(that),
                storeMsgFailed: that.storeMsgFailed.bind(that),
                storeMsgDone: that.storeMsgDone.bind(that)
            };
            currentUser.y2wIMBridge.sendSystemMessage(to, scene, text, options);
            //this.$messageText.val('').focus();
            this.$chatContent.find('.no-msg').remove();
        }
    },
    //发送邀请加入音视频通知
    sendVideoMessage: function (type, receiverIds, mode, channelId,roomId) {

        var scene = this.$chatEditor.data('type'),
         to = this.$chatEditor.data('to');
        var content = {
            senderId: currentUser.id,
            receiversIds: receiverIds,
            avcalltype: mode,
            channelId: channelId,
            roomId:roomId,
            sessionId: currentUser.currentSession.id
        };
        currentUser.y2wIMBridge.sendcallVideoMessage(to, scene, content);
    },
    sendFileMessage: function(){
        var scene = this.$chatEditor.data('type'),
            to = this.$chatEditor.data('to'),
            fileInput = this.$fileInput.get(0),
            that = this;
        var file = fileInput.files[0];
        if(!file)
            return;
        if(file.size==0) {
            alert("不能传空文件");
            return;
        }
        if(scene == 'group') {
            var sessionMember = currentUser.currentSession.members.getMember(currentUser.id);
            if (sessionMember.isDelete) {
                alert('您已不在此群中，不能发送消息');
                return;
            }
        }
        var options = {
            showMsg: that.showMsg.bind(that),
            storeMsgFailed: that.storeMsgFailed.bind(that),
            storeMsgDone: that.storeMsgDone.bind(that),
            updateMsg:that.changeUrl.bind(that)
        }
        currentUser.y2wIMBridge.sendFileMessage(to, scene, file, options);
    },
    showMsg: function(msg){
        //this.$messageText.val('').focus();
        //this.$chatContent.find('.no-msg').remove();
        var msgHtml = this.chat.updateChatContentUI(msg);
        this.$chatContent.append(msgHtml);
        this.$chatContentWrap.scrollTop(99999);
    },
    changeUrl:function(msg){
        var that=this;
        var $dom = that.$chatContent.find('div[data-id=' + msg.id + ']');
        //var msgHtml = this.chat.updateChatContentUI(messages[i]);
        //$dom.after(msgHtml);
        var src = parseAttachmentUrl(msg.content.src,currentUser.token,msg.content.name);//config.baseUrl + msg.content.src + '/'+msg.content.name+'?access_token=' + currentUser.token;
        $dom.find("a.download-file").attr('href',src);
        //$dom.remove();

    },
    storeMsgDone: function(id, type, targetId, msg){
        //同步会话及消息
        var that = this;
        //某些情况下先同步并显示了此消息，删除掉
        var $domSyncTemp = that.$chatContent.find("div[data-id='" + msg.id + "']");
        if($domSyncTemp && $domSyncTemp.length > 0){
            $domSyncTemp.prev().remove();
            $domSyncTemp.remove();
        }
        var $dom = that.$chatContent.find("div[data-id='" + id + "']");
        if($dom && $dom.length > 0) {
            $dom.attr('data-time', msg.createdAt);
            $dom.attr('data-id', msg.id);
            $dom.find('.storing').remove();
            var $timeDOM = $dom.prev();
            $timeDOM.find('.msgTime').html('&nbsp;'+transTime(msg.createdAt)+'&nbsp;');
            var $prevDOM = $timeDOM.prev();
            if($dom.prev() == undefined || msg.createdAt - parseInt($prevDOM.attr('data-time')) > 5*60*1000)
                $timeDOM.removeClass('invisible');
        }
        this.syncUserConversations(function(err){
            if(err) {
                console.error(err);
                return;
            }
            var userConversation = currentUser.userConversations.get(type, targetId);
            that.syncMessages(userConversation, function(err){
                if(err){
                    console.error(err);
                    return;
                }
            })
        });
        //推送消息
    },
    storeMsgFailed: function(id){
        var $msg = this.$chatContent.find("div[data-id='" + id + "']");
        $msg.find('.storing').remove();
        $msg.append('<span class="error"><i class="icon icon-error"></i>发送失败</span>');
    },
    /**
    * 发送消息完毕后的回调
    * @param error：消息发送失败时，error != null
    * @param msg：消息主体，类型分为文本、文件、图片、地理位置、语音、视频、自定义消息，通知等
    */
    sendMsgDone: function (error, msg) {
        this.$messageText.val('').focus();
        this.$chatContent.find('.no-msg').remove();
        var msgHtml = this.chat.updateChatContentUI(msg);
        this.$chatContent.append(msgHtml).scrollTop(99999);
        $('#j-uploadForm').get(0).reset();
        this.syncUserConversations();
    },

    inputMessage: function (e) {
        var ev = e || window.event,
            $this = $(this);
        if ($.trim($this.val()).length > 0) {
            if (ev.keyCode === 13 && ev.ctrlKey) {
                $this.val($this.val() + '\r\n');
            } else if (ev.keyCode === 13 && !ev.ctrlKey) {
                y2w.sendTextMessage();
                return false;
            }
        }
    },

    autoOpenChatBox:function(){
        var kvs=(location.href.split("?")[1]||"").split("&");
        var parms={};
        for(var i=0;i<kvs.length;i++){
            var kk=kvs[i].split("=");
            parms[kk[0]]=kk[1];
        }
        var cid=parms.targetId;
        var type=parms.type;
        if(!cid)
            return;

        if(type){
            this.openChatBox(cid,type);
            return;
        }

        var c=currentUser.userConversations.get("group",cid);
        if(c){
            this.openChatBox(cid,"group");
            return;
        }
        this.openChatBox(cid,"p2p");
    },
    /**
     * 点击左边面板，打开聊天框
     */
    openChatBox: function (account,scene) {
        y2w.chatInfo.hide();
        var info;
        //this.mysdk.setCurrSession(scene,account);
        this.crtSession = scene+"-"+account;
        this.prepSession = {
            scene: scene,
            id: account
        }
        var that = this;
        that.offChatBoxScrollTop();
        //根据帐号跟消息类型获取消息数据
        if(scene=="p2p"){
            info = Users.getInstance().get(account);
            currentUser.sessions.get(info.id, scene, function(err, session){
                if(err){
                    console.error(err);
                    return;
                }
                currentUser.currentSession = session;

                // 根据或取聊天记录
                that.getHistoryMsgs(account, scene, function(){
                    var sessionMember = currentUser.currentSession.members.getMember(currentUser.id);
                    if(sessionMember.isDelete)
                        that.buildNoRightMessage();
                    that.onChatBoxScrollTop();
                });
            })
        }else if(scene == 'group'){
            info = currentUser.userConversations.get(scene, account);
            currentUser.sessions.get(info.targetId, scene, function(err, session){
                if(err){
                    console.error(err);
                    return;
                }
                currentUser.currentSession = session;

                // 根据或取聊天记录
                that.getHistoryMsgs(account, scene, function(){
                    var sessionMember = currentUser.currentSession.members.getMember(currentUser.id);
                    if(sessionMember.isDelete)
                        that.buildNoRightMessage();
                    that.onChatBoxScrollTop();
                });
            })
        }
        //隐藏其他窗口
        $('#j-teamInfoContainer').addClass('hide');
        this.$devices.addClass('hide');
        this.$cloudMsgContainer.addClass('hide');
        //退群的特殊UI
        this.$rightPanel.find(".u-chat-notice").addClass("hide");
        this.$rightPanel.find(".chat-mask").addClass("hide");

        //设置聊天面板
        if (scene === 'p2p') {
            var text;
            var avatarUrl;
            var contact = currentUser.contacts.get(account);
            if(contact) {
                text = contact.getName();
                avatarUrl = contact.getAvatarUrl();
            }
            else{
                text = info.name;
                avatarUrl = info.getAvatarUrl();
            }
            this.$chatName.text(text);
            this.$chatTitle.find('img').attr('src', avatarUrl);
            //$('#j-videoType').addClass('hide');
            //$('#j-audioType').addClass('hide');
            $("#j-videoType").off("click");
            $("#j-videoType").on("click", function () {
                y2w.chatInfo.callGroupMembers(scene, 'video', account);
            });
            $("#j-audioType").off("click");
            $("#j-audioType").on("click", function () {
                y2w.chatInfo.callGroupMembers(scene, 'audio', account);
            });
        }else{
            if(info){
                this.$chatName.text(info.getName());
                this.$chatTitle.find('img').attr('src', info.getAvatarUrl());
            }else{
                this.$rightPanel.find(".u-chat-notice").removeClass("hide");
                this.$rightPanel.find(".chat-mask").removeClass("hide");
                this.$chatTitle.find('img').attr('src', "images/normal.png"); 
                this.$chatName.text(info.name);
            }
            //$('#j-videoType').removeClass('hide');
            //$('#j-audioType').removeClass('hide');
            $("#j-videoType").off("click");
            $("#j-videoType").on("click", function () {
                y2w.chatInfo.callGroupMembers(scene,'video',null);
            });
            $("#j-audioType").off("click");
            $("#j-audioType").on("click", function () {
                y2w.chatInfo.callGroupMembers(scene,'audio',null);
            });
        }
        //显示面板
        this.$rightPanel.find('.chat-box').removeClass('hide');
        this.$messageText.val('');

        //群信息
        if (scene === 'p2p') {
            this.$teamInfo.addClass('hide').data({
                teamId: '',
                gtype: ''
            });
        } else {
            this.$teamInfo.removeClass('hide').data({
                teamId: account,
                gtype: info?info.type:"normal"
            });
        }
        //会话信息
        this.$chatEditor.data({
            to: account,
            type: scene
        });
        y2w.tab.doCurrent();
        // 根据或取聊天记录
        //this.getHistoryMsgs(account, scene);
        // 滚动条事件
        //this.onChatBoxScrollTop();
    },
    offChatBoxScrollTop: function(){
        this.$chatContentWrap.off('scroll');
    },
    onChatBoxScrollTop: function(){
        var that = this;
        this.$chatContentWrap.off('scroll').on('scroll', function(){
            if($(this)[0].scrollTop < 5 && currentUser.currentSession.messages.more){
                that.$chatContentWrap.off('scroll');
                var oriHeight = that.$chatContent.height();
                //获取历史纪录
                currentUser.currentSession.messages.remote.getLastMessages(function(err){
                    if(err){
                        console.error(err);
                        return;
                    }
                    var temp = that.chat.buildChatContentUI(currentUser.currentSession.messages.getMessages());
                    that.$chatContent.html(temp);
                    var newHeight = that.$chatContent.height();;
                    that.$chatContentWrap.scrollTop(newHeight - oriHeight);
                    if(currentUser.currentSession.messages.more)
                        that.onChatBoxScrollTop();
                })
            }
        })
    },
    updateMessages: function(messages){
        var that = this;
        for(var i = 0; i < messages.length; i++){
            var $dom = that.$chatContent.find('div[data-id=' + messages[i].id + ']');
            if(!$dom || $dom.length == 0){
                var msgHtml = this.chat.updateChatContentUI(messages[i]);
                this.$chatContent.append(msgHtml);
            }
            else{
                var msgHtml = this.chat.updateChatContentUI(messages[i]);
                $dom.after(msgHtml);
                $dom.prev("p").remove();
                $dom.remove();
                //console.log(messages[i]);
            }
        }
        //var temp = appUI.buildChatContentUI(messages);
        //that.$chatContent.html(temp);
        that.$chatContentWrap.scrollTop(99999);
    },
    appendMsgs: function(messages){
        var that = this;
        for(var i = 0; i < messages.length; i++){
            var $dom = that.$chatContent.find('div[data-id=' + messages[i].id + ']');
            if(!$dom || $dom.length == 0){
                var msgHtml = this.chat.updateChatContentUI(messages[i]);
                this.$chatContent.append(msgHtml);
            }

        }
        //var temp = appUI.buildChatContentUI(messages);
        //that.$chatContent.html(temp);
        that.$chatContentWrap.scrollTop(99999);
    },
    buildMsgs: function(messages){
        var that = this;
        var temp = this.chat.buildChatContentUI(messages);
        that.$chatContent.html(temp);
        that.$chatContentWrap.scrollTop(99999);
    },
    buildNoRightMessage: function(){
        var that = this;
        var temp = this.chat.buildChatContentUIOfNoRight();
        that.$chatContent.append(temp);
        that.$chatContentWrap.scrollTop(99999);
    },
    clearUnRead: function(userConversation){
        userConversation.clearUnread();
        //userConversation.unread = 0;
        //userConversation.userConversations.localStorage.setList(userConversation.userConversations.getList());
        this.tab.userConversationPanel.$list.find('li[data-scene=' + userConversation.type + '][data-id=' + userConversation.targetId + ']  .unread').remove();
    },
    /**
     * 获取当前会话消息
     * 1. 获取session
     * 2. 显示session的所有消息
     * 3. 同步消息
     * @return {void}
     */
    getHistoryMsgs: function (targetId, scene, cb) {
        cb = cb || nop
        var that = this;
        //获取session
        currentUser.sessions.get(targetId, scene, function(err, session){
            if(err){
                cb(err);
                return;
            }
            var temp = that.chat.buildChatContentUI(session.messages.getMessages());
            that.$chatContent.html(temp);
            that.$chatContentWrap.scrollTop(99999);
            var userConversation = currentUser.userConversations.get(scene, targetId);
            if(session.messages.updatedAt == globalMinDate){
                session.messages.remote.getLastMessages(function (err, messages) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    if(userConversation)
                        that.clearUnRead(userConversation);
                    that.buildMsgs(messages);
                    cb();
                });
            }
            else {
                if(userConversation) {
                    if (session.messages.updatedAt < userConversation.updatedAt)
                        that.syncMessages(userConversation, cb);
                    else {
                        that.buildMsgs(session.messages.getMessages());
                        cb();
                    }
                }
            }
        })
    },

    logout: function () {
        currentUser.logout(function(){
            window.location.href = '../web/index.html';
        })
    },

    showDialog: function () {
        this.$logoutDialog.removeClass('hide');
        this.$mask.removeClass('hide');
    },

    hideDialog: function () {
        this.$logoutDialog.addClass('hide');
        this.$mask.addClass('hide');
    },
    showEmoji:function(){
        this.$emNode._$show();
    },
    // 语音播放
    playAudio:function(){
        if(!!window.Audio){
            var node = $(this),
                btn = $(this).children(".j-play");
            node.addClass("play");
            setTimeout(function(){node.removeClass("play");},parseInt(btn.attr("data-dur")))
            new window.Audio(btn.attr("data-src")+"&audioTrans&type=mp3").play();
        }
    },

    syncContacts: function(cb){
        cb = cb || nop
        var that = this;
        currentUser.contacts.remote.sync(function(err, count){
            if(err){
                cb(err);
                return;
            }
            if(count > 0 && that.tab.curTabType == that.tab.tabType.contact)
                that.tab.contactPanel.render();
            cb();
        });
    },
    //接收音视频通知处理
    receive_AV_Mesage: function (syncObj) {
        var content = syncObj.content;
        var senderId = content.senderId;
        var avcalltype= content.avcalltype;
        var channelId = content.channelId;
        var roomId = content.roomId;
        var comtext;
        var channmode,channtype;
        if (avcalltype == 'video') {
            comtext = '视频通话';
            channmode = "AVSW";
        } else if(avcalltype == 'audio'){
            comtext = '音频通话';
            channmode = "ASW";
        }
        if (syncObj.type == "groupavcall") {
            channtype = 'group';
            var sessionId = content.sessionId;
            //var sendername = currentUser.userSessions.get(sessionId).members.getMember(senderId).name;

            var usersessions = currentUser.sessions;
            var usersesion = usersessions.getById(sessionId);
            var members = usersesion.members;
            var member = members.getMember(senderId);
            var sendername = member.name;
            $('.callvideo_bg').removeClass('hide');
            $('#callvideo_title_text')[0].innerText = comtext + '邀请';
            $('#callvideo_content_username')[0].innerText = sendername;
            $('#callvideo_content_userimg')[0].src = member.user.avatarUrl;
            comtext = '邀请您参与群组' + comtext;
            $('#callvideo_content_userinfo')[0].innerText = comtext;
        } else if (syncObj.type == "singleavcall") {
            channtype = 'p2p';
            var sender = currentUser.contacts.get(senderId);
            var sendername = sender.name;
            $('.callvideo_bg').removeClass('hide');
            $('#callvideo_title_text')[0].innerText = comtext + '邀请';
            $('#callvideo_content_username')[0].innerText = sendername;
            $('#callvideo_content_userimg')[0].src = sender.avatarUrl;

            comtext = '邀请您参与' + comtext;
            $('#callvideo_content_userinfo')[0].innerText = comtext;
        }
        $("#callvideo_title_img").off("click");
        $("#callvideo_buttom_handup").off("click");
        $("#callvideo_buttom_call").off("click");
        $("#callvideo_title_img").on("click", function () {
            $('.callvideo_bg').addClass('hide');
        });
        $("#callvideo_buttom_handup").on("click", function () {
            $('.callvideo_bg').addClass('hide');
        });
        $("#callvideo_buttom_call").on("click", function () {
            $('.callvideo_bg').addClass('hide');
            if(!roomId)
                roomId =null;
           var y2wVideo = new RTCManager();
           y2wVideo.gotoVideoAudio(channelId, roomId, channmode, channtype, currentUser.id, currentUser.name, currentUser.avatarUrl, currentUser.imToken, function (error, data) {
               if (error) {
                   return;
               }
               //window.open("https://av-api.liyueyun.com/media/?channelSign=" + dataId, "_blank");
               //已经布好https，可以定义logo等界面访问下面
               window.open("../yun2win/videoAudio.html?channelSign=" + data.dataId, "_blank");
           });
        });
    }
};
y2w.init();