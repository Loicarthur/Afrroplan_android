# AfroPlan 💇🏾‍♀️

AfroPlan est une plateforme mobile spécialisée dans la mise en relation entre clients et professionnels de la coiffure afro. L'application permet de découvrir des salons, de réserver des prestations (en salon ou à domicile) et de gérer les rendez-vous de manière fluide.

## 🚀 Technologies utilisées

- **Frontend** : [Expo](https://expo.dev/) (React Native) + React 19
- **Langage** : [TypeScript](https://www.typescriptlang.org/)
- **Navigation** : [Expo Router](https://docs.expo.dev/router/introduction/) (File-based)
- **Backend** : [Supabase](https://supabase.com/) (Auth, PostgreSQL, Storage, Edge Functions)
- **Paiements** : [Stripe](https://stripe.com/) via `@stripe/stripe-react-native`
- **Gestion d'état** : [Zustand](https://github.com/pmndrs/zustand) & React Context
- **Requêtes API** : [React Query](https://tanstack.com/query/latest) (TanStack Query)
- **Cartographie** : React Native Maps + Google Maps API

## 📋 Fonctionnalités clés

- **Recherche multicritère** : Filtrage par catégories de coiffures afro, ville ou évaluation.
- **Système de Réservation** : Gestion des créneaux, sélection du lieu (salon ou domicile).
- **Multi-Rôles** :
  - **Client** : Recherche, réservation, favoris, avis.
  - **Coiffeur Indépendant** : Gestion de son portfolio, services à domicile.
  - **Propriétaire de Salon** : Dashboard de gestion, services du salon, abonnements.
  - **Admin** : Administration complète de la plateforme.
- **Synchronisation de Catalogue** : Utilisation d'un catalogue unifié pour une correspondance précise entre l'offre et la demande.
- **Paiements Sécurisés** : Intégration Stripe pour les acomptes ou paiements complets.
- **Messagerie** : Chat intégré entre clients et professionnels.

## 📁 Structure du projet

```text
├── app/                  # Routes Expo Router (Navigation)
│   ├── (auth)/           # Authentification (Login, Register, OTP)
│   ├── (tabs)/           # Onglets principaux du client
│   ├── (coiffeur)/       # Espace coiffeur indépendant
│   ├── (salon)/          # Espace gestion de salon
│   └── (admin)/          # Dashboard administrateur
├── components/           # Composants UI réutilisables
├── constants/            # Thème, catégories de coiffures, config
├── contexts/             # Contextes React (Auth, Langue)
├── hooks/                # Hooks personnalisés
├── lib/                  # Configurations tierces (Supabase)
├── services/             # Logique métier et appels API
├── store/                # Gestion d'état global (Zustand)
├── supabase/             # Schémas SQL et Edge Functions
├── types/                # Définitions TypeScript
└── assets/               # Images, polices et ressources statiques
```

## 🛠 Installation et Lancement

1. **Cloner le projet** :
   ```bash
   git clone <url-du-repo>
   cd Afroplan_app_ios
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement** :
   Créez un fichier `.env` à la racine (basé sur `.env.example` s'il existe) :
   ```env
   EXPO_PUBLIC_SUPABASE_URL=votre_url_supabase
   EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anonyme
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=votre_cle_stripe
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=votre_cle_google_maps
   ```

4. **Lancer l'application** :
   ```bash
   npx expo start
   ```
   Appuyez sur `i` pour iOS ou `a` pour Android.

## 🧪 Tests et Qualité

- **Exécuter les tests** : `npm test`
- **Couverture de tests** : `npm run test:coverage`
- **Linting** : `npm run lint`
- **Vérification des types** : `npm run typecheck`

## 📄 Licence

Ce projet est privé. Tous droits réservés.
