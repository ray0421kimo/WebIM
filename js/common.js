/**
 * Created by cys on 16/3/25.
 */
//Q1对象
var Q1 = {
    //图片基地址
    IMAGE_BASE_URL: "http://api2.qiyunxin.com/Communal/Communal/getFile/",

    //API基地址
    API_BASE_URL: "http://api2.qiyunxin.com/",

    DEFAULT_IMG: "yiheng.png",

    DEFAULT1_IMG: "img/yiheng.png",

    userIcon: {

        small: function(userId) {

            var width = 42 * 2;
            var height = 42 * 2;

            return Q1.API_BASE_URL + "Communal/Communal/avatar?id=" + userId + "&w=" + width + "&h=" + height + "&type=1";
        },
        normal: function(userId) {
            var width = 42 * 4;
            var height = 42 * 4;

            return Q1.API_BASE_URL + "Communal/Communal/avatar?id=" + userId + "&w=" + width + "&h=" + height + "&type=1"
        }
    },
    teamIcon: {
        small: function(teamId) {

            var width = 42 * 2;
            var height = 42 * 2;

            return Q1.API_BASE_URL + "Communal/Communal/avatar?id=" + teamId + "&w=" + width + "&h=" + height + "&type=2";
        },
        normal: function(teamId) {
            var width = 42 * 4;
            var height = 42 * 4;

            return Q1.API_BASE_URL + "Communal/Communal/avatar?id=" + teamId + "&w=" + width + "&h=" + height + "&type=2"
        }
    },

    //获取小图地址
    imageSmalllUrl: function(img) {
        var width = 80;
        var height = 80;

        if (!img) {

            return this.DEFAULT_IMG;
        }

        return this.IMAGE_BASE_URL + "?fileid=" + img.fileid + "&filehash=" + img.filehash + "&w=" + width + "&h=" + height;
    },
    //获取常规图地址
    imageNormalUrl: function(img) {
        var width = 80 * 2;
        var height = 80 * 2;

        if (!img) {

            return this.DEFAULT_IMG;
        }

        return this.IMAGE_BASE_URL + "?fileid=" + img.fileid + "&filehash=" + img.filehash + "&w=" + width + "&h=" + height;
    },
    //获取大图地址
    imageBigUrl: function(img) {

        if (!img) {

            return this.DEFAULT_IMG;
        }

        return this.IMAGE_BASE_URL + "?fileid=" + img.fileid + "&filehash=" + img.filehash;
    },
    //获取地址栏的参数
    getParam: function() {
        var url = document.URL;

        url = url.replace(new RegExp(/(#)/g), "")
        var para = "";
        if (url.lastIndexOf("?") > 0) {
            para = url.substring(url.lastIndexOf("?") + 1, url.length);
            var arr = para.split("&");
            var isFirt = true;
            for (var i = 0; i < arr.length; i++) {
                var v = arr[i];
                var parm = v.split("=");

                if (isFirt) {
                    if (parm.length <= 1) {
                        para = "\"" + parm[0] + "\"" + ":" + "\"\"";
                    } else {
                        para = "\"" + parm[0] + "\":" + "\"" + parm[1] + "\"";
                    }
                    isFirt = false;
                } else {
                    if (parm.length <= 1) {
                        para = para + ",\"" + parm[0] + "\":" + "\"\"";
                    } else {
                        para = para + ",\"" + parm[0] + "\":" + "\"" + parm[1] + "\"";
                    }
                }

            }
            para = "{" + para + "}";

            var obj = JSON.parse(para);

            return obj;

        }
    },
    ///AJAX请求封装
    ajax: function(opt) {
        var fn = {
            success: function(data, textStatus) {}
        }
        if (opt.error) {
            fn.error = opt.error;
        }
        if (opt.success) {
            fn.success = opt.success;
        }

        //扩展增强处理
        var _opt = $.extend(opt, {
            error: function(XMLHttpRequest, textStatus, errorThrown) {

                if (fn.error) {
                    fn.error(XMLHttpRequest, textStatus, errorThrown);
                } else {
                    //错误方法增强处理
                    if (XMLHttpRequest.status == 400) {
                        $.alert(XMLHttpRequest.responseJSON.msg);
                    } else if (XMLHttpRequest.status == 401) {
                        $.alert("您没权限访问【" + opt.url + "】！");
                    } else {
                        $.alert("出错了,请联系管理员!");
                    }
                }

            },
            success: function(response) {

                if (response.status == 0) {

                    fn.success(null, response);
                } else {

                    fn.success({
                        "status": response.status,
                        "msg": response.msg
                    }, response);
                }
            }
        });



        var url = this.API_BASE_URL + _opt.url;


        var headers = _opt.headers;
        if (!headers) {
            headers = {};
        }

        var datas = _opt.data;
        var _token = readCookie("_token");
        var _custid = readCookie("_custid");
        var username = readCookie("username");

        var timestamp = Date.parse(new Date()) / 1000;

        if (!datas) {
            datas = {};
        }
        if (_token && _custid) {
            datas._token = _token;
            datas._custid = _custid;
        }
        datas.time = timestamp;

        if (username) {
            var sign = MD5(MD5(username + "_" + timestamp));
            datas.sign = sign;
        }

        _opt.url = url;
        _opt.headers = headers;
        _opt.data = datas;
        $.ajax(_opt);
    },
}