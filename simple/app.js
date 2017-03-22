// AdRapid API sample implementation
// Documentation available at http://raviteq.github.io/adrapid-api/
var projects = [];
var api_key = '6271f323ff24875b74569ebc76eafa7c8ce0aa85';
var adrapid = new AdRapid({
  api_key: api_key,
  log: helpers.log // add a custom log function
});

// initialize
adrapid.templates().then(setup_templates);


function setup_templates(templates) {
  $.each(templates, function(i, data) {
    projects[data.identifier] = data.templateId; // add project API key to array of available projects
    $('#templates').append('<div class="template" name="' + data.identifier + '"><img src="' + data.thumbnail + '" style="width: 100%; " title="' + data.name + '" /></div>'); // append template to UI
  });

  bind_buttons(); // bind button actions
}

function bind_buttons() {

  // when a template is clicked, load the form for the template
  $('.template').click(function() {
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
      order.templateId  = projects[$('.active').attr('name')], // get the templateId from our api-keys config array
  
  // send the order to AdRapid, then setup order eventlistener using helper function
  adrapid.sendOrder(order)
  .then(function(orderData) {
    helpers.watchOrder({
      order_id: orderData.order_id,
      update: function(data) {
        adrapid.getPreview(data.id).then(function(res) {
          $('#results').html(res.preview);
          addContentLinks(res);
        });
      },
    })
  });
}

// helper function for loading a form
function loadForm(templateId) {
  helpers.getForm(templateId, {
    selector: '#form-content',
    complete: function(data) {
      helpers.addUploadHelpers();
      helpers.addColorPickers();
      $('.loader').fadeOut();
      $('#the_form button').show();
      $('.form_placeholder').hide();
      $('#form_description').html(
        '<h2>' + rules.title + '</h2>' +
        '<p>Below a form has bee created using the <code>templateIrules</code> for the selected template.</p>'
      );

    }
  });

  $('#templates, #form').toggle();
}

function addContentLinks(preview) {
  var baseUrl = preview.preview.split('src="')[1].split('.html')[0].split('/').splice(0,7).join('/') + '/';
  $('#results > div').append(
    link(baseUrl + 'banner.jpg') +
    link(baseUrl + 'banner.pdf') +
    link(baseUrl + 'banner_preview.jpg', 'pdf preview') +
    link(baseUrl + 'banner.gif')
  );
}

function link(href, name) {
  if(!name) name = href.split('.').pop();
  return '<a href="' + href + '" target="_blank" class="button">' + name + '</a> ';
}



$('#the_form button, #form').hide(); // thide the form initially