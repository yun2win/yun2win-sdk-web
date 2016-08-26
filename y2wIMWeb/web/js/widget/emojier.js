var emojier=function(){
    this.dom=$("#emojier")

    this.dbody=this.dom.find(".emoji-card-body");
    this.dtabs=this.dom.find(".emoji-card-tabs");

    this.dbody.on('click',this.addEmoji.bind(this));
    var that=this;
    $("body").on('click',function(e){
        var evt = e || window.event,
            target = evt.srcElement || evt.target;
        var doms=$(target).parents("#emojier");
        if(!doms || doms.length<=0) {
            that.hide();
        }
    });


};

emojier.prototype.addEmoji=function(e){

    var evt = e || window.event,
        target = evt.srcElement || evt.target;

    y2w.$messageText.val(y2w.$messageText.val()+"["+$(target).attr("alt")+"]");
    y2w.$messageText.focus();
    this.hide();

};

emojier.prototype.show=function(pkg){

    var that=this;
    that.dtabs.empty();
    that.dbody.empty();

    var pkgs=currentUser.emojis.getPackages();
    if(!pkg && pkgs.length>0)
        pkg=pkgs[0];
    for(var i=0;i<pkgs.length;i++){
        var p=pkgs[i];
        var d=$("<div class='emoji-card-tab "+(p==pkg?'emoji-card-tab-active':'')+"'>"+p+"</div>").appendTo(that.dtabs);
        if(p!=pkg)
            d.on('click',this.show.bind(this,p));
    }

    var emojis=currentUser.emojis.getEmojis(pkg);
    var width=0;
    var height=0;
    for(var i=0;i<emojis.length;i++) {
        var em = emojis[i];
        if(width<em.width)
            width=em.width;
        if(height<em.height)
            height=em.height;
    }
    for(var i=0;i<emojis.length;i++){
        var em=emojis[i];
        $('<div class="emoji-item"><img src="'+em.getUrl()+'" title="'+em.name+'" alt="'+em.name+'"/></div>').appendTo(that.dbody);
    }

    setTimeout(function(){
        that.dom.removeClass("hide");
    },0);



};
emojier.prototype.hide=function(){
    this.dom.addClass("hide");
};