function normalizeCountry(country) {
  return country.trim().toLowerCase().replace(/\s+/g, "_");
}
module.exports = { normalizeCountry };
