// AdRapid API sample implementation

// config
var api_url = 'http://test.adrapid.com/api/';
var api_key = '6271f323ff24875b74569ebc76eafa7c8ce0aa85'; // apidemo@dev

// initialize AdRapid
var adrapid = new AdRapid({
  api_key:  api_key,
  api_url:  api_url,
  debug:    true,
});

// extend adrapid with a custom log function
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

    if(title) $('#log .content').prepend('<div class="log-message">' + title + ':</div>');
  } else {
    $('#log .content').prepend('<div class="log-message">' + content + '</div>');
  }
}

adrapid.log = log;

// define our app
$(function() {

  // environment vars
  var projects = [], inspectors = [];
      
  // initialize the app
  (function init() {

    // hide extra content
    $('#the_form button').hide();
    $('#form').hide();

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

    // when a template is clicked, load the form
    $('.template').click(function(e) {
      $('.template').removeClass('active');
      $(this).toggleClass('active');
      loadForm(projects[$(this).attr('name')]);
    });

    // when the form is submitted, handle sending the order to AdRapid
    $('.send').click(function(e) {
      e.preventDefault();
      send_order();
    });

    // back button
    $('#back').click(function(event) {
      event.preventDefault();
      $('#form').hide();
      $('#templates').show();
    });

  }

  function send_order() {
    var selectedTemplate  = $('.active').attr('name'),
        order             = $('form#the_form').serializeObject();
        order.templateId  = projects[selectedTemplate], // from our api-keys config
    
    // send the order
    adrapid.sendOrder(order).then(function(result) {
      watch_order(result.order_id);
    });
  }

  // watch an order for events
  function watch_order(order_id) {
    adrapid.watch({
      order_id: order_id,
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

  // load form helper 
  function loadForm(template) {
    adrapid.rules(template).then(function(rules) {
      adrapid.createForm(rules, template);
    });

    $('#templates').hide();
    $('#form').show();
  }

});
