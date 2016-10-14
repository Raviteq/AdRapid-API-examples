/*
 * Frontend helpers for AdRapid API example implementations
 * Documentation is available at http://raviteq.github.io/adrapid-api/
 */

var helpers = function(options) {

  // configuration
  /////////////////////////////////////////////////////////////////

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
  var bannerState = false;
  var bannerType = ''; //  temp global var
  var globalRules = false; // global rules var
  var globalOptions = false; // global options var
  var currentFormat = '300x250'; // contains current format of html5 banner
  var formFields; // contains form field rules
  var edgeSrc = '//animate.adobe.com/runtime/6.0.0/edge.6.0.0.min.js'; // path to Edge
  var pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 'http://test.adrapid.com/img/assets/pixel.png';
  var spinner, tempColor, state = {};

  // helper functions
  /////////////////////////////////////////////////////////////////

  function getAttributes(selector) {
    var attrs = {};
    $.each( selector[0].attributes, function ( index, attribute ) {
      attrs[attribute.name] = attribute.value;
    });
    return attrs;
   }


  // build a form from template rules
  this.buildForm = function(rules, template, settings) {
  
    // setup defaults
    var settings = $.extend( {
      selector: '#form',
      target: '#target',
      formats: true, // include formats dropdown
      colors: true, // include colors
      images: true, // include images
      texts: true, // include texts//
      url: true, // include URL field
      form: '',
      before: func,
      complete: func,
    }, settings);

    var form = settings.form + '<div>';

    settings.before();
    
    // create formats dropdown
    if(settings.formats) form += form_formats(rules.formats);
    
    // create form fields
    // form += build_fields(rules.fields);
    if(settings.texts) form += build_fields(rules.fields, 'text', 'text-fields');
    if(settings.images) form += build_fields(rules.fields, 'image', 'image-fields');
    if(settings.colors) form += build_fields(rules.fields, 'color', 'color-fields');

    // add url field at bottom of form
    if(settings.url) form += form_field({name: 'URL', label: 'URL', type: 'URL', default: ''});

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

    return adrapid.watch({
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

  // render formats dropdown
  function form_formats(formats) {
    var temp = '<br> <label for="formats">Banner format</label> <br><select name="formats"><br>';
    
    $.each(formats, function(key, format) {
      temp += '<option value="banner_' + format + ':google_adwords">' + format + '</option>'
    });

    temp += '</select> <br><br>';
    return temp;
  }

  // build a set of form fields 
  function build_fields(fields, type, wrap) {
    var output = '';

    // filter fields
    if(type) {
      fields = fields.filter(function (el) {
        return el.type == type
      });
    }

    // build fields
    $.each(fields, function(key, field) {
      output += form_field(field);
    });

    // wrap fields in containing div
    if(wrap) output = '<div class="' + wrap + '">' + output + '</div>';

    return output;
  }

  // render a form field
  function form_field(field) {
    return '<div class="field">' +
      '<label for="' + field.name + '">' + field.label + '</label>' + 
      '<input name="' + field.name + '" value="' + field.default + '" prop="' + field.type + '" />' + 
     '</div>';
  }


  // live banner preview functions
  // ---------------------------------------------------

  this.loadPreviewDependencies = function(callback) {
    
    // TODO: we need to know the banner type to load 
    // the correct dependencies for the ad.
    // if(bannerType != 'edge') {
    //   if(callback) callback();
    //   return;
    // }
    
    // TODO: load correct dependencies depending on the banner type
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

      // re-build image selectors before loading banner events
      rebuildImgSelectors().then(function(res) {
        // getAndBindFormFields();

        // perform bnaner load events when banner has finished loading
        bannerLoadEvents(options)
          .then(function(loadedBanner) {
            console.log('Loaded banner...')
            // do stuff then banner has finished loading..
            return res; 
          })
        ;

        // replace the elem
        // return when complete
      });

      // perform bnaner load events when banner has finished loading
      // bannerLoadEvents();

      // save global options
      globalOptions = options;
      
      // TODO: handle with status flag var so that we can avoid doing this multiple times
      // add a timeout in case we dont get the iframe load event
      setTimeout(updateBanner, 700);
      setTimeout(updateBanner, 1500);

    }());

    // add color pickers to form
    // TODO: file upload helpers?
    // TODO: crop select helpers?
    helpers.addColorPickers();

    // perform complete callback functions
    settings.complete(); 
  }

  function getTemplateSelectors(rules, callback) {
    var fields = {};
    var max = rules.fields.length;
    var c = 0;

    // loop through list of fields to build rules
    $.each(rules.fields, function(key, field) { 
      ++c;
      fields[field.name] = getSelector(field);  // find selector for field

      if(c == max) {

        // debug form selectors object

        formFields = fields; // save fields object globally
        if(callback) callback(fields);
        return fields;
      }
    });
  }

  function getFormFields(options, callback) {
    if(globalRules) {
      // console.log('Got global rules');
      getTemplateSelectors(globalRules, function(fields) {
        callback(fields);
      });
    } else {
      // console.log('Need to get global rules');
      // get rules for the template, since they are not provided to this method
      adrapid.rules(options.templateId).then(function(rules) {
        globalRules = rules; // save rules to global rules object
      
        // update form selectors  
        getTemplateSelectors(rules, function(fields) {
          callback(fields);
        });
      });
    }
  }

  // get and bind form fields for template
  // TODO: promisify!
  function getAndBindFormFields(options) {
    if(!options) options = {templateId: template_key} // handle empty options

    getFormFields(options, function(fields) { // get fields
      bindFormFields(fields); // bind fields
    });
  }

  function debugSelector(selector) {

    // get attributes
    var attributes = getAttributes(selector);

    // set of attributes to ignore
    var ignore = [
      'is', 
      'src',
      'source',
      'style',
    ];

    // eppend attributes
    var out = '<div ';
    $.each(attributes, function(index, attrib) {
    
      // skip some attributes
      if(($.inArray(index.toLowerCase(), ignore) === -1)) {
        out += index + '="' + attrib + '" ';
      }

    });

    return out;
  }

  this.debugFields = function() {
    var inputs = $('input');

    $.each(inputs, function(i, inpt) {
      console.log(inpt);
    });
  }

  function debugImages() {
    
    // get all images in iframe
    // var imgs = $('img');
    var imgs = $('#iframe_result').contents().find('img');

    $.each(imgs, function(i, el) {
      el = $(el); // ??
    });
  }

  // debug current form selectors
  this.debugFormSelectors = function() {
    console.log('Debug form selectors:');
    console.log(globalRules);
  }

  this.debugGlobalOptions = function() {
    console.log('Global options:');
    console.log(this.template_key);
  }

  // additional exports
  this.getAndBindFormFields = getAndBindFormFields;
  this.changeColor = changeColor;
  this.performMultiple = performMultiple;
  this.debugSelector = debugSelector;
  helpers.debugImages = this.debugImages;

  // bind form events to update html5 live preview
  function bindFormFields(fields) {

    // text fields change
    $('input[prop=text]').off().on('input', function() {
      $(fields[$(this).attr('name')]).html($(this).val());
    });

    // image fields change
    $('input[prop=image]').off().on('input', function() {
      var name = $(this).attr('name');
      var value = $(this).val();
      if(name.indexOf('-') > -1) name = name.split('-')[0];
      replaceImage(name, value, fields[name]);
    });

    // color fields change
    $('input[prop=color]').off().on('input', function() {
      changeColor($(this).attr('name'), $(this).val());
    });

    // handle formats dropdown change
    $('select[name=formats]').off().change(function(event) {
      switchFormat($(this).find(':selected').text());
    });

    // trigger update event to update banner content
    updateBannerContent();
  }

  function isArray(a) {
    return (!!a) && (a.constructor === Array);
  };

  function flashElement(selector) {
    selector.addClass('border');
    
    setTimeout(function() {
      selector.removeClass('border');
    }, 1500);
  }

  function updateBannerContent() {
    // trigger state change on all text fields in order
    // to get the correct content in the ad.
    // updateFields(); // update / replace all form fields once only
    performMultiple(updateFields, [0, 100, 500, 1000]); // perform multiple times to make sure fields are replaced
  }

  function updateFields() {
    $('input[prop=text], input[prop=image], input[prop=color]').trigger('input');
  }

  function performMultiple(func, times) {
    $.each(times, function(i, time) {
      setTimeout(func, time);
    });
  }

  // replace image wrapper function
  // TODO: needs updated selector...
  function replaceImage(name, value, field) {
    if(!value || value.length < 3) return false; // do not replace image unless we have a value
    performMultiple(changeImage(field, value), [0, 200, 800]);
  }

  function changeImage(field, value) {

    // debug
    // console.log('Replace image (' + field.attr + ') - ' + field.name + ' -> ' + value);
    // console.log(field);

    // different handling for img and background replacement
    if(field.attr == 'img') {
      replaceImageElement(field.target, value);
    } else if(field.attr == 'background') {
      replaceImageBackground($(field.target), value);
    } else {
      console.log('Unknown image type: ' + field.attr);
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
    var outputs = [];

    // check for internal replacement for image
    // TODO: split this into separate function ..
    if(field.type == 'image') { // && field.replace [?]
      target = findImageElement(field); // using helper

      // check if we found image using the `findImageElement` function
      if(target && target.length) {
      }

      // check for other targets
      if($('#' + field.name).length) target = '#' + field.name;

      // check for image..
      if($('#iframe_result').length) {

        // find through replace ID:s...
        // TODO: fix!!
        // TODO: each image should only belong to one selector at max
        if(field.replace_ids) {
        
          // is array?
          if(field.replace_ids instanceof Array) {
            
            // loop through items
            $.each(field.replace_ids, function(i, image) {
              var iframeItem = $('#iframe_result').contents().find('#' + image);

              if(iframeItem.length > 0) {

                // debug
                var cont = debugSelector(iframeItem);

                // make sure image has src
                // temp test: only performing this for background images
                if(iframeItem.attr('src') && iframeItem.attr('id') == 'gwd-image_9' && iframeItem.prev().prop('nodeName') !== 'DIV') {
                  
                  console.log('Replacing image form backgrund!');

                  // // replace the selector - div with background as oposed of img
                  // replaceImageSelector(iframeItem);
                    
                  // // // re-get element for selector
                  // iframeItem = $('#iframe_result').contents().find('#' + image);

                  // add to outputs
                  outputs.push(iframeItem);                  

                } else {
                  // no src
                  // add to outputs
                  outputs.push(iframeItem);
                }

              }

            });
          } else { 
             // replace ids:s is single item
          }
        } else {
          // no replace id:s for item
        }

        // found any image selectors?
        if(outputs.length) {
          return {
            target: outputs,
            attr: 'img',
          };
        }
     
        // pattern : #replacement
        if(field.replace) {
          var iframeItem = $('#iframe_result').contents().find('#' + field.replace);    
          
          // TODO: need to handle multiple selectors !!! 
          if(iframeItem.length) {

            // return with 'img' change attrib...
            return {
              target: iframeItem,
              attr: 'img',
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


      // console.log('We return object ... ');
      // console.log({
      //   name: name,
      //   target: target,
      //   type: 'replace', 
      //   attr: 'background', // either 'background' or 'img'
      //   // replace: replaceString,
      // });

      return {
        name: name,
        target: target,
        type: 'replace', 
        attr: 'background', // either 'background' or 'img'
        // replace: replaceString,
      };
   
    } // end image handling

    // text fields / other:
    
    // using findTextElement helper function
    // var elem = findTextElement(field, name);
    // if(elem && elem != "NOTFOUND") {
    //   return elem;
    // }

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
      
      if($('#iframe_result').contents().find('#' + name + ' p').length) {
        return $('#iframe_result').contents().find('#' + name + ' p');
      }

      if($('#iframe_result').contents().find('#' + name).length) {
        return $('#iframe_result').contents().find('#' + name);
      }
    }

    // TODO: support for colors

    // element was still not found
    return '#notFound';
  }

  // find text element selector for a field name - returns maximum 1 element only
  function findTextElement(field, name) {
    var possibilities = [
      '#' + field.name + ' p',
      '#' + name + ' p',
      '#' + name,
      '#Stage__' + name + ' p font span',
      '#Stage__' + name + ' p span',
      '#Stage__' + name + ' p font',
      '#Stage__' + name + ' p',
      '#Stage__' + name,
      '#Stage_' + name + ' p font span',
      '#Stage_' + name + ' p span',
      '#Stage_' + name + ' p font',
      '#Stage_' + name + ' p',
      '#Stage_' + name,
    ];

    // loop through fields, find selector in documents
    $.each(possibilities, function(i, selector) {
      if($(selector).length) return selector;
    });

    return 'NOTFOUND'; // no selector found
  }

  function findIframeTextElement(field) {

  }

  function replaceImageElement(selector, newImage) {
    if(isArray(selector)) {
      $.each(selector, function(i, el) {
        replaceImageElement(el, newImage);
      });
    } else {

      // get type of element
      var elType = selector.prev().prop('nodeName');
      
      // console.log(' change elem: ' + selector.attr('id') + ' (' + elType + ')');

      // handling for different types of img elements
      switch(elType) {
        default:
        case 'IMG':
          // console.log(' > handle: IMG');
          
          // replace the element image
          selector
            .attr({
              'src': newImage,
              'source': newImage // gwd needs this property as well
            })
          ;
          
        break;

        case 'DIV':
          // console.log(' > handle: DIV');

          // debug element html
          // console.log('>' + newImage + '<' + ' ...');
          // console.log(selector.get());
         
          selector
            .css({
              'background-image': 'url(' + newImage + ')',
            })
          ;
        break;
      }


    }
  }

  // replace element helpers
  // this is a temp fix
  function rebuildImgSelectors() {
   
    // return promise
    return new Promise(function(resolve, reject) {
      // get the background image, replace the element
      // bind form selectors at this point
      // TODO: should be own function
      // TODO: should of course be dynamic, this is for demo purposes

      // wait 
      // setTimeout(function() {
        
      //   var imgElem = $('#iframe_result').contents().find('#gwd-image_9');
      //   console.log('Change this elem:');
      //   console.log(imgElem);
  
      //   // replace the elem
      //   replaceImageSelector(imgElem, function(res) {

      //     // log new elem
      //     var imgElem = $('#iframe_result').contents().find('#gwd-image_9');
      //     console.log('New elem:');
      //     console.log(imgElem);

      //     // some wait
      //     setTimeout(function() {

      //       // reset fields - not neccessary if we bind 
      //       // events in the next step at first ... 
      //       getAndBindFormFields();
      //     }, 1000);
          
      //     // return when complete
      //     resolve('was completed');

      //   });

      // }, 3000);

      // return instead
      resolve('complete');

    });

  } 

  // replace img selector with div element for a specified selector
  function replaceImageSelector(selector, callback) {
    
    // get new css of div element
    var itemStyle = 
      'width: ' + selector.width() + 'px;' +
      'height: ' + selector.height() + 'px;' +
      'background-image: url(' + selector.attr('src') + ');' +
      'background-size: cover;' + 
      'background-position: 50%'
    ;

    // debug selector, also get content of replacement div
    var divHtml = debugSelector(selector);

    // add css to div html
    divHtml += ' style="' + itemStyle + '"></div>';

    // replace img element with div element, delete original img element
    selector.after(divHtml).remove();
    
    // callback
    if(callback) callback();
  }

  function replaceImageBackground(selector, newImage) {

    if(typeof selector == 'array') {
      $.each(selector, function(i, el) {
        replaceImageBackground(el, newImage);
      });
    } else {
      console.log('Replace image background...');
      selector.css('background-image', 'url("' + newImage + '")');
      // replaceImageElement(selector, newImage); // try replace img element as well
    }
  }

  function findImageElement(field) {
    var target;
    var outputs = [];
    
    // // try find by replace images..
    // if(field.replace_images) {

    //   // TODO: should not do the actual replace
    //   if(field.replace_images instanceof Array) {
    //     $.each(field.replace_images, function(i, image) {
    //       var findStr = 'img[src="' + image + '"]';
    //       var imgEl = $(findStr);

          
    //       if(imgEl.length) {
    //         // return imgEl; 
    //         outputs.push(imgEl);
    //       } else {
    //       }
    //     });
    //   } else {
    //   }
    // }


    // if(field.replace_ids) {

    //   if(field.replace_ids instanceof Array) {
      
    //     // loop through items
    //     $.each(field.replace_ids, function(i, image) {
    //       var findStr = '#' + image;
    //       var imgEl = $(findStr);


    //       if(imgEl.length) {
    //         return findStr;
    //       } else {
    //       }
    //     });
    //   } else {
    //   }
    // }

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

    if(outputs) return outputs;

    return '#noImg'; // no image found
  }

  // remove add depdendencies
  function unloadLivePreview(callback) {

    // remove ad object
    $('#ad-preview').remove();
    
    // remove scripts
    $("script[src='*preview_edge.js']").remove();
    $("script[src='http://test.adrapid.com/templates/banner/*']").remove();
    $("script[src='*edge.js']").remove();
    $("script[src='*http://test.adrapid.com/templates/banner/amedia-3_image/980x300/980x300-preview_edge.js']").remove(); // test specific
    $.each($('head script'), function(i, s) { $(s).remove(); });
    $.each($('head object'), function(i, s) { $(s).remove(); });

    // reset global vars
    globalRules = false;
    formFields = false;
    bannerType = false;

    if(callback) callback();
  }

  function resetBannerState() {
    bannerState = false;
    globalRules = false;
    return true;
  }

  // events to be performed when banner have finished loaded
  // and has been added to the current document
  function bannerLoadEvents(options) {

    // set default options if not set
    if(!options) options = {'template_key': helpers.template_key};
    if(!options.templateId) options.templateId = helpers.template_key;

    return new Promise(function(resolve, reject) {

      // wait for iframe to finish loading
      $('iframe').load(function() {
        updateBanner();
        resolve('loaded on iframe load event');
      });

      // TODO: handle with status flag var so that we can avoid doing this multiple times
      // add a timeout in case we dont get the iframe load event
      setTimeout(function() {
        updateBanner();
        resolve('loaded after timeout');
      }, 700);

    });

  }

  function updateBanner() {
    // if(!bannerState) {
      $('#target').show(); // make sure live preview banner is visible
      bannerType = getHtml5BannerType(); // get html5 banner type, save in global var
      getAndBindFormFields(globalOptions); // get and bind form fields for the template
      bannerState = true;
      hideSpinner();
    // }
  }

  // change format helper
  // TODO: unbind previously set listeners
  function switchFormat(newFormat) {
    $('#target').hide();
    showSpinner();

    // reset banner state
    resetBannerState();

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

        // wait for iframe load event
        bannerLoadEvents();

      break;

      case 'edge':
      break;
    }
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
   
    // TODO: refactor, this function is duplicated
    adrapid.getPreviewHtml5(template_key, format) 
      .then(function(data) {
        data.templateId = template_key;               // save template ID, is needed later
        if(format) setElementDims(format);            // set dimensios of preview container
        return data;                                  // return data to next step
      })
      .then(helpers.appendAnimation)                  // add the animation to the area 
    ;
  }

  // handle color change for live preview
  function changeColor(target, color) {

    // text
    if(target == 'color_text_field1') {
      $('#Stage div p').css('color', color);
      $('#iframe_result').contents().find('p, div, span').css('color', color);
      
      // fix for button text, dont replace that
      $('#iframe_result').contents().find('#submitBtn p').css('color', $('input[name=color_button_text1]').val());
      $('#iframe_result').contents().find('#page1_1 p, #page1_1 div').css('color', $('input[name=color_product_text1]').val());

    // background
    } else if(target.indexOf('background') > -1) {
      $('#Stage').css('background-color', color);

      // iframe
      $('#iframe_result').contents().find('#gwd-ad').css('background-color', color);
      $('#iframe_result').contents().find('.gwd-page-wrapper').css('background-color', color);
      
      // remove previously set background image (currently disabled)
      // TODO: remove name dependency
      // $('input[name=img_1]').val('');
      // $('#Stage__02').css('background-image', '');

    // button text
    } else if(target.indexOf('button_text') > -1) {
      $('#iframe_result').contents().find('#submitBtn p').css('color', color);

    // product text
    } else if(target.indexOf('product_text') > -1) {
      $('#iframe_result').contents().find('#page1_1 p, #page1_1 div').css('color', color);

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

  // spinner helper function
  // TODO: add support for custom selector
  // TODO: add support for custom spinner code
  function addSpinner(parent) {
    // if(!parent) parent = $('#target').parent(); // '.livePreview'; // 'body'
    parent = $('#target').parent().parent();
    tempColor = $('#target').parent().css('background');

    // add CSS animations definitons
    $('<style>' + 
      '#liveSpinner:after {display: block;position: relative;width: 20px;height: 20px;animation: rotate 0.5s linear infinite;-webkit-border-radius: 100%;-moz-border-radius: 100%;border-radius: 100%;border-top: 1px solid #545a6a;border-bottom: 1px solid #d4d4db;border-left: 1px solid #545a6a;border-right: 1px solid #d4d4db;content: \'\';opacity: .5;}' +
      '#liveSpinner:after {width: 60px; height: 60px;}' +
      '@keyframes rotate {0% {  transform: rotateZ(-360deg);  -webkit-transform: rotateZ(-360deg);  -moz-transform: rotateZ(-360deg);  -o-transform: rotateZ(-360deg);}100% {  transform: rotateZ(0deg);  -webkit-transform: rotateZ(0deg);  -moz-transform: rotateZ(0deg);  -o-transform: rotateZ(0deg);}}' +
    '</style>').appendTo('body');

    // add spinner to the document, bind to spinner selector
    spinner = $('<div id="liveSpinner" class="spin"></div>').css({
      position: 'fixed',
      top: '55%',
      // left: '48%',
      'z-index': '50000',
    }).appendTo(parent).hide(); 

    setTimeout(showSpinner, 1200);
  }

  function showSpinner() {
    spinner.fadeIn();
    // $('#target').parent().css({
    //   background: '#111',
    //   transition: 'all 400ms',
    // });
  }

  function hideSpinner() {
    setTimeout(function() {
      spinner.fadeOut();
      // $('#target').parent().css({
      //   background: tempColor,
      //   transition: 'all 400ms'
      // });
    }, 500); 
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
    $('input[prop=color]').off();
    
    // utilize minicolor library if available
    if (typeof $.minicolors !== 'undefined') {
      $('input[prop=color]').minicolors({
        control: 'hue',
        format: 'rgb',
        opacity: false,
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
      target: '#target', // target selector
    }, options);

    // add spinner to the document
    addSpinner();
    hideSpinner();

    // get the banner type
    bannerType = getHtml5BannerType()

    this.loadPreviewDependencies(function() {         // make sure animation dependencies is loaded before loading the banner
      adrapid.getPreviewHtml5(templateId, format)     // get the banner animation content
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
      colors: true, // include colors
      images: true, // include images
      texts: true, // include texts
      url: true, // include url
      form: '',
      before: func,
      complete: func,
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