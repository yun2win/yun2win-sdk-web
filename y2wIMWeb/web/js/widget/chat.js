var chat = function(){

}
chat.prototype.makeTimeTag = function(time, invisible){
    return '<p class="u-msgTime' + (invisible ? ' invisible' : '') + '">——————————————<span class="msgTime">&nbsp;'+time+'&nbsp;</span>——————————————</p>';
};
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
};
chat.prototype.buildChatContentUIOfNoRight = function(){
    var msgHtml = '<p class="u-notice tc item" data-time="" data-id="" data-idServer=""><span class="radius5px">您已不在此群中</span></p>';
    return msgHtml;
};
chat.prototype.updateChatContentUI = function(msg){
    var msgHtml = this.makeTimeTag(transTime(msg.createdAt), true);
    msgHtml += this.makeChatContent(msg);
    return msgHtml;
};
chat.prototype.makeChatContent = function(message){
    var msgHtml;
    //if(!message.from)
    //    return "<div></div>";
    if(!message.from)
        message.from={};
    //通知类消息
    if (message.type == 'system') {
        msgHtml =  '<div class="u-notice tc item" data-time="'+ message.createdAt +'" data-id="'+ message.id +'"><span class="radius5px">'+(message.content.text || message.content)+'</span></div>';
    }else{
        //聊天消息
        var type = message.type,
            from = message.from ,
            avatarUrl = from.getAvatarUrl(),
            scene = message.messages.session.type,
            showName = scene === 'group' && from.userId !== currentUser.id,
            name = showName ? from.name : '',
            contentDOM = '',
            avatarDOM = '<div class="item-avatar" data-account="' + (from.userId?from.userId:from.id) + '">';
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
            case 'task':
            case 'av':
                contentDOM = '<div class="msg"><div class="box"><div class="cnt">';
                contentDOM += this.getMessage(message);
                contentDOM += '</div></div></div>';
                break;

            case 'audio':
                contentDOM = '<div class="msg"><div class="box"><div class="cnt">';
                contentDOM += this.getMessage(message);
                contentDOM += '</div></div></div>';
                break;
            case 'image':
            case 'video':
            case 'location':
                contentDOM = '<div class="image">';
                contentDOM += this.getMessage(message);
                contentDOM += '</div>';
                break;
            case 'file':
                contentDOM = '<div class="msg"><div class="box"><div class="cnt"><div class="default-width">';
                contentDOM += this.getMessage(message);
                contentDOM += '</div></div></div></div>';
                break;
            default:
                contentDOM = '<div class="msg"><div class="box"><div class="cnt"><div class="default-width">';
                contentDOM += '未知类型消息，请在移动端开启';
                contentDOM += '</div></div></div></div>';
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
};
/**
 * 根据消息的发送人，构造发送方，注意：发送人有可能是自己
 * @param msg：消息对象
 */
chat.prototype.buildSender = function(msg) {
    var sender = '';
    var from = msg.from.userId || msg.from.id;
    var to =msg.to?(msg.to.userId || msg.to.id):'';
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
};
chat.prototype.getMessage = function(msg) {
    var str = '',
        url = msg.file ? _$escape(msg.file.url) : '',
        sentStr = (msg.from.id!==currentUser.id)?"收到":"发送";
    switch (msg.type) {
        case 'text':
        case 'task':
            //var re = /(http[s]?:\/\/[\w\.\/\?\&=@;:]+[\.][\w]{2,4}[\w\.\/\?\&=@;:]+)(?!\&nbsp;)(?![^<]+>)/gi; // 识别链接
            var re = /(http[s]?:\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?)/gi; // 识别链接
            var text = msg.content.text == undefined ? msg.content : msg.content.text;
            str = _$escape(text);
            //str = str.replace(re, "<a href='#' data-href='$1' >$1</a>");
            str = str.replace(re, "<a href='$1' target='_blank' >$1</a>");

            var matchs=str.match(/\[[^\]]{1,5}\]/ig);
            if(matchs)
            for(var i=0;i<matchs.length;i++){
                var k=matchs[i];
                var ename= k.replace("[","").replace("]","");
                var emoji=currentUser.emojis.get(ename);
                if(!emoji)
                    continue;

                str=str.replace(k,"<img class='emoji' src='"+emoji.getUrl()+"'/>");
            }
            str ="<div class='default-width'>"+str+"</div>";
            break;
        case 'av':
            var text = msg.content.text == undefined ? msg.content : msg.content.text;
            str = _$escape(text);
            str ="<div class='default-width'>"+str+"</div>";
            break;
        case 'image':
            var src;
            if(msg.content.base64 == undefined)
                src = parseAttachmentUrl(msg.content.thumbnail,currentUser.token);//config.baseUrl + msg.content.src + '?access_token=' + currentUser.token;
            else
                src = msg.content.base64;

            var tsrc=parseAttachmentUrl(msg.content.src,currentUser.token);
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
                str = '<a href="' + tsrc + '" data-thumbnail="' + src + '" data-gallery="message"><img src="' + src + '" style="width:' + width + 'px; height:' + height + 'px" /></a>';
            }
            else
                str = '<a href="' + tsrc + '" data-thumbnail="' + src + '" data-gallery="message"><img src="' + src + '" /></a>';

            break;
        case 'location':
            var src = parseAttachmentUrl(msg.content.thumbnail,currentUser.token);//config.baseUrl + msg.content.src + '?access_token=' + currentUser.token;

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
                str = '<a onclick="y2w.maper.show('+msg.content.longitude+','+msg.content.latitude+')"  ><img src="' + src + '" style="width:' + width + 'px; height:' + height + 'px" /></a>';
            }
            else
                str = '<a  onclick="y2w.maper.show('+msg.content.longitude+','+msg.content.latitude+')"  ><img src="' + src + '" /></a>';

            //if(msg.status === -1){
            //    str = '<p>['+msg.message.message+']</p>';
            //}else{
            //    msg.file.url = _$escape(msg.file.url);
            //    str = '<a href="' + msg.file.url + '?imageView" target="_blank"><img onload="loadImg()" data-src="' + msg.file.url + '" src="' + msg.file.url + '?imageView&thumbnail=200x0&quality=85"/></a>';
            //}
            break;
        case 'file':
            var src = parseAttachmentUrl(msg.content.src,currentUser.token,msg.content.name);//config.baseUrl + msg.content.src + '/'+msg.content.name+'?access_token=' + currentUser.token;

            var ext="";
            var name=msg.content.name||"";
            var index =name.lastIndexOf(".");
            if(index>=0)
                ext=name.substr(index+1);
            ext=ext.toLowerCase();

            var icon="";
            switch(ext){
                case "apk":icon="message_file_apk.png";break;
                case "txt":icon="message_file_txt.png";break;
                case "pdf":icon="message_file_pdf.png";break;
                case "ppt":
                case "pptx":icon="message_file_ppt.png";break;
                case "xls":
                case "xlsx":icon="message_file_xls.png";break;
                case "doc":
                case "docx":icon="message_file_doc.png";break;
                case "7z":
                case "zip":
                case "rar":icon="message_file_zip.png";break;
                case "jpg":
                case "jpeg":
                case "png":
                case "bmp":
                case "gif":
                case "tip":icon="message_file_pic.png";break;
                case "audio":
                case "mp3":
                case "wma":
                case "wav":
                case "ogg":
                case "m4a":
                case "mid":
                case "xmf":
                case "amr":
                case "aac":icon="message_file_audio.png";break;
                case "video":
                case "wmv":
                case "3gp":
                case "mp4":
                case "rmvb":
                case "avi":icon="message_file_video.png";break;
                default: icon="message_file_unknow.png";break;
            }

            var capacity=Util.parseCapacity(msg.content.size);

            str='<a class="download-file" href="'+src+'" f-maxWid><img src="images/'+icon+'"/><span class="ftitle">'+msg.content.name+'</span><span class="fremark">'+capacity+'</span><span class="downloading">下载中</span></a>';

            //if(msg.status === -1){
            //    str = '<p>['+msg.message.message+']</p>';
            //}else{
            //    if (/png|jpg|bmp|jpeg|gif/i.test(msg.file.ext)) {
            //        msg.file.url = _$escape(msg.file.url);
            //        str = '<a class="f-maxWid" href="' + msg.file.url + '?imageView" target="_blank"><img data-src="' + msg.file.url + '" src="' + msg.file.url + '?imageView&thumbnail=200x0&quality=85"/></a>';
            //    } else if (!/exe|bat/i.test(msg.file.ext)) {
            //        url += msg.file ? '?download=' + encodeURI(_$escape(msg.file.name)): '';
            //        str = '<a href="' + url + '" target="_blank" class="download-file f-maxWid"><span class="icon icon-file2"></span>' +_$escape(msg.file.name) + '</a>';
            //    } else {
            //        str = '<p>[非法文件，已被本站拦截]</p>';
            //    }
            //}
            break;
        case 'video':
            var src= parseAttachmentUrl(msg.content.thumbnail,currentUser.token);
            var tsrc=parseAttachmentUrl(msg.content.src,currentUser.token);
            tsrc=tsrc.replace("/content?","/content/"+msg.content.name+"?");
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
                str = '<a title="'+(msg.content.name||'') +'" href="' + tsrc + '" type="video/mp4" data-poster="' + src + '" data-gallery="message"><img src="' + src + '" style="width:' + width + 'px; height:' + height + 'px" /></a>';
            }
            else
                str = '<a title="'+(msg.content.name||'') +'"  href="' + tsrc + '" type="video/mp4" data-poster="' + src + '" data-gallery="message"><img src="' + src + '" /></a>';

            break;
        case 'audio':
            if(!!window.Audio){
                var src= parseAttachmentUrl(msg.content.src,currentUser.token);
                if(msg.from === currentUser.id&&msg.from!==msg.to){
                    str ='<div class="u-audio j-mbox right"> <a href="javascript:;" class="j-play playAudio" data-dur="'+msg.content.second+'"  data-src="'+ src+'">点击播放</a><b class="j-duration">'+Math.floor((msg.content.second))+'"</b><span class="u-icn u-icn-play" title="播放音频"></span></div>'
                }else{
                    str ='<div class="u-audio j-mbox left"> <a href="javascript:;" class="j-play playAudio" data-dur="'+msg.content.second+'"  data-src="'+ src+'">点击播放</a><b class="j-duration">'+Math.floor((msg.content.second))+'"</b><span class="u-icn u-icn-play" title="播放音频"></span></div>'
                }
            }else{
                str = '<a href="' + url + '" target="_blank" class="download-file"><span class="icon icon-file2"></span>[一条语音消息]</a>';
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
};
chat.prototype.contextmenu = function($div){

    $div.contextPopup({
        title: null,
        items: [
            {   label:'消息撤回',
                check:function(e){
                    var evt = e || window.event,
                        target = evt.srcElement || evt.target;
                    var doms=$(target).parents(".item");
                    if(doms.attr("class") && doms.attr("class").indexOf("item-me")>=0){
                        return true;
                    }
                    return false;
                },
                action:function(e) {
                    //$(e.target).parents(".item").attr("data-id")
                    var evt = e || window.event,
                        target = evt.srcElement || evt.target;
                    var doms=$(target).parents(".item");
                    var id=doms.attr("data-id");
                    var msg=currentUser.currentSession.messages.get(id);
                    if(!msg)
                        return;

                    msg.content= {text:currentUser.name+"撤回了一条消息"};
                    msg.type="system";

                    var mrmote=currentUser.currentSession.messages.remote;

                    mrmote.update(msg,function(){
                        y2w.syncMessages(currentUser.currentSession.getConversation(),true,function(){

                            var imSession = currentUser.y2wIMBridge.transToIMSession(currentUser.currentSession);
                            //发送通知
                            var syncs = [
                                {type: currentUser.y2wIMBridge.syncTypes.userConversation},
                                {type: currentUser.y2wIMBridge.syncTypes.message, sessionId: imSession.id}
                            ];
                            currentUser.y2wIMBridge.sendMessage(imSession, syncs);

                        });
                    });
                }
            },
            {   label:'引用',
                check:function(e){
                    var evt = e || window.event,
                        target = evt.srcElement || evt.target;
                    var doms=$(target).parents(".item");
                    var id=doms.attr("data-id");
                    if(!id)
                        return false;
                    var msg=currentUser.currentSession.messages.get(id);
                    if(msg.type=="text")
                        return true;
                    return false;
                },
                action:function(e) {
                    //$(e.target).parents(".item").attr("data-id")
                    var evt = e || window.event,
                        target = evt.srcElement || evt.target;
                    var doms=$(target).parents(".item");
                    var scene=doms.attr("data-scene");
                    var id=doms.attr("data-id");

                    var msg=currentUser.currentSession.messages.get(id);
                    if(!msg)
                        return;

                    var name="";
                    if(msg.from && msg.from.name)
                        name=msg.from.name+": ";
                    var text=msg.content;
                    if(msg.content && msg.content.text)
                        text=msg.content.text;
                    var content="「"+name+text+"」\n—————————\n";
                    y2w.$messageText.val(y2w.$messageText.val()+content);
                    y2w.$messageText.focus();

                    //alert('clicked 1');
                }
            },
            {   label:'转发',
                check:function(e){
                    var evt = e || window.event,
                        target = evt.srcElement || evt.target;
                    var doms=$(target).parents(".item");
                    var id=doms.attr("data-id");
                    if(!id)
                        return false;
                    var msg=currentUser.currentSession.messages.get(id);
                    if(msg.type=="system")
                        return false;
                    return true;
                },
                action:function(e) {
                    //$(e.target).parents(".item").attr("data-id")
                    var evt = e || window.event,
                        target = evt.srcElement || evt.target;
                    var doms=$(target).parents(".item");
                    var scene=doms.attr("data-scene");
                    var id=doms.attr("data-id");

                    var msg=currentUser.currentSession.messages.get(id);
                    if(!msg)
                        return;

                    var dataSource=[];

                    var us=currentUser.userConversations.getUserConversations();
                    for(var i=0;i<us.length;i++){
                        var u=us[i];
                        if(u.type=='p2p' || u.type=='group') {
                            dataSource.push({
                                id: u.id,
                                name: u.name,
                                avatarUrl: u.getAvatarUrl()
                            });
                        }
                    }

                    var single=false;
                    var selectorConf = {};
                    selectorConf.title = '选择';// obj.title;
                    var tab = {};
                    tab.type = 99;
                    tab.avatar = true;//obj.avatar;
                    tab.selection = single ? 0 : 1;
                    tab.hidden = {};
                    tab.selected = {};
                    tab.title =  "所有会话";//obj.title;
                    tab.folder = false; //obj.folder;
                    tab.selectFolder = false;//!!obj.selectFolder;
                    tab.dataSource =  dataSource;
                    selectorConf.tabs = [ tab ];
                    selectorConf.onSelected = function (obj) {


                        var selectedUs=[];

                        for(var i=0;i<obj.selected.length;i++){
                            var id=obj.selected[i];

                            for(var j=0;j<us.length;j++){
                                var u=us[j];
                                if(u.id==id) {
                                    selectedUs.push(u);
                                    break;
                                }
                            }
                        }

                        var options = {
                            count:selectedUs.length,
                            //showMsg: that.showMsg.bind(that),
                            //storeMsgFailed: that.storeMsgFailed.bind(that),
                            storeMsgDone: function(){
                                this.count--;
                                if(this.count<=0){
                                    currentUser.userConversations.remote.sync(function(err, count){
                                        if(err){
                                            //cb(err);
                                            return;
                                        }
                                        if(count > 0 && y2w.tab.curTabType == y2w.tab.tabType.userConversation)
                                            y2w.tab.userConversationPanel.render(true);
                                        //cb();

                                        var currentUC = currentUser.currentSession.getConversation();

                                        var find = false;
                                        for(var i=0;i<selectedUs.length;i++){
                                            if(selectedUs[i].id == currentUC.id){
                                                find = true;
                                                break;
                                            }
                                        }
                                        if(find){
                                            y2w.syncMessages(currentUC);
                                        }
                                    });
                                }
                            }
                        };

                        for(var i=0;i<selectedUs.length;i++){
                            var su=selectedUs[i];
                            console.log(su.targetId);
                            console.log(su.type);
                            currentUser.y2wIMBridge.sendCopyMessage( su.targetId, su.type ,msg.content,msg.type,options);
                        }



                    };
                    y2w.selector.show(selectorConf);



                    //alert('clicked 1');
                }
            },
            {   label:'下载',
                check:function(e){
                    var evt = e || window.event,
                        target = evt.srcElement || evt.target;
                    var doms=$(target).parents(".item");
                    if(doms.find(".image").length>0){
                        return true;
                    }
                    return false;
                },
                getUrl:function(e){
                    var evt = e || window.event,
                        target = evt.srcElement || evt.target;
                    var doms=$(target).parents(".image").find("img");
                    var url=doms.attr("src");
                    return url;
                },
                action:function(e) {
                    //$(e.target).parents(".item").attr("data-id")
                    //var evt = e || window.event,
                    //    target = evt.srcElement || evt.target;
                    //var doms=$(target).parents(".image").find("img");
                    //var url=doms.attr("src");
                    //if(url)
                    //    window.open(url, "a1");
                }
            },

        ]
    });
};