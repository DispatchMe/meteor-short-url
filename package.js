Package.describe({
  name: 'dispatch:short-url',
  version: '0.0.1',
  summary: 'Handle short urls'
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
    'check'
  ], 'server');

  api.addAssets([
    'lib/redirect.template.html',
  ], 'server');

  api.addFiles([
    'lib/server.js'
  ], 'server');

  api.export('UrlShortner', 'server');
});

// Package.onTest(function(api) {
//   api.use(['ecmascript'], 'web');

//   api.use(['dispatch:short-url']);
//   api.use('test-helpers', 'client');
//   api.use('tinytest', 'client');

//   api.addFiles('tests/utils.js', 'client');
// });
