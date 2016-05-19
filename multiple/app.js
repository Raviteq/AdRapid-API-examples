$(function() {
  
  // config
  var api_url     = 'http://test.adrapid.com/api/',
      api_key     = '6271f323ff24875b74569ebc76eafa7c8ce0aa85', // apidemo @ dev
      formats     = 'banner_970x250:google_adwords',            // a predefined banner format
      group       = 'offer',
      projects    = [];


  // initialize AdRapid
  var adrapid = new AdRapid({
    api_key:  api_key,
  });


  // setup the application
  adrapid.templates() // get available templates
    .then(filterTemplates) // filter templates
    .then(function(templates) {
      $.each(templates, function(i, data) {
        projects.push(data.templateId);
        build_template(data);
      });

      // generate the form based on rules of the first template...
      adrapid.rules(templates[0].templateId).then(function(rules) {
        build_form(rules); // build the order form
        bind_actions(); // bind submit click action
      });
    })
  ;


  // helper functions

  function filterTemplates(templates) {
    return templates.filter(function(template) {
      return template.group == group;
    });
  }

  function build_template(data) {
    $('#results').append('<div id="res-' + data.templateId + '" class="res">' + 
        '<div class="content"><p>Preview for ' + data.identifier + ' goes here.</p></div>' +
        '<div id="loader-' + data.templateId + '" class="loader"><div class="throbber throbber_large"></div></div>' +
      '</div>');
    $('#loader-' + data.templateId).fadeOut();
  }

  // build form helper
  function build_form(rules) {
    $.each(rules.fields, function(index, el) {
      if(el.name.indexOf('color') == -1) { // ignore colors
        $('#form').append('<div><label for="' + el.name + '">' + el.label + '</label><br><input name="' + el.name + '" value="' + el.default + '" /></div>');
      } 
    });

    $('#form').append('<button id="submit">Send</button'); // add submit button
  }

  function bind_actions() {
    $('#submit').click(function(event) {
      event.preventDefault();

      // send an order for every project
      $.each(projects, function(ins, el) {
        var order             = $('#form').serializeObject();
            order.templateId  = el;
            order.formats     = formats;
        
        // send the order
        adrapid.sendOrder(order).then(function(result) {
          watch_order(result.order_id, order.templateId); // watch the order
        });
      });
    });
  }

  // watch order helper
  function watch_order(order_id, templateId) {
    adrapid.watch({
      order_id: order_id,
      init: function() {
        $('#loader-' + templateId).fadeIn();
      },
      update: function(data) {
        adrapid.getPreview(data.id).then(function(res) {
          $('#res-' + templateId + ' .content').html(res.preview);
          $('#loader-' + templateId).fadeOut();
        });
      },
    });
  }

});