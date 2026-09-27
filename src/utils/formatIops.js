const number = (value, digits = 0, language = 'fr') => new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'fr-FR', { maximumFractionDigits: digits }).format(value || 0)

export const formatIops = (value, language = 'fr') => value >= 1e6
  ? `${number(value / 1e6, 2, language)} MIOPS`
  : value >= 1e3
    ? `${number(value / 1e3, 1, language)} KIOPS`
    : number(value, 0, language)
