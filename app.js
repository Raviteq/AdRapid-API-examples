// AdRapid API demo app


// config
var api_url = 'http://test.adrapid.com/api/';
var api_key = '6271f323ff24875b74569ebc76eafa7c8ce0aa85'; // apidemo@dev
							

// log helper
function log(content, title) {
	if(!content) return false;

	// if content is object, implement code inspector
	if(typeof content === 'object') {
		var logId = 'log-' + Date.now();
		$("#log .content").prepend("<div class=\"log-message\" id=\"" + logId + "\"></div>")

		inspectors.push(new InspectorJSON({
			element: logId,
			json: content,
		}));

		if(title) $('#log .content').prepend('<div class="log-message">' + title + '</div>');
	} else {
		$('#log .content').prepend('<div class="log-message">' + content + '</div>');
	}
}


// initialize AdRapid
var adrapid = new AdRapid({
	api_key: 	api_key,
	api_url: 	api_url,
	debug:  	true,
});

// add our custom log function to the AdRapid object
adrapid.log = log;


// define our app
$(function() {

	// environment vars
	var projects = [], inspectors = [];
			
	// initialize the app
	(function init() {

		// hide extra content
		$('#the_form button').hide();

		// get list of templates
		adrapid.templates().then(function(templates) {

		  // initiate templates
		  $.each(templates, function(i, data) {

				// add project API key to array of available projects
				projects[data.identifier] = data.templateId;

				// append template to UI
				$('#templates').append('<div class="template" name="' + data.identifier + '"><img src="' + data.thumbnail + '" style="width: 100%; " /></div>');			
			});

			// bind template click actions
			bind_buttons();

			$('.loader').fadeOut();

		}, function(error) {
		  console.log(error);
		});

	})();

	// handle button bindings
	function bind_buttons() {

		// when a template is clicked
		$('.template').click(function(e) {
			$('.template').removeClass('active');
			$(this).toggleClass('active');
			loadForm($(this).attr('name'));
		});

		// when the form is submitted
		$('.send').click(function(e) {
			e.preventDefault();
			
			var selectedTemplate 	= $('.active').attr('name'),
					order 						= $('form#the_form').serializeObject();
					order.templateId 	= projects[selectedTemplate], // from our api-keys config
			
			// send the order
			adrapid.sendOrder(order).then(function(result) {
				watch_order(result.order_id);
			});

		});

	}


	// load form helper 
	function loadForm(template) {
		adrapid.rules(template).then(function(rules) {
			createForm(rules, template);
		});
	}

	// watch order for changes, display order items as they are completed 
	function watch_order(order_id) {
		$('.loader').fadeIn();

		// initialize EventSource for order
		var evt_url 	= api_url + "watch_order/" + order_id,
				evtSource = new EventSource(evt_url);
		
		// show items as they are completed
		evtSource.addEventListener("item_complete", function(e) {
			var data = JSON.parse(e.data);
			
			// show a preview of the order item
			adrapid.getPreview(data.id).then(function(res) {
				$('#results').html(res.preview);
			});

		}, false);

    // when order is completed
    evtSource.addEventListener('order_complete', function(e) {
    	var data = JSON.parse(e.data);
    	log(data, 'Got order complete event');
			$('.loader').fadeOut();

			// get order data
			adrapid.getOrder(order_id).then(function(order){
				log(order, 'Order result data');
			});

			// remove the eventsource
			evtSource.close();

		}, false);

	}

	// form helpers
	function createForm(data, template) {
		var form = '<h3>' + template + '</h3>';
		
		// create formats dropdown
		form += '<br> <label for="formats">Banner format</label> <br><select name="formats"><br>';
		for(var i = 0; i < data.formats.length; ++i) form += '<option value="banner_' + data.formats[i] + ':google_adwords">' + data.formats[i] + '</option>';
		form += '</select> <br><br>';
		
		// create form fields
		for(var i = 0; i < data.fields.length; ++i) {
			if(data.fields[i]['name'].indexOf('img') > -1 || data.fields[i]['name'].indexOf('color') > -1) {} else {
				form += '<label for="' + data.fields[i]['name'] + '">' + data.fields[i]['label'] + '</label> <br>' + '<input name="' + data.fields[i]['name'] + '" value="' + data.fields[i]['default'] + '"><br>';
			}
		}

		// create form images
		for(var i = 0; i < data.fields.length; ++i) {
			if(data.fields[i]['type'] == 'image') {
				data.fields[i]['default'] = data.fields[i]['default'].replace('10.0.0.150', 'test.adrapid.com');

				form += 
					data.fields[i]['label'] + ': <br>' +
					'<img src="' + data.fields[i]['default'] + '" width="150" /><br>' +
					'<input name="' + data.fields[i]['name'] + '" value="' + data.fields[i]['default'] + '"><br>';

			}
		}

		form += '<br>';

		// create form colors
		for(var i = 0; i < data.fields.length; ++i) {
			if(data.fields[i]['type'] == 'color') {
				form += '<label for="' + data.fields[i]['name'] + '">' + data.fields[i]['label'] + '</label> <br>' + 
								'<input name="' + data.fields[i]['name'] + '" value="' + data.fields[i]['default'] + '" class="colorPicker"><br>';
			}
		}


		// add colorpickers
		setTimeout(function() { $('.colorPicker').minicolors(); }, 0);

		// set form content
		$('#form-content').html(form);
		$('#the_form button').show();
		$('.form_placeholder').hide();
	}

});



// serialize to object helper
$.fn.serializeObject = function() {
  var o = {};
  var a = this.serializeArray();

  $.each(a, function() {
      if (o[this.name] !== undefined) {
          if (!o[this.name].push) {
              o[this.name] = [o[this.name]];
          }
          o[this.name].push(this.value || '');
      } else {
          o[this.name] = this.value || '';
      }
  });
  
  return o;
};