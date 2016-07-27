var api_key = '6271f323ff24875b74569ebc76eafa7c8ce0aa85';
var template_key = '1dbc77d334cce79b2d8eb6ff96b9674995787df6';
var adrapid = new AdRapid(api_key);

$('#load').click(function(event) {
  $('#target h3').text('Loading...');   // set loading text
  $('#form, #templates').toggle();      // show the form
  helpers.getForm(template_key);               // get the form for the template
  helpers.getLivePreview(template_key); // get the live preview, bind form events
  console.log('Load preview');
});

$('#form').hide(); // hide the form initially