// AdRapid API sample implementation

// initialize AdRapid
// var adrapid = new AdRapid('6271f323ff24875b74569ebc76eafa7c8ce0aa85');
var adrapid = new AdRapid({
  api_key: '6271f323ff24875b74569ebc76eafa7c8ce0aa85',
  log: helpers.log,
});


adrapid.log = helpers.log;


// define our app
$(function() {

  // environment vars
  var projects = [], inspectors = [];
      
  // initialize
  (function init() {

    // hide some content
    $('#the_form button').hide();
    $('#form').hide();

    // get list of templates
    adrapid.templates().then(setup_templates);

  })();

  // initiate templates
  function setup_templates(templates) {

    // setup templates
    $.each(templates, function(i, data) {
      projects[data.identifier] = data.templateId; // add project API key to array of available projects
      $('#templates').append('<div class="template" name="' + data.identifier + '"><img src="' + data.thumbnail + '" style="width: 100%; " /></div>'); // append template to UI
    });

    // bind template click actions
    bind_buttons();
    $('.loader').fadeOut();
  }

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

    // handle back button
    $('.back').click(function(event) {
      event.preventDefault();
      $('#form').hide();
      $('#templates').show();
    });
  }

  function send_order() {
    var order             = $('form#the_form').serializeObject();
        order.templateId  = projects[$('.active').attr('name')], // from our api-keys config
    
    // send the order
    adrapid.sendOrder(order).then(helpers.watchOrder);
  }

  // load form helper 
  function loadForm(template) {
    adrapid.rules(template).then(function(rules) {
      helpers.buildForm(rules, template, {
        // rules: rules,
        selector: '#form-content',
        before: function() {
          $('#the_form button').show();
          $('.form_placeholder').hide();
        },
        complete: function(data) {
          $('#the_form button').show();
          $('.form_placeholder').hide();
        }
      });
    });

    $('#templates').hide();
    $('#form').show();
  }

});
