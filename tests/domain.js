describe('alternate domain', () => {
  it('should generate a url with an alternate domain', () => {
    var shortener = new UrlShortener({
      domain: 'http://short.url'
    });

    expect(shortener.createShortUrl('https://google.com')).toMatch(/^http\:\/\/short.url\/s\/[A-Za-z0-9]+$/);
  });
});
