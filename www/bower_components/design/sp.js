$.fn.fadeBgSlider = function (config) {
	var target = this;
	config = jQuery.extend({
		interval:8000,
		duration:1000
	},config);

	var size = target.size();
	var now = 0;

	var getBack = function(now_) {
		now_--;
		if(now_ < 0) {
			now_ = size - 1;
		}
		return now_;
	};

	var getNext = function(now_) {
		now_++;
		if(now_ > (size - 1)) {
			now_ = 0;
		}
		return now_;
	};

	var imgChange = function(now_) {
		var back = getBack(now_);
		target.eq(now_).fadeIn(config.duration);
		target.eq(back).fadeOut(config.duration);
	}

	var init = function() {
		target.eq(now).fadeIn(config.duration);
		setInterval(function(){
			imgChange(now);
			now = getNext(now);
		}, config.interval);
	};
	init();
};



$.fn.accordion = function(config) {
    var targetsJ = this;
    
    config = $.extend({
                      classHead: '.head',
                      classBody: '.body',
                      classToggle: 'minus'
                      },config);
    
    var applyAccordion = function(targetJ) {
        
        var headJ = targetJ.find(config.classHead);
        var bodyJ = targetJ.find(config.classBody);
        
        // 元々開いているかチェック
        if(!headJ.hasClass(config.classToggle)) {
            bodyJ.hide();
        }
        
        headJ.click(function() {
                    if(bodyJ.is(':animated')) {
                    return false;
                    }
                    
                    bodyJ.slideToggle("normal",function(){
                                      if(bodyJ.is(':visible')) {
                                      headJ.addClass(config.classToggle);
                                      
                                      // アコーディオンを開くとき開いたことがわかるように少しスクロールさせる
                                      $('#hikiyamaDetail .page__content').animate({
                                                                                  scrollTop: $('#hikiyamaDetail .page__content').scrollTop()+100
                                                                                  }, 500);
                                      
                                      } else {
                                      headJ.removeClass(config.classToggle);
                                      }
                                      });
                    
                    return false;
                    });
    }
    
    targetsJ.each(function(){
                  applyAccordion($(this));
                  });
};


$(function () {
	$('.fadeBgMod li').fadeBgSlider(
		{
			interval: 8000,
			duration: 1000
		}
	);
});

