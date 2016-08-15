// frontend helpers for AdRapid API example implementations
// Documentation is available at http://raviteq.github.io/adrapid-api/

var helpers = function(options) {

  // config
  var func = function() {};
  this.inspectors = [];
  this.uploadHelper = uploadHelper;
  this.template_key = '';

  var edgeSrc = 'http://animate.adobe.com/runtime/6.0.0/edge.6.0.0.min.js';

  // setup options for using the AdRapid api_get method 
  // to send the file upload request using AJAX.
  var uploadOptions = {
    cache       : false, // Don't cache
    processData : false, // Don't process the files
    contentType : false, // Set content type to false as jQuery will tell the server its a query string request
  };

  // build a form from template rules
  this.buildForm = function(rules, template, settings) {
  
    // setup defaults
    var settings = $.extend( {
      selector: '#form',
      target: '#target',
      formats: true, // include formats dropdown
      form: '',
      before: func,
      complete: func,
    }, settings);

    var form = settings.form + '<div>';

    settings.before();
    
    // create formats dropdown
    if(settings.formats) form += form_formats(rules.formats);
    
    // create form fields
    $.each(rules.fields, function(key, field) {
      form += form_field(field);
    });

    // close form
    form += '</div>';

    // set form content
    $(settings.selector).html(form);

    // complete callback
    settings.complete(rules);
    
    // return rules to next
    return rules; 
  }

  // watch order events
  this.watchOrder = function(options) {
    var settings = $.extend( {
      init: function() {
        $('.loader').fadeIn();
      },
      update: function(data) {
        adrapid.getPreview(data.id).then(function(res) {
          $('#results').html(res.preview);
        });
      },
      complete: function(data) {
        $('.loader').fadeOut();
      }
    }, options);

    adrapid.watch({
      order_id: options.order_id,
      init: settings.init,
      update: settings.update,
      complete: settings.complete,
      // TODO: add 'downloadable' event
    });
  }

  // file upload helper
  function uploadHelper(options) {

    // config
    var file; // global files object
    var maxFileSize = 100 * 1000; // 100mb
  
    // throwerror helper
    function throwError(error) { alert(error); }

    // extend defaults
    var settings = $.extend( {
      element: '#form2',
      error: function(error) { throwError(error) },
      begin: func,
      complete: func,
      progress: func,
      errors: {
        missingFile: function() { throwError('File missing') },
        tooLarge: function() { throwError('File too large') },
        wrongMime: function() { throwError('File type not allowe!') },
      },
    }, options);
    
    var str = settings.element.substring(1);

    // create form
    $(settings.element).append('<input type="file" name="' + str + '-file" />');

    // setup file upload events
    $('input[name="' + str + '-file"]').change(function(event) {
      settings.begin(str);
      file = event.target.files; // update file data
      var data = new FormData();

      // add file(s)
      $.each(file, function(key, value) {
        data.append(key, value);
      });

      // send the upload request using our formData and custom ajax options
      adrapid.api_get('medias', false, data, uploadOptions).then(function(response) {
        settings.complete(response[0]);
      });

    });

  }


  // internal helpers

  function form_formats(formats) {
    var temp = '<br> <label for="formats">Banner format</label> <br><select name="formats"><br>';
    
    $.each(formats, function(key, format) {
      temp += '<option value="banner_' + format + ':google_adwords">' + format + '</option>'
    });

    temp += '</select> <br><br>';
    return temp;
  }


  function form_field(field) {
    return '<label for="' + field.name + '">' + field.label + '</label> <br>' + 
      '<input name="' + field.name + '" ' + 
      'value="' + field.default + '"' + 
      'prop="' + field.type + '"' +
      '><br>';
  }


  // live banner preview functions
  // ---------------------------------------------------

  this.loadPreviewDependencies = function(callback) {
    if(typeof AdobeEdge == 'undefined') {
      console.log('Loading animation dependencies...');
      $.getScript(edgeSrc, function() {
        if(callback) callback();
      });
    } else {
      if(callback) callback();
    }
  }

  // add an edge animation to the page
  this.appendAnimation = function(data, callback, target) {
    
    // try setting dimensions 
    if(data.script.indexOf(', ') > -1) {

      // create Stage element if it does not exist
      var parts = data.script.split(', ');
      var edgeID = parts[1].substring(1, parts[1].length - 1);

      // create Stage element
      if(!$('.' + edgeID).length) {
        $('#target').html('<div id="Stage" class="' + edgeID + '"></div>');
      }

      // add the script
      $('head').append(data.script);

      // set dimensions
      var wdims = $('script#ad-preview').attr('data-dimensions').split('x');
      $('#target').width(wdims[0]).height(wdims[1]);
      
      console.log('Appended animation...');
    } else {
      // try to append the script
      $('head').append(data.script);
    }

    console.log('Appended ? ');
    if(callback) callback();
    return data;
  }

  this.previewHelper = function(options) {
    
    // TODO: should utilize an initialization function,
    // to avoid doing look-ups every time we update an
    // text field
    var fields = {}; // empty field obj

    // get & prepare field rules
    adrapid.rules(options.templateId).then(function(rules) {
      $.each(rules.fields, function(key, field) {
        if(field.type == 'image' && field.replace) {
          // console.log('Got an image! ' + field.name);
          fields[field.name] = field.replace.substring(0, field.replace.length - 4);
        }
      });
    });


    // extend options
    var settings = $.extend( {
      selector: '',
      complete: function() {},
      load: function() {}
    }, options);

    // text fields change
    $('input[prop=text]').on('input', function() {
      var target = '#Stage__' + $(this).attr('name') + ' p';

      // if further target(s) exists, use these as selector instead

      // check other - actual ID
      if($('#' + $(this).attr('name')).length)
        target = $('#' + $(this).attr('name'));


      // if target selector does not exist, try fallback
      if (!$(target).length ) target = '#Stage_' + $(this).attr('name') + ' p';
      if($(target + ' font').length) { target += ' font';}
      if($(target + ' span').length) { target += ' span';}

      // temp
      // target = '#' + $(this).attr('name');
      $('#iframe_result').contents().find('#' + $(this).attr('name')).text($(this).val()); // replace in local iframe

      console.log('REPL: ' + target + ' -> ' + $(this).val());

      $(target).html($(this).val());
    });

    // image fields change
    $('input[prop=image]').on('input', function() {
      var target = '#Stage_' + $(this).attr('name');
      var val = $(this).val();

      // find fallback
      if(fields[$(this).attr('name')]) {
        // console.log('Got replacement!');
        // console.log(fields[$(this).attr('name')]);
        target = '#Stage_' + fields[$(this).attr('name')];
        if(!$(target).length) target = '#Stage__' + fields[$(this).attr('name')]; // handle double underscore corner case
      }

      // check if we have a target
      if(!$(target).length) {
        // console.log('No target found!');
        // console.log(target);
        // target = '#Stage__02'; // temp fallback
      }

      $(target).css('background-image', 'url("' + val + '")');
    });


    helpers.addColorPickers();


    // handle formats dropdown change
    $('select[name=formats]').change(function(event) {
      // var newFormat = $(this).val();
      var newFormat = $(this).find(':selected').text();
      switchFormat(newFormat);
    });

    // trigger state change on all text fields in order
    // to get the correct content in the ad.
    // TODO: should use callback
    setTimeout(function() { $('input[prop=text]').trigger('input'); }, 600);
    setTimeout(function() { $('input[prop=text]').trigger('input'); }, 1100);

    settings.complete();
  }

  // remove add depdendencies
  function flushAd(callback) {

    // remove scripts
    $("script[src='*preview_edge.js']").remove();
    $("script[src='http://test.adrapid.com/templates/banner/*']").remove();
    $("script[src='*edge.js']").remove();
    $("script[src='*http://test.adrapid.com/templates/banner/amedia-3_image/980x300/980x300-preview_edge.js']").remove(); // test specific
    $.each($('head script'), function(i, s) { $(s).remove(); });
    $.each($('head object'), function(i, s) { $(s).remove(); });
    $('#ad-preview').remove();

    // ...after this, we should possibly be able 
    //    to force-reload the actual template..!
  }

  // chcnage format helper
  function switchFormat(newFormat) {
    console.log(' -> Setting new format: ' + newFormat);

    flushAd(); // remove current libraries for currently running ad
    
    $('#target').html('Loading...');

    // force-reload animation dependencies
    setTimeout(function() {
      $.getScript(edgeSrc, function() {
        console.log('Force-reloaded animation libs!');
      });
    }, 100);

    // get new live preview using helper
    // TODO: only get new preview, do not trigger for mevetns..
    setTimeout(function() {
      console.log(' >> will get new preview');
      console.log('template: ' + this.template_key);
      console.log('format: ' + newFormat)
      
      // re-fetch preview using adrapid helper
      // helpers.getLivePreview(this.template_key, newFormat);
      reloadHtml5ForFormat(template_key, newFormat);
    }, 400);

    // trigger input re-render ....
    setTimeout(function() { 
      $('input').trigger('input');
    }, 800);
  
    // setup test for banner - make sur it is loaded
    setTimeout(function() {
      html5BannerExists(function() {
        console.log(' >> Error handling! try reload the banner...');
        
        $('#target').html('<h2>Fail</h2>').css('background', 'red');

        setTimeout(function() {
          reloadHtml5ForFormat(template_key, newFormat); // error callback
        }, 1200);
      });
    }, 2222);

  }

  function setElementDims(format) {
    setTimeout(function(){
      var dims = format.split('x');
      $('#target').width(dims[0]).height(dims[1]);
      $('#target').css({
        width: dims[0],
        height: dims[1],
      });

      console.log('Updating container dimensions. Set format = ' + dims[0] + 'x' + dims[1] + ' (' + $('#target').width() + 'px is container)');
    }, 222);
  }

  // reload html5 helper
  function reloadHtml5ForFormat(template_key, format) {
    adrapid.getPreviewHtml5(template_key, format) 
      .then(function(data) {
        console.log('xxx-- Loaded html5 preview...');

        data.templateId = template_key;               // save template ID, is needed later
        
        if(format) setElementDims(format); // set dimensios of preview container
        
        setTimeout(function() { $('input').trigger('input'); }, 800); // setup input triggerning
        return data;                                // return data to next step
      })
      .then(helpers.appendAnimation)              // add the animation to the area 
    ;
  }

  // test existance of html5 banner in page
  function html5BannerExists(failCallback) {
    var findElem = $('#Stage_Text');
    console.log(findElem);

    if(findElem.length == 1) {
      console.log(' HAVE html5 banner!');
    } else {
      console.log(' MISSING html5 banner!');

      // if its missing, we can try reload
      if(failCallback) failCallback();
    }
  }

  // handle color change for live preview
  function changeColor(target, color) {
    if(target == 'color_text_field1') {
      $('#Stage div p').css('color', color);
    } else if(target.indexOf('background') > -1) {
      $('#Stage').css('background-color', color);

      // remove previously set background image
      // TODO: remove name dependency
      $('input[name=img_1]').val('');
      $('#Stage__02').css('background-image', '');
    
    // button
    } else if(target.indexOf('button') > -1) {
      // TODO: need global value
      $('#Stage_Text3 p span').css('background-color', color); 
    
    // cornercase: shape
    } else if(target.indexOf('_shape') > -1) {
      // TODO: need global value
      $('#Stage_Rectangle').css('background-color', color); 
    
    // default: background
    } else {
      $('#Stage__' + target).css('background-color', color);
    }
  }


  this.addUploadHelpers = function() {
    $('input[prop="image"]').each(function() {
      var elem = $(this), nn = elem.attr('name');
      $('<div id="' + nn + '-temp"></div>').insertAfter(elem);

      // create image upload helper for the element
      uploadHelper({
        element: '#' + nn + '-temp',
        begin: function() {
          $('#spinner').fadeIn();
        },
        complete: function(data) {
          elem.val(data.preview).trigger('input'); // 3 sizes available - thumb, preview & original
          $('#spinner').fadeOut();
        },
      });
    });

    return true;
  }

  this.addColorPickers = function() {
    console.log('Adding color pickers...');

    // utilize minicolor library if used on the page
    if (typeof $.minicolors !== 'undefined') {
      $('input[prop=color]').minicolors({
        control: 'wheel',
        format: 'rgb',
        opacity: true,
        change: function(value, opacity) {
          if(!value) return;
          changeColor($(this).attr('name'), $(this).val());
        }
      });
    } else {
      $('input[prop=color]').on('input', function() {
        changeColor($(this).attr('name'), $(this).val());
      });
    }
  }

  this.uploadMedia = function(data, callback) {
    return adrapid.api_get('medias', false, data);
  }

  this.getLivePreview = function(templateId, format) {
    // TODO: add support for options!

    this.loadPreviewDependencies(function() {         // make sure animation dependencies is loaded before loading the banner
      adrapid.getPreviewHtml5(templateId, format)             // get the banner animation content
        .then(function(data) {
          console.log('-- Loaded html5 preview... [for the first time]');
          // console.log(data);

          if(format) setElementDims(format);          // set dimensions of preview container
          
          data.templateId = templateId;               // save template ID, is needed later
          return data;                                // return data to next step
        })
        .then(helpers.appendAnimation)                // append the banner to the page
        .then(helpers.previewHelper)                  // bind form events
        .then(helpers.addUploadHelpers);              // add file uploads to form
    });
  }

  this.getForm = function(templateId) {
    return adrapid.rules(templateId).then(function(rules) {   // get the rules for the template
      helpers.buildForm(rules, false);
    });
  }

  // other test functions, may be removed
  // --------------------------------------------------------

  // a log function
  this.log = function(content, title) {
    if(!content) return false;

    var logId = 'log-' + Date.now();
    $("#log .content").prepend("<div class=\"log-message\" id=\"" + logId + "\"></div>")

    // add code inspector
    inspectors.push(new InspectorJSON({
      element: logId,
      json: content,
    }));

    if(title) $('#log .content').prepend('<div class="log-message">' + title + ':</div>');  
  }

};


// expose
var helpers = new helpers();