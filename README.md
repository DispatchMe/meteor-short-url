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
    fallbackUrl: 'https://go.to.here.if.the.redirect.fails',
    // debug: true // Make it verbose
  });

  // Create a short url
  shortUrl = createShortUrl('https://if.this.is.a.long.url.then.shorten.me');

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
    expireAt=10000 + new Date(), // Set expiration time/date
    oneTimeLink=false            // Set true and this link will only work once
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
    fallbackUrl: 'https://go.to.here.if.the.redirect.fails',
  });

  // Create some data to send
  var payload = {
    foo: 'bar',
    createdAt: new Date() // Supports EJSON
    bar: {                // and
      foo: 'bar2'         // Nested data
    }
  };

  // Create the shortUrl
  shortUrl = createShortUrl('https://if.this.is.a.long.url.then.shorten.me', {
    androidUrl: deepLink.androidLink('', payload),
      iosUrl: deepLink.iosLink('', payload)
  });
```
