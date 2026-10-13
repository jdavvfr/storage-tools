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
          { title: 'Estimation du temps de reconstruction', text: 'Le temps nominal par disque vaut capacité / débit nominal de reconstruction. Le temps réaliste vaut temps nominal / (coefficient de charge × coefficient de largeur RAID). Pour RAID 50/60, la largeur et le domaine de panne désignent un groupe sous-jacent, pas le nombre total de disques. Le RiskIndex absolu vaut heures réalistes × largeur du domaine × facteur de parité × facteur taille disque × facteur largeur × facteur workload × facteur utilisation. Les facteurs sont sans unité ; l’indice est exprimé en unités de risque ajustées et ne représente pas une probabilité de panne. Les facteurs de parité valent 2,40 / 2,20 / 0,75 / 0,65 / 0,55 pour RAID5/50/6/60/10. La taille RAID5/50 interpole les facteurs 1,00 à 4 To, 1,15 à 6–8 To, 1,35 à 10 To, 1,60 à 12 To, 2,00 à 14–16 To, 2,40 à 18 To, 2,90 à 20 To, 3,50 à 22 To et 4,20 dès 24 To. RAID6/60/10 croît de 1,5 % par To après 12 To (plafond +30 %). Le facteur largeur RAID5/50 croît de 8 % par disque après 8, puis 12 % par disque après 12 ; RAID6/60 croît de 6 % après 12, puis 8 % après 14 ; les facteurs sont plafonnés à 2,5 et 2,0, RAID10 reste à 1.' },
          { title: 'Score de classement', text: 'Les configurations n’atteignant pas la capacité demandée avec réserve sont éliminées avant classement : réserve 20 % pour sauvegarde/archivage et base de données, 15 % pour vidéosurveillance, virtualisation et généraliste. Six sous-scores distincts de 0 à 100 sont pondérés : adéquation capacité, efficacité capacitive, performances, temps de reconstruction, risque absolu et résilience intrinsèque. Sauvegarde/archivage utilise exactement 18/7/8/12/25/30 %. Les autres poids de base sont virtualisation 16/8/28/10/18/20 %, base de données 10/5/40/8/17/20 %, vidéosurveillance 23/12/15/12/18/20 %. Les profils d’optimisation ajustent ces poids sauf sauvegarde/archivage. Le sous-score risque est 100/(1 + RiskIndex/3 000) : le point de référence donne 50 et ne dépend pas des candidats présents. Le sous-score rebuild est 100/(1 + heures/48). Le score capacité commence à 90 à la capacité requise puis plafonne à 100 après 20 % d’excédent ; l’efficacité capacitive est le ratio utile/brut borné à 100. La résilience part de RAID5 30, RAID50 38, RAID6 78, RAID60 88 et RAID10 82, puis est réduite progressivement selon taille, largeur et workload, et bornée entre 0 et 100.' }
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
