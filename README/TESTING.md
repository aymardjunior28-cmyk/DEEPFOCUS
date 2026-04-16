# Guide de Test - Système Multi-Utilisateurs

## ✅ Checklist de Vérification

### Phase 1 : Installation & Configuration
- [ ] `npm install` s'exécute sans erreur
- [ ] `npm run dev` lance le frontend et le backend
- [ ] Accès à http://localhost:5173 en OK
- [ ] Accès à http://localhost:3001/api/ping en OK

### Phase 2 : Authentification
- [ ] Inscription d'un nouvel utilisateur (User 1 - Owner)
- [ ] Connection fonctionnelle
- [ ] Token JWT généré et stocké en localStorage
- [ ] Workspace par défaut créé automatiquement
- [ ] Code d'invitation généré

### Phase 3 : Planning & Tâches
**Avec User 1 (Owner)**

#### Vue Planning
- [ ] Onglet "Planning" visible
- [ ] Vue "Jour" accessible
  - [ ] Date de jour présélectionnée
  - [ ] Aucune tâche affichée initialement
- [ ] Vue "Semaine" accessible
  - [ ] Grille de 7 jours affichée
  - [ ] Navigation semaine précédente/suivante
- [ ] Vue "Mois" accessible
  - [ ] Calendrier complet du mois
  - [ ] Navigation mois précédent/suivant

#### Création de Tâche
- [ ] Button "+ Nouvelle tâche" cliquable
- [ ] Formulaire s'affiche avec :
  - [ ] Champ "Titre" requis
  - [ ] Champ "Description" optionnel
  - [ ] Champ "Date début" pré-rempli du jour
  - [ ] Champ "Date fin" pré-rempli du jour
  - [ ] Select "Priorité" (Basse/Normale/Haute)
  - [ ] Checkboxes des membres pour attribution
  - [ ] Boutons "Créer" et "Annuler"

- [ ] Création d'une tâche "simple" (sans assignation)
  - [ ] Tâche visible en vue Jour
  - [ ] Tâche visible en vue Semaine
  - [ ] Point visible en vue Mois

- [ ] Création d'une tâche "urgente" (Priorité Haute)
  - [ ] Bordure rouge visible (priority-high)
  - [ ] Couleur rouge dans le dot du mois

- [ ] Modification d'une tâche
  - [ ] Click sur tâche → Édition
  - [ ] Changement titre → Sauvegarde
  - [ ] Changement statut "completed" → Checkbox
  - [ ] Changement priorité → Couleur mise à jour

- [ ] Suppression d'une tâche
  - [ ] Click "×" sur une tâche
  - [ ] Confirmation ? (optionnel)
  - [ ] Tâche disparaît du planning

### Phase 4 : Système d'Invitations
**Owner teste l'invitation d'un Member**

#### Interface Invitations (Owner)
- [ ] Onglet "👥 Membres" visible (Owner uniquement)
- [ ] Section "Gestion des membres"
- [ ] Compteur "1 / 6 membres" affiché
- [ ] Section "Membres actuels" avec User 1 (Owner)
- [ ] Button "+ Inviter un utilisateur" visible

#### Envoi d'Invitation
- [ ] Click sur "+ Inviter"
- [ ] Formulaire "Email de l'utilisateur"
- [ ] Validation email (format)
- [ ] Envoi avec succès → Message "Invitation envoyée !"
- [ ] Invitation apparaît en "Invitations en attente"
- [ ] Vérifier les 5 invitations max (test limite)

### Phase 5 : Attributions Multi-Membres
**Créer User 2, accepter invitation, tester attributions**

#### Inscription User 2
- [ ] Créer nouveau compte (User 2 - Member)
- [ ] Connexion avec User 2
- [ ] Workspace par défaut créé pour User 2

#### Accepter Invitation
- [ ] Alerte "Vous avez 1 invitation(s)" affichée
- [ ] Button "Accepter" visible
- [ ] Click "Accepter" → Confirmation
- [ ] Redirection vers workspace d'User 1
- [ ] User 2 visible dans les membres (onglet Membres)

#### Attribuer une Tâche à User 2
**Retour User 1**
- [ ] Click onglet Planning
- [ ] "+ Nouvelle tâche"
- [ ] Remplir : Titre = "Test Multi-User"
- [ ] Dates quelconques
- [ ] **Checkbox User 2 cochée**
- [ ] Créer la tâche
- [ ] Tâche affichée avec avatar User 2

#### Notification pour User 2
**Vérifier User 2 reçoit notification**
- [ ] Onglet Notifications (🔔)
- [ ] Notification visible : "Vous avez été assigné à : Test Multi-User"
- [ ] Statut unread (badge bleu)
- [ ] Click sur notification → Marquer comme lu
- [ ] Badge disparaît

#### Voir Tâche Assignée (User 2)
- [ ] Aller au Planning (User 2)
- [ ] Vue Jour/Semaine/Mois
- [ ] Tâche "Test Multi-User" visible
- [ ] Avatar User 2 affiché sur la tâche

### Phase 6 : Permissions & Accès
**Vérifier les restrictions**

#### User 2 ne peut pas inviter
- [ ] Onglet "👥 Membres" NON visible pour User 2
- [ ] User 2 ne voit que ses tâches + privé d'ownership

#### User 1 voit tout
- [ ] Voit toutes les tâches (même les autres)
- [ ] Peut éditer tâche d'autrui (si assigné)
- [ ] Peut inviter jusqu'à 5 (total 6 : 1 Owner + 5)

#### User 2 peut éditer ses tâches
- [ ] Edit tâche assignée ✅
- [ ] Edit tâche qu'il a créée ✅
- [ ] Edit tâche d'un autre member ❌

### Phase 7 : Synchronisation Temps-Réel
**Ouvrir 2 onglets pour tester sync**

#### Sync via EventSource
- [ ] Onglet 1 : User 1, Planning
- [ ] Onglet 2 : User 1, Planning (même browser)
- [ ] Onglet 1 : Créer une tâche
- [ ] **Onglet 2 : Tâche apparat automatiquement**
- [ ] Onglet 1 : Modifier la tâche
- [ ] **Onglet 2 : Changement visible immédiatement**

### Phase 8 : Cas Limites
**Tester les erreurs**

- [ ] Créer tâche sans titre → Erreur
- [ ] Créer tâche sans date → Erreur
- [ ] Inviter au-delà de 5 → Erreur "Limite atteinte"
- [ ] Inviter email invalide → Validation
- [ ] Upload fichier > 25MB → Erreur
- [ ] Type fichier non accepté → Erreur
- [ ] Créer 2 comptes avec même email → Erreur

### Phase 9 : Responsive Design
**Tester sur différentes résolutions**

#### Desktop (> 1200px)
- [ ] Layout complet visible
- [ ] Sidebar + Main content côte-à-côte
- [ ] Notifications dans sidebar si visible

#### Tablet (768-1200px)
- [ ] Layout adaptif OK
- [ ] Pas de scroll inutile
- [ ] Touch-friendly buttons

#### Mobile (< 768px)
- [ ] Stack vertical OK
- [ ] Week view : 3 jours par ligne
- [ ] Month view : 4 jours par ligne
- [ ] Buttons cliquables on touch

---

## 🧪 Scénarios de Test Complète

### Scénario 1 : Équipe de 3 Personnes
1. User 1 (Owner) s'enregistre
2. User 2 & 3 (Members) s'enregistrent
3. User 1 invite User 2 et User 3
4. User 2 et 3 acceptent
5. User 1 crée une tâche complexe :
   - Titre : "Lancement produit"
   - Début : 20 avril, Fin : 30 avril
   - Priorité : Haute
   - Assignés : User 2 + User 3
6. Vérifier :
   - [ ] User 2 reçoit notification
   - [ ] User 3 reçoit notification
   - [ ] Tâche visible sur 11 jours (20-30 avril)
   - [ ] 2 avatars affichés
   - [ ] Tous les 3 voient la tâche en planning

### Scénario 2 : Workflow Complet
1. Créer 5 tâches
   - Tâche 1 (15 avril, Basse) → User 2
   - Tâche 2 (15 avril, Normale) → User 3
   - Tâche 3 (16 avril, Haute) → User 2 + User 3
   - Tâche 4 (17-20 avril, Basse) → User 1
   - Tâche 5 (Mois mai, Normale) → Todos
2. Vérifier vue Mois :
   - [ ] 4 points visibles en avril
   - [ ] 1 point visibles en mai
3. Vérifier vue Semaine :
   - [ ] Tous les positionnements corrects

### Scénario 3 : Limite de Membres
1. User 1 invite 5 utilisateurs (User 2 à 6)
2. Tentative d'inviter User 7 → Erreur "Limite atteinte"
3. Vérifier compteur : "6 / 6 membres"

---

## 📊 Critères d'Acceptation

| Feature | Status | Notes |
|---------|--------|-------|
| Planning Jour/Semaine/Mois | ✅ | Doit fonctionner |
| Création de Tâches | ✅ | Titre + Dates requises |
| Attributions Multi-Membres | ✅ | 1 personne min, plusieurs OK |
| Notifications | ✅ | Task assigned + Member joined |
| Invitations | ✅ | Max 5 + Status pending/accepted |
| Permissions | ✅ | Owner full access, Member restricted |
| Sync Temps-Réel | ✅ | EventSource obligatoire |
| Responsive | ✅ | Mobile/Tablet/Desktop OK |

---

## 🐛 Rapport de Bugs

Créer un ticket GitHub avec :
```markdown
### Description
[Décrire le bug]

### Étapes pour reproduire
1. ...
2. ...
3. ...

### Comportement attendu
[Décrire ce qui devrait se passer]

### Comportement actuel
[Décrire ce qui se passe]

### Screenshots
[Inclure si possible]

### Environnement
- OS: [e.g., Windows, macOS]
- Browser: [e.g., Chrome, Firefox]
- Version Node: [e.g., 18.x]
```

---

**Dernière mise à jour** : Avril 2026  
**Testeur** : À remplir
**Date de test** : À remplir
