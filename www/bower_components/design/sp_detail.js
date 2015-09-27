
  
  var module = ons.bootstrap('my-app', ['onsen']);



  
  ons.ready(function() {

$('.bxslider').bxSlider({
  mode: 'horizontal',
  controls: false,
  captions: false
});




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

 $('.accordionMod').accordion({
  classHead:'.title',
  classBody:'.in',
  classToggle:'on'
 });




  });




