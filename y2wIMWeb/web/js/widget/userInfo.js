var userInfo=function(){
    this.dom=$("#userInfo")

    this.dover=this.dom.find(".u-card-over").remove();
    this.dcard=this.dom.find(".u-card");

    this.dimage=this.dom.find(".u-head");
    this.dname=this.dom.find(".u-name");
    this.dremark=this.dom.find(".u-remark");
    this.daccount=this.dom.find(".u-account");

    this.dbtns=this.dom.find(".u-card-btns");
    this.dsend=this.dom.find(".u-send");
    this.dadd=this.dom.find(".u-add");

    //this.dover.on('click', this.hide.bind(this));
    this.dsend.on('click', this.talkTo.bind(this));

    var that=this;
    $("body").on('click',function(e){
        var evt = e || window.event,
            target = evt.srcElement || evt.target;
        var doms=$(target).parents("#userInfo");
        if(!doms || doms.length<=0){
            that.hide();
        }
    });
};


userInfo.prototype.show=function(e,account,btns){

    var u=Users.getInstance().get(account);
    if(!u)
        return;
    this.user=u;

    this.dname.text(u.name);
    this.daccount.find("span").text(u.account? u.account:"");
    this.dremark.find("span").text(u.name);

    var avatarUrl=u.getAvatarUrl();
    if(avatarUrl && avatarUrl != ''){
        this.dimage.attr("src", u.getAvatarUrl());
    }
    else{
        var id = u.userId ? u.userId.toString() : u.id.toString();
        var index = id.substr(id.length - 1);
        this.dimage.attr("class",' avatar-random-bg-' + index % 5).attr("src",defaultContactImageUrl);
        //avatarDOM += ' avatar-random-bg-' + index % 5 + '"><img src="' + defaultContactImageUrl + '"></span>'
    }

    if(!u.date || (new Date().getTime() - u.date.getTime())>1000*60*60){
        var that=this;
        Users.getInstance().remote.get(u.id,currentUser.token,function(err,user){
            that.user=user;
            that.daccount.find("span").text(user.account? user.account:"");
            that.dremark.find("span").text(user.name);
            var avatarUrl=user.getAvatarUrl();
            if(avatarUrl && avatarUrl != ''){
                that.dimage.attr("src", user.getAvatarUrl());
            }
            that.dname.text(user.name);
        });
    }


    var width=this.dcard.outerWidth();
    var height=this.dcard.outerHeight() || 300;
    var left= e.clientX;
    var top= e.clientY;
    left=Math.max(0,left-width);
    top=Math.max(0,top-height);
    this.dcard.css("left",left+"px").css("top",top+"px");

    if(account==currentUser.id)
        this.dbtns.addClass("hide");
    else
        this.dbtns.removeClass("hide");

    var that=this;
    setTimeout(function(){
        that.dom.removeClass("hide");
        if(btns) {
            that.dbtns.append(btns);
            that.otherBtns = btns;
        }
    },0);



};
userInfo.prototype.talkTo=function(){

    var contact=currentUser.contacts.get(this.user.id);
    if(contact) {
        y2w.openChatBox(this.user.id, "p2p");
        this.hide();
        return;
    }

    var that=this;
    currentUser.contacts.remote.add(this.user.id,this.user.name,function(error,obj){
        currentUser.contacts.remote.sync(function(){
            y2w.openChatBox(that.user.id, "p2p");
            that.hide();
        });
    });

};
userInfo.prototype.hide=function(){
    this.dom.addClass("hide");
    try {
        if (this.otherBtns)
            this.otherBtns.remove();
    }
    catch(ex){}
};