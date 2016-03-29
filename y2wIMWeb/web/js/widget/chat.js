var chat = function(){

}
chat.prototype.makeTimeTag = function(time, invisible){
    return '<p class="u-msgTime' + (invisible ? ' invisible' : '') + '">——————————————<span class="msgTime">&nbsp;'+time+'&nbsp;</span>——————————————</p>';
}
chat.prototype.buildChatContentUI = function(msgs){
    var msgHtml = "";
    if(msgs.length===0){
        msgHtml = '<div class="no-msg tc"><span class="radius5px">暂无消息</span></div>';
    }else{
        for (var i = 0, l = msgs.length; i < l; ++i) {
            var message = msgs[i],
                user = message.from;
            //消息时间显示
            var invisible = false;
            if(i > 0 && message.createdAt-msgs[i-1].createdAt<=5*60*1000)
                invisible = true;
            msgHtml += this.makeTimeTag(transTime(message.createdAt), invisible);
            msgHtml += this.makeChatContent(message,user);
        }
    }
    return msgHtml;
}
chat.prototype.buildChatContentUIOfNoRight = function(){
    var msgHtml = '<p class="u-notice tc item" data-time="" data-id="" data-idServer=""><span class="radius5px">您已不在此群中</span></p>';
    return msgHtml;
}
chat.prototype.updateChatContentUI = function(msg){
    var msgHtml = this.makeTimeTag(transTime(msg.createdAt), true);
    msgHtml += this.makeChatContent(msg);
    return msgHtml;
}
chat.prototype.makeChatContent = function(message){
    var msgHtml;
    //通知类消息
    if (message.type == 'system') {
        msgHtml =  '<div class="u-notice tc item" data-time="'+ message.createdAt +'" data-id="'+ message.id +'"><span class="radius5px">'+message.content.text+'</span></div>';
    }else{
        //聊天消息
        var type = message.type,
            from = message.from,
            avatarUrl = from.getAvatarUrl(),
            scene = message.messages.session.type,
            showName = scene === 'group' && from.userId !== currentUser.id,
            name = showName ? from.name : '',
            contentDOM = '',
            avatarDOM = '<div class="item-avatar" data-account="' + from.userId + '">';
        avatarDOM += '<span class="avatar avatar-chat';
        if(avatarUrl && avatarUrl != ''){
            avatarDOM += '"</span><img src="'+avatarUrl+'" data-account="' + from + '"/></span>';
        }
        else{
            var id = from.userId ? from.userId.toString() : from.id.toString();
            var index = id.substr(id.length - 1);
            avatarDOM += ' avatar-random-bg-' + index % 5 + '"><img src="' + defaultContactImageUrl + '"></span>'
        }
        if(showName)
            avatarDOM += '<span class="name">' + name + '</span>';
        avatarDOM += '</div>';
        switch (type){
            case 'text':
                contentDOM = '<div class="msg"><div class="box"><div class="cnt">';
                contentDOM += this.getMessage(message);
                contentDOM += '</div></div></div>';
                break;
            case 'image':
                contentDOM = '<div class="image">';
                contentDOM += this.getMessage(message);
                contentDOM += '</div>';
                break;
        }
        msgHtml = ['<div data-time="'+ message.createdAt +'" data-id="'+ message.id +'" class="item item-' + this.buildSender(message) + '">',
            avatarDOM,
            contentDOM,
            message.status === "storing"?'<span class="storing"></span>':'',
            message.status === "fail"?'<span class="error"><i class="icon icon-error"></i>发送失败</span>':'',
            '</div>'].join('');
    }
    return msgHtml;
}
/**
 * 根据消息的发送人，构造发送方，注意：发送人有可能是自己
 * @param msg：消息对象
 */
chat.prototype.buildSender = function(msg) {
    var sender = '';
    var from = msg.from.userId || msg.from.id;
    var to = msg.to.userId || msg.to.id;
    if (from === to) {
        if (msg.fromClientType==="Web") {
            sender = 'me';
        } else {
            sender= 'you';
        }
    } else {
        if (from === currentUser.id && !msg.fromClientType) {
            sender = 'me';
        } else {
            sender = 'you';
        }
        if (from === currentUser.id && to != currentUser.id) {
            sender = 'me';
        }
    }
    return sender;
}
chat.prototype.getMessage = function(msg) {
    var str = '',
        url = msg.file ? _$escape(msg.file.url) : '',
        sentStr = (msg.from.id!==currentUser.id)?"收到":"发送";
    switch (msg.type) {
        case 'text':
            var re = /(http:\/\/[\w.\/]+)(?![^<]+>)/gi; // 识别链接
            var text = msg.content.text == undefined ? msg.content : msg.content.text;
            str = _$escape(text);
            str = str.replace(re, "<a href='$1' target='_blank'>$1</a>");

            str ="<div class='default-width'>"+str+"</div>"
            break;
        case 'image':
            var src;
            if(msg.content.base64 == undefined)
                src = config.baseUrl + msg.content.src + '?access_token=' + currentUser.token;
            else
                src = msg.content.base64;
            var maxWidth = 290;
            var width;
            var height;
            if(msg.content.width){
                if(msg.content.width < maxWidth){
                    width = msg.content.width;
                    height = msg.content.height;
                }
                else{
                    height = parseInt(msg.content.height * maxWidth / msg.content.width);
                    width = maxWidth;
                }
                str = '<img src="' + src + '" style="width:' + width + 'px; height:' + height + 'px" />';
            }
            else
                str = '<img src="' + src + '" />';

            //if(msg.status === -1){
            //    str = '<p>['+msg.message.message+']</p>';
            //}else{
            //    msg.file.url = _$escape(msg.file.url);
            //    str = '<a href="' + msg.file.url + '?imageView" target="_blank"><img onload="loadImg()" data-src="' + msg.file.url + '" src="' + msg.file.url + '?imageView&thumbnail=200x0&quality=85"/></a>';
            //}
            break;
        case 'file':
            if(msg.status === -1){
                str = '<p>['+msg.message.message+']</p>';
            }else{
                if (/png|jpg|bmp|jpeg|gif/i.test(msg.file.ext)) {
                    msg.file.url = _$escape(msg.file.url);
                    str = '<a class="f-maxWid" href="' + msg.file.url + '?imageView" target="_blank"><img data-src="' + msg.file.url + '" src="' + msg.file.url + '?imageView&thumbnail=200x0&quality=85"/></a>';
                } else if (!/exe|bat/i.test(msg.file.ext)) {
                    url += msg.file ? '?download=' + encodeURI(_$escape(msg.file.name)): '';
                    str = '<a href="' + url + '" target="_blank" class="download-file f-maxWid"><span class="icon icon-file2"></span>' +_$escape(msg.file.name) + '</a>';
                } else {
                    str = '<p>[非法文件，已被本站拦截]</p>';
                }
            }
            break;
        case 'video':
            // str = '<a href="' + url + '" target="_blank" class="download-file"><span class="icon icon-file2"></span>[你收到了一条视频消息]</a>';
            str= '<video src= "'+url+'" controls>您的浏览器不支持 video 标签。</video>';

            break;
        case 'audio':
            if(!!window.Audio){
                if(msg.from === userUID&&msg.from!==msg.to){
                    str ='<div class="u-audio j-mbox right"> <a href="javascript:;" class="j-play playAudio" data-dur="'+msg.file.dur+'"  data-src="'+ url+'">点击播放</a><b class="j-duration">'+Math.floor((msg.file.dur)/1000)+'"</b><span class="u-icn u-icn-play" title="播放音频"></span></div>'
                }else{
                    str ='<div class="u-audio j-mbox left"> <a href="javascript:;" class="j-play playAudio" data-dur="'+msg.file.dur+'"  data-src="'+ url+'">点击播放</a><b class="j-duration">'+Math.floor((msg.file.dur)/1000)+'"</b><span class="u-icn u-icn-play" title="播放音频"></span></div>'
                }
            }else{
                str = '<a href="' + url + '" target="_blank" class="download-file"><span class="icon icon-file2"></span>['+sentStr+'一条语音消息]</a>';
            }
            break;
        case 'geo':
            str = sentStr+'一条[地理位置]消息';
            break;
        case 'custom':
            var content = JSON.parse(msg.content);
            if(content.type===1){
                str = sentStr+'一条[猜拳]消息,请到手机或电脑客户端查看';
            }else if(content.type===2){
                str = sentStr+'一条[阅后即焚]消息,请到手机或电脑客户端查看';
            }else if(content.type===3){
                var catalog = _$escape(content.data.catalog),
                    chartlet = _$escape(content.data.chartlet);
                str = '<img class="chartlet" onload="loadImg()" src="./images/'+catalog+'/' +chartlet+'.png">';
            }else if(content.type==4){
                str = sentStr+'一条[白板]消息,请到手机或电脑客户端查看';
            }else{
                str = sentStr+'一条[自定义]消息，请到手机或电脑客户端查看';
            }
            break;
        default:
            str = sentStr+'一条[未知消息类型]消息';
            break;
    }
    return str;
}