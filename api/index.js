"use strict";
// Vercel serverless entry point.
// Lazily imports the pre-built Express app bundle and forwards all requests to it.
let _app;

async function getApp() {
  if (!_app) {
    const mod = await import("../artifacts/api-server/dist/handler.mjs");
    _app = mod.default;
  }
  return _app;
}

module.exports = async (req, res) => {
  const app = await getApp();
  app(req, res);
};
