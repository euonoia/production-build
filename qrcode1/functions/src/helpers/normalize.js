function normalizeCountry(country) {
  return country
    .toLowerCase()
    .replace(/\s+/g, "_")
    .trim();
}

module.exports = { normalizeCountry };
