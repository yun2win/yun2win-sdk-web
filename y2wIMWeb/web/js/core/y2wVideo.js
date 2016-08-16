function RTCManager() {
    //var channel_url = "https://meeting-api.liyueyun.com:443/";//http://47.90.13.178:82/
    var channel_url = "https://192.168.0.165:460/";//var channel_url = "https://meeting-hz-t.liyueyun.com:460/";
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
}
