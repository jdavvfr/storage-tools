# Storage Tools

Une boîte à outils en ligne pour estimer une capacité, comparer des configurations RAID et préparer des transferts ou des sauvegardes sur bande. Choisissez un outil dans la navigation, renseignez les paramètres et consultez les résultats calculés à la volée.

**Utiliser les outils en ligne :** [jdavvfr.github.io/storage-tools](https://jdavvfr.github.io/storage-tools/)

## Les outils

### Calculateur RAID Basic

Estimez la capacité utile, le rendement, les débits agrégés, les IOPS lecture/écriture et la tolérance aux pannes d’un groupe RAID. Choisissez un type de disque, un niveau RAID, le nombre de disques actifs, leur capacité, les hot spares et un profil d’usage. Un schéma montre l’organisation logique des disques.

Le catalogue propose 12 profils indicatifs de disques HDD, SSD SATA/SAS et NVMe. Leurs performances sont des valeurs de référence propres au calculateur, pas des caractéristiques garanties par un constructeur. La version Basic utilise ces références telles quelles.

### Calculateur RAID Advanced

Retrouvez le dimensionnement Basic et comparez les niveaux RAID valides pour votre configuration. Vous pouvez aussi modifier les IOPS et débits de référence du disque, régler précisément la charge IO, puis consulter trois scénarios de reconstruction. Le tableau permet de trier les résultats et de sélectionner un niveau pour afficher son schéma et son analyse de rebuild.

Le débit nominal de rebuild est recalculé à partir des débits lecture/écriture personnalisés : le débit de référence est multiplié par le plus faible des deux ratios entre valeur personnalisée et valeur de référence. Les hot spares sont pris en compte dans la capacité brute installée et le rendement installé, mais pas dans la capacité utile ni dans les budgets de performance des disques actifs.

### Convertisseur To / TiB

Convertissez une valeur dans les deux sens en modifiant l’un des champs. Les unités sont distinctes :

- **To** (téraoctet décimal) : 1 To = 1 000 000 000 000 octets.
- **TiB** (tébioctet binaire) : 1 TiB = 1 099 511 627 776 octets.

Les valeurs positives ou nulles sont acceptées. Le point et la virgule peuvent servir de séparateur décimal ; le résultat est affiché avec jusqu’à 12 décimales.

### Estimation de durée de copie

Indiquez un volume en Go, To ou Po, ou en GiB, TiB ou PiB, puis un débit en Mo/s, Go/s, Mbit/s ou Gbit/s. La durée est calculée ainsi :

`durée (secondes) = volume (octets) / débit (octets par seconde)`

Les préfixes décimaux sont en base 10 et les préfixes binaires en base 2. Les débits en bits sont divisés par 8 pour obtenir des octets par seconde. L’estimation suppose un débit constant ; elle ne modélise pas les ralentissements, le protocole, les temps d’accès ni les autres activités du système. La durée affichée est arrondie à la seconde supérieure et présentée en unités de temps lisibles.

### Projection de croissance volumétrique

Projetez un volume en Go, To, Po, GiB, TiB ou PiB sur un nombre entier d’années. Le calcul applique un taux annuel composé constant :

`volume cible = volume source × (1 + taux annuel / 100)^nombre d’années`

Le volume source doit être positif ou nul, le taux annuel supérieur ou égal à -100 %, et la durée d’au moins un an. Le résultat conserve l’unité choisie pour le volume source. Une baisse de -100 % donne un volume cible nul.

### Dimensionnement Tape LTO

Pour un volume en Go, To, GiB ou TiB, choisissez la génération LTO, le type de job, le débit et le nombre de jeux/cycles identiques à conserver. L’outil estime les cartouches par sauvegarde complète, la durée d’écriture et le total de cartouches à acquérir.

| Génération | Capacité native par cartouche | Débit natif de référence |
|---|---:|---:|
| LTO-7 | 6 To | 300 Mo/s |
| LTO-8 | 12 To | 360 Mo/s |
| LTO-9 | 18 To | 400 Mo/s |

Le nombre de cartouches est arrondi à l’entier supérieur. L’option de compression estime une capacité multipliée par **2,5** ; cette hypothèse ne change pas la durée d’écriture et ne garantit pas la compression réellement obtenue. La durée utilise le volume complet et un débit constant, natif ou personnalisé. Pour l’externalisation de VM, le débit total est supposé augmenter linéairement avec le nombre de lecteurs, avec répartition équilibrée et accélération idéale. Un job NAS utilise toujours un lecteur. Les changements de cartouche, montages et autres délais ne sont pas inclus. Le total à acquérir correspond aux cartouches d’une sauvegarde complète multipliées par le nombre de jeux/cycles identiques : il ne s’agit pas d’un schéma de rétention GFS.

## Repères de calcul RAID

Les capacités saisies par disque sont exprimées en To décimaux. Les capacités utiles sont calculées à partir du nombre de disques actifs et affichées en TiB, avec leur valeur décimale en TB. La capacité brute installée inclut les hot spares. Le rendement installé est le rapport entre la capacité utile et cette capacité brute installée.

Les débits agrégés sont des sommes théoriques : le débit de lecture correspond au nombre de disques actifs multiplié par le débit de lecture par disque ; le débit d’écriture correspond au nombre de disques utiles multiplié par le débit d’écriture par disque. Les hot spares ne contribuent pas à ces débits.

| Niveau | Capacité utile calculée | Tolérance aux pannes indiquée |
|---|---:|---|
| RAID 0 | `n × capacité disque` | Aucune |
| RAID 1 | `n / 2 × capacité disque` | 1 panne par miroir |
| RAID 5 | `(n − 1) × capacité disque` | 1 panne |
| RAID 6 | `(n − 2) × capacité disque` | 2 pannes |
| RAID 10 | `n / 2 × capacité disque` | 1 panne par paire miroir |
| RAID 50 | `(n − nombre de groupes) × capacité disque` | 1 panne par groupe |
| RAID 60 | `(n − 2 × nombre de groupes) × capacité disque` | 2 pannes par groupe |

Ici, `n` désigne le nombre de disques actifs. RAID 1 et RAID 10 exigent un nombre pair de disques. RAID 50 et RAID 60 exigent au moins deux groupes égaux ; chaque groupe doit contenir au moins 3 disques en RAID 50 ou 4 en RAID 60.

## Profils et hypothèses IOPS

Les profils ci-dessous sont des points de départ pour estimer une charge, pas des mesures d’application. Virtualisation est le profil sélectionné par défaut dans les deux calculateurs. Basic applique le profil choisi ; Advanced permet également d’ajuster le ratio lecture/écriture, le type d’accès et la taille de bloc.

| Profil | Lectures | Accès | Taille de bloc |
|---|---:|---|---:|
| Fichiers NAS | 70 % | Aléatoire | 64 KiB |
| Personnalisé | 70 % | Aléatoire | 4 KiB |
| Sauvegarde | 0 % | Séquentiel | 256 KiB |
| Vidéosurveillance | 10 % | Séquentiel | 256 KiB |
| Virtualisation (défaut) | 70 % | Aléatoire | 8 KiB |

Le profil vidéosurveillance représente un enregistrement continu et une part de lecture pour la consultation ; adaptez-le à l’activité réelle du NVR. Dans Advanced, les tailles de bloc proposées vont de 4 à 256 KiB.

Le calcul estime les IOPS logiques maximales compatibles avec les budgets physiques cumulés des disques actifs. Les IOPS de référence de chaque disque sont plafonnées par son débit nominal divisé par la taille de bloc. Une lecture logique coûte une lecture physique. Pour les écritures aléatoires, le modèle applique les coûts suivants :

| Niveaux RAID | Coût physique par écriture logique |
|---|---|
| RAID 0 | 1 écriture |
| RAID 1 et RAID 10 | 2 écritures |
| RAID 5 et RAID 50 | 2 lectures + 2 écritures |
| RAID 6 et RAID 60 | 3 lectures + 3 écritures |

Pour les écritures séquentielles en RAID 5/6/50/60, le modèle suppose que le contrôleur peut regrouper les écritures en bandes complètes alignées, sans lecture préalable. Le coût retenu est le nombre de disques du groupe divisé par son nombre de disques de données : `(taille du groupe) / (taille du groupe − disques de parité)`. Les lectures des miroirs sont supposées réparties entre leurs membres. Le ratio lecture/écriture du profil répartit ensuite le résultat entre IOPS de lecture et d’écriture.

Ce modèle théorique ne tient pas compte du cache, du contrôleur, des files d’attente, des limites de bus ni du comportement propre à l’application. Il ne représente ni une mesure ni une garantie constructeur ; utilisez des traces de charge réelles pour dimensionner un système de production.

## Hypothèses de reconstruction (Advanced)

Les durées sont des estimations par disque, fondées sur la capacité d’un disque et son débit nominal de rebuild retenu :

1. **Optimiste** : `capacité du disque / débit nominal de rebuild`, sans charge applicative.
2. **Réaliste** : le temps nominal est divisé par `max(0,15, 1 − charge / 100)`, puis multiplié par un facteur de contention du domaine de reconstruction. La charge pendant le rebuild est réglable de 0 à 85 %.
3. **Dégradé** : le temps réaliste est divisé par `0,65`, soit environ 1,54 fois le temps réaliste (environ 53,8 % de durée supplémentaire).

Le facteur de contention vaut `1 + max(0, taille du domaine − 2) × taux de contention`. Il n’ajoute aucune contention pour RAID 1/10 ; le taux est de 8 % par membre supplémentaire en RAID 5/50 et de 12 % en RAID 6/60. Pour RAID 50/60, le domaine concerné est un groupe ; pour RAID 5/6, c’est l’ensemble des disques actifs. RAID 0 ne dispose d’aucune redondance et ne peut pas reconstruire un disque.

Ces scénarios ne sont pas des garanties de durée. Le contrôleur, son firmware et ses priorités, la charge réelle et les erreurs de lecture peuvent modifier sensiblement le temps observé. Un hot spare peut permettre un démarrage automatique de la reconstruction si le contrôleur est configuré en conséquence.

## Lancer le projet en local

```bash
npm install
npm run dev
```

Pour générer le site de production, lancez `npm run build`.
