Package.describe({
  name: 'dispatch:short-url',
  version: '1.0.3',
  summary: 'Handle short urls, android and ios support'
});

Npm.depends({
  'connect-ratelimit': '0.0.7'
});

Package.onUse(function(api) {
  api.versionsFrom('METEOR@1.2');
  api.use([
    'ecmascript',
    'underscore',
    'random',
    'check',
    'mongo',
    'webapp',
    'raix:eventemitter@0.1.3'
  ], 'server');

  api.addAssets([
    'lib/redirect.template.html',
  ], 'server');

  api.addFiles([
    'lib/server.js'
  ], 'server');

  api.export('UrlShortener', 'server');

  api.export('shortUrlPattern', {
    testOnly: true
  });
  api.export('isHttp', {
    testOnly: true
  });
  api.export('isAndroidIntentWithCallback', {
    testOnly: true
  });
});

Package.onTest(function(api) {
  // xxx: limitation in velocity - jasmine have to be included on both
  // client and server - in this case we dont have any client-side tests
  api.use('sanjo:jasmine@0.20.2', 'client');

  api.use([
    'sanjo:jasmine@0.20.2',
    'ecmascript',
    'dispatch:short-url',
    'http',
    'webapp'
  ], 'server');

  api.addFiles([
    'tests/server.js',
    'tests/domain.js'
  ], 'server');
});
