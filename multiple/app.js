$(function() {
  
  // config
  var api_url     = 'http://test.adrapid.com/api/',
      api_key     = '6271f323ff24875b74569ebc76eafa7c8ce0aa85', // apidemo@dev
      templateId  = '14e4b22b467f740c7cf9542989af9330b054f7b8',
      formats     = 'banner_970x250:google_adwords',
      group       = 'offer',
      projects    = [];


  // initialize AdRapid
  var adrapid = new AdRapid({
    api_key:  api_key,
    api_url:  api_url,
    debug:    true,
  });

  adrapid.log = function() {};

  // initialize
  (function init() {
    var out = '';

    // get templates
    adrapid.templates().then(function(templates) {

      // filter templates, only get for the selected `group`
      var templates2 = templates.filter(function(template) {
        return template.group == group;
      });

      // loop through our templates 
      $.each(templates2, function(i, data) {
        projects.push(data.templateId);
        // $('#app').append('<div class="template" name="' + data.identifier + '"><img src="' + data.thumbnail + '" style="width: 100%; " /></div>');      
        $('#results').append('<div id="res-' + data.templateId + '" class="res">' + 
            '<div class="content"><p>Preview for ' + data.identifier + ' goes here.</p></div>' +
            '<div id="loader-' + data.templateId + '" class="loader"><div class="throbber throbber_large"></div></div>' +
          '</div>');
        $('#loader-' + data.templateId).fadeOut();
      });

      // generate the form based on rules of the first template...
      adrapid.rules(templates2[0].templateId).then(function(rules) {
        build_form(rules); // build the order form
        bind_actions(); // bind submit click action
      });
    });

  })();


  // build form helper
  function build_form(rules) {
    
    // create the form fields
    $.each(rules.fields, function(index, el) {
      if(el.name.indexOf('color') == -1) { // ignore colors
        $('#form').append('<div><label for="' + el.name + '">' + el.label + '</label><br><input name="' + el.name + '" value="' + el.default + '" /></div>');
      } 
    });

    // add submit button
    $('#form').append('<button id="submit">Send</button');
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
          watch_order(result.order_id, order.templateId);
        });
      });
    });
  }


  // watch order helper
  function watch_order(order_id, templateId) {
    $('#loader-' + templateId).fadeIn();

    // initialize EventSource for order
    var evt_url   = api_url + "watch_order/" + order_id,
        evtSource = new EventSource(evt_url);

    // show items as they are completed
    evtSource.addEventListener("item_complete", function(e) {
      var data = JSON.parse(e.data);

      // show a preview of the order item
      adrapid.getPreview(data.id).then(function(res) {
        $('#res-' + templateId + ' .content').html(res.preview);
        $('#loader-' + templateId).fadeOut();
      });
    }, false);

    // when order is completed
    evtSource.addEventListener('order_complete', function(e) {
      $('#loader-' + templateId).fadeOut();
      evtSource.close();
    }, false);
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