'use strict';

var Contacts = function(user){
    var _list;
    var _localStorage = new contactsLocalStorage(this);
    this.user = user;
    this.updatedAt = globalMinDate;
    this.remote = new contactsRemote(this);

    this.init = function(){
        _list = _localStorage.getList();
        for(var k in _list){
            var contact = this.createContact(_list[k]);
            _list[k] = contact;
            if(this.updatedAt < contact.updatedAt)
                this.updatedAt = contact.updatedAt;
        }
    }
    /**
     * 获取联系人
     * @param userId:用户id
     * @returns contact
     */
    this.get = function(userId){
        return _list[userId];
    }
    this.createContact = function(obj){
        return new Contact(this, obj);
    }
    /**
     * 获取联系人列表
     * @returns [contact]
     */
    this.getContacts = function(){
        var foo = [];
        for(var k in _list){
            if(_list[k].isDelete)
                continue;
            foo.push(_list[k]);
        }
        return foo;
    }
    this.addContacts = function(list){
        for(var i = 0; i < list.length; i++){
            var contact = this._add(list[i]);
            if(this.updatedAt < contact.updatedAt)
                this.updatedAt = parseInt(contact.updatedAt);
        }
        if(list.length > 0)
            _localStorage.setList(_list);
    }
    this._add = function(obj){
        var contact = _list[obj['userId']];
        if(!contact)
            contact = this.createContact(obj);
        else
            contact.update(obj);
        _list[contact.userId] = contact;
        return contact;
    }
}
var contactsLocalStorage = function(contacts){
    this.contacts = contacts;
}
contactsLocalStorage.prototype.getList = function(){
    var list = localStorage.getItem(this.contacts.user.id + '_contacts');
    if(!list)
        return {};
    return JSON.parse(list);
}
contactsLocalStorage.prototype.setList = function(list){
    localStorage.setItem(this.contacts.user.id + '_contacts', JSON.stringify(list));
}
var contactsRemote = function(contacts) {
    this.contacts = contacts;
}
contactsRemote.prototype.sync = function(cb) {
    cb = cb || nop;
    var that = this;
    var url = 'users/' + that.contacts.user.id + '/contacts';
    baseRequest.get(url, that.contacts.updatedAt, that.contacts.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        that.contacts.addContacts(data.entries);
        cb(null, data.entries.length);
    })
}
/**
 * 添加联系人
 * @param userId:用户id
 * @param name:用户姓名
 * @param cb
 */
contactsRemote.prototype.add = function(userId, name, cb) {
    cb = cb || nop;
    var that = this;
    var url = 'users/' + that.contacts.user.id + '/contacts';
    var params = {
        userId: userId,
        name: name
    };
    baseRequest.post(url, params, that.contacts.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
}
/**
 * 修改联系人
 * @param contact
 * @param cb
 */
contactsRemote.prototype.store = function(contact, cb){
    cb = cb || nop;
    var that = this;
    var url = 'users/' + that.contacts.user.id + '/contacts/' + contact.id;
    var params = {
        userId: contact.userId,
        name: contact.name,
        title: contact.title,
        remark: contact.remark,
        avatarUrl: contact.avatarUrl
    }
    baseRequest.put(url, params, that.contacts.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
}
/**
 * 删除联系人
 * @param contactId
 * @param cb
 */
contactsRemote.prototype.remove = function(contactId, cb){
    cb = cb || nop;
    var that = this;
    var url = 'users/' + that.contacts.user.id + '/contacts/' + contactId;
    baseRequest.delete(url, null, that.contacts.user.token, function(err){
        if(err){
            cb(err);
            return;
        }
        cb();
    })
};

var Contact = function(contacts, obj){
    this.contacts = contacts;
    this.id = obj['id'];
    this.name = obj['name'];
    this.pinyin = obj['pinyin'];
    this.title = obj['title'];
    this.titlePinyin = obj['titlePinyin'];
    this.remark = obj['remark'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.userId = obj['userId'];
    this.user = Users.getInstance().get(this.userId);
    this.account=obj['email'];
    if(this.user === undefined)
        this.user = Users.getInstance().create(obj['userId'], obj['name'], obj['email'], obj['avatarUrl']);
    this.avatarUrl = obj['avatarUrl'] || ' ';
};
Contact.prototype.update = function(obj){
    this.name = obj['name'];
    this.pinyin = obj['pinyin'];
    this.title = obj['title'];
    this.titlePinyin = obj['titlePinyin'];
    this.remark = obj['remark'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.avatarUrl = obj['avatarUrl'] || ' ';
};
Contact.prototype.toJSON = function(){
    return {
        id: this.id,
        name: this.name,
        pinyin: this.pinyin,
        title: this.title,
        titlePinyin: this.titlePinyin,
        remark: this.remark,
        account:this.account,
        isDelete: this.isDelete,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        userId: this.userId,
        avatarUrl: this.avatarUrl
    }
}
/**
 * 获取名称
 * @returns name
 */
Contact.prototype.getName = function(){
    if(this.title && !/\s/.test(this.title) && this.title.length > 0)
        return this.title;
    return this.user.name;
}
/**
 * 获取拼音
 * @returns pinyin
 */
Contact.prototype.getPinYin = function(){
    if(this.title && this.title.length > 0)
        return this.titlePinyin;
    return this.pinyin;
}
/**
 * 获取头像
 * @returns url
 */
Contact.prototype.getAvatarUrl = function(){
    return this.user.getAvatarUrl();
}