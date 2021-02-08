define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel'
], function(Adapt, ComponentView, ComponentModel) {

  var SimulationView = ComponentView.extend({

    events: {
      'click .js-sim-start-click': 'onStart',
      'click .js-sim-click-area': 'onSelectArea',
      'click .js-sim-incorrect' : 'onSelectIncorrectArea',
      'input .js-sim-input': 'onInput',
      'click .js-sim-continue-click': 'onContinue',
      'click .js-sim-retry-click': 'onRetry'
    },

    _type: '',
    _stepIndex: 0,
    _stepType: '',
    _data: '',
    _score: 0,
    _stepFailed: false,
    _mousex: 0,
    _mousey: 0,
    _audio: false,

    preRender: function() {

      Handlebars.registerHelper('if_eq', function(a, b, opts) {
        if (a == b) {
            return opts.fn(this);
        } else {
            return opts.inverse(this);
        }
      });

      this.checkIfResetOnRevisit();
    },

    postRender: function() {
      this.setReadyStatus();

      this.$('.simulation__widget').eq(this._stepIndex).addClass('is-visible'); 

      this._type = this.model.get('_type');

      const index = this._stepIndex;
      let type = '';
      this.model.get('_items').forEach(function(item, i) {
        if (i === index) {
          type = item._stepType;
        }
      });
      this._stepType = type;

      if (this._type === 'watch' && this._stepType === 'select') {
        let target = this.$('.simulation__widget').eq(this._stepIndex).find('.simulation__area');
        target.addClass('watch');
      }

      this.$('.simulation__message-main').a11y_focus();

    },

    checkIfResetOnRevisit: function() {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      // If reset is enabled set defaults
      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    },


    onStart: function() {
      this.$('.simulation__intro').addClass('hide');
      this._score = 0;

      if(this._type === "watch" ) {
        this.animateMouse();
      }

      this.checkAudio();

    },

    animateMouse: function () {

      let target = this.$('.simulation__widget').eq(this._stepIndex).find('.simulation__area');
      switch(this._stepType) {
        case 'select':
          target.addClass('watch');
          break;
        case 'input':
          target = this.$('.simulation__widget').eq(this._stepIndex).find('.simulation__input');
          target.disabled = true;
          break;
      }

      const mouse = this.$('.simulation__widget').eq(this._stepIndex).find('.simulation__watch-mouse');
      mouse.animate({left: this._mousex, top: this._mousey}, 0);

      if (this._stepType !== 'message') {
        this._mousex = target[0].offsetLeft + target[0].offsetWidth/2;
        this._mousey = target[0].offsetTop + target[0].offsetHeight/2;

        mouse.animate({left: this._mousex, top: this._mousey}, 1000, function(){}).promise().done(() =>{
          window.setTimeout(() => {
            const audioOn = !$('.js-nav-audio-btn').find('.icon').hasClass('mute');
            switch(this._stepType) {
              case 'select':
                let wait = 500;
                if (this._audio === true) {
                  if($('#audio')[0].duration && audioOn === true) {
                    wait = $('#audio')[0].duration * 1000;
                  }
                }
                window.setTimeout(() => {
                  this.onContinue();
                }, wait);
                break;
              case 'input':
                //write out data...
                let inputStr = '';
                const dataStr = this._data;
                var chars = dataStr.split("");
                chars.forEach((char, i) => {
                  window.setTimeout(() => {
                    inputStr += char;
                    target.val(inputStr);

                    if(i === chars.length-1) {
                      let wait = 1000;
                      if (this._audio === true) {
                        if($('#audio')[0].duration && audioOn === true) {
                          wait = ($('#audio')[0].duration * 1000) - (100*chars.length);
                        }
                      }
                      window.setTimeout(() => {
                        this.onContinue();
                      }, wait);
                    }
                  }, 100*i);
                  
                })
                break;
            }
          }, 500);
        });
      }

    },

    onSelectIncorrectArea: function() {
      if (this._type !== 'watch') {
        this.$('.simulation__warning').addClass('show');
        this._stepFailed = true;
        window.setTimeout(function(){
          this.$('.simulation__warning').addClass('hide');
          window.setTimeout(function(){
            this.$('.simulation__warning').removeClass('show');
            this.$('.simulation__warning').removeClass('hide');
          }, 1000);
        }, 4000);
      }
    },

    onSelectArea: function() {
      if (this._type !== 'watch') {
        this.onContinue();
      }
    },

    onInput: function(e) {
      // move on to next step, if data entered correctly
      if (e.target.value.toLowerCase() === this._data.toLowerCase()) {
        window.setTimeout(() => {
          this.onContinue();
        }, 500);
      }
    },

    onContinue: function() {
      
      if (this._stepFailed === false) {
        this._score++;
      } 
      this._stepFailed = false;

      this.$('.simulation__widget').eq(this._stepIndex).removeClass('is-visible'); 
      this._stepIndex++;
      this.$('.simulation__widget').eq(this._stepIndex).addClass('is-visible'); 
      const index = this._stepIndex;

      let data = '';
      let type = '';
      this.model.get('_items').forEach(function(item, i) {
        if (i === index) {
          data = item.data;
          type = item._stepType;
        }
      })
      this._data = data;
      this._stepType = type;

      switch (this._type) {
        case 'watch':
          this.animateMouse();
        break;
      }

      if (this._stepType === 'input') {
        const target = this.$('.simulation__widget').eq(this._stepIndex).find('.simulation__input');
        target.val('');
        target.a11y_focus();
      }

       const steps = this.model.get('_items').length-1;
       if (this._stepIndex === steps) {

        if (this._type === 'evaluate') {
          const result = document.getElementById(this.model.get('_id') + '-message-' + this._stepIndex);
          let content = this.model.get('passed');
         
          if (this._score !== steps) {
            content = this.model.get('failed');
            this.$('.simulation__continue-btn').addClass('hide');
            this.$('.simulation__retry-btn').removeClass('hide');
          } else {
            this.$('.simulation__button').addClass('hide');
          }
          const percent = (100/steps) * this._score;
          content = content.replace('{0}','' + percent + '');
          result.innerHTML = content;

          result.a11y_focus();
          
          this.setCompletionStatus();

        } else {

          this.$('.simulation__continue-btn').addClass('hide');
          this.$('.simulation__retry-btn').removeClass('hide');

        }

      }

      this.checkAudio();

    },

    checkAudio: function() {
      //audio?
      this._audio = false;
      Adapt.trigger('audio:stop');
      if (Adapt.config.get('_sound')._isActive === true) {
        this.model.get('_items').forEach((item, i) => {
          if (i === this._stepIndex) {
            if (item._audio) {
              this._audio = true;
              Adapt.trigger('audio:partial', {src: item._audio._src});
            }
          }
        });
      }
    },

    onRetry: function() {
      this._mousex = 0;
      this._mousey = 0;
      
      if(this._type === 'watch') {
        const mouse = this.$('.simulation__widget').eq(0).find('.simulation__watch-mouse');
        mouse.animate({left: this._mousex, top: this._mousey}, 0);

        let type = '';
        this.model.get('_items').forEach(function(item, i) {
          if (i === 0) {
            type = item._stepType;
          }
        });
        this._stepType = type;
      } else {
        this._stepType = '';
      }
      
      
      this._data = '';
      this._score = 0;
      this._stepFailed = false;
      

      this.$('.simulation__continue-btn').removeClass('hide');
      this.$('.simulation__retry-btn').addClass('hide');
      this.$('.simulation__button').removeClass('hide');
      
      this.$('.simulation__intro').removeClass('hide');

      this.$('.simulation__widget').eq(this._stepIndex).removeClass('is-visible'); 
      this._stepIndex = 0;
      this.$('.simulation__widget').eq(this._stepIndex).addClass('is-visible'); 

      this.$('.simulation__message-main').a11y_focus();
    }



  },
  {
    template: 'simulation'
  });

  return Adapt.register('simulation', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: SimulationView
  });
});
