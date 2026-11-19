import http from "node:http";
import https from "node:https";

const request = https.request;
https.request = function (options, ...args) {
  if (options.host !== "api.stripe.com" || options.headers?.Authorization !== "Bearer sk_test_marketplace_fixture") {
    return request.call(this, options, ...args);
  }
  const { path, method, headers } = options;
  return http.request({ host: "127.0.0.1", port: Number(process.env.STRIPE_FIXTURE_PORT), path, method, headers }, ...args);
};
