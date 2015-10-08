dispatch:short-url
==================

Create short urls, supports android and ios intents / custom-url shemes.


#### Usage examples
```js
  // Setup a url shortner
  shortUrl = new UrlShortner({
    prefix: '/s'     // If the shortner is to co-exist with
                     // the application then prefix, default is /s/XXXXXXXX
    // rateLimit: {  // Set rate limit options on the http point
    //   totalRequests: 10,
    //   every: 60000
    // },
    // collectionName: '', // Overwrite the default collection for short urls
    fallbackUrl: 'https://go.to.here.if.the.short.url.is.not.found',
    // debug: true // Make it verbose,
    // payload: { foo: bar } // Abillity to add payload for events
    startServer: true // Start the http(s) restpoint, default is false
  });

  // Create a short url
  shortUrl = createShortUrl('https://this.is.a.long.url.please.shorten.me');

  // Create a short url for android and iOS
  // Note: Provide the android fallback url in the intent for the best
  // user experience
  shortUrl = createShortUrl('https://if.this.is.a.long.url.then.shorten.me', {
    androidUrl: 'intent://?platform=android#Intent;scheme=dispatchdeeplinktest;'+
              'package=me.dispatch.qa.test.deep.link;' +
              'S.browser_fallback_url=http://www.google.com;end',
      iosUrl: 'dispatchdeeplinktest://?shorturl=ios'
  });

  // Limit usage
  shortUrl = createShortUrl('https://if.this.is.a.long.url.then.shorten.me', {
    oneTimeLink=true // Set true and this link will only work once
  });

  // or... have it expire
  shortUrl = createShortUrl('https://if.this.is.a.long.url.then.shorten.me', {
    expireAt=new Date(new Date().getTime() + 10000) // Set expiration time/date
  });
```


#### dispatch:deep-link example
```js
  // Add the "dispatch:deep-link" package
  // Initialize the deepLink - customURL scheme
  deepLink = new DeepLink('dispatchdeeplinktest', {
    fallbackUrl: 'https:/go.to.here.if.the.redirect.fails', // Adding a fallback here will add it to the android intent
    appId: 'me.dispatch.qa.test.deep.link'
  });

  // Setup a url shortner
  shortUrl = new UrlShortner({
    prefix: '/s',
    fallbackUrl: 'https://go.to.here.if.the.redirect.fails', // In case the url is not found
  });

  // Create some data to send
  var payload = {
    foo: 'bar',
    createdAt: new Date() // Supports EJSON
    bar: {                // and
      foo: 'bar2'         // Nested data
    }
  };

  var tinyPayload = 12; // For internet explorer

  // Create the shortUrl
  shortUrl = createShortUrl(deepLink.browserLink('', payload), {
    androidUrl: deepLink.androidLink('', payload), // This will fallback to the main url
    iosUrl: deepLink.iosLink('', payload), // This will fallback to the main url
    ieUrl: deepLink.browserLink('', tinyPayload)
  });
```

#### Events emitted
The `urlShortner` will emit the following event:
* `this.emit('redirect', event);` *(redirect or by html template)*
* `this.emit('expired', event);` *(By date or usage)*
* `this.emit('error', event);`
