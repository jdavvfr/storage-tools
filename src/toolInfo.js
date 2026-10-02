const RAID_IOPS_ASSUMPTIONS = 'Les IOPS logiques sont limitées par les budgets physiques cumulés des disques actifs. Une lecture logique coûte une lecture physique. Pour une écriture aléatoire, le modèle compte 1 écriture en RAID 0, 2 écritures en RAID 1/10, 2 lectures + 2 écritures en RAID 5/50 et 3 lectures + 3 écritures en RAID 6/60. Les écritures séquentielles RAID 5/6/50/60 supposent des bandes complètes alignées, sans lecture préalable ; leur coût est le nombre de disques du groupe divisé par le nombre de disques de données. Les lectures des miroirs sont supposées réparties entre leurs membres. Les IOPS par disque sont plafonnées par le débit nominal divisé par la taille de bloc ; le profil et le ratio lecture/écriture déterminent la charge logique estimée.'
const RAID_IOPS_LIMITS = 'Ce modèle simplifié n’est ni une mesure ni une garantie constructeur. Il ignore le cache, le contrôleur, les files d’attente, la granularité réelle des E/S et les limites de bus. Ajustez les recommandations à partir des traces de charge de l’application.'
const RAID_REBUILD_ASSUMPTIONS = 'Le temps nominal correspond à la capacité du disque divisée par le débit nominal retenu pour son média et ses performances. Le temps réaliste est le temps nominal divisé par le coefficient du profil de charge et le coefficient de largeur RAID. Sauvegarde correspond à une faible activité (30 %, coefficient 0,85) ; Virtualisation, Fichiers NAS et Personnalisé à une activité modérée (60 %, coefficient 0,70) ; Vidéosurveillance à une activité continue (100 %, coefficient 0,50). Le coefficient de largeur vaut 1,00 jusqu’à 8 disques, puis 0,95 jusqu’à 12, 0,90 jusqu’à 16, 0,85 jusqu’à 24, 0,80 jusqu’à 40 et 0,75 au-delà. En RAID 50/60, la largeur est celle d’un sous-groupe, pas du pool complet. L’indice d’exposition vaut le temps réaliste multiplié par le nombre de disques du groupe ; il sert de critère principal de comparaison du risque. RAID 50/60 réduit surtout le domaine de panne et l’exposition au risque, sans garantir un temps de reconstruction plus court. Le scénario dégradé divise le temps réaliste par 0,65. RAID 0 ne permet pas de reconstruire un disque.'
const RAID_REBUILD_LIMITS = 'Ces scénarios ne sont pas des garanties : contrôleur, firmware, priorités, erreurs de lecture et charge réelle peuvent modifier sensiblement les durées. Les profils représentent des estimations et non une détection télémétrique de la charge réelle.'

const makeRaidInfo = name => ({
  name,
  sections: [
    {
      title: 'Hypothèses',
      items: [
        { title: 'Estimation des IOPS', text: RAID_IOPS_ASSUMPTIONS },
        { title: 'Estimation du temps de reconstruction', text: RAID_REBUILD_ASSUMPTIONS }
      ]
    },
    {
      title: 'Limites',
      items: [
        { title: 'Modèle IOPS', text: RAID_IOPS_LIMITS },
        { title: 'Reconstruction', text: RAID_REBUILD_LIMITS },
        { title: 'Performances des disques', text: 'Les valeurs de performances intégrées au calculateur sont indicatives et ne correspondent pas nécessairement à une référence constructeur précise.' }
      ]
    }
  ]
})

export const TOOL_INFO = {
  recommendation: {
    name: 'RAID Recommendation',
    sections: [
      {
        title: 'Hypothèses',
        items: [
          { title: 'Données de performance', text: 'Les IOPS, débits et reconstructions sont des estimations calculées à partir des références indicatives de médias existantes et du profil IO associé au workload.' },
          { title: 'Estimation du temps de reconstruction', text: 'Le temps nominal par disque vaut capacité / débit nominal de reconstruction. Le temps réaliste vaut temps nominal / (coefficient de charge × coefficient de largeur RAID). Pour RAID 50/60, la largeur est celle du groupe reconstruit. L’indice d’exposition vaut temps réaliste × nombre de disques du groupe.' },
          { title: 'Score de classement', text: 'Les candidats qui atteignent la capacité et les objectifs de performance sont comparés avec des métriques normalisées de 0 à 100. Le score capacité combine une réserve utile plafonnée à deux fois la cible (55 %) et l’efficacité capacitive normalisée (45 %). Les pondérations de base sont capacité 40 %, exposition/résilience 35 %, reconstruction 15 % et performance 10 %, puis varient selon le workload et le profil d’optimisation. Le score exposition combine le score normalisé d’indice d’exposition inversé et celui de tolérance aux pannes : respectivement 80/20 % pour sauvegarde et virtualisation, 75/25 % pour les bases de données et 35/65 % pour la vidéosurveillance.' }
        ]
      },
      {
        title: 'Limites',
        items: [
          { title: 'Références de plateforme', text: 'Les baies et capacités de disques sont des références modifiables destinées au pré-dimensionnement. Vérifiez les références, compatibilités média et limites de configuration auprès du constructeur.' },
          { title: 'Résultats indicatifs', text: 'Les calculs ne modélisent pas le contrôleur, le cache, les bus, les contraintes constructeur, les réserves de capacité ni les mesures réelles de l’application. Validez toute architecture en fonction du système cible.' }
        ]
      }
    ]
  },
  raid: makeRaidInfo('RAID Calculator Basic'),
  'raid-advanced': makeRaidInfo('RAID Calculator Advanced'),
  converter: {
    name: 'Convertisseur To / TiB',
    sections: [
      {
        title: 'Hypothèses',
        items: [
          { title: 'Unités de capacité', text: 'Le To est décimal (1 To = 1 000 000 000 000 octets) et le TiB est binaire (1 TiB = 1 099 511 627 776 octets).' }
        ]
      },
      {
        title: 'Limites',
        items: [
          { title: 'Précision', text: 'Les calculs utilisent les nombres JavaScript et le résultat affiché est arrondi à 12 décimales. Les valeurs négatives, non numériques ou trop grandes pour être représentées sont refusées.' }
        ]
      }
    ]
  },
  copy: {
    name: 'Durée de copie',
    sections: [
      {
        title: 'Hypothèses',
        items: [
          { title: 'Calcul théorique', text: 'La durée est calculée en divisant le volume par le débit après conversion en octets et octets par seconde. Les unités décimales (Go, To) et binaires (GiB, TiB) sont distinguées ; 8 bits équivalent à 1 octet.' }
        ]
      },
      {
        title: 'Limites',
        items: [
          { title: 'Débit constant', text: 'Cette estimation suppose un débit constant et ne tient pas compte des ralentissements, du protocole, des temps d’accès ni des autres activités du système.' },
          { title: 'Format d’affichage', text: 'La durée est arrondie à la seconde supérieure et l’affichage est limité aux deux unités de temps les plus grandes.' }
        ]
      }
    ]
  },
  growth: {
    name: 'Croissance volumétrique',
    sections: [
      {
        title: 'Hypothèses',
        items: [
          { title: 'Croissance composée', text: 'Le calcul applique chaque année le même taux composé : volume source × (1 + taux annuel / 100) puissance nombre d’années. Le résultat conserve l’unité choisie pour le volume source.' }
        ]
      },
      {
        title: 'Limites',
        items: [
          { title: 'Projection théorique', text: 'Le taux est supposé constant d’une année à l’autre. La projection ne modélise pas les variations réelles de consommation, les paliers de capacité ni les besoins de réserve.' },
          { title: 'Valeurs acceptées', text: 'Le nombre d’années doit être un entier supérieur ou égal à 1 et le taux ne peut pas être inférieur à -100 %. Les résultats trop grands pour être représentés ne sont pas calculés.' }
        ]
      }
    ]
  },
  'tape-lto': {
    name: 'Outils Tape LTO',
    sections: [
      {
        title: 'Hypothèses',
        items: [
          { title: 'Capacité et débit natifs', text: 'Les capacités et débits de référence sont ceux intégrés pour les générations LTO-7, LTO-8 et LTO-9. Le nombre de cartouches est arrondi à l’entier supérieur.' },
          { title: 'Compression et parallélisation', text: 'L’option de compression applique un ratio indicatif de 2,5:1. Pour un job VM, le débit est multiplié par le nombre de lecteurs avec une répartition équilibrée et une accélération idéale linéaire. Un job NAS utilise un seul lecteur.' },
          { title: 'Rotation des bandes', text: 'Le total de cartouches est le nombre requis pour une sauvegarde complète multiplié par le nombre de jeux/cycles identiques à conserver ; aucun schéma GFS n’est supposé.' }
        ]
      },
      {
        title: 'Limites',
        items: [
          { title: 'Résultat indicatif', text: 'La compression réelle dépend des données et peut être inférieure à l’hypothèse. Le débit est supposé constant ; les temps de montage, changements de cartouche, ralentissements, protocole et autres activités du système ne sont pas inclus.' },
          { title: 'Parallélisation VM', text: 'La répartition équilibrée et l’accélération linéaire idéale peuvent surestimer le débit réel, qui dépend des lecteurs, de la source et de l’infrastructure.' }
        ]
      }
    ]
  }
}
