// frontend helpers for AdRapid API example implementations

var func = function() {};
var helpers = function() {

	// build a form from template rules
	this.buildForm = function(rules, template, settings) {
	
		// setup defaults
    var settings = $.extend( {
      selector: '#form',
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
	this.uploadHelper = function(options) {

		// config
    var maxFileSize = 100 * 1000; // 100mb
    var api_get = adrapid.api_get;
    var file; // global files object

    // throwerror helper
    function throwError(error) { alert(error); }

    // extend defaults
    var settings = $.extend( {
      element: '#form2',
      error: function(error) { throwError(error) },
      complete: function() {
        console.log('Completed upload!');
      },
      progress: function(event) {
        console.log('Progress: ' + event);
      },
      errors: {
        missingFile: function() { throwError('File missing!') },
        tooLarge: function() { throwError('Too large!') },
        wrongMime: function() { throwError('Wrong mime!') },
      },
    }, options);
    
    var str = settings.element.substring(1);

    // create form
    $(settings.element).append('<input type="file" name="' + str + '-file" />');

    // setup file upload events
    $('input[name="' + str + '-file"]').change(function(event) {
      file = event.target.files; // update file data
      var data = new FormData();

      $.each(file, function(key, value) {
        data.append(key, value);
      });

      var options = {
        cache       : false,
        processData : false, // Don't process the files
        contentType : false, // Set content type to false as jQuery will tell the server its a query string request
      };

      // send the upload request using our formData and custom ajax options
      api_get('medias', false, data, options).then(function(response) {
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

  function load_edge(callback) {
	  if(typeof AdobeEdge == 'undefined') {
	    $.getScript(edgeSrc, function() {
	      if(callback) callback();
	    });
	  } else {
	    if(callback) callback();
	  }
	}

	// get preview function
	function get_preview(template, format, callback) {

	  // make sure Adobe Edge runtime is loaded before loading html5 banner
	  load_edge(function() {

	    // load the animation for the ad
	    adrapid.api_get('templates/' + template + '/preview').then(function(data) {
	      
	      // create #Stage element if it does not exist
	      var parts = data.script.split(', ');
	      var edgeID = parts[1].substring(1, parts[1].length - 1);

	      if(!$('.' + edgeID).length) {
	        $('#target').append('<div id="Stage" class="' + edgeID + '"></div>');
	      }

	      // add the script
	      $('head').append(data.script);

	      if(callback) callback(template);
	    });
	    
	  });

	  addPrev(template);

	}

	function addPrev(template) {
	  
	  // get the rules for the template
	  adrapid.rules(template).then(function(rules) {

	    // create form
	    helpers.buildForm(rules, false, {
	      selector: '#the_form',
	      formats: false,
	      complete: function() {
	        previewHelper(); // add bindings to the form
	        add_upload_helpers(); // add form upload helpers for images
	      },
	    });
	  });
	}

	function previewHelper(options) {

	  // extend options
	  var settings = $.extend( {
	    selector: '',
	    complete: function() {},
	    load: function() {}
	  }, options);

	  // text fields change
	  $('input[prop=text]').on('input', function() {
	    var target = '#Stage__' + $(this).attr('name') + ' p';
	    if($(target).has("span").length) { target += ' span';} // detect existence of span element
	    $(target).html($(this).val());
	  });

	  // image fields change
	  $('input[prop=image]').on('input', function() {
	    var target = '#Stage_' + $(this).attr('name');
	    var val = $(this).val();
	    $(target).css('background-image', 'url("' + val + '")');
	  });

	  // color fields change
	  if(typeof minicolors !== 'undefined' && $.isFunction(minicolors)) {
	    $('input[prop=color]').minicolors({
	      control: 'wheel',
	      format: 'rgb',
	      opacity: true,
	      // changeDelay: 100,
	      change: function(value, opacity) {
	        // TODO: changing background or text? 
	        if(!value) return;    
	        var target = $(this).attr('name');
	        $('#Stage__' + target).css('background-color', value);
	      }
	    });
	  } else {
	    $('input[prop=color]').on('input', function() {
	      var target = $(this).attr('name');
	      $('#Stage__' + target).css('background-color', $(this).val());
	    });
	  }

	  // trigger state change on all text fields to get the correct content in the ad 
	  setTimeout(function() { $('input[prop=text]').trigger('input'); }, 600);

	  settings.complete();
	}


	function add_upload_helpers() {
	  $('input[prop="image"]').each(function() {
	    var elem = $(this);
	    var nn = elem.attr('name');

	    $('<div><div id="' + nn + '-temp"></div></div>').insertAfter($(this));

	    // create image upload helper for the element
	    adrapid.uploadHelper({
	      element: '#' + nn + '-temp',
	      complete: function(data) {
	        elem.val(data.thumbnail).trigger('input');
	      },
	    });

	  });

	}


	// other test functions, may be removed
	// --------------------------------------------------------

  // a log function
  this.log = function(content, title) {
  	if(!content) return false;

	  // if content is object, implement code inspector
	  if(typeof content === 'object') {
	    var logId = 'log-' + Date.now();
	    $("#log .content").prepend("<div class=\"log-message\" id=\"" + logId + "\"></div>")

	    inspectors.push(new InspectorJSON({
	      element: logId,
	      json: content,
	    }));

	    if(title) $('#log .content').prepend('<div class="log-message">' + title + ':</div>');
	  } else {
	    $('#log .content').prepend('<div class="log-message">' + content + '</div>');
	  }
  }

};


// expose
var helpers = new helpers();