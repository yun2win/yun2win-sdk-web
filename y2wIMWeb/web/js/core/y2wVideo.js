function RTCManager() {
    //var channel_url = "http://meeting-api.liyueyun.com:80/";//http://47.90.13.178:82/
    var channel_url = "http://meeting-hz-t.liyueyun.com:88/";
    //var channel_url = "http://192.168.0.135:88/";
      var room_url = "http://121.40.215.56:18080/";
    var that = this;
    /*
   *创建群聊
   *callback回调方法
   */
    this.createVideo = function (myuserID,token,callback) {
        $.ajax({
            url: channel_url + "v1/meetrooms/room",
            type: 'POST',
            data: { userId: myuserID, deviceType: "Web" },//loginAera:"JP"
            dataType: 'json',
            beforeSend: function (req) {
                if (token)
                    req.setRequestHeader('Authorization', 'Bearer ' + token);
            },
            success: function (data) {

                var channelId = data.channelId;
                callback(null, channelId);    
            },
            error: function (e) {
                callback(e, null);
            }
        });
    }
    /*
    *保存会议
    *callback回调方法
    *type  "enum": [ "p2p" , "group" , "conference" ]
     *mode "enum": [ "A" , "AV" ,".."] A音频 V视频 S桌面共享 W白板
    */
    this.saveChannelInfo = function (channelId, type, mode, token,callback) {
        $.ajax({
            url: room_url + "v1/rooms",
            type: 'POST',
            data: { channelId: channelId, type: type, mode: mode},
            dataType: 'json',
            beforeSend: function (req) {
                if (token)
                    req.setRequestHeader('Authorization', 'Bearer ' + token);
            },
            success: function (data) {
                var roomId = data.id;
                callback(null, roomId);
            },
            error: function (e) {
                callback(e, null);
            }
        });
    }


    /*
 *保存会议单个成员体
 *callback回调方法
 */

    this.saveChannelMember = function (roomId, channelId, uid, name,avatar, token, callback) {
        $.ajax({
            url: room_url + "v1/rooms/" + roomId + "/members",
            type: 'POST',
            data: { channelId: channelId, uid: uid, name: name, avatar:avatar },
            dataType: 'json',
            beforeSend: function (req) {
                if (token)
                    req.setRequestHeader('Authorization', 'Bearer ' + token);
            },
            success: function (data) {
                var memberId = data.id;
                callback(null, memberId);
            },
            error: function (e) {
                callback(e, null);
            }
        });
    }
    /*
    *快速接入数据
    *validTime  有效时间（单位：小时）,0或不填为永久
    */
    this.quickStart = function (validTime, content,token, callback) {
        $.ajax({
            url: room_url + "v1/datas",
            type: 'POST',
            data: { validTime: validTime, content: content },
            dataType: 'json',
            beforeSend: function (req) {
                if (token)
                    req.setRequestHeader('Authorization', 'Bearer ' + token);
            },
            success: function (data) {
                var dataId = data.id;
                callback(null, dataId);
            },
            error: function (e) {
                callback(e, null);
            }
        });
    }
    /*
    *一步到位
    */
    this.gotoVideoAudio = function (channelId, roomId,channmode, type, userId, username, useravatarUrl, imToken, callback) {
        if (channelId == null) {
            that.createVideo(userId, imToken, function (error, channelId) {
                if (error) {
                    callback(error, null);
                    return;
                }
                that.saveChannelInfo(channelId, type, channmode, imToken, function (error, roomId) {
                    if (error) {
                        callback(error, null);
                        return;
                    }
                    saveMyuserInfo(channelId,roomId,userId,username,useravatarUrl,imToken,callback);
                });
            });
        } else {
            if (roomId == null) {
                that.saveChannelInfo(channelId, type, channmode, imToken, function (error, roomId) {
                    if (error) {
                        callback(error, null);
                        return;
                    }
                    saveMyuserInfo(channelId, roomId, userId, username, useravatarUrl, imToken, callback);
                });
            } else {
                saveMyuserInfo(channelId, roomId, userId, username, useravatarUrl, imToken, callback);
            }
        }  
}


var saveMyuserInfo=function(channelId,roomId,userId,username,useravatarUrl,imToken,callback){      
    that.saveChannelMember(roomId, channelId, userId, username, useravatarUrl, imToken, function (error, memberid) {
        if (error) {
            callback(error,null);
            return;
        }
        var content = {
            roomId: roomId,
            memberid: memberid,
            imToken: imToken
        };

        that.quickStart(12,  JSON.stringify(content), imToken,function (error, dataId) {
            if (error) {
                callback(error,null);
                return;
            }
            var result ={
                channelId:channelId,
                dataId: dataId,
                roomId: roomId
            }
            callback(null,result);
        });
    });
 }
}
