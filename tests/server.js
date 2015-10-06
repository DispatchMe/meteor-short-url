// Start a simple short url server

var shortUrl;

var asIOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 7_0_2 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) CriOS/30.0.1599.12 Mobile/11A501 Safari/8536.25';
var asAndroid = 'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';

var successUrl = 'http://meteor.com';
var fallbackUrl = 'http://google.com';
var androidFallbackUrl = 'http://play.google.com';
var iosIntent = 'intent://platform=ios';
var androidIntent = 'intent://platform=android';

var androidIntentWithFallback = 'intent://platform=android;S.browser_fallback_url=' + androidFallbackUrl + ';end';

Meteor.startup(function() {
  shortUrl = new UrlShortner({
    prefix: '/test',
    startServer: true,
    collectionName: 'dispatch_short_url_test_mode',
    fallbackUrl: 'http://google.com',
    // Unblock the rate limit
    rateLimit: {
      totalRequests: 10,
      every: 1
    }
  });

  shortUrl.on('error', function() {
    // Ignore errors
  });
});


var Test = {
  get: function(url) {
    return HTTP.get(url, {
      followRedirects: false
    });
  },

  getIOS: function(url) {
    return HTTP.get(url, {
      followRedirects: false,
      headers: {
        'user-agent': asIOS
      }
    });
  },

  getAndroid: function(url) {
    return HTTP.get(url, {
      followRedirects: false,
      headers: {
        'user-agent': asAndroid
      }
    });
  },
};

// Create test methods for the client to call

describe('regular expression "shortUrlPattern"', function () {

  it('test', function () {
    // Valid
    expect(shortUrlPattern.test('/12345678901234567')).toBe(true);
    expect(shortUrlPattern.test('/azAZ09')).toBe(true);

    // One could argue if these should match
    expect(shortUrlPattern.test('/12345678901234567?foo=bar')).toBe(true);
    expect(shortUrlPattern.test('/azAZ09=')).toBe(true);
    expect(shortUrlPattern.test('/azAZ09,.-+=')).toBe(true);

    // Invalid
    expect(shortUrlPattern.test('/')).toBe(false);
    expect(shortUrlPattern.test('12345678901234567')).toBe(false);
    expect(shortUrlPattern.test('/?foo=bar')).toBe(false);
  });

  it('match', function() {
    expect('/id'.match(shortUrlPattern).slice()).toEqual(['/id', 'id']);

    expect('/12345678901234567'.match(shortUrlPattern).slice())
    .toEqual(['/12345678901234567', '12345678901234567']);

    expect('/azAZ09'.match(shortUrlPattern).slice())
    .toEqual(['/azAZ09', 'azAZ09']);

    expect('/12345678901234567?foo=bar'.match(shortUrlPattern).slice())
    .toEqual(['/12345678901234567', '12345678901234567']);

    expect('/azAZ09='.match(shortUrlPattern).slice())
    .toEqual(['/azAZ09', 'azAZ09']);

    expect('/azAZ09,.-+='.match(shortUrlPattern).slice())
    .toEqual(['/azAZ09', 'azAZ09']);
  });
});

describe('regular expression "isHttp"', function () {

  it('test', function () {
    // Valid
    expect(isHttp.test('http://')).toBe(true);
    expect(isHttp.test('https://')).toBe(true);

    // Invalid
    expect(isHttp.test('/')).toBe(false);
    expect(isHttp.test('ttp://')).toBe(false);
    expect(isHttp.test('://')).toBe(false);
  });

});

describe('regular expression "isAndroidIntentWithCallback"', function () {

  it('test', function () {
    // Valid
    expect(isAndroidIntentWithCallback.test('intent://S.browser_fallback_url')).toBe(true);
    expect(isAndroidIntentWithCallback.test('intent://foo;S.browser_fallback_url')).toBe(true);
    expect(isAndroidIntentWithCallback.test('intent://S.browser_fallback_url;end')).toBe(true);
    expect(isAndroidIntentWithCallback.test('intent://foo;S.browser_fallback_url;end')).toBe(true);

    // Invalid
    expect(isAndroidIntentWithCallback.test('intent://')).toBe(false);
    expect(isAndroidIntentWithCallback.test('S.browser_fallback_url')).toBe(false);
    expect(isAndroidIntentWithCallback.test('://')).toBe(false);
  });

});

describe('short url', function() {

  it('is initialized', function() {

    expect(shortUrl).toBeDefined();

    expect(shortUrl.shortLinks).toBeDefined();

  });

});

describe('short url with only url set', function() {
  beforeEach(function() {
    if (shortUrl) {
      // Reset short links
      shortUrl.shortLinks.remove({});
    }
  });

  it('redirects to "' + successUrl + '" in browser', function() {
    var url = shortUrl.createShortUrl(successUrl);

    var result = Test.get(url);

    expect(result.statusCode).toBe(302);
    expect(result.headers.location).toBe(successUrl);
  });

  it('redirects to "' + successUrl + '" on ios', function() {
    var url = shortUrl.createShortUrl(successUrl);

    var result = Test.getIOS(url);

    expect(result.statusCode).toBe(302);
    expect(result.headers.location).toBe(successUrl);
  });

  it('redirects to "' + successUrl + '" on android', function() {
    var url = shortUrl.createShortUrl(successUrl);

    var result = Test.getAndroid(url);

    expect(result.statusCode).toBe(302);
    expect(result.headers.location).toBe(successUrl);
  });

});

  // Setting iosUrl only
describe('short url with iosUrl set', function() {
  beforeEach(function() {
    if (shortUrl) {
      // Reset short links
      shortUrl.shortLinks.remove({});
    }
  });

  it('redirects to "' + successUrl + '" on browser', function() {
    var url = shortUrl.createShortUrl(successUrl, {
      iosUrl: iosIntent
    });

    var result = Test.get(url);

    expect(result.statusCode).toBe(302);
    expect(result.headers.location).toBe(successUrl);
  });

  it('redirects via template on ios', function() {
    var url = shortUrl.createShortUrl(successUrl, {
      iosUrl: iosIntent
    });

    var result = Test.getIOS(url);

    // Got the template served
    expect(result.statusCode).toBe(200);
  });

  it('redirects to "' + successUrl + '" on android', function() {
    var url = shortUrl.createShortUrl(successUrl, {
      iosUrl: iosIntent
    });

    var result = Test.getAndroid(url);

    expect(result.statusCode).toBe(302);
    expect(result.headers.location).toBe(successUrl);
  });

});

// Setting androidUrl only

describe('short url with androidUrl set', function() {
  beforeEach(function() {
    if (shortUrl) {
      // Reset short links
      shortUrl.shortLinks.remove({});
    }
  });

  it('redirects to "' + successUrl + '" on browser', function() {
    var url = shortUrl.createShortUrl(successUrl, {
      androidUrl: androidIntent
    });

    var result = Test.get(url);

    expect(result.statusCode).toBe(302);
    expect(result.headers.location).toBe(successUrl);
  });

  it('redirects to "' + successUrl + '" on ios', function() {
    var url = shortUrl.createShortUrl(successUrl, {
      androidUrl: androidIntent
    });

    var result = Test.getIOS(url);

    expect(result.statusCode).toBe(302);
    expect(result.headers.location).toBe(successUrl);
  });

  it('redirects via template on android', function() {
    var url = shortUrl.createShortUrl(successUrl, {
      androidUrl: androidIntent
    });

    var result = Test.getAndroid(url);

    // Got the template served
    expect(result.statusCode).toBe(200);
  });

});

// Setting androidUrl and iosUrl
describe('short url with androidUrl and iosUrl set', function() {
  beforeEach(function() {
    if (shortUrl) {
      // Reset short links
      shortUrl.shortLinks.remove({});
    }
  });

  it('redirects to "' + successUrl + '" on browser', function() {
    var url = shortUrl.createShortUrl(successUrl, {
      androidUrl: androidIntent,
      iosUrl: iosIntent
    });

    var result = Test.get(url);

    expect(result.statusCode).toBe(302);
    expect(result.headers.location).toBe(successUrl);
  });

  it('redirects via template on ios', function() {
    var url = shortUrl.createShortUrl(successUrl, {
      androidUrl: androidIntent,
      iosUrl: iosIntent
    });

    var result = Test.getIOS(url);

    // Got the template served
    expect(result.statusCode).toBe(200);
  });

  it('redirects via template on android', function() {
    var url = shortUrl.createShortUrl(successUrl, {
      androidUrl: androidIntent,
      iosUrl: iosIntent
    });

    var result = Test.getAndroid(url);

    // Got the template served
    expect(result.statusCode).toBe(200);
  });

});

describe('short url using android intent with fallback url', function() {
  beforeEach(function() {
    if (shortUrl) {
      // Reset short links
      shortUrl.shortLinks.remove({});
    }
  });

  it('does a pure redirect on android', function() {
    var url = shortUrl.createShortUrl(successUrl, {
      androidUrl: androidIntentWithFallback,
      iosUrl: iosIntent
    });

    var result = Test.getAndroid(url);

    expect(result.statusCode).toBe(302);
    expect(result.headers.location).toBe(androidIntentWithFallback);
  });
});

describe('short url with oneTimeLink set', function() {
  beforeEach(function() {
    if (shortUrl) {
      // Reset short links
      shortUrl.shortLinks.remove({});
    }
  });

  it('only works once', function() {
    var url = shortUrl.createShortUrl(successUrl, {
      oneTimeLink: true
    });

    var result = Test.get(url);

    expect(result.statusCode).toBe(302);
    expect(result.headers.location).toBe(successUrl);

    var result2 = Test.get(url);

    expect(result2.statusCode).toBe(302);
    expect(result2.headers.location).toBe(fallbackUrl);
  });

});

describe('short url with expireAt set', function() {
  beforeEach(function() {
    if (shortUrl) {
      // Reset short links
      shortUrl.shortLinks.remove({});
    }
  });

  it('does expire', function(done) {
    var expireAt = new Date(new Date().getTime() + 300);

    var url = shortUrl.createShortUrl(successUrl, {
      expireAt: expireAt
    });

    var result = Test.get(url);
    expect(result.statusCode).toBe(302);
    expect(result.headers.location).toBe(successUrl);


    Meteor.setTimeout(function() {
      var result2 = Test.get(url);
      expect(result2.statusCode).toBe(302);

      // Expired
      expect(result2.headers.location).toBe(fallbackUrl);

      // Stop test
      done();
    }, 500);

  });

});

// Basic Jasmine helpers
//
// expect:
// toBe()
// toEqual()
// toMatch()
// toBeDefined()
// toBeNull()
// toContain()
// toBeLessThan()
// toBeGreaterThan()
// toBeCloseTo()
// toThrow()
// toThrowError()
//
// beforeEach
// beforeAll
// afterEach
// afterAll
//
// not.
