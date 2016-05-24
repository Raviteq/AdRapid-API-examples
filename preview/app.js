  
  var format = '970x250',
	    projects = [],
	    adrapid = new AdRapid('6271f323ff24875b74569ebc76eafa7c8ce0aa85');

  // app initialization
  adrapid.templates()
    .then(filter_templates)
    .then(setup)
    .then(click_actions);


  // helper functions

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
    return templates;
  }

  function click_actions() {
    $('.template').click(function(event) {
      $('#form, #templates').toggle();
      $('#target').html('<h3>Loading..</h3>');
      var template = $(this).attr('name');
      getForm(template);
      getLivePreview(projects[template]);
    });
  }

  function getLivePreview(templateId) {
    helpers.loadEdge(function() { // make sure Adobe Edge runtime is loaded first
      adrapid.getPreviewHtml5(templateId) // get the animation content
        .then(helpers.appendEdgeAnimation) // append the banner to the page
        .then(helpers.previewHelper) // bind form events
        .then(helpers.addUploadHelpers); // add file uploads to form
    });
  }

  function getForm(template) {
    adrapid.rules(template).then(function(rules) { // get the rules for the template
      helpers.buildForm(rules, false, { // load the form for the template
        formats: false, // dont show formats dropdown
      });
    });
  }

  $('#form').hide();