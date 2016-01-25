(function () {
    var parseChapterData = function(jsonData) {
        var jsonObj = JSON.parse(jsonData);
        var html = "<h4>" + jsonObj.t + "</h4>";
        for (var i = 0; i < jsonObj.p.length; i++) {
          html += "<p>" + jsonObj.p[i] + "</p>";
        }
        return html;
    };

    var scrollChapterList = function() {
        var cursor_node = $('.cursor');
        if (cursor_node.length) {
            var cursor_top = cursor_node[0].offsetTop;
            console.log("cursor top:", cursor_top);

            var cursor_height = $(".cursor").outerHeight();

            var list_location = $('#chapter-list');
            var list_height = list_location.innerHeight();

            var scroll_top = list_location.scrollTop();
            if (cursor_top + cursor_height > scroll_top + list_height) {
                list_location.scrollTop(cursor_top + cursor_height - list_height);
            }
            else if (cursor_top < scroll_top) {
                list_location.scrollTop(cursor_top);
            }
        }
    };

    $.getBSONP = function(url, callback) {
        $.jsonp({
            url: url,
            cache: true,
            callback: "duokan_fiction_chapter",
            success: function(result) {
                var data = $.base64.decode(result);
                var json = decodeURIComponent(escape(data));
                var html = parseChapterData(json);
                callback(html);
            }
        });
    };

    var app = angular.module('app', []);
    app.controller('FictionController',
        ['$http', '$location', function($http, $location) {
        this.title = "";
        this.chapter_id = 0;
        this.fiction_id = 13359;
        this.chapters = [];

        var urls = $location.absUrl().split('?');
        if (urls.length == 2) {
            params = urls[1].split('=');
            for (var i = 0; i < params.length && params.length >= 2; i += 2){
                if (params[i] == "fiction_id")
                    this.fiction_id = parseInt(params[i + 1]);
            }
        }

        console.log("fiction_id:", this.fiction_id);

        var fiction = this;
        this.getFictionInfo = function() {
            var url = "/reader/fiction/chapter/list/" + this.fiction_id + "?check_pay=1";
            $http.get(url).success(function (data) {
                if (data.result == 0) {
                    fiction.title = data.title;
                    for (var i = 0; i < data.chapters.length; i++) {
                        fiction.chapters.push({"chapter_id": data.chapters[i].chapter_id,
                            "title": data.chapters[i].title,
                            "price": data.chapters[i].price,
                            "payed": data.chapters[i].payed
                        });
                    }
                }
                else {
                    var msg = "<p class=\"errmsg\">章节列表获取失败<br/><label>" + data.msg + "</label></p>";
                    $("#chapter-list").html(msg);
                }

            });
        };

        this.prevChapter = function() {
            var index = fiction.chapter_id;
            if (index == 0)
                return;
            index--;
            fiction.gotoChapter(index);
        };

        this.nextChapter = function() {
            var index = fiction.chapter_id;
            if (index == fiction.chapters.length - 1)
                return;

            index++;
            fiction.gotoChapter(index);
        };

        this.gotoChapter = function (chapter_id) {
            fiction.chapter_id = chapter_id;
            fiction.getCurChapterContent();
            window.scrollTo(0, 0);
            setTimeout(scrollChapterList, 50);
        };

        this.getCurChapterContent = function () {
            var url = "/reader/fiction/chapter/jsonp/" + fiction.fiction_id + "/" + fiction.chapter_id;
            $http.post(url).success(function(data) {
                var msg = data.msg;
                if (data.result == 0) {
                    var url = data.jsonp;
                    $.getBSONP(url, function (data) {
                        $("#chapter-content").html(data);
                    });
                }
                else if (data.result == 101) {
                    msg = "<p class=\"errmsg\"><label>未登录</label><br/>请到<a href=\"http://www.in.duokan.com\" target=\"_blank\">www.in.duokan.com</a>登录后刷新</p>";
                    $("#chapter-content").html(msg);
                }
                else {
                    msg = "<p class=\"errmsg\"><label>" + msg + "</label><br/>" + fiction.chapters[fiction.chapter_id].title + "</p>";
                    $("#chapter-content").html(msg);
                }
            });
        };

        fiction.getFictionInfo();
        fiction.gotoChapter(0);
    }]);
})();