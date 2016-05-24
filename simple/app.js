// AdRapid API sample implementation
// Documentation available at http://raviteq.github.io/adrapid-api/
var projects = [];
var adrapid = new AdRapid({
  api_key: '6271f323ff24875b74569ebc76eafa7c8ce0aa85',
  log: helpers.log // add a custom log function
});

// initialize
adrapid.templates().then(setup_templates);
$('#the_form button, #form').hide();

function setup_templates(templates) {
  $.each(templates, function(i, data) {
    projects[data.identifier] = data.templateId; // add project API key to array of available projects
    $('#templates').append('<div class="template" name="' + data.identifier + '"><img src="' + data.thumbnail + '" style="width: 100%; " /></div>'); // append template to UI
  });

  bind_buttons();
}

function bind_buttons() {

  // when a template is clicked, load the form
  $('.template').click(function(e) {
    $('.template').removeClass('active');
    $(this).toggleClass('active');
    loadForm(projects[$(this).attr('name')]);
  });

  // when the form is submitted, handle sending the order to AdRapid
  $('.send').click(function(event) {
    event.preventDefault();
    send_order();
  });

  // handle back button
  $('.back').click(function(event) {
    event.preventDefault();
    $('#form, #templates').toggle();
  });

}

function send_order() {
  var order             = $('form#the_form').serializeObject();
      order.templateId  = projects[$('.active').attr('name')], // from our api-keys config
  
  adrapid.sendOrder(order).then(helpers.watchOrder);
}

// load form helper 
function loadForm(template) {
  adrapid.rules(template).then(function(rules) {
    helpers.buildForm(rules, template, {
      selector: '#form-content',
      before: function() {
        $('#the_form button, .form_placeholder').toggle();
      },
      complete: function(data) {
        // $('#the_form button, .form_placeholder').toggle();
        $('.loader').fadeOut();
        $('#the_form button').show();
        $('.form_placeholder').hide();
      }
    });
  });

  $('#templates, #form').toggle();
}