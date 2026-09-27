const RAID_IOPS_ASSUMPTIONS = 'Les IOPS logiques sont limitées par les budgets physiques cumulés des disques actifs. Une lecture logique coûte une lecture physique. Pour une écriture aléatoire, le modèle compte 1 écriture en RAID 0, 2 écritures en RAID 1/10, 2 lectures + 2 écritures en RAID 5/50 et 3 lectures + 3 écritures en RAID 6/60. Les écritures séquentielles RAID 5/6/50/60 supposent des bandes complètes alignées, sans lecture préalable ; leur coût est le nombre de disques du groupe divisé par le nombre de disques de données. Les lectures des miroirs sont supposées réparties entre leurs membres. Les IOPS par disque sont plafonnées par le débit nominal divisé par la taille de bloc ; le profil et le ratio lecture/écriture déterminent la charge logique estimée.'
const RAID_IOPS_LIMITS = 'Ce modèle simplifié n’est ni une mesure ni une garantie constructeur. Il ignore le cache, le contrôleur, les files d’attente, la granularité réelle des E/S et les limites de bus. Ajustez les recommandations à partir des traces de charge de l’application.'
const RAID_REBUILD_ASSUMPTIONS = 'Le temps nominal correspond à la capacité du disque divisée par le débit de rebuild retenu. Le scénario réaliste applique la charge saisie et un facteur de contention : 8 % par membre au-delà de deux en RAID 5/50, 12 % en RAID 6/60, et aucun facteur supplémentaire en RAID 1/10. Pour RAID 50/60, le domaine considéré est un groupe. Le scénario dégradé divise le temps réaliste par 0,65 (environ 1,54 fois plus long, soit +53,8 %). RAID 0 ne permet pas de reconstruire un disque.'
const RAID_REBUILD_LIMITS = 'Ces scénarios ne sont pas des garanties : contrôleur, firmware, priorités, erreurs de lecture et charge réelle peuvent modifier sensiblement les durées.'

const makeRaidInfo = name => ({
  name,
  sections: [
    {
      title: 'Hypothèses',
      items: [
        { title: 'Estimation des IOPS', text: RAID_IOPS_ASSUMPTIONS },
        { title: 'Estimation du rebuild', text: RAID_REBUILD_ASSUMPTIONS }
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
