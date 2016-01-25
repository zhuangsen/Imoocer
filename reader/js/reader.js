(function(){
	"use strict";
	//html5本地存储类
	var Util = (function(){
		//防止key冲突
		var prefix = "my_reader";
		var StorageGetter = function(key){
			return localStorage.getItem(prefix+key);
		}
		var StorageSetter = function(key,val){
			return localStorage.setItem(prefix+key,val);
		}
		var getBSONP = function(url,callback){
			return $.jsonp({
				url:url,
				cache:true,
				callback:"duokan_fiction_chapter",
				success:function(result){
					var data = $.base64.decode(result);
					var json = decodeURIComponent(escape(data));
					callback(json);
				}
			});
		}
		return {
			getBSONP:getBSONP,
			StorageGetter:StorageGetter,
			StorageSetter:StorageSetter
		}
	})();

	var Dom = {
		topNav:$("#top-nav"),
		bottomNav:$(".bottom"),
		dayButton:$(".day-button"),
		fontButton:$("#font-button"),
		bgPanel:$(".bg-panel"),
		fontContainer:$("#font-container"),
		bgContainer:$(".bg-container"),
		lgFont:$("#lg-font"),
		smFont:$("#sm-font"),
		readContainer:$(".m_read_container"),
	}
	var Win = $(window);
	var Doc = $(document);
	var readerModal;
	var readUI;
	/****初始化字体****/
	var font_size = Util.StorageGetter("font_size");
	//console.log(font_size);
	var fontSize=font_size?parseInt(font_size):14;
	//console.log(fontSize);
	Dom.readContainer.css("font-size",fontSize);
	/****初始化背景****/
	var bgContainerIndex = Util.StorageGetter("bg_container_index");
	//var initBgContainer = Util.StorageGetter("bg_container");
	if(null != bgContainerIndex){
		var bg = Dom.bgContainer.eq(bgContainerIndex);
		$("#body").css("background",bg.css("background"));
		bg.children("div").addClass("bg-container-current");
		Dom.bgContainer.not(bg).children("div").removeClass("bg-container-current");

		if(bgContainerIndex == 1){
			$("#itemDay").show();
			$("#itemNight").hide();
		}else{
			$("#itemDay").hide();
			$("#itemNight").show();
		}
	}
	

	function main(){
		//整个项目的入口函数
		readerModal = ReaderModal();
		readUI = ReaderBaseFrame(Dom.readContainer);
		/*readerModal.init(function(data){
			readUI(data);
		});*/
		readerModal.initPromise();
		EventHandler();
	}

	function ReaderModal(){
		//实现和阅读器相关的数据交互的方法
		var ChapterId;
		var ChapterTotal;
		var init = function(UIcallback){
			/*
			getFiction(function(){
				getCurChapterContent(ChapterId,function(data){
					UIcallback && UIcallback(data);
				});
			});
			*/
			getFictionPromise().then(function(d){
				/*getCurChapterContent(ChapterId,function(data){
					UIcallback && UIcallback(data);
				});*/
				return getCurChapterContentPromise();
			}).then(function(data){
				UIcallback && UIcallback(data);
			});
		}

		var initPromise = function(){
			return new Promise(function(resolve,reject){
				getFictionPromise().then(function(d){
					return getCurChapterContentPromise();
				}).then(function(data){
					//UIcallback && UIcallback(data);
					//resolve(data);
					readUI(data);
				});
			});
		}

		var getFiction = function(callback){
			$.get("data/chapter.json",function(data){
				//获得章节信息的回调
				ChapterId = Util.StorageGetter("last_chapter_id");
				if(null == ChapterId){
					ChapterId = data.chapters[1].chapter_id;
				}
				ChapterTotal = data.chapters.length;
				callback && callback();
			},"json");
		}
		var getFictionPromise = function(){
			return new Promise(function(resolve,reject){
				$.get("data/chapter.json",function(data){
					//获得章节信息的回调
					if(data.result == 0){
						ChapterId = Util.StorageGetter("last_chapter_id");
						if(null == ChapterId){
							ChapterId = data.chapters[1].chapter_id;
						}
						ChapterTotal = data.chapters.length;
						//callback && callback();
						resolve(data);
					}else{
						reject({msg:"fail"});
					}
				},"json");
			});
		}
		var getCurChapterContent = function(chapterId,callback){
			$.get("data/data"+chapterId+".json",function(data){
				if(data.result == 0){
					var url = data.jsonp;
					Util.getBSONP(url,function(data){
						callback && callback(data);
					});
				}
			},"json");
		}
		var getCurChapterContentPromise = function(){
			return new Promise(function(resolve,reject){
				$.get("data/data"+ChapterId+".json",function(data){
					if(data.result == 0){
						var url = data.jsonp;
						Util.getBSONP(url,function(data){
							//callback && callback(data);
							resolve(data);
						});
					}else{
						reject({msg:"fail"});
					}
				},"json");
			});
		}

		var prevChapter = function(UIcallback){
			ChapterId = parseInt(ChapterId,10);
			if(ChapterId == 1){
				return;
			}
			ChapterId = ChapterId-1;
			getCurChapterContent(ChapterId,UIcallback);
			Util.StorageSetter("last_chapter_id",ChapterId);
		}
		var nextChapter = function(UIcallback){
			ChapterId = parseInt(ChapterId,10);
			if(ChapterId == ChapterTotal || ChapterId == 4){
				return;
			}
			ChapterId = ChapterId+1;
			getCurChapterContent(ChapterId,UIcallback);
			Util.StorageSetter("last_chapter_id",ChapterId);
		}

		return{
			init:init,
			initPromise:initPromise,
			prevChapter:prevChapter,
			nextChapter:nextChapter
		}
	}

	function ReaderBaseFrame(container){
		//渲染基本的UI结构
		function parseChapterData(jsonData){
			var jsonObj = JSON.parse(jsonData);
			var html = "<h4>"+jsonObj.t+"</h4>";
			for(var i = 0; i < jsonObj.p.length; i++){
				html +="<p>"+jsonObj.p[i]+"</p>";
			}
			return html;
		}

		return function(data){
			container.html(parseChapterData(data));
		}
	}

	function EventHandler(){
		Win.scroll(function(){
			Dom.topNav.hide();
			Dom.bottomNav.hide();
			Dom.bgPanel.hide();
			Dom.fontButton.removeClass("current");
		});
		//交互的事件绑定
		$("#action_id").click(function(){
			if(Dom.topNav.css("display")=="block"){
				Dom.topNav.hide();
				Dom.bottomNav.hide();
				Dom.bgPanel.hide();
				Dom.fontButton.removeClass("current");
			}else{
				Dom.topNav.show();
				Dom.bottomNav.show();
			}
		});

		Dom.fontButton.click(function(){
			if(Dom.fontContainer.css("display")=="none"){
				Dom.bgPanel.show();
				$(this).addClass("current");
			}else{
				Dom.bgPanel.hide();
				$(this).removeClass("current");
			}
		});

		Dom.dayButton.click(function(){
			var bg;
			if($("#itemDay").css("display")=="none"){
				$("#itemDay").show();
				$("#itemNight").hide();
				bg = Dom.bgContainer.eq(1);
				Util.StorageSetter("bg_container_index",1);
			}else{
				$("#itemDay").hide();
				$("#itemNight").show();
				bg = Dom.bgContainer.eq(5);
				Util.StorageSetter("bg_container_index",5);
			}
			$("#body").css("background",bg.css("background"));
			bg.children("div").addClass("bg-container-current");
			Dom.bgContainer.not(bg).children("div").removeClass("bg-container-current");
		});

		Dom.bgContainer.click(function(){
			$("#body").css("background",$(this).css("background"));
			$(this).children("div").addClass("bg-container-current");
			Dom.bgContainer.not($(this)).children("div").removeClass("bg-container-current");
			Util.StorageSetter("bg_container_index",Dom.bgContainer.index($(this)));
		});

		Dom.lgFont.click(function(){
			//var fontSize = Dom.readContainer.css("font-size");
			//fontSize = parseInt(fontSize.substring(0,fontSize.indexOf("px")));
			//console.log(fontSize);
			if(fontSize<=23){
				fontSize=fontSize+1;
				Dom.readContainer.css("font-size",fontSize);
				Util.StorageSetter("font_size",fontSize);
			}
		});

		Dom.smFont.click(function(){
			//var fontSize = Dom.readContainer.css("font-size");
			//fontSize = parseInt(fontSize.substring(0,fontSize.indexOf("px")));
			if(fontSize>12){
				fontSize=fontSize-1;
				Dom.readContainer.css("font-size",fontSize);
				Util.StorageSetter("font_size",fontSize);
			}
		});

		$("#prev-button").click(function(){
			//获取章节的翻页数据,把数据拿出来渲染
			readerModal.prevChapter(function(data){
				readUI(data);
			});
		});

		$("#next-button").click(function(){
			readerModal.nextChapter(function(data){
				readUI(data);
			});
		})

		$("#menu-button").click(function(){
			location.href="http://dushu.xiaomi.com/fiction/chapter/306450";
		});
		$(".top-nav").click(function(){
			location.href="http://dushu.xiaomi.com/";
		})
	}

	main();

})();