/* jshint esnext: true */
var connectLimiter = Npm.require('connect-ratelimit');
var redirectTemplate = Assets.getText('lib/redirect.template.html');

var shortUrlPattern = /\/([a-zA-z0-9]+)/;
var isHttp = /^https?:\/\//;
var isAndroidIntentWithCallback = /^intent:\/\/(.*)S.browser_fallback_url/;

UrlShortner = class UrlShortner {
  constructor({ prefix='s', rateLimit={}, idLength=17, fallbackUrl=null, debug=false, htmlBody='' } = {}) {
    // Make sure the prefix havent got a trailing slash
    this.prefix = prefix.replace(/\//, '');

    this.regExp = new RegExp('\/' + prefix.replace(/\//g, '\\\/'));

    this.debug = debug;

    var collectionName = 'dispatch_short_deep_links_' + this.prefix.replace(/\//g, '_');
    this.shortLinks = new Mongo.Collection(collectionName);

    var { totalRequests=10, every=60000 } = rateLimit;

    this.log('Setting rateLimit totalRequests:', totalRequests, 'every', every);

    // Create the server restpoint for the short link
    WebApp.connectHandlers.use('/' + this.prefix, connectLimiter({
      categories: {
        normal: {
          totalRequests,
          every
        }
      },
      end: true
    }));

    this.log(`Mounted on "/${this.prefix}"`);

    WebApp.connectHandlers.use('/' + this.prefix, (req, res, next) => {

      // Redirect helper
      var redirect = (url) => {
        this.log(`Redirecting to url "${url}"`);
        // 302 HTTP/1.0 or 307 HTTP/1.1
        // xxx: 302 works on both
        res.writeHead(302, {
          'Location': url
        });
        res.end();
      };

      // Redirect via template helper
      var templateRedirect = (url, fallbackUrl) => {
        this.log(`Redirecting to url "${url}" via template, will fallback to "${fallbackUrl}"`);
        // This will be treated as an intent
        var page = redirectTemplate
          .replace('<INTENT>', url)
          .replace('<FALLBACK>', fallbackUrl)
          .replace('<BODY>', htmlBody);

        // Serve the redirect page
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(page);
      };

      this.log('Entry url:', req.url);
      // Get id as the rest of the url
      var [, id] = req.url.match(shortUrlPattern);

      if (id) {
        this.log('Got short url id', id);

        // Lookup short url
        var shortUrl = this.shortLinks.findOne({ _id: id });

        // Expire logic
        if (shortUrl && shortUrl.expireAt && shortUrl.expireAt < new Date()) {
          // xxx: We could also keep the data and do a 410 on each try
          this.shortLinks.remove({ _id: id });
          this.log(`The link "${id}" has expired`);
          shortUrl = null;
        }

        if (shortUrl) {
          this.log('Found short url', shortUrl);

          // If it's a one time link we remove it
          if (shortUrl.oneTimeLink) {
            this.shortLinks.remove({ _id: id });
          }

          var userAgent = req.headers['user-agent'];
          var isIOS = /iPhone|iPod|iPad/i.test(userAgent);
          var isAndroid = !isIOS && /android/i.test(userAgent);

          var url = shortUrl.url;

          if (isAndroid && shortUrl.androidUrl) {

            url = shortUrl.androidUrl;

          } else if (isIOS && shortUrl.iosUrl) {

            url = shortUrl.iosUrl;

          }

          // Serve the redirect template if not http(s)
          // And android intents with fallback url
          if (isHttp.test(url) || isAndroidIntentWithCallback.test(url)) {

            // Normal url
            redirect(url);

          } else {

            // This will be treated as an intent
            templateRedirect(url, shortUrl.url);

          }

        } else {

          if (fallbackUrl) {

            // For now we redirect to the user defined fallbackUrl
            this.log(`Redirecting to fallback url "${fallbackUrl}"`);
            redirect(fallbackUrl);

          } else {
            // Or do 404?
            this.log(`Url not found for "${id}"`);
            next();
          }
        }
      } else {
        // Not a match for us
        this.log('Not a match');
        next();
      }
    });

  }

  log() {
    if (this.debug) {
      console.log('UrlShortner:', ...arguments);
    }
  }

  createShortUrl(url, { androidUrl=null, iosUrl=null, expireAt=null, oneTimeLink=false } = {}) {

    // Check arguments
    check(url, String);
    check(androidUrl, Match.OneOf(null, String));
    check(iosUrl, Match.OneOf(null, String));
    check(expireAt, Match.OneOf(null, Date));
    check(oneTimeLink, Match.OneOf(Boolean));

    // Check that the url is not already found
    var doc = this.shortLinks.findOne({
      $and: [
        { url },
        { androidUrl },
        { iosUrl },
        { expireAt },
        { oneTimeLink }
      ]
    });

    if (!doc) {
      doc = { _id: this.shortLinks.insert({
          url,
          androidUrl,
          iosUrl,
          expireAt,
          oneTimeLink
        })
      };
    }

    this.log('Created short url:', doc);

    return doc._id;
  }
};


