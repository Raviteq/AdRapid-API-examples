// frontend helpers for AdRapid API example implementations
// Documentation is available at http://raviteq.github.io/adrapid-api/

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
  var globalVar = 'herp'; //  temp global var
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
    
    // if we have html content, load it 
    if(data.content) {
      console.log('Load banner html content...');
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
      
      console.log('Appended animation...');
    } else {
      // try to append the script // ...
      $('head').append(data.script);
    }

    console.log('Appended ? ');
    if(callback) callback();
    return data;
  }

  // setup editor for html5 live preview
  // - depends html5 preview (loaded), as well as a an order form.
  this.previewHelper = function(options) {
    
    // debug
    // if(options) {
    //   console.log('We have options!');
    //   console.log(options);
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
      console.log('initialize html5 live preview...');
      console.log(' > type of banner: ' + globalVar);

      // TODO: need to have rendered preview html before we can do this
      setTimeout(function() { 
        globalVar = getHtml5BannerType(); // get html5 banner type, save in global var
        getAndBindFormFields(options); // get and bind form fields for the template
      }, 100);

    }());

    helpers.addColorPickers();// add color pickers to form
    // TODO: file upload helpers?
    // TODO: crop select helpers?
    updateBannerContent();// update banner content
    settings.complete(); // perform complete callback functions
  }

  // get and bind form fields for template
  // TODO: promisify!
  function getAndBindFormFields(options) {
    var fields = {}; // empty fields object
    console.log(' > Will parse form fields..');

    if(!options) options = {templateId: template_key} // handle empty options

    // get & prepare field rules for template
    adrapid.rules(options.templateId).then(function(rules) { // get rules for the template, since they are not provided to this method
      
      console.log(' >> We got this set of rules:');
      console.log(rules);

      $.each(rules.fields, function(key, field) { // loop through list of fields to build rules
        fields[field.name] = getSelector(field); // find selector for field
      });

      formFields = fields; // save fields object globally 

      // debug form fields rules
      console.log(' >> Updated list of field selectors << ');
      console.log(fields);

      // setup form event listeners
      bindFormFields(fields);
    });
  }

  // additional exports
  this.getAndBindFormFields = getAndBindFormFields;

  // bind form events to update html5 live preview
  function bindFormFields(fields) {

    console.log(' >> Binding form field events...');

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

  function updateBannerContent() {
    // trigger state change on all text fields in order
    // to get the correct content in the ad.
    performMultiple(updateFields, [0, 1000]);
  }

  function updateFields() {
    console.log('Will update fields...');
    $('input[prop=text], input[prop=image], input[prop=color]').trigger('input');
  }

  function performMultiple(func, times) {
    $.each(times, function(i, time) {
      setTimeout(func, time);
    });
  }

  function replaceImage(name, value, field) {
    console.log('Will replace image: ' + name);
    console.log(field);

    if(field.attr == 'img') {
      replaceImageElement(field.target, value);
    } else {
      $(field.target).css('background-image', 'url("' + value + '")');
    }
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
            console.log(' > found img @ #' + field.replace);

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
          console.log('We found element in iframe for field -' + name);
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

      console.log(' >> Now we return image object...');
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
      console.log('Dealing with array..');
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

  function findImageElement(field) {
    var target;
    
    // try find by replace images..
    if(field.replace_images) {
      console.log('Checking replace images');

      // TODO: should not do the actual replace
      if(field.replace_images instanceof Array) {
        $.each(field.replace_images, function(i, image) {
          var findStr = 'img[src="' + image + '"]';
          var imgEl = $(findStr);

          // gets
          var iframeItem = $('#iframe_result').contents().find(findStr);    

          if(imgEl.length) {
            console.log(' ! Image found @ ' + findStr);
            return imgEl;
          } else {
            // console.log(' - no image @ ' + findStr);
          }

          if(iframeItem) {
            console.log(' Found in iframe! ' + findStr);
           
            // test replace
            // TODO: get correct ID of image to replace ...
            var rimg = $('input[name=img_1]').val();
            replaceImageElement(iframeItem, rimg);

            return iframeItem;
          }

        });
      } else {
        console.log(' >> Find single: ' + field.replace_images);
      }

    }


    if(field.replace_ids) {
      console.log('Checking replace images');

      if(field.replace_ids instanceof Array) {
      
        // loop through items
        $.each(field.replace_ids, function(i, image) {
          var findStr = '#' + image;
          var imgEl = $(findStr);

          if(imgEl.length) {
            console.log(' ! Image found @' + findStr);
            return findStr;
          } else {
            // console.log(' - no image @ ' + findStr);
          }
        });
      } else {
        console.log(' > Find single: ' + field.replace_ids);
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
        console.log('replaceString missmatch..');
      }
    } else {
      console.log('No replace conf..'); // = no 'replace' property in rules - its all good
    }

    // additional checks
    if($('#Stage__' + field.name).length) return '#Stage__' + field.name;
    if($('#Stage_' + field.name).length) return '#Stage_' + field.name;                

    // look for results in iframe 
    var iframeD = $('#iframe_result').contents();
    var specD = iframeD.find('#' + field.name)
    
    // rrr
    if(specD) {
      console.log(' >> We have iframe field !! - ' + field.name);
      // .text($(this).val());
    } else {
      console.log(' >> Try find field in iframe, but failed - ' + field.name);
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
    console.log(' -> Setting new format: ' + newFormat);
    // $('#target').html('Loading...');

    console.log(' >> Will do handling for banner type: ' + globalVar + ' ...');

    switch(globalVar) {
      default:
      break;

      case 'adrapid':
      break;

      case 'iframe':
        console.log(' > We will reload the iframe..');

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
    //     console.log('Force-reloaded animation libs!');
    //   });
    // }, 100);

    // // get new live preview using helper
    // // TODO: only get new preview, do not trigger for mevetns..
    // setTimeout(function() {
    //   console.log(' >> will get new preview');
    //   console.log('template: ' + this.template_key);
    //   console.log('format: ' + newFormat)
      
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
    //     console.log(' >> Error handling! try reload the banner...');
        
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

    globalVar = 'derp'; // test set global var

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