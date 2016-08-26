var maper=function(){



    var that=this;
    setTimeout(function(){
        that.dom=$("#mapContainer");
        that.over=that.dom.find(".map-over");
        that.close=that.dom.find(".map-close");
        that.over.on('click',that.hide.bind(that));
        that.close.on('click',that.hide.bind(that));

        that.map = new AMap.Map('container');
        that.map.setZoom(16);
    },1000);

    this.marker=null;

};

maper.prototype.init=function(){

};

maper.prototype.show=function(longitude,latitude){
    this.dom.removeClass("hide");

    this.map.setCenter([longitude,latitude]);

    if(this.marker)
        this.marker.setMap();

    this.marker = new AMap.Marker({
        position: [longitude,latitude],
        map:this.map
    });
};

maper.prototype.hide=function(){
    this.dom.addClass("hide");
};
