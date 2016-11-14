var searcher=function(){

    this.dom=$("#searchpanel");
    this.input=this.dom.find(".input input");
    this.list=this.dom.find(".tab-panel");
    this.listContent=this.list.find(".list");
    this.input.on('keyup', this.excute.bind(this));
    this.input.on('click',this.excute.bind(this));

    this.btnclose=this.dom.find(".search-close");
    this.btnclose.on('click',this.close.bind(this))
    this.btnclose.addClass("hide");

    this.listContent.on('click',this.open.bind(this));

};

searcher.prototype.open=function(e){
    var evt = e || window.event,
        target = evt.srcElement || evt.target;
    var doms=$(target).parents(".item");

    var scene=doms.attr("data-scene");
    var id=doms.attr("data-id");
    y2w.openChatBox(id,scene);
    this.hide();

};
searcher.prototype.excute=function(e){

    if(e.keyCode==27)
        return this.hide();

    var text= $.trim(this.input.val());
    if(!text || text==""){
        return this.hide();
    }

    text=text.tran();

    this.list.removeClass("hide");
    this.btnclose.removeClass("hide");

    this.listContent.empty();

    var items={};
    this.searchUserConversation(text,items);
    this.searchContract(text,items);
    this.searchUserSession(text,items);


    var ilist=[];
    for(var index in items)
        ilist.push("<!-- "+index+" -->"+items[index]);

    ilist.sort();
    ilist.reverse();

    var html=ilist.join("");

    this.listContent.append(html);
};

searcher.prototype.searchContract=function(text,items){

    var cs=currentUser.contacts.getContacts();

    for(var i=0;i<cs.length;i++){
        var c=cs[i];
        if(this.match(text,c.name) || (c.remark && this.match(text,c.remark)) ||
            (c.title && this.match(text,c.title) ) || this.matchPY(text, c.pinyin)){

            var key="p2p_"+ c.userId;
            if(items[key])
                continue;

            var info = y2w.tab.getInfo(y2w.tab.tabType.contact, c);
            if (!info)
                continue;
            str = ['<li class="item' + (y2w.tab.isActive(info) ? ' active' : '') + '' + (info.top ? ' top-item' : '') + '" data-scene="' + info.scene + '" data-id="' + info.id + '">',
                y2w.tab.getAvatarDOM(info),
                '<div class="item-text">',
                '<p class="multi-row">',
                '<span class="name">' + this.parseText(text,info.name) + '</span>',
                '<b class="time">' + this.parseText(text,info.time) + '</b>',
                '</p>',
                '<p class="multi-row">',
                '<span class="lastMsg">' + this.parseText(text,info.lastMessage) + '</span>',
                '</p>',
                '</div>',
                '</li>'].join("");

            items[key]=str;
        }
    }
};
searcher.prototype.searchUserConversation=function(text,items){
    var cs=currentUser.userConversations.getUserConversations();

    for(var i=0;i<cs.length;i++){
        var c=cs[i];
        var info = y2w.tab.getInfo(y2w.tab.tabType.userConversation, c);
        if (!info)
            continue;
        if(this.match(text,info.name)  || (info.lastMessage && this.match(text,info.lastMessage)) ||
            (c.title && this.match(text,c.title) ) ||
            (c.type=="group" && this.searchSessionMember(text, c.targetId,info)) ||
            this.matchPY(text, info.pinyin)
        ){

            var key= c.type+"_"+ c.targetId;
            if(items[key])
                continue;



            str = ['<li class="item' + (y2w.tab.isActive(info) ? ' active' : '') + '' + (info.top ? ' top-item' : '') + '" data-scene="' + info.scene + '" data-id="' + info.id + '">',
                y2w.tab.getAvatarDOM(info),
                '<div class="item-text">',
                '<p class="multi-row">',
                '<span class="name">' + this.parseText(text,info.name) + '</span>',
                '<b class="time">' + this.parseText(text,info.time)  + '</b>',
                '</p>',
                '<p class="multi-row">',
                '<span class="lastMsg">' + this.parseText(text,info.lastMessage) + '</span>',
                '</p>',
                '</div>',
                '</li>'].join("");

            items[key]=str;
        }
    }
};
searcher.prototype.searchUserSession=function(text,items){
    var cs=currentUser.userSessions.getUserSessions();

    for(var i=0;i<cs.length;i++){
        var c=cs[i];
        var info = y2w.tab.getInfo(y2w.tab.tabType.userSession, c);
        if (!info)
            continue;
        if(info.name.indexOf(text)>=0  || (info.lastMessage && this.match(text,info.lastMessage)) ||
            (c.title && this.match(text,c.title) ) || this.searchSessionMember(text, c.sessionId,info)){

            var key= c.type+"_"+ c.targetId;
            if(items[key])
                continue;

            str = ['<li class="item' + (y2w.tab.isActive(info) ? ' active' : '') + '' + (info.top ? ' top-item' : '') + '" data-scene="' + info.scene + '" data-id="' + info.id + '">',
                y2w.tab.getAvatarDOM(info),
                '<div class="item-text">',
                '<p class="multi-row">',
                '<span class="name">' + this.parseText(text,info.name) + '</span>',
                '<b class="time">' + this.parseText(text,info.time) + '</b>',
                '</p>',
                '<p class="multi-row">',
                '<span class="lastMsg">' + this.parseText(text,info.lastMessage)  + '</span>',
                '</p>',
                '</div>',
                '</li>'].join("");

            items[key]=str;
        }
    }
};
searcher.prototype.searchSessionMember=function(text,sessionId,info){
    var session = currentUser.sessions.getById(parseInt(sessionId));
    if(!session)
        return false;

    var members=session.members.getMembers();
    for(var i=0;i<members.length;i++){

        var member=members[i];
        var u=Users.getInstance().get(member.userId);
        if( (u && this.match(text, u.name)) ){
            info.lastMessage="群成员:"+ u.name;
            return true;
        }
        if(member.name && this.match(text,member.name)){
            info.lastMessage="群成员:"+member.name;
            return true;
        }
        if(member.pinyin && this.matchPY(text,member.pinyin)){
            info.lastMessage="群成员:"+member.name;
            return true;
        }
    }
    return false;

};

searcher.prototype.parseText=function(key,text){
    if(!text)
        return '';
    return text.replace(new RegExp("("+key+")",'ig'),'<b>$1</b>');
};
searcher.prototype.match=function(key,text){
    if(!key || !text)
        return false;
    return text.tran().toLowerCase().indexOf(key.toLowerCase())>=0;
};
searcher.prototype.matchPY=function(key,pinyin){
    try {
        if (!key || !pinyin)
            return false;
        if (!/^[a-zA-Z]+$/ig.test(key))
            return false;

        var sArray = "";
        var str = "";
        for (var i = 0; i < pinyin.length; i++) {
            var py = pinyin[i];
            str += py;
            if (py.length > 0)
                sArray += py[0];
        }

        if (sArray.indexOf(key) >= 0)
            return true;

        if (str.indexOf(key) >= 0)
            return true;

        return false;
    }
    catch(ex){
        return false;
    }
};

searcher.prototype.close=function(){
    this.input.val('');

    this.hide();
};

searcher.prototype.hide=function(){
    this.list.addClass("hide");
    this.btnclose.addClass("hide");
};