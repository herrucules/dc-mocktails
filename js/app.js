var interactiveApp = {
  appRoutes: appRoutes,
  audioHandles: {},
  videoHandle: null,
  quizes: [],
  currentRoute: null,
  preloadjs: null,
  parsedSVG: {},
  menuBtn: $('#menu-icon'),
  menuContainer: $('#menu-container'),
  bgm: null,
  bgmVol: 0.6
};

$(function() {

  var preload = new createjs.LoadQueue();
  interactiveApp.preloadjs = preload;
  preload.on('complete', handlePreloadComplete);

  $('#content, #menu-icon, #menuContainer').hide();

  function handlePreloadComplete () {
    clog('preload complete..');  
    $('#preloader').hide();    
    $('#content, #menu-icon, #menuContainer').show();

    // play bgm on desktop
    //interactiveApp.bgm = createjs.Sound.play("bgm", {loop:-1, volume:interactiveApp.bgmVol}); 

    initRouting();    
  }

  if (manifestToLoad == undefined) manifestToLoad = [];

  $.each(interactiveApp.appRoutes, function (index, value) {
    if (value.audioURL) {
      manifestToLoad.push({id: value.name, src: value.audioURL});
    }
  });
  if (manifestToLoad.length) {
    createjs.Sound.registerPlugins([createjs.HTMLAudioPlugin]);  // need this so it doesn't default to Web Audio
    preload.installPlugin(createjs.Sound);
    clog(manifestToLoad);
    preload.loadManifest(manifestToLoad);    
  } else {
    handlePreloadComplete(); 
  }

  function handleLoadedAssets () {
    return;
    var imgs = $('#content img');
    $.each(imgs, function(index, value) {
      var obj = $(value);
      if (obj.data('preloaded') == '1') return;
      $.each(manifestToLoad, function (i, v) {
        if (obj.attr("src") == v.src) {          
          obj.data('preloaded','1')
            .hide()
            .after(interactiveApp.preloadjs.getResult(v.id));
            
          interactiveApp.preloadjs.getResult(v.id).alt = obj.attr('alt');
        }
      });
    });
  }

  function initRouting() {

    interactiveApp.mainSection = $('#interactive-container > #content');

    $.sammy(function() {

      var _this = this;      

      $.each(interactiveApp.appRoutes, function(index, value) {   
        _this.before(value.url, function() {
          for (var p in interactiveApp.audioHandles) {
            // clog(p);
            interactiveApp.audioHandles[p].stop();
          }
        });

        _this.get(value.url, function() {   
          // clog('get: '+value.url);
          $.get(value.templateUrl, function(d) {

            interactiveApp.currentRoute = value;

            function setContent() {

              $('#logo').show();

              // set the content
              interactiveApp
                .mainSection
                .html(d);    

              handleLoadedAssets();

              initQuiz(value.id); 
              executeScript();    

              $('#next-nav, #nav-prev').off('click');

              $('#nav-next').on('click', function(e) {
                e.stopPropagation();
                if (index+1 < interactiveApp.appRoutes.length) {
                  window.location = '#'+interactiveApp.appRoutes[index+1].url;      
                  interactiveApp.playAudio(interactiveApp.appRoutes[index+1].name);
                }

                return false;
              });

              $('#nav-prev').on('click', function(e) {
                e.stopPropagation();

                var href = $(this).attr('href');
                if (href) {
                  interactiveApp.linkChange(href);
                }
                else if (index-1 > -1) {
                  window.location = '#'+interactiveApp.appRoutes[index-1].url;      
                  interactiveApp.playAudio(interactiveApp.appRoutes[index-1].name);
                }
                

                return false;
              });

              if (value.postTracked == undefined || value.postTracked == false) {
                interactiveApp.LOProgress.set(value);            
              }
            }


            if (interactiveApp.outAnim) {
              interactiveApp.outAnim( setContent );
            }
            else {
              setContent();
            }
            
          })
        });      
      });

    }).run('#/');

  }

  interactiveApp.menuContainer.css('top', '-200%');
  interactiveApp.menuBtn.on('click', function() {    
    var menu = interactiveApp.menuContainer;
    var btn = interactiveApp.menuBtn;
    if (btn.data('is-open')) {
      btn.data('is-open', false);
      TweenLite.to(menu, 2, {top: '-200%', ease:Expo.easeOut});      
    } else {
      clog('open dong..')
      btn.data('is-open', true);
      TweenLite.to(menu, .5, {top: 0, ease:Expo.easeOut});      
    }

    var icon = btn.children('img');
    var tmp = icon.data('alt-img');
    icon.data('alt-img', icon.attr('src'));
    icon.attr('src', tmp);
  });
  interactiveApp.menuContainer.on('click', 'a', function (e) {
    e.stopPropagation();
    interactiveApp.linkChange( $(this).attr('href') );    
  });

  // if (screenfull.enabled) {
  //   document.addEventListener(screenfull.raw.fullscreenchange, function () {
  //     if (screenfull.isFullscreen == false) {
  //       ic.css('width', ''); // remove the width css so remains 100%
  //     }
  //   });
  // }

});

interactiveApp.linkChange = function (href) {
  window.location = href;                  
  href = href.substring(1);
  for (var i=0; i<interactiveApp.appRoutes.length; i++) {
    var route = interactiveApp.appRoutes[i];
    if (href == route.url) {
      if (route.audioURL) {
        interactiveApp.playAudio(route.name);
      }
      break;
    }
  }
};

interactiveApp.LOProgress = {
  init: function() {
    var self = this;
    self.totalProgressEl = $('#total-progress');
    self.totalProgress = 0;
    self.visitedSection = [];
  },
  set: function(section) {
    var self = this;
    if (self.visitedSection.indexOf(section) == -1 && section.tracked != undefined) {
      self.totalProgress += section.tracked;
      //self.totalProgressEl.css('width', self.totalProgress+'%');
      self.visitedSection.push(section);
    }
  }
};
interactiveApp.LOProgress.init();

interactiveApp.playAudio = function (id) {
  interactiveApp.audioHandles[id] = createjs.Sound.play(id);
};

interactiveApp.muteBGM = function () {
  if (interactiveApp.bgm) {
    interactiveApp.bgm.volume = 0;
  }
};

interactiveApp.unMuteBGM = function () {
  if (interactiveApp.bgm) {
    interactiveApp.bgm.volume = interactiveApp.bgmVol;
  }
};

$(window).TabWindowVisibilityManager({
    onFocusCallback: function(){
        for (var p in interactiveApp.audioHandles) {
          interactiveApp.audioHandles[p].paused = false;
        }
        if (interactiveApp.videoHandle) {
          interactiveApp.videoHandle.play();
        } else {
          interactiveApp.unMuteBGM();          
        }
    },
    onBlurCallback: function(){
        for (var p in interactiveApp.audioHandles) {
          interactiveApp.audioHandles[p].paused = true;
        }
        if (interactiveApp.videoHandle) {
          interactiveApp.videoHandle.pause();
        } 
        interactiveApp.muteBGM();
    }
});


// window resized
  var ic, w, h;

  ic = $('#interactive-container');
  w = ic.width();
  h = ic.height();

  $(window).resize(resizeme);

  var orientation = 'landscape';
  function resizeme() {  

    var win = $(window),
        windowHeight = win.height(),
        windowWidth = win.width(),
        proportion = {w:5, h:3},
        ratio = proportion.w / proportion.h;

    var currentRatio = windowWidth/windowHeight;

    if (currentRatio > ratio) {
      // wider
      h = windowHeight;
      w = h * ratio;
      ic.css({height:h, width:w});
    } else if (currentRatio < ratio) {
      // higher
      w = windowWidth;
      h = w * proportion.h / proportion.w;
      ic.css({height: h, width: w});      
    }
    

    // maxHeight = $(window).height();
    // w = ic.width();      
    // h = w * 3/5;
    // ic.css({height: h});      
    // w = ic.width();

    // keep it proportional
    // if (screenfull.isFullscreen) {

    //   ic.css('width', ic.height() * 5/3);
    // } else {      
      // if (maxHeight <= h) {
      //   ic.css('height', maxHeight);
      //   ic.css('width', ic.height() * 5/3);
      // }
    // }

  }
  resizeme();

  ic.flowtype({
    fontRatio : 30
  });

    interact('.moveable')
     .draggable({
        onmove: calcPercentPos
      })
     .resizable({
      edges:{right:true, bottom:true}
      })
     .on('resizemove', calcPercentSize);
  

  function calcPercentPos(evt) {    
    var obj = $(evt.target),
        pos = obj.position(),
        x = pos.left + evt.dx,
        y = pos.top + evt.dy;

    var parent = obj.parent(),
        wp = parent.width(),
        hp = parent.height();


    $(obj).css({
      left: x / wp * 100 + "%",
      top: y / hp * 100 + "%"
    });

    // $(obj).css({
    //   left: x / wp * 100 + "%"
    // });
  };

  function calcPercentSize(evt) {    
    var obj = $(evt.target),
        parent = obj.parent(),
        wp = parent.width(),
        hp = parent.height(),
        minWidth = minHeight = 3, //percent
        width = evt.rect.width/wp * 100,
        height = evt.rect.height/hp * 100;

    width = width < minWidth ? minWidth : width;
    height = height < minHeight ? minHeight : height;
    $(obj).css({
      width: width+"%",
      height: height+"%"
    });
  };

function clog (str) {
  return;
  console.log(str);
}

var quizes;
function executeScript() {
  // prepare new quizdata container
  quizes = new Array(); 
  // remove the contenteditable
  $('[contenteditable]').removeAttr('contenteditable');
  // execute the scripts
   $('.script').each (function(i, el) {
      el = $(el);
      var scriptText = el.text();
      if (scriptText) {
        el.hide();
        try {
          var scriptVar = eval(scriptText);      
          if (scriptVar.quizType != undefined) {
            // it is a quiz!
            quizes.push(scriptVar);
          }
        }catch (ex) {}        
      }
    }); // end each   
}; // end executeScript

var currentQuizGroup, currentPageID;
function initQuiz (pageID) {
  currentPageID = pageID;
  initQuizMC();
  initQuizBtns();
  initQuizResponse();
}

function initQuizBtns () {
  // $('.quiz-next-btn').hide();

  $('#quiz-submit-btn').on('click', function() {
    var $submitBtn = $(this);
    // $('.quiz .alert-box').hide();  

    if (quizes) {
      var allCorrect = true, 
          reachMaxTry = false;

      $.each (quizes, function (i, quiz) {
        var quizID = quiz.id;
        var status = 'incorrect';
        currentQuizGroup = quizGroup[quiz.group];

        if (currentQuizGroup.maxTry > 0) 
          quiz.tries = parseInt(quiz.tries) + 1;        

        var result = true;
        switch (quiz.quizType) {
          case 'mc':
          case 'tf':
            var answer = quiz.answer;              
            var userAnswer = $('input[name='+quizID+']:checked').val();
            quiz.userAnswer = userAnswer;
            if ( answer != userAnswer ) {
              result = false;                
            } 
          break;

          // case 'sa':
          //   $.each (quiz.answer, function (key, val) {
          //     var answers = val.split('#');
          //     $.each (answers, function (i, answer) {
          //       answers[i] = answer.trim();
          //     });
          //     var userAnswer = $('#'+key).val().trim();
          //     if ( answers.indexOf(userAnswer) == -1) {
          //       result = false;
          //       return false;
          //     }                
          //   });
          // break;

          // case 'dd':
          //   $.each (quiz.answer, function (key, val) {
          //     var answer = val;              
          //     var userAnswer = $('#'+key).val();
          //     if ( answer != userAnswer ) {
          //       result = false;
          //       return false;
          //     }                
          //   });
          // break;

          // case 'matching':
          //   result = checkQuizMatching();
          // break;
        }

        quiz.result = result;
        
        // mark result in group..
        $.each (currentQuizGroup.quizes, function (i, q) {
          if (q.page == currentPageID && q.quizID == quizID) {
            q.result = result;
            q.userAnswer = quiz.userAnswer;
            return false; // found - stop searching
          }
        });

        if (result) {
          status = 'correct';             
        } else {          
          if (currentQuizGroup.maxTry != 0 && quiz.tries >= currentQuizGroup.maxTry) {
            reachMaxTry = true;
            status = 'correction';
          } else {
            allCorrect = false;
            status = 'incorrect';
          }  
        }        

        $('#'+quizID+'-'+status).fadeIn();              
        clog(status);
        $(document).trigger('quiz/checked', {quizID:quizID, quizGroup:quiz.group, quizType:quiz.quizType, status:status});

      }); // end each quiz in this page!

      if (allCorrect || reachMaxTry) {
        $('.quiz-next-btn').show();
        $submitBtn.hide();

        checkAllQuestionInGroupAnswered();

      } // end if
    }
  }); // end on click submit

}

function checkAllQuestionInGroupAnswered () {
  // are all the questions answered in the group?
  var allAnswered = true;
  var totalCorrect = 0;
  $.each (currentQuizGroup.quizes, function (i, q) {
    if (q.result == undefined) {
      allAnswered = false;      
    } else if (q.result) {
      totalCorrect++;
    } 
  }); // end each

  clog('benar = '+totalCorrect+' dari '+currentQuizGroup.quizes.length);

  if (allAnswered) {
    clog('semua udah');
    var modal = $('.modal-catel');

    if (modal.length) {
      var htmlEl = modal.children(':not(.close-reveal-modal)');
      var htmlStr = htmlEl.html();
      htmlStr = htmlStr.replace('{correct}', totalCorrect);
      htmlStr = htmlStr.replace('{total}', currentQuizGroup.quizes.length);
      htmlEl.replaceWith(htmlStr);
          }

    $.each(appRoutes, function (i, el) {
      if (el.id == currentPageID) {        
        interactiveApp.LOProgress.set(el);
        return false;
      }
    });

  } else {
    clog('msi ad belum ');    
  }
}

function initQuizResponse () {
  $('.quiz-response').hide();
}

function initQuizMC () {
  $('.quiz-input-radio').each(function (i, el) {
    $(el).prop('checked', false);
  }); 
}
