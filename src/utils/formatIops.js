const number = (value, digits = 0) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value || 0)

export const formatIops = value => value >= 1e6
  ? `${number(value / 1e6, 2)} MIOPS`
  : value >= 1e3
    ? `${number(value / 1e3, 1)} KIOPS`
    : number(value)
