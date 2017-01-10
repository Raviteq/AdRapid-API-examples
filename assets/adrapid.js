// AdRapid.js - wrapper for AdRapid public API
// Documentation is available at http://raviteq.github.io/adrapid-api/

var AdRapid = function(params) {

  // initialization
  // ---------------------------------------------------

  function log(content, title) {
    return false; // disabled log
  }

  (function init() {
    if(typeof params === 'string') { params = {api_key: params} }
    params                = params || {};
    this.api_url          = params.api_url || 'https://api.adrapid.com/api/';
    this.api_key_public   = params.api_key || '6271f323ff24875b74569ebc76eafa7c8ce0aa85'; // demo API-key
    this.debug            = params.debug || false;
    this.inspectors       = [];
    if(params.log) log = params.log;
  })();

  var func = function(){};


  // public methods
  // ---------------------------------------------------

  // public api helper 
  this.api_get = function(method, params, data, ajaxSettings) {
    if(data) params = data;
    if(!params) params = {}
    if(data && debug && typeof(log) == "function") log(data, 'POST -> ' + method);

    return new Promise(function(resolve, reject) {
      var ajaxOptions = {  
        type: (data) ? 'POST' : 'GET',
        url: this.api_url + method,
        data: params,
        headers: { 'Authorization': this.api_key_public },
        success: function(response) {
          response = jQuery.parseJSON(response);
          log(response, (data) ? 'POST -> ' + method : 'GET -> ' + method);
          resolve(response);
        },
        error: function(jqXHR, textStatus, errorThrown) {
          console.log('ERROR!!');
          console.log(jqXHR.responseText);
          reject(jQuery.parseJSON(jqXHR.responseText));
        }
      };

      // extend ajaxoptions if available
      if(ajaxSettings) { ajaxOptions = $.extend( ajaxSettings, ajaxOptions);}

      // perform the ajax call
      $.ajax(ajaxOptions);
    });
  }


  // bindings to public methods of the AdRapid API
  // ---------------------------------------------------

  // get templates
  this.templates = function() {
    return this.api_get('templates');
  }

  // list available tags
  this.tags = function() {
    return this.api_get('tags');
  }

  // get templates matching a specific tag
  this.templatesWithTags = function(tags) {
    return this.api_get('templates?tags=' + tags);
  }

  // get rules for template
  this.rules = function(templateId) {
    return this.api_get('templates/' + templateId);
  }

  // send order
  this.sendOrder = function(data) {
    return this.api_get('orders', false, data);
  }

  // get order
  this.getOrder = function(orderID) {
    return this.api_get('orders/' + orderID);
  }

  // get order data
  this.getOrderData = function(orderID) {
    return this.api_get('orders/' + orderID + '/data');
  }

  // get available formats
  this.formats = function() {
    return this.api_get('formats');
  }

  // get item preview
  this.getPreview = function(itemID) {
    return this.api_get('get_item_content/' + itemID);
  }

  // get html5 preview
  this.getPreviewHtml5 = function(template, format) {
    return this.api_get('templates/' + template + '/preview/' + format);
  }

  // upload media
  this.addMedia = function(file, options) {
    return this.api_get('medias', false, file);
  }

  // get media
  this.getMedia = function(mediaID) {
    return this.api_get('medias/' + mediaID); 
  }

  // list media
  this.listMedia = function() {
    return this.api_get('medias');
  }


  // additional frontend methods
  // ---------------------------------------------------

  // watch an order, do different actions on state change
  this.watch = function(params) {

    // setup defaults
    var params = $.extend( {
      method: 'watch_order', // support medias update method as well
      init: func,
      update: func,
      complete: func,
    }, params);

    params.init();

    // setup eventsource
    var evtSource = new EventSource(api_url + params.method + '/' + params.order_id);

    // add eventsource evetnts
    evtSource.addEventListener("item_complete", function(e) {
      params.update(JSON.parse(e.data));
    }, false);

    evtSource.addEventListener('order_complete', function(e) {
      params.complete(JSON.parse(e.data));      
      evtSource.close(); // remove the eventsource
    }, false);
  }


  // additional helper methods
  // ---------------------------------------------------

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