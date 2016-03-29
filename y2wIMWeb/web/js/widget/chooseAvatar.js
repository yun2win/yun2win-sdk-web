/**
 * 选择头像
 */
var chooseAvatar = function(){
    this.$chooseAvatar = $('<div class="chooseAvatar hide"></div>').appendTo($('body'));
    this.$cancel = $('<i class="close"></i>').appendTo(this.$chooseAvatar);
    this.$chooseAvatar.append('<h3 class="title">更换头像</h3>');
    this.$content = $('<div class="content"></div>').appendTo(this.$chooseAvatar);
    this.$imageEditor = $('<div class="image-editor"></div>').appendTo(this.$content);
    this.$footer = $('<div class="footer"></div>').appendTo(this.$chooseAvatar);
    this.$save = $('<button class="f-fr btn btn-ok radius5px save">保存</button>').appendTo(this.$footer);
    this.$choose = $('<button class="f-fl btn btn-edit radius5px radius4p choose">选择图片</button>').appendTo(this.$footer);
}
chooseAvatar.prototype.show = function(options){
    var that = this;
    this.$file = $('<input type="file" class="cropit-image-input hide" />');
    this.$imageEditor.append(this.$file);
    this.$imageEditor.append('<div class="cropit-preview" />');
    this.$imageEditor.append('<div class="cropit-preview-zoom-bar"><img src="images/image.png" class="cropit-preview-zoom-image-min" /><input type="range" class="cropit-image-zoom-input" /><img src="images/image.png" class="cropit-preview-zoom-image-max" /></div>');
    this.$chooseAvatar.removeClass('hide');
    this.$imageEditor.cropit();
    this.$choose.on('click', function(){
        that.$file.click();
    });
    this.$save.on('click', function() {
        var imageData = that.$imageEditor.cropit('export');
        //window.open(imageData);
        var fileName = guid() + '.png';
        currentUser.attchments.uploadBase64Image(fileName, imageData, function(err, data){
            if(err){
                console.error(err);
                return;
            }
            else{
                currentUser.avatarUrl = 'attachments/' + data.id + '/content';
                currentUser.remote.store(function(err){
                    if(err){
                        console.error(err);
                        return;
                    }
                    that.hide();
                    if(options.onChange)
                        options.onChange();
                })
            }
        })
    });
    this.$cancel.on('click', function(){
        that.hide();
        if(options.onCancel)
            options.onCancel();
    })
}
chooseAvatar.prototype.hide = function(){
    this.$imageEditor.cropit('destroy');
    this.$imageEditor.empty();
    this.$chooseAvatar.addClass('hide');
    this.$choose.off('click');
    this.$save.off('click');
}