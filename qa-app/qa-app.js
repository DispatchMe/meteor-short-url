if (Meteor.isClient) {
  // counter starts at 0
  Session.setDefault('counter', 0);

  Template.hello.helpers({
    counter: function () {
      return Session.get('counter');
    }
  });

  Template.hello.events({
    'click button': function () {
      // increment the counter when button is clicked
      Session.set('counter', Session.get('counter') + 1);
    }
  });
}

if (Meteor.isServer) {
  shortUrl = new UrlShortner({
    prefix: '/s',
    debug: true,
    htmlBody: 'Redirecting...'
  });

  deepLink = new DeepLink('dispatchdeeplinktest', {
    fallbackUrl: 'http://www.google.com',
    appId: 'me.dispatch.qa.test.deep.link'
  });
}
