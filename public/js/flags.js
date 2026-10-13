/* Banderas SVG autoalojadas (Windows no pinta los emoji de bandera) */
(function () {
  var W = 'width="20" height="14" viewBox="0 0 30 20" aria-hidden="true" focusable="false" class="flag-svg"';
  var F = {
    es: '<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>',
    en: '<rect width="30" height="20" fill="#012169"/><path d="M0 0l30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0l30 20M30 0L0 20" stroke="#C8102E" stroke-width="1.6"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#C8102E" stroke-width="3.4"/>',
    ca: '<rect width="30" height="20" fill="#FCDD09"/><g fill="#DA121A"><rect y="2.22" width="30" height="2.22"/><rect y="6.67" width="30" height="2.22"/><rect y="11.11" width="30" height="2.22"/><rect y="15.56" width="30" height="2.22"/></g>',
    fr: '<rect width="30" height="20" fill="#fff"/><rect width="10" height="20" fill="#002395"/><rect x="20" width="10" height="20" fill="#ED2939"/>',
    de: '<rect width="30" height="20" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#DD0000"/><rect y="13.33" width="30" height="6.67" fill="#FFCE00"/>',
    it: '<rect width="30" height="20" fill="#fff"/><rect width="10" height="20" fill="#009246"/><rect x="20" width="10" height="20" fill="#CE2B37"/>',
    pt: '<rect width="30" height="20" fill="#FF0000"/><rect width="12" height="20" fill="#006600"/><circle cx="12" cy="10" r="3.6" fill="#FFCC00"/><circle cx="12" cy="10" r="2.2" fill="#FF0000"/>',
    nl: '<rect width="30" height="20" fill="#AE1C28"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#21468B"/>',
    pl: '<rect width="30" height="20" fill="#fff"/><rect y="10" width="30" height="10" fill="#DC143C"/>',
    sv: '<rect width="30" height="20" fill="#006AA7"/><path d="M11 0v20M0 10h30" stroke="#FECC00" stroke-width="4"/>',
    ru: '<rect width="30" height="20" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#0039A6"/><rect y="13.33" width="30" height="6.67" fill="#D52B1E"/>',
    ja: '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#BC002D"/>',
    ko: '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5" fill="#CD2E3A"/><path d="M10 10a5 5 0 0 0 10 0a2.5 2.5 0 0 0-5 0a2.5 2.5 0 0 1-5 0z" fill="#0047A0"/>',
    zh: '<rect width="30" height="20" fill="#DE2910"/><path d="M6 3l.9 2.7H9.7L7.4 7.4l.9 2.7L6 8.4 3.7 10.1l.9-2.7L2.3 5.7h2.8z" fill="#FFDE00"/>'
  };
  window.atmFlag = function (code) {
    code = String(code || '').toLowerCase().slice(0, 2);
    if (code === 'gb' || code === 'uk') code = 'en';
    if (code === 'cat') code = 'ca';
    if (code === 'se') code = 'sv';
    return F[code] ? '<svg ' + W + '>' + F[code] + '</svg>' : '';
  };
})();
