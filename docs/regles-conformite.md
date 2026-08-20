# Référentiel des 10 Règles de Conformité vSphere

Ce document détaille l'intégralité des 10 règles d'audit appliquées sur l'infrastructure VMware vSphere par le portail.

| ID Règle | Catégorie | Description | Critère de Validation | Action de Remédiation |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Nommage | Normalisation des noms de VM | Nom débutant par le préfixe `vm-` | Renommage automatique |
| **SEC-02** | Stockage | Présence de Snapshots obsolètes | Aucun snapshot actif sur la VM | Purge automatique des snapshots |
| **SEC-03** | Système | État des VMware Tools | Statut égal à `guestToolsRunning` | Ordre de redémarrage envoyé aux Tools |
| **SEC-04** | Gouvernance| Attribution de Tags vSphere | Présence du Tag obligatoire `Lab` | Attribution via l'API REST vCenter |
| **SEC-05** | Réseau | Déclaration et connectivité IP | Adresse IPv4 valide attribuée | Vérification du Portgroup & vNIC |
| **SEC-06** | Sécurité | Isolement Réseau / Portgroup | Raccordée au Portgroup de production | Re-configuration de la vNIC |
| **SEC-07** | Ressources | Dimensionnement vCPU & RAM | Ressources conformes aux quotas | Ajustement vCPU / RAM |
| **SEC-08** | Supervision | État d'Alimentation & Activité | VM alimentée (`POWERED ON`) | Power-On ou investigation |
| **SEC-09** | Sécurité | Verrouillage CD/DVD / ISO | Aucune image ISO / CD-ROM montée | Déconnexion automatique du lecteur CD/DVD |
| **SEC-10** | Gouvernance| Résolution DNS & Domaine | Nom d'hôte résolvable dans le DNS local | Déclaration automatique Bind9 DNS |

> **Note sur les exécutions système :** Les micro-VMs d'infrastructure vSphere (`vCLS-*`) et les modèles (*Templates*) sont filtrés automatiquement par FastAPI pour éviter les faux positifs sur le calcul du taux de conformité.
