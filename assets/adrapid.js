var AdRapid = function(params) {

  // initialize
  (function init() {
    this.api_url          = params.api_url || 'http://api.adrapid.com/',
    this.api_key_public   = params.api_key || 'myAPIkey',
    this.debug            = params.debug || false,
    this.inspectors       = [];
    // a log helper, may be extended to do something else
    if(!this.log) this.log = function(content, title) {
      if(title) console.log(title + ':');
      console.log(content);
    }
    var log = this.log;
  })();

  // public methods
  // ---------------------------------------------------

  // get templates
  this.templates = function() {
    return this.api_get('templates');
  },

  // get rules for template
  this.rules = function(templateId) {
    return this.api_get('templates/' + templateId);
  },

  // send order
  this.sendOrder = function(data) {
    return this.api_get('orders', false, data);
  },

  // get order
  this.getOrder = function(orderID) {
    return this.api_get('orders/' + orderID);
  },

  // get item preview
  this.getPreview = function(itemID) {
    return this.api_get('get_item_content/' + itemID);
  },

  // public api helper 
  this.api_get = function(method, params, data) {
    if(data) params = data;
    if(!params) params = {}

      if(data && debug && typeof(log) == "function") log(data, 'POST -> ' + method);

    // Return a new promise.
    return new Promise(function(resolve, reject) {
      $.ajax({  
        type: (data) ? 'POST' : 'GET',
        url: this.api_url + method,
        data: params,
        headers: { 'Authorization': this.api_key_public }, // cant do this locally
        success: function(response) {
          response = jQuery.parseJSON(response);
          if(debug && typeof(log) == "function") log(response, (data) ? 'POST' : 'GET' + ' -> ' + method);
          resolve(response);
        },

        error: function(status) {
          reject(Error(status));
        }
      });
    });
  }

  




  // additional frontend methods
  // ---------------------------------------------------

  // the watch function
  this.watch = function(params) {
    var func = function(){};

    // setup defaults
    params.method         = params.method || 'watch_order';
    params.update         = params.update || func;
    params.complete       = params.complete || func;
    params.init           = params.init || function(){ console.log('Init this watcher'); };
    params.init();

    var evtSource = new EventSource(api_url + params.method + '/' + params.order_id);

    // show items as they are completed
    evtSource.addEventListener("item_complete", function(e) {
      params.update(JSON.parse(e.data));
    }, false);

    // when order is completed
    evtSource.addEventListener('order_complete', function(e) {
      params.complete(JSON.parse(e.data));      
      evtSource.close(); // remove the eventsource
    }, false);

  }

  this.createForm = function(data, template) {
    var form = '';
    
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
    form += '<div class="images">';
    for(var i = 0; i < data.fields.length; ++i) {
      if(data.fields[i]['type'] == 'image') {
        data.fields[i]['default'] = data.fields[i]['default'].replace('10.0.0.150', 'test.adrapid.com');

        form += 
        '<div class="image">' + '<label>' + data.fields[i]['label'] + '</label>' +
        '<img src="' + data.fields[i]['default'] + '" width="150" /><br>' +
        '<input name="' + data.fields[i]['name'] + '" value="' + data.fields[i]['default'] + '"></div>';
      }
    }

    form += '</div><br><div class="colors">';

    // create form colors
    for(var i = 0; i < data.fields.length; ++i) {
      if(data.fields[i]['type'] == 'color') {
        form += '<label for="' + data.fields[i]['name'] + '">' + data.fields[i]['label'] + '</label> <br>' + 
        '<input name="' + data.fields[i]['name'] + '" value="' + data.fields[i]['default'] + '" class="colorPicker"><br>';
      }
    }

    form += '</div>';

    // add colorpickers
    // setTimeout(function() { $('.colorPicker').minicolors(); }, 0);

    // set form content
    // TODO: add support for complete callback here
    $('#form-content').html(form);
    $('#the_form button').show();
    $('.form_placeholder').hide();
  }



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

};