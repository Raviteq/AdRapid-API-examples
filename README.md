# AdRapid API examples
This repository contains a list of demos / example implementations of the AdRapid API. 

The `simple` implementation illustrates in a simple way the whole process of getting a list of available templates, getting rules for a specific template, sending an order, as well as wating for and displaying the resulting ads. A log displays the data that is sent to and from the API through the order process. http://test.adrapid.com/api-test/simple/index.html

The `multiple` implementation is an example on how multiple orders for different templates can be sent at the same time. http://test.adrapid.com/api-test/multiple/index.html

The `preview` implementation shows how dynamic live-previews for html5-banners can be achieved. When a template is selected, we get the rules for the template and create a form using the rules. We also get a preview banner and append it to the page. We then bind form change events, so that when the user changes a field, the banner preview is updated instantly.

This example also implements form upload helpers, so that the end user can upload images from their local computer. The file is sent to AdRapid (& transcoded if needed). The image field is then updated with the result of the upload, triggering the image in the banner to be changed.

More examples will be added shortly.

A simple wrapper - [AdRapid.js](assets/adrapid.js) is used for the demo implementations. 

A separate [helpers.js](assets/helpers.js) library contains frontend functions/helpers.

Documentation for the API is available at http://raviteq.github.io/adrapid-api/