/**
netbeat web socket  sdk
@version V1.0
@user uag
**/
Date.prototype.pattern = function(fmt) {
	var o = {
		"M+": this.getMonth() + 1, //月份
		"d+": this.getDate(), //日
		"h+": this.getHours() % 12 == 0 ? 12 : this.getHours() % 12, //小时
		"H+": this.getHours(), //小时
		"m+": this.getMinutes(), //分
		"s+": this.getSeconds(), //秒
		"q+": Math.floor((this.getMonth() + 3) / 3), //季度
		"S": this.getMilliseconds() //毫秒
	};
	var week = {
		"0": "/u65e5",
		"1": "/u4e00",
		"2": "/u4e8c",
		"3": "/u4e09",
		"4": "/u56db",
		"5": "/u4e94",
		"6": "/u516d"
	};
	if (/(y+)/.test(fmt)) {
		fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	}
	if (/(E+)/.test(fmt)) {
		fmt = fmt.replace(RegExp.$1, ((RegExp.$1.length > 1) ? (RegExp.$1.length > 2 ? "/u661f/u671f" : "/u5468") : "") + week[this.getDay() + ""]);
	}
	for (var k in o) {
		if (new RegExp("(" + k + ")").test(fmt)) {
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
		}
	}
	return fmt;
}
var _friends = new Array();
var ITIM = function(options) {

	this.options = options;
	var _options = {
		serverURI: null,
		reconnect: true,
		custId: null,
		error: function(code) {},
		success: function() {},
		messageReceive: function(message) {},
		offline: function() {}
	};


	if (options) {
		for (var key in options) {
			if (key == 'onConnect') {

				_options['success'] = options["onConnect"];

			} else if (key == 'onError') {

				_options['error'] = options["onError"];

			} else if (key == 'onMsg') {

				_options['messageReceive'] = options["onMsg"];

			} else if (key == 'account') {

				_options['custId'] = options["account"];
			} else {
				_options[key] = options[key];
			}
		}
	}


	var _ws_socket = null;
	var ERROR_CODE = {
		NOT_SUPPORT: 10001,
		URI_ERROR: 10002,
		CONNECT_ERROR: 10003,
		NOT_CONNECT: 10004
	};

	if (!_options.serverURI) {
		_options.error(ERROR_CODE.URI_ERROR);
	}

	if (!detectBrowser()) {
		_options.error(ERROR_CODE.NOT_SUPPORT);
		return;
	}

	var pfc = 0;
	var start = 0x02;
	var end = [0x03];
	var login_type = [0x02];
	var version = [0x01];
	var callbackFunction = null;
	var datas = [];


	var that = this;

	this.start = function(params) {
		_options.messageReceive = params.messageReceive || function() {};
		_options.offline = params.offline || function() {};
		_options.success = params.success || function() {};
		callbackFunction = null;
		datas = [];
		connect();
	}({
		messageReceive: function(data) {
			console.log(data);
			var time1 = new Date().pattern("yyyy-MM-dd HH:mm");

			options.onmsg({
				scene: 'p2p',
				from: data.from_cust_id + "",
				time: time1,
				type: "text",
				text: data.content,
				to: readCookie("uid")
			});
		},
		offline: function() {
			alert("client is offline,need relogin");
		},
		success: function() {
			console.log("connect to server successfully");
			var my = JSON.parse(readCookie("userJson"));
			that.login({
				loginAuth: my.webauth,
				callback: function(code) {
					console.log("login result_code:" + code);


				}
			});
			requestSync();

		}

	});

	var getSessions = function() {

		var sessions = window.localStorage.getItem("sessions");
		if (sessions) {

			return JSON.parse(sessions);
		}

		return null;
	}

	var requestSync = function() {

		var my = JSON.parse(readCookie("userJson"));

		options.onmyinfo(aitFriendConvertToIMFriend(my));

		var teamLoaded = false;
		var friendLoaded = false;

		requestFriends(function(data) {

			_friends = data;
			options.onfriends(data);



			options.onsyncdone();

			var sessions = getSessions();
			if (sessions) {
				options.onsessions(getSessions());
				options.onupdatesession({});
			}



		});

		requestTeams(function(items) {

			options.onteams(items);
			options.onsyncteammembersdone();
			teamLoaded = false;
		});

	}

	var aitFriendConvertToIMFriend = function(aitiFriend) {

		aitiFriend.account = aitiFriend.custid;
		aitiFriend.nick = aitiFriend.nickname;
		aitiFriend.avatar = Q1.userIcon.small(aitiFriend.custid);

		return aitiFriend;
	}


	//请求群聊
	var requestTeams = function(completion) {

		Q1.ajax({
			url: "Chat/Chat/getChatList",
			success: function(error, response) {
				var newItems = new Array();
				if (!error) {

					var items = response.data;

					if (items && items.length > 0) {

						$(items).each(function(index, obj) {

							newItems.push({
								bits: "0",
								createTime: null,
								joinMode: "noVerify",
								level: parseFloat(obj.maxcustnum),
								memberNum: parseFloat(obj.custnum),
								memberUpdateTime: null,
								name: obj.chatname,
								owner: null,
								teamId: obj.chatid,
								type: "advanced",
								updateTime: null,
								valid: true,
								validToCurrentUser: true,
								avatar: Q1.teamIcon.normal(obj.chatid)
							})
						});
					}
				}
				newItems.invalid = new Array();
				completion(newItems);
			}
		});
	}

	//请求好友列表
	var requestFriends = function(completion) {
		Q1.ajax({
			url: "Friend/Friend/getFriendList",
			data: {
				pageIndex: 1,
				pageSize: 99999
			},
			success: function(error, response) {

				if (error) {
					alert(error.msg);
				} else {


					var items = new Array();
					$(response.data).each(function(index, obj) {



						items.push(aitFriendConvertToIMFriend(obj));

					});

					completion(items);



				}
			}
		});
	}

	function splitCustId(custId) {
		var result = [];

		if (result.length < 8) {
			for (var i = result.length; i < 8; i++) {
				result.push(0);
			}
		}

		var i = 8;
		while (custId > 0) {
			i--;
			var temp = custId;
			custId = Math.floor(custId / 256);
			result[i] = temp - custId * 256;
		}

		return result;
	}

	function splitContent(content) {


		return stringToUint(content);
	}

	function splitAuth(auth) {
		var result = [];
		for (var i = 0; i < auth.length; i++) {
			result[i] = auth.charCodeAt(i);
		}
		if (result.length < 32) {
			for (var i = result.length; i < 32; i++) {
				result.push(0);
			}
		}
		return result;
	}


	var currentTimes = function() {
		var timestamp = Date.parse(new Date()) / 1000;

		var result = [];

		if (result.length < 8) {
			for (var i = result.length; i < 8; i++) {
				result.push(0);
			}
		}

		var i = 8;
		while (timestamp > 0) {
			i--;
			var temp = timestamp;
			timestamp = Math.floor(timestamp / 256);
			result[i] = temp - timestamp * 256;


		}

		return result;


	}

	//过期时间
	var msgExpireTime = function() {

		return [0x00, 0x00, 0x00, 0x00];
	}


	var pfc = 0;

	function nextMessageNum() {
		pfc++;
		var result = [];
		while (pfc > 0) {
			var temp = pfc;
			pfc = Math.floor(pfc / 256);
			result.push(temp - pfc * 256);
		}
		if (result.length < 8) {
			for (var i = result.length; i < 8; i++) {
				result.push(0);
			}
		}
		result[3] = parseInt(Math.random() * (9 - 1 + 1) + 1, 10);
		result[4] = parseInt(Math.random() * (9 - 1 + 1) + 1, 10);
		result[5] = parseInt(Math.random() * (9 - 1 + 1) + 1, 10);
		result[6] = parseInt(Math.random() * (9 - 1 + 1) + 1, 10);
		result[7] = parseInt(Math.random() * (9 - 1 + 1) + 1, 10);
		return result;
	}

	function logPrint(prefix, buffer) {
		var log = [];
		for (var i = 0; i < buffer.length; i++) {
			if (buffer[i] < 0) {
				log[i] = buffer[i] + 256;
			} else {
				log[i] = buffer[i];
			}
		}

		console.log(prefix + ":" + log.join(","));
	}

	this.login = function(loginParam) {
		if (_ws_socket == null || _ws_socket.readyState != 1) {
			_options.error(ERROR_CODE.NOT_CONNECT);
			return;
		}
		var buffer = [];
		var from_cust_id = splitCustId(_options.custId);
		var length = [0x00, 0x00, 0x00, 0x00];
		var msg_no = nextMessageNum();
		var msg_type = [0x00, 0x01];
		var auth = splitAuth(loginParam.loginAuth);
		//for(var i = 0; i < 32; i++){
		//	auth[i] = 0;
		//}
		var body = [];
		body = body.concat(login_type).concat(from_cust_id).concat(auth);

		var checkCode = calcChecksum(body, body.length);
		body = body.concat(checkCode).concat(end);
		buffer = buffer.concat(start).concat(length).concat(version).concat(msg_no).concat(msg_type).concat(body);
		var len = body.length;
		buffer[4] = len - ((len >> 16) << 16);
		buffer[3] = len >> 8;
		buffer[2] = len >> 16;
		buffer[1] = 0;
		logPrint("login", buffer);
		var aDataArray = new Uint8Array(buffer);
		pushData({
			data: aDataArray,
			callback: loginParam.callback,
			isSend: true
		});
		//_ws_socket.send(aDataArray);

		//执行心跳
		window.setInterval("heartbeat()", 1000 * 60 * 2);

	}

	window.heartbeat = function() {

		var token = readCookie("_webtoken");
		if (!token) {

			return;
		}

		if (_ws_socket == null || _ws_socket.readyState != 1) {
			_options.error(ERROR_CODE.NOT_CONNECT);
			return;
		}
		var buffer = [];
		var from_cust_id = splitCustId(_options.custId);
		var length = [0x00, 0x00, 0x00, 0x00];
		var msg_no = nextMessageNum();
		var msg_type = [0x00, 0x06];
		var auth = splitAuth(token);
		//for(var i = 0; i < 32; i++){
		//	auth[i] = 0;
		//}
		var body = [];
		body = body.concat(login_type).concat(from_cust_id).concat(auth);

		var checkCode = calcChecksum(body, body.length);
		body = body.concat(checkCode).concat(end);
		buffer = buffer.concat(start).concat(length).concat(version).concat(msg_no).concat(msg_type).concat(body);
		var len = body.length;
		buffer[4] = len - ((len >> 16) << 16);
		buffer[3] = len >> 8;
		buffer[2] = len >> 16;
		buffer[1] = 0;
		logPrint("heart", buffer);
		var aDataArray = new Uint8Array(buffer);
		pushData({
			data: aDataArray,
			callback: null,
			isSend: true
		});
	}

	this.sendMessage = function(params) {
		if (_ws_socket == null || _ws_socket.readyState != 1) {
			_options.error(ERROR_CODE.NOT_CONNECT);
			return;
		}
		var buffer = [];
		var chat_id = splitCustId(params.chatId);
		var from_cust_id = splitCustId(_options.custId);
		var to_cust_id = splitCustId(params.toCustId);
		var length = [0x00, 0x00, 0x00, 0x00];
		var msg_no = nextMessageNum();
		var msg_type = [0x00, 0x03];

		var chat_type = [0x01];
		if (params.chatId) {
			chat_type = [0x02];
		}

		var timestamp = currentTimes();
		var expireTime = msgExpireTime();
		var content_len = [0x00, 0x00, 0x00, 0x00];
		var content = splitContent(JSON.stringify(params.content));
		var auth = splitAuth(params.loginAuth);
		content_len[3] = content.length - ((content.length >> 16) << 16);
		content_len[2] = content.length >> 8;
		content_len[1] = content.length >> 16;
		content_len[0] = 0;

		console.log("auth==" + auth)

		console.log(chat_type, login_type, auth, expireTime, timestamp, chat_id)
		var body = [];
		body = body.concat(chat_type).concat(login_type).concat(auth).concat(expireTime).concat(timestamp).concat(chat_id)
			.concat(from_cust_id).concat(to_cust_id).concat(content_len).concat(content);

		var checkCode = calcChecksum(body, body.length);
		body = body.concat(checkCode).concat(end);
		buffer = buffer.concat(start).concat(length).concat(version).concat(msg_no).concat(msg_type).concat(body);
		var len = body.length;
		logPrint("sendAckResponse1", buffer);

		buffer[4] = len - ((len >> 16) << 16);
		buffer[3] = len >> 8;
		buffer[2] = len >> 16;
		buffer[1] = 0;
		logPrint("sendMessage2", buffer);
		var aDataArray = new Uint8Array(buffer);
		pushData({
			data: aDataArray,
			callback: params.callback,
			isSend: true
		});
	}


	function sendAckResponse(msg) {
		if (_ws_socket == null || _ws_socket.readyState != 1) {
			_options.error(ERROR_CODE.NOT_CONNECT);
			return;
		}
		var buffer = [];
		var from_cust_id = splitCustId(_options.custId);
		var msg_id = subArray(msg, 49, 57);
		var length = [0, 0, 0, 0];
		var msg_no = [msg[3], msg[4], 0, 0, 0, 0, 0, 0];
		var msg_type = [0x0, 0x08];
		var body = [];
		body = body.concat(from_cust_id).concat(msg_id);

		var checkCode = calcChecksum(body, body.length);
		body = body.concat(checkCode).concat(end);
		buffer = buffer.concat(start).concat(length).concat(version).concat(msg_no).concat(msg_type).concat(body);
		var len = body.length;

		buffer[4] = len - ((len >> 16) << 16);
		buffer[3] = len >> 16;
		buffer[2] = len >> 8;
		buffer[1] = 0;
		logPrint("sendAckResponse", buffer);
		var aDataArray = new Uint8Array(buffer);
		pushData({
			data: aDataArray,
			callback: null,
			isSend: false
		});
	}



	function pushData(data) {
		datas.push(data);
		if (1 == datas.length) {
			sendData();
		}
	}

	function sendData() {
		var data = datas.shift();
		if (data) {
			_ws_socket.send(data.data);
			if (data.isSend && data.callback) {
				callbackFunction = data.callback;
			}
		}
	}


	function calcChecksum(buffer, buffer_len) {
		if (null == buffer)
			return [0, 0, 0, 0];
		var tmp = [0, 0, 0, 0];
		var dest = 0;
		var len = 0;
		var offset = 0;
		while (len < buffer_len) {
			if (len + 4 > buffer_len) {
				offset = buffer_len - len;
			} else {
				offset = 4;
			}
			for (var i = 0; i < offset; i++) {
				tmp[i] ^= buffer[len + i];
			}
			len += 4;
		}
		return tmp;
	}

	function detectBrowser() {
		window.WebSocket = window.WebSocket || window.MozWebSocket;
		if (!window.WebSocket) {
			return false;
		}
		return true;
	}


	function connect() {
		try {
			_ws_socket = new WebSocket(_options.serverURI);
			_ws_socket.binaryType = "arraybuffer";
			_ws_socket.onopen = eventOpenConn;
			_ws_socket.onmessage = eventReceiveMessage;
			_ws_socket.onclose = eventCloseConn;
			_ws_socket.onerror = eventError;
		} catch (exception) {
			_options.error(ERROR_CODE.CONNECT_ERROR);
		}
	}


	function eventOpenConn() {
		_options.success();
		sendData();
	}

	function eventReceiveMessage(msg) {
		var response = new Int8Array(msg.data);
		var arr = [];
		for (var i = 0; i < response.length; i++) {
			arr.push(response[i]);
		}
		logPrint("receive data", arr);
		var msg_type = parseNumberData(subArray(arr, 14, 16));

		console.log("msg_type=" + msg_type);
		if (handleFunctons[msg_type] && typeof handleFunctons[msg_type] == 'function') {
			handleFunctons[msg_type](arr);
		}
		sendData();
	}

	//解析数字数据
	var parseNumberData = function(data) {

		var j = data.length;
		var v = 0;
		for (var i = 0; i < data.length; i++) {
			j--;
			var n = data[i];
			if (n < 0) {

				n = 256 + n;
			}
			if (i == data.length - 1) {
				v += parseFloat(n);
			} else {

				v += parseFloat(n) * 256 * j;
			}

		}

		return v;
	}

	function calStatus(high, low) {
		if (high < 0) {
			high += 256;
		}
		if (low < 0) {
			low += 256;
		}
		return high * 256 + low;
	}

	var handleFunctons = {
		"2": function(msg) { //login response
			if (!msg || msg.length != 20) {
				return;
			}
			var status = calStatus(msg[16], msg[15]);
			if (callbackFunction && typeof callbackFunction == 'function') {
				callbackFunction(status);
			}
		},
		"4": function(msg) { //send message response
			if (!msg || msg.length != 37) {
				return;
			}
			var status = calStatus(msg[33], msg[32]);
			if (callbackFunction && typeof callbackFunction == 'function') {
				callbackFunction(status);
			}
		},
		"5": function(msg) { //receive message
			if (!verifyMessage(msg)) {
				return;
			}

			sendAckResponse(msg);
			parseReceiveMessage(msg);

		},
		"6": function(msg) { //heartbeat response
			callbackFunction(200);
		},
		"7": function(msg) { //offline response
			_options.offline();
		},
		"9": function(msg) { //push response
			sendAckResponse(msg);
			parseReceiveMessage(msg);
		}
	}

	function parseReceiveMessage(msg) {
		var result = {};
		result.msgType = parseNumberData(subArray(msg, 14, 16));
		result.chatType = parseNumberData(subArray(msg, 16, 17));
		result.msgTime = parseNumberData(subArray(msg, 17, 25));
		result.chatId = parseNumberData(subArray(msg, 25, 33));
		result.fromCustId = parseNumberData(subArray(msg, 33, 41));
		result.toCustId = parseNumberData(subArray(msg, 41, 49));
		result.msgId = parseNumberData(subArray(msg, 49, 57));
		result.contentLength = parseNumberData(subArray(msg, 57, 61));



		result.content = JSON.parse(parseString(subArray(msg, 61, 61 + result.contentLength)));


		var userJson = readCookie("userJson");

		var sessionId = result.fromCustId;
		var scene = "p2p";
		if (result.chatId && parseFloat(result.chatId) > 0) {
			scene = "team";
			sessionId = result.chatId;
		}

		var message = {
			id: scene + "-" + sessionId,
			scene: scene,
			to: sessionId,
			unread: 0,
			lastMsg: {
				scene: scene,
				status: 'success',
				to: sessionId,
				type: 'text',
				from: readCookie('uid'),
				fromNick: result.content.from_cust_name,
				target: sessionId,
				time: new Date().getTime(),
				text: result.content.content
			}
		};

		options.onupdatesession([message]);
		_options.messageReceive(result.content);



	}

	function parseString(arr) {


		return uintToString(new Uint8Array(arr));
	}

	function uintToString(uintArray) {

		var encodedString = String.fromCharCode.apply(null, uintArray),
			decodedString = decodeURIComponent(escape(encodedString));
		return decodedString;
	}

	function stringToUint(string) {
		var string = unescape(encodeURIComponent(string)),
			charList = string.split(''),
			uintArray = [];
		for (var i = 0; i < charList.length; i++) {
			uintArray.push(charList[i].charCodeAt(0));
		}
		return uintArray;
	}



	function subArray(src, start, end) {
		if (!src || src.lenth < end + 1) {
			return [];
		}
		var result = [];
		for (var index = start; index < end; index++) {
			result[index - start] = src[index];
		}
		return result;
	}

	function verifyMessage(msg) {
		return true;
	}

	function eventCloseConn(event) {
		_options.error(event.code);
	}

	function eventError() {
		_options.error(ERROR_CODE.CONNECT_ERROR);
	}


	//	-------------------  API ---------------

}


ITIM.prototype.createTeam = function(param) {


}

ITIM.prototype.getLocalTeams = function() {

}

ITIM.prototype.cutTeams = function(teamList, invalidTeams) {

	return teamList;
}

ITIM.prototype.mergeTeams = function(teamList, newTeams) {

	return newTeams;
}

ITIM.prototype.mergeFriends = function(friendlist, friends) {

	return friends;
}

ITIM.prototype.cutFriends = function(friendlist, friends) {

	return friendlist;
}

ITIM.prototype.getUsers = function(option) {

	// #bug
	option.done(null, _friends);
}

ITIM.prototype.setCurrSession = function(info) {



}

//{
//	msg:msg,
//			done: done
//}
//消息回执
ITIM.prototype.sendMsgReceipt = function(option) {

	var data = null;
	var error = null;
	option.done(error, data);
}

//消息回执 (暂时不在这里回执)
ITIM.prototype.isMsgRemoteRead = function(message) {


}

/**
 *
 * @param option
 */
ITIM.prototype.sendText = function(option) {

	var token = readCookie("_webtoken");
	var uid = readCookie("uid");
	var userJson = readCookie("userJson");

	var my = JSON.parse(userJson);

	var content = {
		loginAuth: token,
		toCustId: option.to,
		content: {
			type: "1",
			from_cust_id: uid,
			from_cust_name: my.nickname,
			content: option.text
		},
		callback: function(code) {
			console.log("send data result_code:" + code);

		}
	}
	if (option.scene == "team") {
		content = {
			chatId: option.to,
			loginAuth: token,
			content: {
				type: "1",
				from_cust_id: uid,
				from_cust_name: my.nickname,
				content: option.text
			},
			callback: function(code) {
				console.log("send data result_code:" + code);

			}
		}
	}
	window.nim.sendMessage(content);
	var time1 = new Date().pattern("yyyy-MM-dd HH:mm");

	var message = {
		id: option.scene + "-" + option.to,
		scene: option.scene,
		to: option.to,
		lastMsg: {
			scene: option.scene,
			status: 'success',
			to: option.to,
			type: 'text',
			from: readCookie('uid'),
			fromNick: my.nickname,
			target: option.to,
			time: new Date().getTime(),
			text: option.text
		}
	};

	this.options.onupdatesession([message]);
	option.done(null, {
		scene: option.scene,
		from: uid,
		time: time1,
		type: "text",
		text: option.text,
		to: option.to
	});
}


//{
//	"scene": "p2p",
//		"from": "zuoshou",
//		"fromNick": "tangtao",
//		"fromClientType": "Web",
//		"fromDeviceId": "05cbdd8c458fb866bcc50a6e104f2742",
//		"to": "zuoshou2",
//		"time": 1459416916657,
//		"type": "image",
//		"isHistoryable": true,
//		"isRoamingable": true,
//		"isSyncable": true,
//		"cc": true,
//		"isPushable": true,
//		"isOfflinable": true,
//		"isUnreadable": true,
//		"needPushNick": true,
//		"resend": false,
//		"idClient": "211668e4d987c6351e8457c79de4fd0d",
//		"idServer": "106147935",
//		"userUpdateTime": 1453526248179,
//		"status": "success",
//		"file": {
//	"md5": "30e7a16574cddf952bbae51ea418f831",
//			"size": 22102,
//			"w": 640,
//			"h": 1136,
//			"url": "http://nim.nos.netease.com/MTAxMTAwMg==/bmltYV80MTU5MjM3XzE0NTk0MTY5MTYzNjlfN2E5NWY4ODEtYTVkNy00NjFiLTljOGQtYmY4NzRlNDZlY2Zh",
//			"name": "关于迅脉-恢复的.png",
//			"ext": "png"
//},
//	"target": "zuoshou2",
//		"sessionId": "p2p-zuoshou2",
//		"flow": "out"
//}
ITIM.prototype.willSendFile = function(option) {

	console.log("willSendFile");
}

ITIM.prototype.sendFileProgress = function(option) {
	console.log("sendFileProgress==" + option * 100);
}

ITIM.prototype.sendFileSuccess = function(option) {

	console.log("sendFileSuccess");

	var token = readCookie("_token");
	var uid = readCookie("uid");
	var userJson = readCookie("userJson");

	var fileObj = option.fileObj;

	var my = JSON.parse(userJson);

	var content = {
		loginAuth: token,
		toCustId: option.to,
		content: {
			type: "6",
			from_cust_id: uid,
			from_cust_name: my.nickname,
			fileid: fileObj.fileid,
			filehash: fileObj.filehash,
			name: fileObj.fileName,
			size: fileObj.fileSize
		},
		callback: function(code) {
			console.log("send data result_code:" + code);

		}
	}
	if (option.scene == "team") {
		content = {
			chatId: option.to,
			loginAuth: token,
			content: {
				type: "6",
				from_cust_id: uid,
				from_cust_name: my.nickname,
				fileid: fileObj.fileid,
				filehash: fileObj.filehash,
				name: fileObj.fileName,
				size: fileObj.fileSize
			},
			callback: function(code) {
				console.log("send data result_code:" + code);

			}
		}
	}
	window.nim.sendMessage(content);
	var time1 = new Date().pattern("yyyy-MM-dd HH:mm");

	var lastMsg = {
		scene: option.scene,
		status: 'success',
		from: uid,
		fromNick: my.nickname,
		target: option.to,
		time: time1,
		type: "file",
		file: {
			name: fileObj.fileName,
			url: Q1.API_BASE_URL + "?fileid=" + fileObj.fileid + "&" + fileObj.filehash
		},
		to: option.to
	};
	var message = {
		id: option.scene + "-" + option.to,
		scene: option.scene,
		to: option.to,
		lastMsg: lastMsg
	};

	this.options.onupdatesession([message]);
	option.done(null, lastMsg);
}

ITIM.prototype.sendFileError = function(option) {

	console.log("sendFileError");
}



ITIM.prototype.mergeSessions = function(olds, sessions) {

	var newSessionItemsMap = {};

	if (olds && olds.length > 0) {
		for (var i = 0; i < olds.length; i++) {
			newSessionItemsMap[olds[i].id] = olds[i];
		}
	}

	if (sessions && sessions.length > 0) {
		for (var i = 0; i < sessions.length; i++) {
			newSessionItemsMap[sessions[i].id] = sessions[i];
		}
	}

	var newSessionItems = new Array();
	if (newSessionItemsMap) {
		for (var key in newSessionItemsMap) {
			newSessionItems.push(newSessionItemsMap[key]);
		}
	}

	return newSessionItems;

}