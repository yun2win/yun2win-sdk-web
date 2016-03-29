/**
 * 选择组件，用于选人/群组等，可扩展其它选择类型
 */
var selector = function(){
    this.$selector = $('<div class="selector radius5px hide"></div>').appendTo($('body'));
    this.$close = $('<i class="close"></i>').appendTo(this.$selector);
    this.$title = $('<h3 class="title"></h3>').appendTo(this.$selector);
    this.$tabs = $('<div class="tabs" id="selectorTabs"></div>').appendTo(this.$selector);
    this.$ok = $('<button class="btn btn-cancel radius4px j-chat chat hide">确定</button>').appendTo(this.$selector);
    this.$mask = $('#mask');
    this.tabType = { contact: 0, group: 1 };
    this.tabText = { 0: '选择联系人', 1: '选择群组'};
    this.selection = { single: 0, multiple: 1 };

    this.$close.on('click', this.close.bind(this));
}
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
    }
    this.tabs = conf.tabs;
    for(var i = 0; i < this.tabs.length; i++){
        this.tabs[i].selected = this.tabs[i].selected || {};
        this.tabs[i].hidden = this.tabs[i].hidden || {};

        var html = '';
        html += ['<a href="javascript:;" class="box-sizing tc tab' + i,
            i == 0 ? ' cur' : '',
            '" data-type="select' + this.tabText[this.tabs[i].type] + '">',
            this.tabText[this.tabs[i].type],
            '</a>'].join("");
        this.tabs[i].$tab = $(html);
        this.tabs[i].$tab.on('click', this.switchTab.bind(this, this.tabs[i]));
        this.$tabs.append(this.tabs[i].$tab[0]);

        html = '';
        html += ['<ul class="list hide" data-type="select' + this.tabText[this.tabs[i].type] + '">',
            '</ul>'].join("");
        this.tabs[i].$list = $(html);
        this.$selector.append(this.tabs[i].$list[0]);

    }
    this.switchTab(this.tabs[0]);
}
selector.prototype.close = function(){
    this.$title.text('');
    this.$selector.addClass('hide');
    this.$mask.addClass('hide');
    this.$ok.removeClass('btn-ok').addClass('btn-cancel').addClass('hide').off('click');
}
selector.prototype.switchTab = function(tab){
    tab.$tab.addClass('cur');
    tab.$tab.siblings().removeClass('cur');
    tab.$list.removeClass('hide').siblings('.list').addClass('hide');
    tab.$list.empty();
    if (tab.type === this.tabType.contact) {
        this.renderContact(tab);
    } else if (tab.type === this.tabType.group) {
        this.renderGroup(tab);
    }
}
selector.prototype.renderContact = function(tab) {
    var list = currentUser.contacts.getContacts();
    this.buildList(tab, list);
}
selector.prototype.renderGroup = function(tab){
    var list = currentUser.userConversations.getUserConversations('group');
    this.buildList(tab, list);
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
        else if(tab.type == this.tabType.contact)
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
        html += ['<li class="list-item" tab-type="' + tab.type + '" data-id="' + dataId + '">',
            tab.selection == this.selection.multiple ? '<div class="opt"><i class="unchecked' + (checked ? ' checked' : '') + '"/></div>' : '',
            avatarDOM,
            '<div class="info">',
            '<h4 class="name">' + list[i].getName() + '</h4>',
            '</div>',
            '</li>'].join("");
    }
    tab.$list.append(html);
    if(tab.selection == this.selection.multiple) {
        tab.$list.find('li').each(function () {
            $(this).on('click', that.toggleCheck.bind(this, that, tab));
        });
        tab.$list.addClass('multi');
        this.$ok.removeClass('hide');
    }
    else{
        tab.$list.find('li').each(function () {
            $(this).on('click', function(){
                var selected = [];
                if(tab.type == that.tabType.group){
                    var targetId = $(this).attr('data-id');
                    selected.push(targetId);
                }

                that.onSelected({
                    type: tab.type,
                    selected: selected
                });
                that.close();
            });
        });
    }
}
selector.prototype.toggleCheck = function(that, tab){
    var $this = $(this);
    var $i = $this.find('.opt i');
    if($i.attr('class') == 'unchecked')
        $i.addClass('checked');
    else
        $i.removeClass('checked');
    if(tab.$list.find('li .opt i.checked').length == 0)
        that.$ok.removeClass('btn-ok').addClass('btn-cancel').off('click');
    else
        that.$ok.removeClass('btn-cancel').addClass('btn-ok').off('click').on('click', function() {
            var selected = [];
            tab.$list.find('li .opt i.checked').each(function () {
                var uid = $(this).parent().parent().attr('data-id');
                var user = Users.getInstance().get(uid);
                selected.push(user);
            })
            that.onSelected({
                type: tab.type,
                selected: selected
            });
            that.close();
        });
}
