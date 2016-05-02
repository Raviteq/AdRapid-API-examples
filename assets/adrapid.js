var AdRapid = function(params) {

	// initialize
	(function init() {
		this.api_url 					= params.api_url || 'http://api.adrapid.com/',
		this.api_key_public 	= params.api_key || 'myAPIkey';
		this.debug 						= params.debug || false,
		this.inspectors 			= [];
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

		if(data && debug) log(data, 'POST -> ' + method);

	  // Return a new promise.
	  return new Promise(function(resolve, reject) {
		  $.ajax({  
				type: (data) ? 'POST' : 'GET',
				url: this.api_url + method,
				data: params,
				headers: { 'Authorization': this.api_key_public }, // cant do this locally
				success: function(response) {
					response = jQuery.parseJSON(response);
					if(debug) log(response, (data) ? 'POST' : 'GET' + ' -> ' + method);
	        resolve(response);
				},
				error: function(status) {
	        reject(Error(status));
				}
			});
	  });
	}

	// a log helper, may be extended to do something else
	this.log = function(content, title) {
		if(title) console.log(title + ':');
		console.log(content);
	}
};