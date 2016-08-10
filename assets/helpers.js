// frontend helpers for AdRapid API example implementations
// Documentation is available at http://raviteq.github.io/adrapid-api/

var helpers = function(options) {

  // config
  var func = function() {};
  this.inspectors = [];
  this.uploadHelper = uploadHelper;

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
    adrapid.watch({
      order_id: options.order_id,
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
      },
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
    var edgeSrc = 'http://animate.adobe.com/runtime/6.0.0/edge.6.0.0.min.js';
    
    if(typeof AdobeEdge == 'undefined') {
      $.getScript(edgeSrc, function() {
        if(callback) callback();
      });
    } else {
      if(callback) callback();
    }
  }

  // add an edge animation to the page
  this.appendAnimation = function(data, callback, target) {
    // create #Stage element if it does not exist
    var parts = data.script.split(', ');
    var edgeID = parts[1].substring(1, parts[1].length - 1);

    if(!$('.' + edgeID).length) {
      $('#target').html('<div id="Stage" class="' + edgeID + '"></div>');
    }

    // add the script
    $('head').append(data.script);

    if(callback) callback();
    return data;
  }

  this.previewHelper = function(options) {
    
    // TODO: should utilize an initialization function,
    // to avoid doing look-ups every time we update an
    // text field
    var fields = {}; // empty field obj

    // we temporarily need to get rules, 
    // to handle corner cases..
    // ...
    console.log('Got them options');
    console.log(options);

    // get & prepare field rules
    adrapid.rules(options.templateId).then(function(rules) {
      $.each(rules.fields, function(key, field) {
        if(field.type == 'image' && field.replace) {
          console.log('Got an image! ' + field.name);
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

      // if target selector does not exist, try fallback
      if (!$(target).length ) target = '#Stage_' + $(this).attr('name') + ' p';
      if($(target + ' font').length) { target += ' font';}
      if($(target + ' span').length) { target += ' span';}
     
      console.log(' > target : ' + target);

      $(target).html($(this).val());
    });

    // image fields change
    $('input[prop=image]').on('input', function() {
      var target = '#Stage_' + $(this).attr('name');
      var val = $(this).val();

      // find fallback
      if(fields[$(this).attr('name')]) {
        console.log('Got replacement!');
        console.log(fields[$(this).attr('name')]);
        target = '#Stage_' + fields[$(this).attr('name')];
      }

      if(!$(target).length) target = '#Stage__02'; // temp

      $(target).css('background-image', 'url("' + val + '")');
    });



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


    // trigger state change on all text fields to get the correct content in the ad 
    setTimeout(function() { $('input[prop=text]').trigger('input'); }, 600);
    setTimeout(function() { $('input[prop=text]').trigger('input'); }, 1100);

    settings.complete();
  }

  function changeColor(target, color) {
    console.log('Change -> ' + target);
    if(target == 'color_text_field1') {
      $('#Stage div, #Stage p').css('color', color);
    } else if(target.indexOf('background') > -1) {
      $('#Stage').css('background-color', color);

      // remove previously set background image
      $('input[name=img_1]').val('');
      $('#Stage__02').css('background-image', '');
    } else if(target.indexOf('button') > -1) {
      // TODO: need global value
      $('#Stage_Text3 p span').css('background-color', color); 
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
          elem.val(data.thumbnail).trigger('input');
          $('#spinner').fadeOut();
        },
      });
    });
  }

  this.addColorPickers = function() {
    console.log('Adding color pickers...');
  }

  this.uploadMedia = function(data, callback) {
    return adrapid.api_get('medias', false, data);
  }

  this.getLivePreview = function(templateId) {
    this.loadPreviewDependencies(function() {         // make sure Adobe Edge runtime is loaded first
      adrapid.getPreviewHtml5(templateId)             // get the animation content
        .then(function(data) {
          data.templateId = templateId; // needs this later in the chain 
          console.log('Got data at this point:');
          console.log(data);
          return data; // to next step
        })
        .then(helpers.appendAnimation)               // append the banner to the page
        .then(helpers.previewHelper)                     // bind form events
        .then(helpers.addUploadHelpers);                 // add file uploads to form
    });
  }

  this.getForm = function(templateId) {
    return adrapid.rules(templateId).then(function(rules) {   // get the rules for the template
      helpers.buildForm(rules, false, {                          // load the form for the template
        formats: false,                                       // dont show formats dropdown
      });
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