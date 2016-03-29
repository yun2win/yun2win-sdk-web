/**
 * 左边tab，用于显示与切换会话，联系人等列表，可扩展显示其它列表
 */
var tab = function(){
    this.$tab = $('#tab');
    this.$tab.delegate('a', 'click', this.switch.bind(this));
    this.tabType = {
        userConversation: 0,
        contact: 1,
        group: 2
    }
    this.curTabType;
    this.userConversationPanel = new userConversationPanel(this);
    this.contactPanel = new contactPanel(this);
    this.groupPanel = new groupPanel(this);
}
tab.prototype.switch = function(e){
    var $this = $(e.currentTarget),
        $curTab = $this.find('span'),
        type = $this.data('type');
    $curTab.addClass('cur');
    $this.siblings().find('span').removeClass('cur');
    $('.left-panel .tab-panel[data-type=' + type + ']').removeClass('hide').siblings('.tab-panel').addClass('hide');
    switch(type){
        case this.tabType.userConversation:
            this.userConversationPanel.render();
            break;
        case this.tabType.contact:
            this.contactPanel.render();
            break;
        case this.tabType.group:
            this.groupPanel.render();
            break;
    }
}
tab.prototype.isActive = function(info){
    if(y2w.prepSession)
        return y2w.prepSession.scene == info.scene && y2w.prepSession.id == info.id;
    return false;
}
tab.prototype.getInfo = function(tabType, obj){
    var info = {};
    switch (tabType){
        case this.tabType.userConversation:
            var userConversation = obj;
            info.scene = userConversation.type;
            info.id = userConversation.targetId;
            info.time = transTime2(userConversation.updatedAt);
            info.unread = userConversation.unread > 99 ? "99+" : userConversation.unread;
            info.lastMessage = userConversation.lastMessage ? this.renderLastMessage(userConversation.lastMessage) : '';
            info.name = userConversation.getName();
            info.avatarUrl = userConversation.getAvatarUrl();
            return info;
        case this.tabType.contact:
            var contact = obj;
            info.scene = 'p2p';
            info.id = contact.userId;
            info.name = contact.title && $.trim(contact.title) != '' ? contact.title : contact.name;
            info.pinyin = contact.title && $.trim(contact.title) != '' ? contact.titlePinyin : contact.pinyin;
            info.strPinyin = contact.pinyin.join('').toLowerCase();
            info.avatarUrl = contact.user.getAvatarUrl();
            return info;
        case this.tabType.group:
            var userSession = obj;
            info.scene = 'group';
            info.id = userSession.sessionId;
            info.name = userSession.name;
            info.avatarUrl = userSession.getAvatarUrl();
            return info;
        default :
            return null;
    }
};
tab.prototype.renderLastMessage = function(msg){
    if(!msg || !msg.from)
        return '';
    var text = (msg.scene!='p2p'?((msg.from.id ===currentUser.id)?"我":msg.from.name)+":":"");
    var type = msg.type;
    if (!/text|image|file|audio|video|geo|custom|notification/i.test(type)) return '';
    switch (type) {
        case 'text':
            text += _$escape(msg.content.text || msg.content);
            break;
        case 'image':
            text += '[图片]';
            break;
        case 'file':
            if (!/exe|bat/i.test(msg.file.ext)) {
                text += '[文件]';
            } else {
                text += '[非法文件，已被本站拦截]';
            }
            break;
        case 'audio':
            text += '[语音]';
            break;
        case 'video':
            text += '[视频]';
            break;
        case 'geo':
            text += '[位置]';
            break;
        default:
            text += '[未知消息类型]';
            break;
    }
    if(msg.status=== "fail"){
        text = '<i class="icon icon-error"></i>'+text;
    }
    return text;
}
tab.prototype.getAvatarDOM = function(info){
    var avatarDOM = '<div class="item-avatar"><span class="avatar avatar-tab';
    if(info.avatarUrl && info.avatarUrl != ''){
        avatarDOM += '"><img src="' + info.avatarUrl + '"/>';
    }
    else{
        var id = info.id.toString();
        var index = id.substr(id.length - 1);
        if(info.scene == 'p2p')
            avatarDOM += ' avatar-random-bg-' + index % avatarRandomBGColorCount + '"><img src="' + defaultContactImageUrl + '"/>';
        else
            avatarDOM += ' avatar-random-bg-' + index % avatarRandomBGColorCount + '"><img src="' + defaultGroupImageUrl + '"/>';
    }
    if(info.unread && info.unread > 0)
        avatarDOM += '<span class="unread">' + info.unread + '</span>';
    avatarDOM += '</span></div>';
    return avatarDOM;
}
tab.prototype.doCurrent = function(){
    var $container;
    switch(this.curTabType){
        case this.tabType.userConversation:
            $container = this.userConversationPanel.$panel;
            break;
        case this.tabType.contact:
            $container = this.contactPanel.$panel;
            break;
        case this.tabType.group:
            $container = this.groupPanel.$panel;
            break;
    }
    if($container) {
        var $li = $container.find("li.item[alpha!=true]");
        $li.map(function () {
            $(this).removeClass("active");
            if ($(this).attr('data-id') == $('#j-chatEditor').data('to') &&
                $(this).attr('data-scene') == $('#j-chatEditor').data('type')) {
                $(this).addClass("active");
            }
        });
    }
}
//用户会话列表
var userConversationPanel = function(tab){
    this.tab = tab;
    this.tabType = this.tab.tabType.userConversation;
    this.$panel = $('#userConversationPanel');
    this.$list = this.$panel.find('ul');
    this.$list.on('click', function(e){
        var self = this,
            evt = e || window.event,
            id,
            scene,
            target = evt.srcElement || evt.target;
        while(self !== target){
            if(target.tagName.toLowerCase() === "li"){
                id = target.getAttribute("data-id");
                scene = target.getAttribute("data-scene");
                y2w.openChatBox(id, scene);
                return;
            }
            target = target.parentNode;
        }
    });
}
userConversationPanel.prototype.render = function(){
    var html = '',
        i,
        str,
        info,
        list = currentUser.userConversations.getUserConversations();
    if (list.length === 0) {
        html += '<p class="empty">暂无会话</p>';
    }else{
        for (i = 0; i< list.length;i++) {
            info = this.tab.getInfo(this.tabType, list[i]);
            if(!info)
                continue;
            str = ['<li class="item'+(this.tab.isActive(info)?' active':'')+'" data-scene="' + info.scene + '" data-id="' + info.id + '">',
                this.tab.getAvatarDOM(info),
                '<div class="item-text">',
                '<p class="multi-row">',
                '<span class="name">' +info.name + '</span>',
                '<b class="time">' + info.time + '</b>',
                '</p>',
                '<p class="multi-row">',
                '<span class="lastMsg">' + info.lastMessage + '</span>',
                '</p>',
                '</div>',
                '</li>'].join("");
            html += str;
        }
    }
    this.$list.html(html);
    this.tab.curTabType = this.tabType;
    this.tab.doCurrent();
};
//联系人列表
var contactPanel = function(tab){
    this.tab = tab;
    this.tabType = this.tab.tabType.contact;
    this.$panel = $('#contactPanel');
    this.$list = this.$panel.find('ul');
    this.$list.on('click',function(e){
        var self = this,
            evt = e || window.event,
            id,
            scene,
            target = evt.srcElement || evt.target;
        while(self !== target){
            if(target.tagName.toLowerCase() === "li"){
                if(target.getAttribute("alpha") == 'true')
                    return;
                id = target.getAttribute("data-id");
                scene = target.getAttribute("data-scene");
                y2w.openChatBox(id, scene);
                return;
            }
            target = target.parentNode;
        }
    });
};
contactPanel.prototype.render = function(){
    var html="",
        list = currentUser.contacts.getContacts(),
        infos = [],                 //拼音首字母a-z
        infos1 = [];                //其它
    var reg = new RegExp('[a-zA-Z]');
    for (var i = 0; i < list.length; i++) {
        var info = this.tab.getInfo(this.tabType, list[i]);
        if(!info)
            continue;
        if(reg.test(info.strPinyin.substr(0, 1)))
            infos.push(info);
        else
            infos1.push(info);
    }
    //排序
    infos = quickSort(infos, 'strPinyin', false);
    infos1 = quickSort(infos1, 'strPinyin', false);
    var lastAlpha = '';
    for (var i = 0; i < infos.length; i++) {
        var info = infos[i];
        //添加字母分类
        if(lastAlpha.toLowerCase() !== info.strPinyin.substr(0, 1).toLowerCase()){
            lastAlpha = info.strPinyin.substr(0, 1).toUpperCase();
            html += ['<li class="item alpha" alpha="true">',
                '<div>' + lastAlpha + '</div>',
                '</li>'].join("");
        }
        html += ['<li class="item'+(this.tab.isActive(info)?' active':'')+'" data-scene="' + info.scene + '" data-id="' + info.id + '" pinyin=' + JSON.stringify(info.pinyin) + '>',
            this.tab.getAvatarDOM(info),
            '<div class="item-text">',
            '<p class="single-row">'+info.name+'</p>',
            '</div>',
            '</li>'].join("");
    }
    if(infos1.length > 0) {
        //添加字母分类
        html += ['<li class="item alpha">',
            '<div>~</div>',
            '</li>'].join("");
        for (var i = 0; i < infos1.length; i++) {
            var info = infos1[i];
            html += ['<li class="item'+(this.tab.isActive(info)?' active':'')+'" data-scene="' + info.scene + '" data-id="' + info.id + '">',
                this.tab.getAvatarDOM(info),
                '<div class="item-text">',
                '<p class="single-row">'+info.name+'</p>',
                '</div>',
                '</li>'].join("");
        }
    }
    this.$list.html(html);
    this.tab.curTabType = this.tabType;
    this.tab.doCurrent();
};
//群组列表
var groupPanel = function(tab){
    this.tab = tab;
    this.tabType = this.tab.tabType.group;
    this.$panel = $('#groupPanel');
    this.$list = this.$panel.find('ul');
    this.$list.on('click',function(e){
        var self = this,
            evt = e || window.event,
            id,
            scene,
            target = evt.srcElement || evt.target;
        while(self !== target){
            if(target.tagName.toLowerCase() === "li"){
                id = target.getAttribute("data-id");
                scene = target.getAttribute("data-scene");
                y2w.openChatBox(id, scene);
                return;
            }
            target = target.parentNode;
        }
    });
};
groupPanel.prototype.render = function(){
    var html="",
        list = currentUser.userSessions.getUserSessions();
    for (var i = 0; i < list.length; i++) {
        var info = this.tab.getInfo(this.tabType, list[i]);
        if(!info)
            continue;
        html += ['<li class="item'+(this.tab.isActive(info)?' active':'')+'" data-scene="' + info.scene + '" data-id="' + info.id + '" pinyin=' + JSON.stringify(info.pinyin) + '>',
            this.tab.getAvatarDOM(info),
            '<div class="item-text">',
            '<p class="single-row">'+info.name+'</p>',
            '</div>',
            '</li>'].join("");
    }
    this.$list.html(html);
    this.tab.curTabType = this.tabType;
    this.tab.doCurrent();
};