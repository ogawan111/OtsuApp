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




$(function () {
	$('.fadeBgMod li').fadeBgSlider(
		{
			interval: 8000,
			duration: 1000
		}
	);
});

