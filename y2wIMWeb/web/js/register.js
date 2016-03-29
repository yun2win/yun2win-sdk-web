var register = {
	init: function() {
		this.initNode();
        this.initAnimation();
		this.addEvent();
	},

	initNode: function() {	// 初始化节点
		this.$email = $('#email');
		this.$pwd = $('#password');
		this.$name = $('#name');
		this.$errorMsg = $('#errorMsg');
		this.$submit = $('#submit');
	},

    initAnimation: function() {	// 添加动画
        var $wrapper = $('#j-wrapper'),
            wrapperClass = $wrapper.attr('class');
        $wrapper.addClass('fadeInDown animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
            $(this).removeClass().addClass(wrapperClass);
        });
    },

	addEvent: function() {	// 绑定事件
		var that = this;
		this.$submit.on('click', this.validate.bind(this));
		$(document).on('keydown', function(e) {
			var ev = e || window.event;
			if (ev.keyCode === 13) {
				that.validate();
			}
		});
	},

	validate: function() {	
		this.$errorMsg.addClass('hide');
		var that = this,
			email = $.trim(this.$email.val()),
			pwd = this.$pwd.val(),
            name = $.trim(this.$name.val()),
			errorMsg = '';
		if (email.length === 0) {
			errorMsg = '邮箱不能为空';
		} else if(name.length===0){
			errorMsg = '昵称不能为空';
		}else if (!pwd || pwd.length < 6) {
			errorMsg = '密码为6~20位字母或者数字';
		}else {
			this.$submit.html('注册中...').attr('disabled', 'disabled');
			this.doRegister(email,pwd,name);
			return;
			this.$submit.html('注册').removeAttr('disabled');
		}
		this.$errorMsg.html(errorMsg).removeClass('hide');  // 显示错误信息
		return false;
	},

	doRegister: function(email, pwd, name) {
		var that = this;
        Users.getInstance().remote.register(email, pwd, name, function(err){
            if(err){
                that.$errorMsg.html(JSON.parse(e.responseText).message).removeClass('hide');
                that.$submit.html('注册').removeAttr('disabled');
                return;
            }
            alert("注册成功");
            window.location.href = '../web/index.html';
        });
	}
};
register.init();