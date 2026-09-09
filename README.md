[![CI/CD Pipeline](https://github.com/zeinebkharrat/portail-vsphere/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/zeinebkharrat/portail-vsphere/actions/workflows/ci-cd.yml)

# Portail vSphere & Audit de Conformité

Portail web de gestion et d'audit de conformité pour infrastructure VMware vSphere, développé avec un backend FastAPI et un frontend React.

---

## 🛠️ Stack Technique

* **Backend :** Python 3.11, FastAPI, pyVmomi, Uvicorn
* **Frontend :** React, Vite, Tailwind CSS
* **Conteneurisation :** Docker, Nginx
* **CI/CD & Sécurité :** GitHub Actions, Trivy Security Scanner

---

## 📁 Structure du Projet
portail-vsphere/
├── .github/
│   └── workflows/
│       └── ci-cd.yml        # Pipeline CI/CD GitHub Actions
├── frontend/                # Application React & Dockerfile Frontend
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── audit_compliance.py      # Scripts d'audit vSphere
├── main.py                  # API FastAPI principale
├── test_vc.py               # Script de test de connexion vCenter
├── Dockerfile               # Dockerfile Backend FastAPI
├── requirements.txt         # Dépendances Python
└── README.md                # Documentation du projet

## 🚀 Lancement Rapide avec Docker

### 1. Démarrer le Backend (FastAPI)

Construction de l'image Docker Backend
docker build -t vsphere-backend .

Lancement du conteneur Backend sur le port 8000
docker run -d -p 8000:8000 --name vsphere-backend vsphere-backend

### 2. Démarrer le Frontend (React)
Déplacement dans le dossier frontend
cd frontend

Construction de l'image Docker Frontend
docker build -t vsphere-frontend .

Lancement du conteneur Frontend sur le port 80
docker run -d -p 80:80 --name vsphere-frontend vsphere-frontend

---

## 🔄 Pipeline CI/CD

Chaque modification poussée (`git push`) sur la branche `main` déclenche automatiquement le pipeline **GitHub Actions** (`.github/workflows/ci-cd.yml`) qui effectue les étapes suivantes :

1. **Build & Scan Backend :**
   * Construction de l'image Docker du backend Python FastAPI.
   * Analyse des vulnérabilités critiques avec l'outil de sécurité **Trivy**.

2. **Build & Scan Frontend :**
   * Validation de la compilation du projet React (Node.js 20).
   * Construction de l'image Docker Nginx pour le frontend.
   * Analyse des vulnérabilités critiques avec **Trivy**.

---

## 🔒 Sécurité

Le projet intègre un scan continu d'images de conteneurs avec **Trivy** pour s'assurer qu'aucune vulnérabilité de niveau `CRITICAL` ou `HIGH` n'est introduite dans les dépendances système ou applicatives.
