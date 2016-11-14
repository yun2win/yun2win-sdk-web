
var networker = function(){

    this.dom=$("#networkStatus");

    this.pServer=false;
    this.dServer=true;


    var that=this;
    Util.httpClient.onConnectionStatusChanged=function(error,status){
        if(status!="connected"){
            that.dServer=false;
        }
        else{
            that.dServer=true;
        }
        that.render();
    };

    this.dom.on('click',function(e){
        alert($(this).attr("title"));
    });
};


networker.prototype.change=function(status){

    if(status!="connected"){
        this.pServer=false;
    }
    else{
        this.pServer=true;
    }
    this.render();

};

networker.prototype.render=function(){

    if(this.pServer && this.dServer){
        this.dom.addClass("hide").attr("title","服务器连接正常");
    }
    else if(!this.pServer){
        this.dom.removeClass("hide").attr("title","网络异常,未能连接到服务器,正在努力连接中...");
    }
    else{
        this.dom.removeClass("hide").attr("title","网络异常,未能连接到数据服务器.");
    }

};
