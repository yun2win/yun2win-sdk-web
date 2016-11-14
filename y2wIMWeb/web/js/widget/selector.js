/**
 * 选择组件，用于选人/群组等，可扩展其它选择类型
 */
var selector = function(){
    this.$selector = $('<div class="selector radius5px hide"></div>').appendTo($('body'));
    this.$close = $('<i class="close"></i>').appendTo(this.$selector);
    this.$title = $('<h3 class="title"></h3>').appendTo(this.$selector);
    this.$tabs = $('<div class="tabs" id="selectorTabs"></div>').appendTo(this.$selector);
    this.$ok = $('<button class="btn btn-ok radius4px j-chat chat hide">确定</button>').appendTo(this.$selector);
    this.$mask = $('#mask');
    this.tabType = { contact: 0, group: 1,groupmembers:2, email:3, custom: 99 };
    this.tabText = { 0: '选择联系人', 1: '选择群组', 2:'选择群成员', 3:'邮箱邀请'};
    this.selection = { single: 0, multiple: 1 };

    this.$close.on('click', this.close.bind(this));
};
selector.prototype.show = function(conf){
    this.$title.text(conf.title);
    this.onSelected = conf.onSelected;
    this.$selector.removeClass('hide');
    this.$mask.removeClass('hide');
    if(this.tabs){
        this.$tabs.empty();
        this.$selector.find('.list').each(function(){
            $(this).remove();
        });
        for(var i = 0; i < this.tabs.length; i++){
            if(this.tabs[i].folderNav)
                this.tabs[i].folderNav.destroy();
        }
    }
    this.tabs = conf.tabs;
    for(var i = 0; i < this.tabs.length; i++){
        this.tabs[i].selected = this.tabs[i].selected || {};
        this.tabs[i].hidden = this.tabs[i].hidden || {};

        var html = '';
        var tabName = this.tabs[i].type == this.tabType.custom ? this.tabs[i].title : this.tabText[this.tabs[i].type];
        html += ['<a href="javascript:;" class="box-sizing tc tab' + i,
            //i == 0 ? ' cur' : '',
            '" data-type="select' + tabName + '">',
            tabName,
            '</a>'].join("");
        this.tabs[i].$tab = $(html);
        this.tabs[i].$tab.on('click', this.switchTab.bind(this, this.tabs[i]));
        this.$tabs.append(this.tabs[i].$tab[0]);

        html = '';
        html += ['<ul class="list hide" data-type="select' + tabName + '">',
            '</ul>'].join("");
        this.tabs[i].$list = $(html);
        this.tabs[i].selector = this;
        this.$selector.append(this.tabs[i].$list[0]);

    }
    this.switchTab(this.tabs[0]);
}
selector.prototype.close = function(){
    this.$title.text('');
    this.$selector.addClass('hide');
    this.$mask.addClass('hide');
    //this.$ok.removeClass('btn-ok').addClass('btn-cancel').addClass('hide').off('click');
    this.$ok.addClass('hide').off('click');
}
selector.prototype.switchTab = function(tab){
    if(!tab.$tab.attr('class') || tab.$tab.attr('class').indexOf('cur') < 0) {
        tab.$tab.addClass('cur');
        tab.$tab.siblings().removeClass('cur');
        tab.$list.removeClass('hide').siblings('.list').addClass('hide');
        tab.$list.empty();
        if (tab.type === this.tabType.contact) {
            this.renderContact(tab);
        } else if (tab.type === this.tabType.group) {
            this.renderGroup(tab);
        } else if (tab.type === this.tabType.groupmembers) {
            this.renderGroupMembers(tab);
        } else if (tab.type == this.tabType.email) {
            this.renderEmail(tab);
        } else if (tab.type == this.tabType.custom) {
            this.renderCustom(tab);
        }
    }
};
selector.prototype.renderContact = function(tab) {
    var list = currentUser.contacts.getContacts();
    this.buildList(tab, list);
}
selector.prototype.renderGroup = function(tab){
    var list = currentUser.userConversations.getUserConversations('group');
    this.buildList(tab, list);
}
selector.prototype.renderGroupMembers = function (tab) {
    var list =currentUser.currentSession.members.session.members.getMembers();
    this.buildList(tab, list);
};
selector.prototype.renderEmail = function(tab){
    this.$ok.addClass('hide').off('click');
    tab.$list.empty();

    var members = currentUser.currentSession.members.getEmailMembers();
    var html="";
    for(var i=0;i<members.length;i++){
        var m=members[i];
        if(m.role!='email')
            continue;


        html += ['<li class="list-item no-selector" tab-type="' + tab.type + '" data-id="' + m.userId + '">',
            '<div class="info">',
            '<h4 class="name">' + m.name + '',
            '<span class="email">' + m.userId + '</span>',
            '<span class="remark">已邀请未入群</span>',
            '<div class="radius4px j-invite-a btn-cancel">再次邀请('+(m.time||'1')+')</div>',
            '</h4>',
            '</div>',
            '</li>'].join("");
    }
    html += ['<li class="list-item no-selector" tab-type="' + tab.type + '" data-id="">',
        '<div class="info">',
        '<input class="txt-email" placeholder="请输入对方的邮箱"/>',
        '<div class="radius4px j-invite btn-edit">邀请</div>',
        '</div>',
        '</li>'].join("");

    tab.$list.append(html);

    tab.$list.find(".j-invite").on("click",this.inviteEmail.bind(this,tab));
    tab.$list.find(".j-invite-a").on("click",this.inviteEmail.bind(this,tab));

};
selector.prototype.renderCustom = function(tab){
    if(tab.folder && !tab.folderNav){
        tab.folderNav = new FolderNav(tab);
    }
    this.buildCustomList(tab, tab.dataSource);
}
selector.prototype.buildList = function(tab, list){
    var that = this;
    var html = '';
    this.$ok.addClass('hide').off('click');
    tab.$list.removeClass('multi');

    for (var i = 0; i < list.length; i++) {
        var dataId;
        if(tab.type == this.tabType.group)
            dataId = list[i].targetId;
        else if (tab.type == this.tabType.contact || tab.type == this.tabType.groupmembers)
            dataId = list[i].userId;
        else{
            throw 'selector build list error, tab type is invalid';
        }
        var hide = !!tab.hidden[dataId];
        if(hide)
            continue;
        var checked = tab.selection == this.selection.multiple ? !!tab.selected[dataId] : false;
        var avatarDOM = '<span class="avatar avatar-selector';
        var avatarUrl = list[i].getAvatarUrl();
        if(avatarUrl && avatarUrl != ''){
            avatarDOM += '"><img src="' + avatarUrl + '"/>';
        }
        else{
            var id = dataId.toString();
            var index = id.substr(id.length - 1);
            var imageUrl = tab.type == this.tabType.group ? defaultGroupImageUrl : defaultContactImageUrl;
            avatarDOM += ' avatar-random-bg-' + index % avatarRandomBGColorCount + '"><img src="' + imageUrl + '"/>';
        }
        avatarDOM += '</span>';
        var name = this.tabType.groupmembers ? list[i].name : list[i].getName();
        html += ['<li class="list-item" tab-type="' + tab.type + '" data-id="' + dataId + '">',
            tab.selection == this.selection.multiple ? '<div class="opt"><i class="unchecked' + (checked ? ' checked' : '') + '"/></div>' : '',
            avatarDOM,
            '<div class="info">',
            '<h4 class="name">' + name + '</h4>',
            '</div>',
            '</li>'].join("");
    }
    tab.$list.append(html);
    if(tab.selection == this.selection.multiple) {
        tab.$list.find('li').each(function () {
            $(this).on('click', that.toggleCheck.bind(this, that, tab));
        });
        tab.$list.addClass('multi');
        that.$ok.on('click', function() {
            var selected = [];
            if(tab.type == that.tabType.custom){
                for(var k in tab.selected){
                    selected.push(k);
                }
            }
            else {
                tab.$list.find('li .opt i.checked').each(function () {
                    var uid = $(this).parent().parent().attr('data-id');
                    var user = Users.getInstance().get(uid);
                    selected.push(user);
                })
            }
            that.onSelected({
                type: tab.type,
                selected: selected
            });
            that.close();
        });
        this.$ok.removeClass('hide');
    }
    else{
        tab.$list.find('li').each(function () {
            $(this).on('click', function(){
                var selected = [];
                //if(tab.type == that.tabType.group){
                var targetId = $(this).attr('data-id');
                selected.push(targetId);
                //}

                that.onSelected({
                    type: tab.type,
                    selected: selected
                });
                that.close();
            });
        });
    }
}
selector.prototype.buildCustomList = function(tab, list){
    var that = this;
    var html = '';
    tab.$list.empty();
    this.$ok.addClass('hide').off('click');
    tab.$list.removeClass('multi');
    for (var i = 0; i < list.length; i++) {
        var dataId = list[i].id;
        var hide = !!tab.hidden[dataId];
        if(hide)
            continue;
        var checked = tab.selection == this.selection.multiple ? !!tab.selected[dataId] : false;
        var avatarDOM = '';
        if(tab.avatar) {
            avatarDOM = '<span class="avatar avatar-selector';
            var avatarUrl = list[i].avatarUrl;
            if (avatarUrl && avatarUrl != '') {
                avatarDOM += '"><img src="' + avatarUrl + '"/>';
            }
            else {
                var index = Math.floor(100 * Math.random());
                var imageUrl = list[i].folder ? defaultGroupImageUrl : defaultContactImageUrl;
                avatarDOM += ' avatar-random-bg-' + index % avatarRandomBGColorCount + '"><img src="' + imageUrl + '"/>';
            }
            avatarDOM += '</span>';
        }
        var name = list[i].name;
        var folder = '';
        if(list[i].folder){
            folder = '<span class="folder" isFolder="true" folder-id="' + dataId + '" folder-name="' + name + '"></span>';
        }
        html += ['<li class="list-item" tab-type="' + tab.type + '" data-id="' + dataId + '">',
            tab.selection == this.selection.multiple ? '<div class="opt"><i class="unchecked' + (checked ? ' checked' : '') + '"/></div>' : '',
            avatarDOM,
            '<div class="info">',
            '<h4 class="name">' + name + '</h4>',
            folder,
            '</div>',
            '</li>'].join("");
    }
    tab.$list.append(html);
    if(tab.selection == this.selection.multiple) {
        tab.$list.find('li').each(function () {
            var folder = $(this).find('span[isFolder="true"]');
            if(folder.length > 0){
                if(tab.selectFolder)
                    $(this).on('click', that.toggleCheck.bind(this, that, tab));
                var $folder = $(folder);
                if(tab.selected[$folder.attr('folder-id')]){
                    $folder.addClass('folder-disabled').removeClass('folder');
                    $folder.on('click', function(event){
                        event.stopPropagation();
                    })
                }
                else{
                    $folder.on('click', function(event){
                        event.stopPropagation();
                        $folder.removeClass('folder-disabled').addClass('folder');
                        var folderId = $folder.attr('folder-id');
                        var folderName = $folder.attr('folder-name');
                        tab.folderNav.add(folderId, folderName);
                        //切换新视图
                        var result = that.queryDataSource(tab.dataSource, folderId);
                        if(result.find)
                            that.buildCustomList(tab, result.dataSource);
                    })
                }
            }
            else
                $(this).on('click', that.toggleCheck.bind(this, that, tab));
        });
        tab.$list.addClass('multi');
        that.$ok.on('click', function() {
            var selected = [];
            if(tab.type == that.tabType.custom){
                for(var k in tab.selected){
                    selected.push(k);
                }
            }
            else {
                tab.$list.find('li .opt i.checked').each(function () {
                    var uid = $(this).parent().parent().attr('data-id');
                    var user = Users.getInstance().get(uid);
                    selected.push(user);
                })
            }
            that.onSelected({
                type: tab.type,
                selected: selected
            });
            that.close();
        });
        this.$ok.removeClass('hide');
    }
    else{
        tab.$list.find('li').each(function () {
            var folder = $(this).find('span[isFolder="true"]');
            if(folder.length > 0){
                if(tab.selectFolder){
                    $(this).on('click', function(){
                        var selected = [];
                        var targetId = $(this).attr('data-id');
                        selected.push(targetId);

                        that.onSelected({
                            type: tab.type,
                            selected: selected
                        });
                        that.close();
                    });
                }
                var $folder = $(folder);
                $folder.on('click', function(event){
                    event.stopPropagation();
                    $folder.removeClass('folder-disabled').addClass('folder');
                    var folderId = $folder.attr('folder-id');
                    var folderName = $folder.attr('folder-name');
                    tab.folderNav.add(folderId, folderName);
                    //切换新视图
                    var result = that.queryDataSource(tab.dataSource, folderId);
                    if(result.find)
                        that.buildCustomList(tab, result.dataSource);
                })
            }
            else{
                $(this).on('click', function(){
                    var selected = [];
                    var targetId = $(this).attr('data-id');
                    selected.push(targetId);

                    that.onSelected({
                        type: tab.type,
                        selected: selected
                    });
                    that.close();
                });
            }
        });
    }
}
selector.prototype.queryDataSource = function(dataSource, id){
    var that = this;
    var result = {
        find: false
    }
    for(var i = 0; i < dataSource.length; i++){
        var item = dataSource[i];
        if(item.id == id){
            result.find = true;
            result.dataSource = item.children;
            return result;
        }
        if(item.folder){
            result = that.queryDataSource(item.children, id);
            if(result.find)
                return result;
        }
    }
    return result;
}
selector.prototype.toggleCheck = function(that, tab){
    var $this = $(this);
    var $i = $this.find('.opt i');
    var id = $i.parent().parent().attr('data-id');
    if($i.attr('class') == 'unchecked') {
        $i.addClass('checked');
        tab.selected[id] = true;
        var folder = $i.parent().parent().find('span[isFolder="true"]');
        if(folder.length > 0){
            var $folder = $(folder);
            $folder.off('click');
            $folder.addClass('folder-disabled').removeClass('folder');
            $folder.on('click', function(event){
                event.stopPropagation();
            })
        }
    }
    else {
        $i.removeClass('checked');
        delete tab.selected[id];
        var folder = $i.parent().parent().find('span[isFolder="true"]');
        if(folder.length > 0){
            var $folder = $(folder);
            $folder.removeClass('folder-disabled').addClass('folder');
            $folder.off('click');
            $folder.on('click', function(event){
                event.stopPropagation();
                var folderId = $folder.attr('folder-id');
                var folderName = $folder.attr('folder-name');
                tab.folderNav.add(folderId, folderName);
                //切换新视图
                var result = that.queryDataSource(tab.dataSource, folderId);
                if(result.find)
                    that.buildCustomList(tab, result.dataSource);
            })
        }
    }
    //if(tab.$list.find('li .opt i.checked').length == 0)
    //    that.$ok.removeClass('btn-ok').addClass('btn-cancel').off('click');
    //else
    //    that.$ok.removeClass('btn-cancel').addClass('btn-ok').off('click').on('click', function() {
    //        var selected = [];
    //        if(tab.type == that.tabType.custom){
    //            for(var k in tab.selected){
    //                selected.push(k);
    //            }
    //        }
    //        else {
    //            tab.$list.find('li .opt i.checked').each(function () {
    //                var uid = $(this).parent().parent().attr('data-id');
    //                var user = Users.getInstance().get(uid);
    //                selected.push(user);
    //            })
    //        }
    //        that.onSelected({
    //            type: tab.type,
    //            selected: selected
    //        });
    //        that.close();
    //    });
}
selector.prototype.inviteEmail=function(tab){
    var evt = window.event,
        target = evt.srcElement || evt.target;
    var doms=$(target).parents(".no-selector");
    var txt=doms.attr("data-id");
    if(txt=="" || !txt)
        txt= $.trim(tab.$list.find("input.txt-email").val());
    if(txt=="")
        return ;

    var members=currentUser.currentSession.members.getMembers();
    for(var i=0;i<members.length;i++){
        var member=members[i];
        if(member.user && member.user.account ==txt)
            return alert("此用户已经在群里");
    }
    var tlength=members.length;

    var that=this;
    var remote=currentUser.currentSession.members.remote;
    remote.invite(txt,function(err){
        if(err) {
            try {
                var error = JSON.parse(err.responseText);
                return alert(error.message);
            }
            catch(ex){
                alert("邀请失败!")
            }
        }
        remote.sync(function() {

            var members = currentUser.currentSession.members.getMembers();
            if (tlength < members.length) {
                currentUser.currentSession.messages.remote.sync(function () {

                });
                that.close();
                return alert("已成功邀请入群!");

            }

            that.renderEmail(tab);
        });
    });
};

var FolderNav = function(tab){
    this.tab = tab;
    this.$dom = $('<ol class="breadcrumb"></ol>');
    this.$dom.insertBefore(this.tab.$list);
    this.items = [];
    this.add('all', '全部');
}

FolderNav.prototype.destroy = function(){
    for(var i = this.items.length - 1; i >= 0; i--){
        this.items[i].destroy();
        this.items.pop();
    }
    this.$dom.remove();
}

FolderNav.prototype.add = function(id, name){
    var index = this.items.length;
    var item = new FolderNavItem(id, name, index, this);
    this.items.push(item);
    this.active(index);
}

FolderNav.prototype.sub = function(index){
    for(var i = this.items.length - 1; i > index; i--){
        this.items[i].destroy();
        this.items.pop();
    }
}

FolderNav.prototype.active = function(index){
    if(this.activeItem){
        this.activeItem.blur();
    }
    this.items[index].active();
    this.activeItem = this.items[index];
    for(var i = this.items.length - 1; i > index; i--){
        this.items[i].destroy();
    }
}

var FolderNavItem = function(id, name, index, parent){
    this.id = id;
    this.name = name;
    this.index = index;
    this.parent = parent;
    this.$dom = $('<li>' + this.name + '</li>');
    this.parent.$dom.append(this.$dom);
}
FolderNavItem.prototype.active = function(){
    this.$dom.empty();
    this.$dom.text(this.name);
    this.$dom.off('click');
}
FolderNavItem.prototype.blur = function(){
    var that = this;
    this.$dom.empty();
    this.$dom.html('<a href="#">' + this.name + '</a>');
    this.$dom.on('click', function(){
        //切换新视图
        var dataSource;
        if(that.id == 'all')
            dataSource = that.parent.tab.dataSource;
        else {
            var result = that.parent.tab.selector.queryDataSource(that.parent.tab.dataSource, that.id);
            if (result.find)
                dataSource = result.dataSource;
        }
        if(dataSource)
            that.parent.tab.selector.buildCustomList(that.parent.tab, dataSource);
        that.parent.active(that.index);
    })
}
FolderNavItem.prototype.destroy = function(){
    this.$dom.off('click');
    this.$dom.remove();
}