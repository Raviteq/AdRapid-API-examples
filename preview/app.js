var api_key = '6271f323ff24875b74569ebc76eafa7c8ce0aa85';       // apidemo
var template_key = '1dbc77d334cce79b2d8eb6ff96b9674995787df6';  // defult to adrapid-product00003
var adrapid = new AdRapid(api_key);
var projects = [];

// define a live preview wrapper function
function getLivePreview(template_key) {
  helpers.getForm(template_key);            // get the form for the template
  helpers.getLivePreview(template_key);     // get the live preview, bind form events
}

function filter_templates(templates) {
  return templates.filter(function(template) {
    return template.group == 'offer';
  });
}

function setup(templates) {
  $.each(templates, function(i, data) {
    projects[data.identifier] = data.templateId;
    $('#templates').append('<div class="template" name="' + data.identifier + '"><img src="' + data.thumbnail + '" style="width: 100%; " /></div>');
  });

  $('.template').click(function(event) {
    $('#form, #templates').toggle();
    $('#target').html('<h3>Loading..</h3>');
    template_key = projects[$(this).attr('name')];
    getLivePreview(template_key);
  });
}

// initialize
adrapid.templates()
  .then(filter_templates)
  .then(setup);


$('#form').hide(); // hide the form initially