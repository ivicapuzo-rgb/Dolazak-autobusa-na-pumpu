// Dinamička Expo konfiguracija: verzija se čita iz version.json, a android
// versionCode / iOS buildNumber se automatski izračunavaju iz nje. Tako svaki
// build ima veći broj verzije i poređenje sa GitHub release-om uvek radi.
// Baza (plugins, ikone, dozvole...) i dalje dolazi iz app.json.
const fs = require("fs");
const path = require("path");
const versionData = require("./version.json");

module.exports = ({ config }) => {
  const version = versionData.version || config.version || "1.0.0";
  const parts = version.split(".").map((n) => parseInt(n, 10) || 0);
  const maj = parts[0] ?? 1;
  const min = parts[1] ?? 0;
  const pat = parts[2] ?? 0;
  const versionCode = maj * 10000 + min * 100 + pat;

  // google-services.json se dodaje samo ako postoji (korisnik ga doda za push).
  const googleServices = fs.existsSync(
    path.join(__dirname, "google-services.json"),
  )
    ? { googleServicesFile: "./google-services.json" }
    : {};

  return {
    ...config,
    version,
    android: {
      ...(config.android || {}),
      versionCode,
      ...googleServices,
    },
    ios: { ...(config.ios || {}), buildNumber: String(versionCode) },
  };
};
