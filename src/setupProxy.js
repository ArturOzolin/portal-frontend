const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(createProxyMiddleware({
    pathFilter: ['/api', '/ad-photo', '/ws'],
    target: 'http://localhost:8080',
    changeOrigin: true,
    ws: true,
  }));
};