(function(){
  var postMessage;
  (function() {
    var _h = {}

    postMessage = (function() {
      var _self = window.name || '_parent',
        _wmap = {
          '_top': window.top,
          '_self': window,
          '_parent': window.parent
        };
      return function(_target, _options) {
        if (typeof(_target) == 'string') {
          _target = _wmap[_target] ||
            window.frames[_target];
          if (!_target) return this;
        }
        // check data
        var _data = angular.extend({
          origin: '*',
          source: _self
        }, _options);
        // send message
        _h.__postMessage(_target, _data);
        return this;
      };
    })();

    _h.__formatOrigin = (function() {
      var _reg = /^([\w]+?:\/\/.*?(?=\/|$))/i;
      return function(_origin) {
        _origin = _origin || '';
        if (_reg.test(_origin))
          return RegExp.$1;
        return '*';
      };
    })();

    _h.__formatPassData = function(_data) {
      return _data;
    };

    _h.__postMessage = function(_window, _options) {
      if (!_window.postMessage)
        return;
      _options = _options || _o;
      _window.postMessage(
        _h.__formatPassData(_options.data),
        _h.__formatOrigin(_options.origin)
      );
    };

    var isIE6789 = /\bMSIE [6789]\.0\b/.test(navigator.userAgent);
    if(!isIE6789) {
      return;
    }

    Function.prototype.aop || (Function.prototype.aop = function(_before, _after) {
      var f = function() {
        return !1;
      },
        _after = _after || f,
        _before = _before || f,
        _handler = this;
      return function() {
        var _event = {
          args: Array.prototype.slice.call(arguments, 0)
        };
        _before.call(this, _event);
        if (!_event.stopped) {
          _event.value = _handler
            .apply(this, _event.args);
          _after.call(this, _event);
        }
        return _event.value;
      };
    });

    // ie8-9 only support string data
    if (!!window.postMessage) {
      /**
       * 解析消息传递数据
       * @param  {Variable} 数据
       * @return {Variable} 数据
       */
      _h.__formatPassData =
        _h.__formatPassData.aop(function(_event) {
          _event.stopped = !0;
          _event.value = JSON.stringify(_event.args[0]);
        });
      return;
    }
  })();

  // request.js
  var request = (function() {
    var iframeCache = {};
    var requestCache = {};

    function request(url, options) {
      var proxy = options.iframe;
      var frame = iframeCache[proxy];
      // 准备iframe
      if(!frame) {
        createXFrame({
          src: proxy,
          visible: !1,
          onload: function(event) {
            iframeCache[proxy] = event.target.contentWindow;
            // 重新请求
            request(url, options);
          }
        });
        return;
      }

      // 发送信息, * extend方法,只读参数1里的字段
      var _data = extend({
        url: url,
        data: null,
        timeout: 0,
        method: 'GET'
      }, options);
      // key 用作从iframe回调的数据中对请求的标示
      _data.key = uniqueId('frm-');
      _data.headers = options.headers;
      postMessage(frame, {data: _data});

      // 准备deffer对象
      var dtd = $q.defer();
      var timer = window.setTimeout(function() {
        dtd.reject();
      }, options.timeout || 1000)
      requestCache[_data.key] = {dtd : dtd, type : options.type, timer : timer};
      dtd.promise.then(options.onload, options.onerror);
    }

    // regist message
    var _flag = 'VIPER-AJAX-DATA:';
    $(window).on('message', function(_event) {
      // retrive data
      var _data = _event.data;
      if (_data.indexOf(_flag) != 0) return;
      _data = JSON.parse(_data.replace(_flag, ''));
      _data.result = decodeURIComponent(_data.result || '');

      // 根据key从缓存里面读取请求信息, 并删除
      var req = requestCache[_data.key];
      if (!req) return;
      delete requestCache[_data.key];
      window.clearTimeout(req.timer);

      // 执行
      var dtd = req.dtd;
      dtd.resolve(text2type(_data.result, req.type));
    });

    // helper
    var uniqueId = (function() {
      var count = 1;
      return function(prefix) {
        return prefix + count++;
      };
    })();

    var createXFrame = (function() {
      var _getFrameSrc = function() {
        if (location.hostname == document.domain)
          return 'about:blank';
        return 'javascript:(function(){document.open();document.domain="' + document.domain + '";document.close();})();';
      };
      var _getFrameWithName = function(_name) {
        _name = _name.trim();
        var _iframe = $('<iframe></iframe>');
        if (!_name)
          return _iframe;
        _iframe.attr('name', _name);
        return _iframe;
      };
      return function(_options) {
        _options = _options || _o;
        var _iframe = _getFrameWithName(_options.name || '');
        if (!_options.visible)
          _iframe.css('display', 'none');
        if (angular.isFunction(_options.onload))
          _iframe.on('load', function(_event) {
            if (!_iframe.attr('src')) return;
            _iframe.unbind('load');
            _options.onload(_event);
          });
        // will trigger onload
        var _parent = _options.parent;
        if (angular.isFunction(_parent)) {
          try {
            _parent(_iframe)
          } catch (e) {
            console.error(ex.message);
            console.error(ex);
          }
        } else {
          $(_parent || document.body).append(_iframe);
        }
        // ensure trigger onload async
        var _src = _options.src || _getFrameSrc();
        window.setTimeout(function() {
          _iframe.attr('src', _src);
        }, 0);
        return _iframe;
      };
    })();

    var extend = function(_object, _config) {
      if (!_object || !_config)
        return _object;
      for (var x in _object) {
        if (_object.hasOwnProperty(x) &&
          _config[x] != null)
          _object[x] = _config[x];
      }
      return _object;
    };

    var text2type = function(_text,_type){
        _text = _text||'';
        switch(_type){
            case 'json':
                try{
                    _text = JSON.parse(_text);
                }catch(ex){
                    _text = null;
                }
            break;
        }
        return _text;
    };

    return request;
  })();

  // var RET = 'http://172.27.16.24:8000/tests/ret.json'
  // var RET = 'http://api.account.xiaomi.com/pass/usersCard?ids=110000';

  // request(RET, {
  //   iframe : 'http://api.account.xiaomi.com/pass/static/viper_proxy_frame.html',
  //   timeout : 1000,
  //   type : 'json',
  //   onload : function(_data) {
  //     console.log('frames', _data);
  //   },
  //   onerror : function() {
  //       console.log('error!!!!');
  //   }
  // });

  return function(user_id) {
    var dtd = $q.defer();

    if(!angular.isArray(user_id)) {
      user_id = [user_id];
    }
    user_id = user_id.join(',');

    if(!user_id) {
      dtd.resolve([]);
    }

    var PREFIX = 'http://api.account.xiaomi.com/pass/usersCard?ids=';
    var IFRAME = 'http://api.account.xiaomi.com/pass/static/viper_proxy_frame.html?1';
    var url = PREFIX + user_id;
    request(url, {
      iframe : IFRAME,
      timeout : 1000,
      type : 'json',
      onload : function(data) {
        dtd.resolve(data.data.list);
      },
      onerror : function() {
        dtd.reject({});
      }
    });

    return dtd.promise;
  }
})();

if(location.href.indexOf('fiction_id')<0){
  //localStorage.removeItem('wap_reader_login_jump');
  //登录跳转记忆
  var loginJump = localStorage.getItem('wap_reader_login_jump');
  location.href = loginJump;
}
var version = localStorage.getItem('wap_version');
if(version != '2.0'){
   //localStorage.clear();
   //localStorage.setItem('wap_version','2.0');
}

(function() {
  var Util = (function(){
    var prefix = 'ficiton_reader_';
    var StorageGetter = function(key){
      return localStorage.getItem(prefix+key);
    }
    var StorageSetter = function(key,val){
      return localStorage.setItem(prefix+key ,val);
    }
    return {
      StorageGetter:StorageGetter,
      StorageSetter:StorageSetter
    }
  })();

  function Fiction(id_, cid_, onChange_) {
    var Title = "";
    var Fiction_id = id_;

    var Chapter_id = cid_;

	if(Util.StorageGetter(Fiction_id + 'last_chapter')){
	   Chapter_id = Util.StorageGetter(Fiction_id + 'last_chapter');
	}

	if(!Chapter_id){
		Chapter_id = 0;
	}
    var Chapters = [];

    var init = function() {
      getFictionInfo(function(){
		gotoChapter(Chapter_id);
	  });
      
    }

    var gotoChapter = function(chapter_id) {
      Chapter_id = chapter_id;
      getCurChapterContent();
    };
	var get_buy_num = function(begin,num){
       var count = 0;
       var ret = [];
       for(var i=begin;i<window.chapter_data.length;i++){
          if(window.chapter_data[i] && !window.chapter_data[i].hasbuy){
             count ++ ;
             ret.push(window.chapter_data[i]);
          }
          if(count == num){
             return ret;
          }
       }
       return ret;
    }

	var getCookie = function(key){
        var _c = document.cookie.split(key+'=')[1];
        if(_c){
          _c = _c.split(';')[0];
          return _c;
        }
        return '';
    }

	function doBuyAction(chapter_id,entire) {
      var token = getCookie('token');
      var user_id = getCookie('user_id');
	  var device_id = getCookie('device_id');
      chapter_id = chapter_id + '';
      if(chapter_id.indexOf(',')>-1){
        var jumpId = chapter_id.split(',')[0];
      }else{
        var jumpId = chapter_id;
      }
	  var _loginFollowUp = encodeURIComponent(location.href);
      /*
	  var _loginFollowUp = encodeURIComponent(location.href + '?buy_chapter_id=' + jumpId);
	  if(location.href.indexOf('?')> -1){
		  var _url = location.href;
		  _url = _url.split('?');
		  _url = _url[0] + '?buy_chapter_id=' + jumpId + '&' + _url[1];
		 _loginFollowUp = encodeURIComponent(location.href + '&buy_chapter_id=' + jumpId);
	  }
	  */
      
	  var _loginUrl = '/dk_id/api/xiaomi_web_reg?login=1&followup=' + _loginFollowUp;
      
      if (!(user_id && token)) {
        location.href = _loginUrl;
        return false;
      }
    
      
      var returnUrl = 'http://' + location.host + '/reader/fiction/www/app_mobile.html?fiction_id=' + Fiction_id + '#' + Fiction_id;
      localStorage.setItem('ficiton_reader_' + Fiction_id + 'last_chapter', jumpId);
      var postdata =  {
        return_url : returnUrl,
        payment_name : 'MIPAY_WEB',
        user_id : user_id,
        device_id : device_id,
        token : token,
        fiction_id : Fiction_id,
        chapter_id : chapter_id,
        app_id : 'web'
      };
      
      //购买全本
      if(entire){
         postdata.entire = 1;
      }
      
      $.post('/store/v0/payment/fiction/create',postdata, function(d) {

        if (d.free) {
          //location.href = href;
          return;
        } else {
          //限时免费
          if (d.result == 10012) {
            //location.href = href;
            return;
          }

          if (d.result == 1003) {
            location.href = _loginUrl;
            return;
          }
          if (d.payment_url) {
            location.href = d.payment_url;
          } else {
            alert(d.msg);
          }
        }
      }, 'json');
    }

	$('#mask').click(function() {
      $('#mask').hide();
      $('#buy_popup_frame').hide();
    });

    var getCurChapterContent = function() {
      $.post("/reader/fiction/chapter/jsonp/" + Fiction_id + "/" + Chapter_id,function(data) {
        
		if (data.result == 0) {
          var url = data.jsonp;
          getBSONP(url, function(data) {
			$('#init_loading').hide();
            onChange_ && onChange_(data);
          });
        }else if(data.result == 101){
			//没有登录触发购买显示
		} else {
		  var chapterData = window.ChaptersData[Chapter_id];
		  $('#init_loading').hide();
		  $('#buy_chapter_title').html(chapterData.title);
		  $('#buy_chapter_price').html(chapterData.price/100);
		  var c_20 = get_buy_num(Chapter_id, 20);
          var c_50 = get_buy_num(Chapter_id, 50);
          var c_100 = get_buy_num(Chapter_id, 100);
		  var c_all ={
            20:c_20,
            50:c_50,
            100:c_100
          }
		  top.buyEntire = function(){
            doBuyAction(Chapter_id,true);
          }

          top.buyOne = function(){
            doBuyAction(Chapter_id);
          }

          top.buyAll = function(num){
            var data = c_all[num];
            var ids = [];
            for(var i=0;i<data.length;i++){
                ids.push(data[i].chapter_id);
            }
            doBuyAction(ids.join(',') );
          }
          var entirePrice = localStorage.getItem("entire_price_" + Fiction_id);
		  $('#buy_popup_frame')[0].contentWindow.set(Fiction_id,Title,chapterData.title,chapterData.price/100,entirePrice,c_20,c_50,c_100);
		  if(data.result == '203'){
			  $('#buy_container').show();
			  $('#buy_mask').show();
			  return;
		  }

		  //需要登录
		  if(data.result == '101'){
			$('#buy_container').show();
			$('#buy_mask').show();
			return;
		  }
		  
          alert(data.msg);
        }
      },'json');
      return;
      function getBSONP(url, callback) {
        return $.jsonp({
          url : url,
          cache : true,
          callback : "duokan_fiction_chapter",
          success : function(result) {
            var data = $.base64.decode(result);
            var json = decodeURIComponent(escape(data));
            callback(json);
          }
        });

      };

    };
	
	var token = getCookie('token');
    var user_id = getCookie('user_id');
	var device_id = getCookie('device_id');
    var getFictionInfo = function(callback) {
      $.get("/reader/fiction/chapter/list/" + Fiction_id,function(data) {
        Title = data.title;
		$('#nav_title').html('返回书架');
		window.ChaptersData = data.chapters;
		window.chapter_data = data.chapters;
        for (var i = 0; i < data.chapters.length; i++) {
          Chapters.push({
            "chapter_id" : data.chapters[i].chapter_id,
            "title" : data.chapters[i].title
          })
        }
		if ((user_id && token) || user_id) {
			$.post('/store/v0/payment/fiction/chapter/list', {
			  user_id : user_id,
			  fiction_id : Fiction_id,
			  device_id : device_id,
			  token : token,
			  d : 1,
			  app_id : 'web'
			}, function(d) {
			  var items = d.items;
			  for (var i = 0; i < items.length; i++) {
				var cid = items[i];
				if(window.chapter_data[cid]){
				  window.chapter_data[cid].hasbuy = true;
				}
			  }
			}, 'json');
		  }
		
		callback&&callback();
      },'json');
    };

    var prevChapter = function() {
	  Chapter_id = parseInt(Chapter_id);
      if (Chapter_id == 0) {
        return
      }
	  var cid = Chapter_id - 1;
      gotoChapter(cid);
      Util.StorageSetter(Fiction_id + 'last_chapter',Chapter_id);
    };

    var nextChapter = function() {
	  Chapter_id = parseInt(Chapter_id);
      if (Chapter_id == Chapters.length - 1) {
        return
      }
	  var cid = Chapter_id + 1;
      gotoChapter(cid);
      Util.StorageSetter(Fiction_id + 'last_chapter',Chapter_id);
    };

    return {
      init : init,
      go : gotoChapter,
      prev : prevChapter,
      next : nextChapter,
	  getChapter_id:function(){
	    return Chapter_id;
	  }
    };
  }

  var Render = function(container_) {
    function parseChapterData(jsonData) {
      var jsonObj = JSON.parse(jsonData);
      var html = "<h4>" + jsonObj.t + "</h4>";
      for (var i = 0; i < jsonObj.p.length; i++) {
        html += "<p>" + jsonObj.p[i] + "</p>";
      }
      return html;
    }
    return function(data) {
      container_.html(parseChapterData(data));
    };
  }

  function main() {
    // 获取fiction_id 和 chapter_id
	var root = $('#fiction_container');
    var Hash = location.hash.replace('#','');
    var Fiction_id, Chapter_id;
    if(Hash){
      Hash = Hash.split('/');
      if(Hash[0]){
        Fiction_id = Hash[0];
      }
      //url中的章节信息优先使用
      if(Hash[1]){
        Chapter_id = Hash[1];
      }
    }

	if(!Chapter_id){
	   Chapter_id = Util.StorageGetter(Fiction_id + 'last_chapter');
	}

	if(!Chapter_id){
	   Chapter_id = 0;
	}

    // 程序初始化
    var render = Render($("#fiction_container"));
    var fiction  = Fiction(Fiction_id || 13359, Chapter_id, function(data) {
      render(data);
	  $('#bottom_tool_bar').show();
      setTimeout(function(){
        ScrollLock = false;
        Screen.scrollTop = 0;
      },20)
    });
    fiction.init();

    // 绑定事件
    var ScrollLock = false;
    var Doc = document;
    var Screen = Doc.body;
    var Win = $(window);

    var onPageScroll = function(){
      var scrollBuffer = 100;
      Win.scroll(function(e){ 
        if(Win.height() + Screen.scrollTop >= Screen.scrollHeight && !ScrollLock){
           ScrollLock = true;
           fiction.next();
        }		
      })
    }
	
	var getCookie = function(key){
        var _c = document.cookie.split(key+'=')[1];
        if(_c){
          _c = _c.split(';')[0];
          return _c;
        }
        return '';
    }
	
	$('#nav_title').click(function(){
		location.href='/#3'
	});

	$('.icon-back').click(function(){
		location.href='/#3'
	});
	window.ChaptersData;
	/*
	$('#buy_series_container').find('button').click(function(){
		var type = $(this).data('type');
		var num,end;
		var start = parseInt(Chapter_id);

		if(type == 'all'){
			end = window.ChaptersData.length;
		}else{
			num = type;
			num = parseInt(num);
			end = start+num;
			if(end > window.ChaptersData.length){
				end = window.ChaptersData.length;
			}
		}
		
		var buyData = window.ChaptersData.slice(start,end);
		var ids = [];
		for(var i=0;i<buyData.length;i++){
			ids.push(buyData[i].chapter_id);
		}
		ids = ids.join(',');

		var device_id = getCookie('device_id');
        var token = getCookie('token');
        var user_id = getCookie('user_id');
		  if(!user_id || !token){
			 localStorage.setItem('wap_reader_login_jump',location.href);
			 location.href = loginUrl;
			 return;
		  }
	    Util.StorageSetter(Fiction_id + 'last_chapter',fiction.getChapter_id());
		$.post('/store/v0/payment/fiction/create',{
          payment_name : 'MIPAY_WEB',
		  return_url : location.href,
          user_id : user_id,
          device_id : device_id,
          token : token,
          fiction_id :Fiction_id,
          chapter_id : ids,
          app_id :'web'
        },function(d){
          if(d.free){
			alert('免费图书无需购买');
            return;
          }else{
            if(d.result == 1003){
			  localStorage.setItem('wap_reader_login_jump',location.href);
              location.href = loginUrl;
              return;
            }
			//给web项目使用 支付成功之后可以通过这个数据来跳转回这里
			localStorage.setItem('wap_reader_buying_jump',location.href);
            location.href = d.payment_url;
          }
        },'json');
	});
	*/

	var colorArr = [{value:'#f7eee5',name:'米白',font:''},
		{value:'#e9dfc7',name:'纸张',font:''},
		{value:'#a4a4a4',name:'浅灰',font:''},
		
		{value:'#cdefce',name:'护眼',font:''},
		{value:'#283548',name:'灰蓝',font:'#7685a2',bottomcolor:'#fff'},
		{value:'#0f1410',name:'夜间',font:'#4e534f',bottomcolor:'rgba(255,255,255,0.7)'}];
	for(var i=0;i<colorArr.length;i++){
		$('#bk-container').append('<div class="bk-container" data-font="'+colorArr[i].font+'"  data-bottomcolor="'+colorArr[i].bottomcolor+'" data-color="'+colorArr[i].value+'" style="background-color:'+colorArr[i].value+'"><span>'+colorArr[i].name+'</span></div>');
	}

	
	var fiction_container = $('#fiction_container');

	fiction_container.css('min-height',$(window).height() -100);
	//背景信息
	(function(){
		var tool_bar = localStorage.getItem('wap_reader_toolbar_background_color');
		var bottomcolor = localStorage.getItem('wap_reader_bottom_color');
		var color = localStorage.getItem('wap_reader_background_color');
		var font = localStorage.getItem('wap_reader_font_color');
		if(tool_bar){
		  $('#buy_mask').css('background',tool_bar);
		  $('#bottom_tool_bar_ul').css('background',tool_bar);
		}
		if(bottomcolor){
		  $('#bottom_tool_bar_ul').find('li').css('color',bottomcolor);
		}

		if(color){
		  $('body').css('background-color',color);
		}

		if(font){
		  $('.m-read-content').css('color',font);
		}
	})();

	$('#buy_mask').click(function(){
		var tool_bar = $('#top-nav');
		  if(tool_bar.css('display') == 'none'){
			tool_bar.show();
		  }else{
			tool_bar.hide();
			$('#font-container').hide();
			font_button.css('background','none');
		  }
	});

	$('#buy_container').click(function(){
		var tool_bar = $('#top-nav');
		  if(tool_bar.css('display') == 'none'){
			tool_bar.show();
		  }else{
			tool_bar.hide();
			$('#font-container').hide();
			font_button.css('background','none');
		  }
	});
	
	$('#bk-container').delegate('.bk-container','click',function(){
		var color = $(this).data('color');
		var font = $(this).data('font');
		var bottomcolor = $(this).data('bottomcolor');
		var tool_bar = font;
		
		if(!font){
		   font = '#000';
		}
		if(!tool_bar){
			tool_bar = '#fbfcfc';
		}

		if(!bottomcolor){
			//bottomcolor = '#d3d3d3';
		}
		
		$('#buy_mask').css('background',tool_bar);
		
		$('#bottom_tool_bar_ul').css('background',tool_bar);
		if(bottomcolor && bottomcolor !="undefined"){
		  $('#bottom_tool_bar_ul').find('li').css('color',bottomcolor);
		}else{
		  $('#bottom_tool_bar_ul').find('li').css('color','#a9a9a9');
		}
		$('body').css('background-color',color);
		$('.m-read-content').css('color',font);

        localStorage.setItem('wap_reader_toolbar_background_color',tool_bar);
		localStorage.setItem('wap_reader_bottom_color',bottomcolor);
		localStorage.setItem('wap_reader_background_color',color);
		localStorage.setItem('wap_reader_font_color',font);
	});
    
	//字体设置信息
	var begin = localStorage.getItem('wap_reader_font_size');
	begin = parseInt(begin);
	if(!begin){
		begin = 16;
	}

	fiction_container.css('font-size',begin);
	
	$('.spe-button').on('touchstart',function(){
		$(this).css('background','rgba(255,255,255,0.3)');
	}).on('touchmove',function(){
		$(this).css('background','none');
	}).on('touchend',function(){
		$(this).css('background','none');
	});
	$('#large-font').click(function(){
		if(begin>20){
			return;
		}
		begin+=1;
		localStorage.setItem('wap_reader_font_size',begin);
		fiction_container.css('font-size',begin);
	});

	
	
	$('#small-font').click(function(){
		if(begin<12){
			return;
		}
		begin-=1;
		localStorage.setItem('wap_reader_font_size',begin);
		fiction_container.css('font-size',begin);
	});
	var font_container = $('#font-container');
	var font_button = $('#font-button');
	font_button.click(function(){
		if(font_container.css('display') == 'none'){
			font_container.show();
			font_button.css('background','rgba(255,255,255,0.3)');
		}else{
			font_container.hide();
			font_button.css('background','none');
		}
	});
	
	fiction_container.click(function(){
		font_container.hide();
		font_button.css('background','none');
	});

	$(window).scroll(function(){
		$('#top-nav').hide();
		font_container.hide();
		font_button.css('background','none');
	});

	var menuLoaded = false;
	var menuLock = false;
	$('#menu_mask').click(function(){
		if(menuLock){
			return;
		}
		$('#menu-container').hide();
		$('#menu_mask').hide();
	});
	
	$('#menu-container').delegate('li','click',function(){
		var id = $(this).data('id');
		Chapter_id = id;
		fiction.go(id);
		$('#menu-container').hide();
		$('#menu_mask').hide();

	});
	var menu_frame;
	var createMenuFrame = function(url){
		if(menu_frame){
		   menu_frame.show();
		   return;
		}
		var iframe = $('<iframe></iframe>');
		iframe[0].id = 'menu_frame';
		iframe[0].src = url;
		iframe[0].width = '100%';
		iframe[0].height = '100%';
		iframe[0].style.cssText = 'position:absolute;top:0px;left:0px;z-index:39999';
		$('body').append(iframe);
		menu_frame = iframe;
	}

	top.GoChapter = function(id){
		fiction.go(id);
		menu_frame.hide();
	}
	$('.menu-button').click(function(){
		var iframeUrl = '/fiction/chapter/'+Fiction_id+'?menuframe=true&jumpfrom=wap_reader&scroll_chapter_id='+Chapter_id;
		localStorage.setItem('jumpfrom',location.href);
		location.href = iframeUrl;
		return;
		createMenuFrame(iframeUrl);
		return;
		if(menuLock){
		   return;
		}

		if(menuLoaded){
			$('#menu-container').show();
			$('#menu_mask').show();
			return;
		}
		$('#loading').show();
		$('#menu_mask').show();
		menuLock = true;
		$.get('/fiction/v0/chapter/'+Fiction_id,{},function(d){
			var data = d.chapters;
			var html = '';
			for(var i=0;i<data.length;i++){
				var _d = data[i];
				var _html = '<li data-id="'+_d.chapter_id+'" class="u-bookitm2 u-bookitm2-relevant chapter_item" data-price="'+_d.price+'"><a>'+_d.title+'</a>';
				if(_d.free || d.price == 0){
					_html+='<span class="free">免费</span>';
				}else{
					_html+='<span class="free">'+_d.price+'米币</span>';
				}
				_html+='</li>';
				html+=_html;
				$('#menu-container').html(html);
				$('#menu-container').show();
				$('#loading').hide();
				menuLoaded = true;
				menuLock = false;
			}
			
		},'json');
	});

	var loginUrl = '/dk_id/api/xiaomi_web_reg?login=1&followup=http%3A%2F%2F'+ location.host + location.pathname +'%3Fapp_id%3Dweb';
	$('#buy_chapter').click(function(e){
	  e.stopPropagation();
	  $('#buy_popup_frame').show();
	  $('#mask').show();
	  return;
      var device_id = getCookie('device_id');
      var token = getCookie('token');
      var user_id = getCookie('user_id');
	  if(!user_id || !token){
		 localStorage.setItem('wap_reader_login_jump',location.href);
		 location.href = loginUrl;
		 return;
	  }
	    Util.StorageSetter(Fiction_id + 'last_chapter',fiction.getChapter_id());
		$.post('/store/v0/payment/fiction/create',{
          payment_name : 'MIPAY_WEB',
		  return_url : location.href,
          user_id : user_id,
          device_id : device_id,
          token : token,
          fiction_id :Fiction_id,
          chapter_id : fiction.getChapter_id(),
          app_id :'web'
        },function(d){
          if(d.free){
			alert('免费图书无需购买');
            return;
          }else{
            if(d.result == 1003){
			  localStorage.setItem('wap_reader_login_jump',location.href);
              location.href = loginUrl;
              return;
            }
			//给web项目使用 支付成功之后可以通过这个数据来跳转回这里
			localStorage.setItem('wap_reader_buying_jump',location.href);
            location.href = d.payment_url;
          }
        },'json');
	});

	$('#buy_back').click(function(){
		location.href = "/fiction/chapter/"+Fiction_id;
		$('#buy_container').hide();
		$('#buy_mask').hide();
	});

    //onPageScroll();
    $('#action_bottom').click(function(){
      var scrollHeight = Win.height()/2;
      if(Win.height() + Screen.scrollTop == Screen.scrollHeight){
        fiction.next();
      }else{
        Screen.scrollTop = Screen.scrollTop + scrollHeight;
      }

    });
	
	$('#menu_button').click(function(){
	  if(Fiction_id){
        location.href = '/fiction/chapter/'+Fiction_id;
      }
	});
	$('#go_to_next').click(function(){
		fiction.next();
		_hmt.push(['_trackPageview', location.href]);
	});

	$('#next_button').click(function(){
		 fiction.next();
		 _hmt.push(['_trackPageview', location.href]);
	});
	$('#prev_button').click(function(){
		 fiction.prev();
		 _hmt.push(['_trackPageview', location.href]);
	});

    $('#back_button').click(function(){
      //var fid = localStorage.getItem('fiction_reading_id');
      if(Fiction_id){
        location.href = '/book/'+Fiction_id;
      }
    });

    $('#action_mid').click(function(){
      var tool_bar = $('#top-nav');
      if(tool_bar.css('display') == 'none'){
        tool_bar.show();
      }else{
        tool_bar.hide();
		$('#font-container').hide();
		font_button.css('background','none');
      }

    });

    $('#action_top').click(function(){
      var scrollHeight = Win.height()/2;
      if(Screen.scrollTop == 0){
        fiction.prev();
      }else{
        Screen.scrollTop = Screen.scrollTop - scrollHeight;
      }
    });

  }

  return main();
})();