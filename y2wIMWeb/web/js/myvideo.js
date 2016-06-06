window.onload = function () {
    var url = location.search; //获取url中"?"符后的字串   
    var theRequest = new Object();
    if (url.indexOf("?") != -1) {
        var str = url.substr(1);
        strs = str.split("&");
        for (var i = 0; i < strs.length; i++) {
            theRequest[strs[i].split("=")[0]] = unescape(strs[i].split("=")[1]);
        }
    }
   var memberId = theRequest["userid"];
   var channelId = theRequest["channelId"];
   var initype = theRequest["type"];

   var currentUserid = localStorage.getItem('y2wIMCurrentUserId');
   var currentuserinfo = JSON.parse(localStorage.getItem(currentUserid));
   if (currentuserinfo == null) {
       if (window.confirm("您还没有登录，请先登录")) {
           window.location.href = '../yun2win/index.html';
       }
       return;
      //重新登录
   }
   var sUserAgent = navigator.userAgent;
    //parseFloat 运行时逐个读取字符串中的字符，当他发现第一个非数字符是就停止  
   var appVersion = navigator.appVersion;
   var index = appVersion.indexOf('Chrome/');
   var sub = appVersion.substring(index+7);
   var fAppVersion = parseFloat(sub);
   if (fAppVersion < 49) {
       alert('您的浏览器版本太低！为了不影响您的视频聊天，请升级到最新版本');
   }

   var avatarUrl = currentuserinfo.avatarUrl;
   var name = currentuserinfo.name;
   var params = {
       grant_type: 'client_credentials',
       client_id: currentuserinfo.key,
       client_secret: currentuserinfo.secret
   };
   var token = currentuserinfo.token;
   $.ajax({
       url: config.y2wAutorizeUrl + 'oauth/token',
       type: 'POST',
       data: params,
       dataType: 'json',
       contentType: 'application/x-www-form-urlencoded',
       beforeSend: function (req) {
           if (token)
               req.setRequestHeader('Authorization', 'Bearer ' + token);
       },
       success: function (data) {
           var token = data.access_token;
           //document.getElementById("iframe_videoaudio").src = "https://av-api.liyueyun.com/media/?userid=" + memberId + "&channelId=" + channelId + "&type=" + initype + "&token=" + token + "&avatarUrl=" + avatarUrl + "&name=" + name +"&url="+encodeURIComponent(location.href.replace("videoAudio.html","av.html"));
           document.getElementById("iframe_videoaudio").src = "https://av-api.liyueyun.com/media/?userid=" + memberId + "&channelId=" + channelId + "&type=" + initype + "&token=" + token + "&avatarUrl=" + avatarUrl + "&name=" + name;
       },
       error: function (e) {//验证失败，重新登陆
           if (e.status ==400){
           if (window.confirm("验证失败，请重新登录")) {
               window.location.href = '../yun2win/index.html';
           }
           }
       }
   });
}








