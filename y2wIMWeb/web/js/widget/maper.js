var maper=function(){

    this.hasGetJS=false;
    this.ready=false;


    this.marker=null;

    //this.init();
};

maper.prototype.init=function(cb){

    if(this.ready)
        return cb();

    var that=this;
    that.dom=$("#mapContainer");
    that.over=that.dom.find(".map-over");
    that.close=that.dom.find(".map-close");
    that.over.on('click',that.hide.bind(that));
    that.close.on('click',that.hide.bind(that));

    try {

        if(!this.hasGetJS){
            this.hasGetJS=true;
            $('<script type="text/javascript" src="http://webapi.amap.com/maps?v=1.3&key=83007dcd721230f38cbe90c94a8d121c"></script>').appendTo($("body"));
        }

        that.map = new AMap.Map('container');
        that.map.setZoom(16);

        this.ready=true;
        cb();
    }catch(ex){

        setTimeout(function () {
            that.init(cb);
        }, 2000);

    }
};



maper.prototype.show=function(longitude,latitude){

    var that=this;
    this.init(function(){
        that.dom.removeClass("hide");

        that.map.setCenter([longitude,latitude]);

        if(that.marker)
            that.marker.setMap();

        that.marker = new AMap.Marker({
            position: [longitude,latitude],
            map:that.map
        });
    });
};

maper.prototype.hide=function(){
    this.dom.addClass("hide");
};
