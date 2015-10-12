var connectLimiter = Npm.require('connect-ratelimit');
var redirectTemplate = Assets.getText('lib/redirect.template.html');

shortUrlPattern = /\/([a-zA-z0-9]+)/;
isHttp = /^https?:\/\//;
isAndroidIntentWithCallback = /^intent:\/\/(.*)S.browser_fallback_url/;

var internetExplorerPattern = /Mozilla\/([0-9.]+) \(compatible; MSIE ([0-9.]+);/i;
var iosPattern = /iPhone|iPod|iPad/i;
var androidPattern = /android/i;

UrlShortener = class UrlShortener {
  constructor({
    prefix='s',         // Default prefix is "/s/XXXXXXXXXXXXXXXXX"
    rateLimit={},       // Default rate limit { totalRequests=10, every=60000 }
    idLength=17,        // Set the id length for generator (default is 17)
    fallbackUrl=null,   // Set overall fallback url
    debug=false,        // Add verbose output
    htmlBody='',        // Display html on the redirect page
    collectionName,     // Allow the user to overwrite the short link collection
    startServer=false,  // Pr. Default we don't start up the http server
    domain=null         // Override the domain (uses the local domain by default)
  } = {}) {

    if (prefix !== ''+prefix) {
      throw new Error('UrlShortener prefix needs to be type String');
    }

    // Make sure the prefix havent got a start/trailing slash
    this.prefix = prefix.replace(/^\//, '').replace(/\/$/, '');

    this.regExp = new RegExp('\/' + prefix.replace(/\//g, '\\\/'));

    this.idLength = idLength;

    this.debug = debug;

    // Remove trailing slash
    this.domain = domain && domain.replace(/\/$/, '') || null;

    this.eventEmitter = new EventEmitter();

    if (!collectionName) {
      collectionName = 'dispatch_short_deep_links_' + this.prefix.replace(/\//g, '_');
    }

    this.shortLinks = new Mongo.Collection(collectionName);

    if (startServer) {

      var { totalRequests=10, every=60000 } = rateLimit;

      this.log(`Starting the http mount point "/${this.prefix}"`);
      this.log(`Setting rateLimit totalRequests: ${totalRequests} every ${every}`);

      if (fallbackUrl) {
        this.log(`Setting fallback url "${fallbackUrl}"`);
      }

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
        // Test to make sure it's valid. Even if it has the prefix it might not be a valid ID, in which case it won't match the pattern. In that case just go to the fallback URL
        let match = req.url.match(shortUrlPattern);

        if(match === null) {
          // Not a match.
          this.log('Not a match');
          next();
          return;
        }
        var [, id] = req.url.match(shortUrlPattern);
        var userAgent = req.headers['user-agent'];

        if (id && id.length === this.idLength) {
          this.log('Got short url id', id);

          // Lookup short url
          var shortUrl = this.shortLinks.findOne({ _id: id });

          // Expire logic
          if (shortUrl && shortUrl.expireAt && shortUrl.expireAt < new Date()) {
            this.log('Link expired', id, ' - ', shortUrl.expireAt, '<', new Date());
            // xxx: We could also keep the data and do a 410 on each try
            this.shortLinks.remove({ _id: id });

            this.log(`The link "${id}" has expired`);
            this.emit('expired', {
              type: 'expireAt',
              id,
              shortUrl,
              userAgent
            });

            shortUrl = null;
          }

          if (shortUrl) {
            this.log('Found short url', shortUrl);

            // If it's a one time link we remove it
            if (shortUrl.oneTimeLink) {
              this.log('Link is now used one time and will be removed', id);
              this.shortLinks.remove({ _id: id });

              this.emit('expired', {
                type: 'usage',
                id,
                shortUrl,
                userAgent
              });
            }

            var isIOS = iosPattern.test(userAgent);
            var isAndroid = !isIOS && androidPattern.test(userAgent);
            var isIE = internetExplorerPattern.test(userAgent);

            var url = shortUrl.url;

            if (isAndroid && shortUrl.androidUrl) {

              url = shortUrl.androidUrl;

            } else if (isIOS && shortUrl.iosUrl) {

              url = shortUrl.iosUrl;

            } else if (isIE && shortUrl.ieUrl) {

              url = shortUrl.ieUrl;

            }

            // Serve the redirect template if not http(s)
            // And redirect http(s) and android intents with fallback url
            if (isHttp.test(url) || isAndroidIntentWithCallback.test(url)) {

              // Normal url
              redirect(url);

              this.emit('redirect', {
                type: 'redirect',
                url,
                shortUrl,
                userAgent
              });

            } else {

              // This will be treated as an intent
              templateRedirect(url, shortUrl.url);

              this.emit('redirect', {
                type: 'template',
                url,
                shortUrl,
                userAgent
              });

            }

          } else {

            if (fallbackUrl) {
              var fallback = fallbackUrl;
              if(_.isFunction(fallback)) {
                fallback = fallback(req);
              }
              // For now we redirect to the user defined fallbackUrl
              redirect(fallback);

            } else {
              // Or do 404?
              this.log(`Url not found for "${id}"`);
              next();
            }

            this.emit('error', {
              type: 'not-found',
              error: new Error(`Short url id: "${id}" not found`),
              userAgent
            });
          }
        } else {
          // Not a match for us
          this.log('Not a match');
          next();
        }
      });

    } // EO Start server

  }

  log() {
    if (this.debug) {
      console.log(`UrlShortener "/${this.prefix}":`, ...arguments);
    }
  }

  createShortUrl(url, {
    androidUrl=null,   // Android specific url
    iosUrl=null,       // iOS specific url
    ieUrl=null,        // Internet Explorer specific url
    expireAt=null,     // Have the url expire
    oneTimeLink=false, // Allow this url to be used once
    payload=null,      // Allow the user to add tracking data etc.
    urlOptions         // Ref. Meteor.absoluteUrl options
  } = {}) {

    // Check arguments
    check(url, String);
    check(androidUrl, Match.OneOf(null, String));
    check(iosUrl, Match.OneOf(null, String));
    check(ieUrl, Match.OneOf(null, String));
    check(expireAt, Match.OneOf(null, Date));
    check(oneTimeLink, Match.OneOf(Boolean));
    // We dont check the payload type - it could be anything

    // Check that the url is not already found
    var doc = this.shortLinks.findOne({
      $and: [
        { url },
        { androidUrl },
        { iosUrl },
        { ieUrl },
        { expireAt },
        { oneTimeLink }
      ]
    });

    if (!doc) {
      doc = { _id: this.shortLinks.insert({
          _id: Random.id(this.idLength),
          url,
          androidUrl,
          iosUrl,
          ieUrl,
          expireAt,
          oneTimeLink,
          payload
        })
      };
    }

    this.log('Created short url:', doc);

    if(this.domain) {

      var prefix = this.prefix;
      // Support for empty prefix
      if (prefix !== '') {
        prefix = '/' + prefix;
      }

      return `${this.domain}${prefix}/${doc._id}`;
    }

    return Meteor.absoluteUrl(`${this.prefix}/${doc._id}`, urlOptions);

  }

  emit() { return this.eventEmitter.emit(...arguments); }
  emitState() { return this.eventEmitter.emitState(...arguments); }
  on() { return this.eventEmitter.on(...arguments); }
  once() { return this.eventEmitter.once(...arguments); }
  off() { return this.eventEmitter.off(...arguments); }
};
