/*
 * Frontend helpers for AdRapid API example implementations
 * Documentation is available at http://raviteq.github.io/adrapid-api/
 */

var helpers = function(options) {

  // config
  var func = function() {};
  this.inspectors = [];
  this.uploadHelper = uploadHelper;
  this.template_key = '';

  // setup options for using the AdRapid api_get method 
  // to send the file upload request using AJAX.
  var uploadOptions = {
    cache       : false, // Don't cache
    processData : false, // Don't process the files
    contentType : false, // Set content type to false as jQuery will tell the server its a query string request
  };

  // global vars f0r html5 live preview
  var bannerType = ''; //  temp global var
  var globalRules = false; // global rules var
  var currentFormat = '300x250'; // contains current format of html5 banner
  var formFields; // contains form field rules
  var edgeSrc = 'http://animate.adobe.com/runtime/6.0.0/edge.6.0.0.min.js'; // path to Edge

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
      $.getScript(edgeSrc, function() {
        if(callback) callback();
      });
    } else {
      if(callback) callback();
    }
  }

  // add an edge animation to the page
  this.appendAnimation = function(data, callback, target) {
    
    // if we have html content, load it 
    if(data.content) {
      $('#target').html(data.content);
    }

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
      
    } else {
      // try to append the script // ...
      $('head').append(data.script);
    }

    if(callback) callback();
    return data;
  }

  // setup editor for html5 live preview
  // - depends html5 preview (loaded), as well as a an order form.
  this.previewHelper = function(options) {
    
    // debug
    // if(options) {
    // }

    // TODO: should utilize an initialization function,
    // to avoid doing look-ups every time we update an
    // text field
    
    // empty field obj, will be populated with fieldName:elementSelector pairs
    // is also mapped to global formFields object
    var fields = {};

    // extend options
    var settings = $.extend( {
      selector: '',
      complete: function() {},
      load: function() {}
    }, options);

    // initialize function - is only run once 
    (function init() {

      // TODO: need to have rendered preview html before we can do this
      setTimeout(function() { 
        bannerType = getHtml5BannerType(); // get html5 banner type, save in global var
        getAndBindFormFields(options); // get and bind form fields for the template
      }, 100);

    }());

    // add color pickers to form
    // TODO: file upload helpers?
    // TODO: crop select helpers?
    helpers.addColorPickers();

    // update banner content
    updateBannerContent();

    // perform complete callback functions
    settings.complete(); 
  }

  function getTemplateSelectors(rules) {
    var fields = {};

    // loop through list of fields to build rules
    $.each(rules.fields, function(key, field) { 
      // find selector for field
      fields[field.name] = getSelector(field); 
    });

    // return prepared fields
    return fields;
  }

  function getFormFields(options, callback) {

    if(globalRules) {
      // re-append

      callback(formFields); // do callback with global rules
    } else {
      var fields = {};

      // get rules

      // set new rules
      adrapid.rules(options.templateId).then(function(rules) { // get rules for the template, since they are not provided to this method
        
        // set form fields
        // $.each(rules.fields, function(key, field) { // loop through list of fields to build rules
        //   // find selector for field
        //   fields[field.name] = getSelector(field); 
        // });

        // using new
        fields = getTemplateSelectors(rules);

        // save fields object globally 
        formFields = fields; 
        globalRules = fields;

        // debug form fields rules

        // do callback with results
        callback(fields);
      });
    }


  }

  // get and bind form fields for template
  // TODO: promisify!
  function getAndBindFormFields(options) {
    var fields = {}; // empty fields object

    if(!options) options = {templateId: template_key} // handle empty options
    
    // getFormFields(options, function(fields) {
    //   fields = getTemplateSelectors(fields);
    //   bindFormFields(fields);
    // });

    if(globalRules) {
      // re-append
    } else {
      // get rules

      // set new
      globalRules = 'some rules';
    }

    // get & prepare field rules for template
    adrapid.rules(options.templateId).then(function(rules) { // get rules for the template, since they are not provided to this method
      

      var fields = getTemplateSelectors(rules);
      
      formFields = fields; // save fields object globally 

      // debug form fields rules

      // setup form event listeners
      bindFormFields(fields);
    });

  }

  // additional exports
  this.getAndBindFormFields = getAndBindFormFields;

  // bind form events to update html5 live preview
  function bindFormFields(fields) {


    // text fields change
    $('input[prop=text]').on('input', function() {
      $(fields[$(this).attr('name')]).html($(this).val());
    });

    // image fields change
    $('input[prop=image]').on('input', function() {
      var name = $(this).attr('name');
      var value = $(this).val();
      replaceImage(name, value, fields[name]);
    });

    // handle formats dropdown change
    $('select[name=formats]').change(function(event) {
      switchFormat($(this).find(':selected').text());
    });
  }

  function flashElement(selector) {
    selector.addClass('border');
    
    setTimeout(function() {
      selector.removeClass('border');
    }, 1500);
  }

  function updateBannerContent() {
    // trigger state change on all text fields in order
    // to get the correct content in the ad.
    performMultiple(updateFields, [0, 1000]);
  }

  function updateFields() {
    $('input[prop=text], input[prop=image], input[prop=color]').trigger('input');
  }

  function performMultiple(func, times) {
    $.each(times, function(i, time) {
      setTimeout(func, time);
    });
  }

  function replaceImage(name, value, field) {
    
    if(!field) field = fields[name]; // ...

    // do not replace empty fields
    if(!value || value == 'http://test.adrapid.com/') {
      return false;
    } 
    // else {
    // }


    if(field.attr == 'img') {
      replaceImageElement(field.target, value);
    } else {
      replaceImageBackground($(field.target), value);
    }

    // repeat the image replacement process after a short timeout.
    // solves an issue where the image would not be replaced on 
    // the first attempt.
    setTimeout(function() {
      if(field.attr == 'img') {
        replaceImageElement(field.target, value);
      } else {
        replaceImageBackground($(field.target), value);
      }
    }, 200);

  }

  // get type of html5 banner
  // @returns 'adrapid', 'edge' or 'iframe'
  function getHtml5BannerType(element) {
    if(!element) element = '#target';
    if($(element + ' .adrapid').length) return 'adrapid';
    if($('#Stage').length) return 'edge';
    if($(element + ' iframe').length) return 'iframe';
    return 'unknown'; // did not detect banner type
  }

  // find selector for name
  function getSelector(field) {
    var name = field.name;
    var target;

    // check for internal replacement for image
    // TODO: split this into separate function ..
    if(field.type == 'image') { // && field.replace [?]
      target = findImageElement(field); // using helper

      // check for other targets
      if($('#' + field.name).length) target = '#' + field.name;

      // - check for existence of element with name
      // TODO: check if we should repl1ace background or img ? 

      // redundant check for image..
      // TODO: improve this!
      if($('#iframe_result').length) {
     
        // pattern : #replacement
        if(field.replace) {
          var iframeItem = $('#iframe_result').contents().find('#' + field.replace);    
          
          if(iframeItem.length) {

            // return with 'img' change attrib...
            return {
              // returns an object
              // TODO: set config for this
              target: iframeItem,
              attr: 'img', // intead of 'background'
            };

          }
        }

        // pattern : #name
        if($('#iframe_result').contents().find('#' + name).length) {
          target = $('#iframe_result').contents().find('#' + name);
        
          // return with 'img' change attrib...
          return {
            // returns an object
            // TODO: set config for this
            target: target,
            attr: 'img', // intead of 'background'
          };

        }
        
      }

      return {
        // returns an object
        // TODO: set config for this
        name: name,
        target: target,
        type: 'replace', 
        attr: 'background', // either 'background' or 'img'
        // replace: replaceString,
      };
    }

    // text fields / other:

    // #name
    if($('#' + field.name + ' p').length) return $('#' + field.name + ' p');
    if($('#' + name + ' p').length) return $('#' + name + ' p'); // durr
    if($('#' + name).length) return $('#' + name);
    
    // double __
    if($('#Stage__' + name + ' p font span').length) return '#Stage__' + name + ' p font span';
    if($('#Stage__' + name + ' p span').length) return '#Stage__' + name + ' p span';
    if($('#Stage__' + name + ' p font').length) return '#Stage__' + name + ' p font';
    if($('#Stage__' + name + ' p').length) return '#Stage__' + name + ' p';
    if($('#Stage__' + name).length) return '#Stage__' + name;

    // single _
    if($('#Stage_' + name + ' p font span').length) return '#Stage_' + name + ' p font span';
    if($('#Stage_' + name + ' p span').length) return '#Stage_' + name + ' p span';
    if($('#Stage_' + name + ' p font').length) return '#Stage_' + name + ' p font';
    if($('#Stage_' + name + ' p').length) return '#Stage_' + name + ' p';
    if($('#Stage_' + name).length) return '#Stage_' + name;

    // no results yet, look into the iframe as well...
    if($('#iframe_result').length) {
      if($('#iframe_result').contents().find('#' + name).length) return $('#iframe_result').contents().find('#' + name);
    }

    // TODO: support for colors
    // TODO: support for spec

    // not found yet...
    return '#notFound';
  }

  function findTextElement(field) {
    // ...
  }

  function findIframeTextElement(field) {

  }

  function replaceImageElement(selector, newImage) {
    if(typeof selector == 'array') {
      $.each(selector, function(i, el) {
        replaceImageElement(el. newImage);
      });
    } else {
      selector.attr({
        'src': newImage,
        'source': newImage // gwd needs this property as well
      });
    }
  }

  function replaceImageBackground(selector, newImage) {
    if(typeof selector == 'array') {
      $.each(selector, function(i, el) {
        replaceImageBackground(el. newImage);
      });
    } else {
      selector.css('background-image', 'url("' + newImage + '")');
    }
  }

  function findImageElement(field) {
    var target;
    
    // try find by replace images..
    if(field.replace_images) {

      // TODO: should not do the actual replace
      if(field.replace_images instanceof Array) {
        $.each(field.replace_images, function(i, image) {
          var findStr = 'img[src="' + image + '"]';
          var imgEl = $(findStr);

          // gets
          var iframeItem = $('#iframe_result').contents().find(findStr);    

          if(imgEl.length) {
            return imgEl;
          } else {
          }

          if(iframeItem) {
           
            // test replace
            // TODO: get correct ID of image to replace ...
            var rimg = $('input[name=img_1]').val();
            replaceImageElement(iframeItem, rimg);

            return iframeItem;
          }

        });
      } else {
      }

    }


    if(field.replace_ids) {

      if(field.replace_ids instanceof Array) {
      
        // loop through items
        $.each(field.replace_ids, function(i, image) {
          var findStr = '#' + image;
          var imgEl = $(findStr);

          if(imgEl.length) {
            return findStr;
          } else {
          }
        });
      } else {
      }

    }


    if(field.replace) {
      var replaceString = field.replace.substring(0, field.replace.length - 4);

      if(replaceString.length) {
        
        // find selector by some patterns:
        if($('#' + replaceString).length) return '#' + replaceString;
        if($('#Stage__' + replaceString).length) return '#Stage__' + replaceString;
        if($('#Stage_' + replaceString).length) return '#Stage_' + replaceString;                
        
      } else {
      }
    } else {
    }

    // additional checks
    if($('#Stage__' + field.name).length) return '#Stage__' + field.name;
    if($('#Stage_' + field.name).length) return '#Stage_' + field.name;                

    // look for results in iframe 
    var iframeD = $('#iframe_result').contents();
    var specD = iframeD.find('#' + field.name)
    
    // rrr
    if(specD) {
      // .text($(this).val());
    } else {
    }

    return '#noImg'; // no image found
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
    // $('#target').html('Loading...');


    switch(bannerType) {
      default:
      break;

      case 'adrapid':
      break;

      case 'iframe':

        var dims = newFormat.split('x');
        var currentSrc = $('#iframe_result').attr('src');
        var newSrc = currentSrc.replace(currentFormat, newFormat);
        currentFormat = newFormat; // update global var

        // set iframe src, update dimensions
        $('#iframe_result')
          .attr('src', newSrc)
          .width(dims[0])
          .height(dims[1])
        ;

        // now we need to rebind fields ..
        setTimeout(function() {
          // TODO: re-populate rules ... 
          // bindFormFields(formFields);
          getAndBindFormFields();

          // trigger fields update (after some timeout)
          updateBannerContent();

        }, 800); // needs to wait for iframe render ...


      break;

      case 'edge':
      break;
    }

    // flushAd(); // remove current libraries for currently running ad
    
    // // force-reload animation dependencies
    // setTimeout(function() {
    //   $.getScript(edgeSrc, function() {
    //   });
    // }, 100);

    // // get new live preview using helper
    // // TODO: only get new preview, do not trigger for mevetns..
    // setTimeout(function() {
      
    //   // re-fetch preview using adrapid helper
    //   // helpers.getLivePreview(this.template_key, newFormat);
    //   reloadHtml5ForFormat(template_key, newFormat);
    // }, 400);

    // // trigger input re-render ....
    // setTimeout(function() { 
    //   $('input').trigger('input');
    // }, 800);
  
    // // setup test for banner - make sur it is loaded
    // setTimeout(function() {
    //   html5BannerExists(function() {
        
    //     $('#target').html('<h2>Fail</h2>').css('background', 'red');

    //     setTimeout(function() {
    //       reloadHtml5ForFormat(template_key, newFormat); // error callback
    //     }, 1200);
    //   });
    // }, 2222);

  }

  function setElementDims(format) {
    setTimeout(function(){
      var dims = format.split('x');
      $('#target').width(dims[0]).height(dims[1]);
      $('#target').css({
        width: dims[0],
        height: dims[1],
      });

    }, 222);
  }

  // reload html5 helper
  function reloadHtml5ForFormat(template_key, format) {
    adrapid.getPreviewHtml5(template_key, format) 
      .then(function(data) {

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

    if(findElem.length == 1) {
    } else {

      // if its missing, we can try reload
      if(failCallback) failCallback();
    }
  }

  // handle color change for live preview
  function changeColor(target, color) {

    // text
    if(target == 'color_text_field1') {
      $('#Stage div p').css('color', color);

      // iframe
      $('#iframe_result').contents().find('p, div, span').css('color', color);

    // background
    } else if(target.indexOf('background') > -1) {
      $('#Stage').css('background-color', color);

      // iframe
      $('#iframe_result').contents().find('#gwd-ad').css('background-color', color);

      // remove previously set background image
      // TODO: remove name dependency
      $('input[name=img_1]').val('');
      $('#Stage__02').css('background-image', '');
    
    // button
    } else if(target.indexOf('button') > -1) {
      // TODO: need global value
      $('#Stage_Text3 p span').css('background-color', color); 
    
      // iframe
      $('#iframe_result').contents().find('#submitBtn').css('background-color', color);

    // cornercase: shape
    } else if(target.indexOf('_shape') > -1) {
      // TODO: need global value
      $('#Stage_Rectangle').css('background-color', color); 
    
    // default: background
    } else {
      $('#Stage__' + target).css('background-color', color);
    }
  }

  /*
   * Add upload helpers to a form
   */
  this.addUploadHelpers = function(options) {
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

  /*
   * Add color pickers to a form
   */
  this.addColorPickers = function() {
    
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

  /*
   * Upload media through the AdRapid API
   */
  this.uploadMedia = function(data, callback) {
    return adrapid.api_get('medias', false, data);
  }

  /*
   * Get a html5 live previe
   */
  this.getLivePreview = function(templateId, format, options) {
    
    // define default options
    var settings = $.extend( {
      strategy: 'inline', // inline or iframe
    }, options);

    bannerType = 'html5'; // set global var

    this.loadPreviewDependencies(function() {         // make sure animation dependencies is loaded before loading the banner
      adrapid.getPreviewHtml5(templateId, format)             // get the banner animation content
        .then(function(data) {

          if(format) setElementDims(format);          // set dimensions of preview container
          
          data.templateId = templateId;               // save template ID, is needed later
          return data;                                // return data to next step
        })
        .then(helpers.appendAnimation)                // append the banner to the page
        .then(helpers.previewHelper)                  // bind form events
        .then(helpers.addUploadHelpers);              // add file uploads to form
    });
  }

  this.getForm = function(templateId, settings) {

    // setup options
    var options = $.extend( {
      selector: '#form',
      target: '#target',
      formats: true, // include formats dropdown
      form: '',
      before: func,
      // complete: func,
      complete: function() {
      }
    }, settings);

    return adrapid.rules(templateId).then(function(rules) {   // get the rules for the template
      helpers.buildForm(rules, false, options);
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