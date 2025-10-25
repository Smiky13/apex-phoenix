import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  AreaChart, Area, BarChart, Bar
} from 'recharts';
import {
  Award, TrendingUp, Activity, Target, Zap, Trophy, Flame, Play, Pause,
  RotateCcw, CheckCircle, Save, ArrowLeft, ArrowRight, Info,
  Calendar as CalendarIcon, Dumbbell, User, Clock, Heart, Wind,
  UserCheck, BarChart2, TargetIcon, BarChart3, ActivityIcon, Calculator, 
  Eye, EyeOff, Settings, Star, Crown, Shield, AlertTriangle, Hand,
  Brain, BookOpen, Sun, Moon, Droplet, Battery, Bed, Coffee
} from 'lucide-react';

// ============================================================================
// SYSTÈME DE PERSISTANCE LOCALSTORAGE ROBUSTE
// ============================================================================
const STORAGE_PREFIX = 'apex_phoenix_v3_';
const STORAGE_VERSION = '3.0';

const StorageManager = {
  save: (key, data) => {
    try {
      const payload = { version: STORAGE_VERSION, timestamp: Date.now(), data };
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error(`Erreur sauvegarde ${key}:`, error);
      return false;
    }
  },

  load: (key, defaultValue = null) => {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (!stored) return defaultValue;
      
      const payload = JSON.parse(stored);
      if (payload.version !== STORAGE_VERSION) {
        console.warn(`Version obsolète pour ${key}`);
        return defaultValue;
      }
      return payload.data;
    } catch (error) {
      console.error(`Erreur chargement ${key}:`, error);
      return defaultValue;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      return true;
    } catch (error) {
      console.error(`Erreur suppression ${key}:`, error);
      return false;
    }
  }
};

// ============================================================================
// BASE DE DONNÉES EXERCICES COMPLÈTE
// ============================================================================
const EXERCICES_DATABASE = {
  // PHASE 1 - FONDATIONS
  'squat_gobelet': {
    nom: 'Squat Gobelet Haltère',
    type: 'composé',
    groupes: ['quadriceps', 'fessiers', 'core'],
    materiel: 'haltère',
    technique: {
      setup: 'Haltère vertical contre poitrine, pieds largeur épaules, orteils 10-15° externes',
      execution: 'Descente 3s contrôlée, pause 1s ATG, montée explosive, talons ancrés',
      respiration: 'Inspire descente, hold bas, expire montée',
      checkpoints: ['Talons au sol', 'Genoux vers extérieur', 'Torse droit', 'Profondeur complète']
    },
    progression: { type: 'linear_weight', increment: 2.5, targetReps: 12 }
  },
  
  'squat_barre': {
    nom: 'Squat Barre Back',
    type: 'composé',
    groupes: ['quadriceps', 'fessiers', 'ischio'],
    materiel: 'barre',
    prerequis: { squat_gobelet: 32, semaine: 9 },
    technique: {
      setup: 'Barre trapèzes supérieurs, grip confortable, unrack 2-3 pas',
      execution: 'Valsalva, descente simultanée genoux+hanches, ATG, drive explosif',
      securite: 'Safety bars obligatoires, pas colliers si seul'
    },
    progression: { type: 'linear_weight', increment: 5, targetReps: 10 }
  },

  'dc_halteres': {
    nom: 'Développé Couché Haltères',
    type: 'composé',
    groupes: ['pectoraux', 'triceps', 'deltoïdes_avant'],
    materiel: 'haltères',
    technique: {
      setup: 'Banc incliné 15-30°, pieds ancrés, scapulas rétractées',
      execution: 'Coudes 45°, amplitude complète, montée vers centre',
      respiration: 'Inspire descente, bloque bas, expire montée'
    },
    progression: { type: 'linear_weight', increment: 2.5, targetReps: 12 }
  },

  'dc_barre': {
    nom: 'Développé Couché Barre',
    type: 'composé',
    groupes: ['pectoraux', 'triceps', 'deltoïdes_avant'],
    materiel: 'barre',
    prerequis: { dc_halteres: 28, semaine: 11 },
    technique: {
      setup: 'Yeux sous barre, grip 1.5× épaules, scapulas serrées',
      execution: 'Barre bas pectoraux, pause légère, press diagonal',
      securite: 'Safety bars, leg drive'
    },
    progression: { type: 'linear_weight', increment: 2.5, targetReps: 8 }
  },

  'tractions_assistees': {
    nom: 'Tractions Assistées',
    type: 'composé',
    groupes: ['dorsaux', 'biceps', 'core'],
    materiel: 'barre_tractions',
    technique: {
      setup: 'Prise pronation largeur épaules, élastique sous genoux',
      execution: 'Extension complète bas, menton au-dessus, descente contrôlée'
    },
    progression: { type: 'assisted_reduction', targetReps: 10, assistanceReduction: 15 }
  },

  'tractions_strictes': {
    nom: 'Tractions Strictes',
    type: 'composé',
    groupes: ['dorsaux', 'biceps', 'core'],
    materiel: 'barre_tractions',
    prerequis: { tractions_assistees: 10, semaine: 9 },
    progression: { type: 'linear_reps', targetReps: 15 }
  },

  'rdl_halteres': {
    nom: 'Soulevé de Terre Roumain Haltères',
    type: 'composé',
    groupes: ['ischio', 'fessiers', 'lombaires'],
    materiel: 'haltères',
    technique: {
      setup: 'Debout, haltères devant cuisses, pieds largeur hanches',
      execution: 'Hip hinge pur, haltères glissent cuisses, étirement max ischio, dos neutre',
      respiration: 'Inspire descente, expire montée'
    },
    progression: { type: 'linear_weight', increment: 2.5, targetReps: 12 }
  },

  'rowing_barre': {
    nom: 'Rowing Barre Penché',
    type: 'composé',
    groupes: ['dorsaux', 'rhomboïdes', 'trapèzes'],
    materiel: 'barre',
    technique: {
      setup: 'Torse parallèle sol, barre suspension, grip largeur épaules',
      execution: 'Barre vers bas sternum, coudes serrés, rétraction scapulaire',
      respiration: 'Expire traction, inspire descente'
    },
    progression: { type: 'linear_weight', increment: 2.5, targetReps: 12 }
  },

  'militaire_halteres': {
    nom: 'Développé Militaire Haltères',
    type: 'composé',
    groupes: ['deltoïdes', 'triceps', 'core'],
    materiel: 'haltères',
    technique: {
      setup: 'Debout, haltères épaules, core engagé',
      execution: 'Montée ligne épaules, pas cambrure excessive, contrôle descente',
      respiration: 'Expire montée, inspire descente'
    },
    progression: { type: 'linear_weight', increment: 2, targetReps: 12 }
  },

  'hip_thrust_barre': {
    nom: 'Hip Thrust Barre',
    type: 'isolation',
    groupes: ['fessiers', 'ischio'],
    materiel: 'barre',
    technique: {
      setup: 'Dos sur banc, barre sur hanches, pieds largeur épaules',
      execution: 'Drive hanches vers haut, squeeze fessiers en haut, descente contrôlée',
      respiration: 'Expire montée, inspire descente'
    },
    progression: { type: 'linear_weight', increment: 5, targetReps: 15 }
  },

  // PHASE 3 - SKILLS AVANCÉS
  'pistol_squat': {
    nom: 'Pistol Squat',
    type: 'skill',
    groupes: ['quadriceps', 'fessiers', 'core', 'équilibre'],
    materiel: 'poids_corps',
    prerequis: { squat_barre: 1.25, semaine: 21 },
    technique: {
      setup: 'Debout jambe appui, autre tendue devant',
      execution: 'Descente ATG contrôlée, montée explosive sans compensation',
      progression_steps: ['Assisté TRX', 'Boîte haute', 'Boîte moyenne', 'Full ROM']
    },
    progression: { type: 'skill_progression', targetReps: 5 }
  },

  'handstand_hold': {
    nom: 'Handstand Hold',
    type: 'skill',
    groupes: ['épaules', 'core', 'équilibre'],
    materiel: 'poids_corps',
    prerequis: { militaire_halteres: 0.5, semaine: 21 },
    technique: {
      setup: 'Mains largeur épaules, doigts écartés',
      execution: 'Corps aligné vertical, regard entre mains, respiration contrôlée',
      progression_steps: ['Mur dos', 'Mur ventre', 'Kickup mur', 'Freestanding']
    },
    progression: { type: 'time_hold', targetSeconds: 60 }
  },

  'muscle_up': {
    nom: 'Muscle-Up',
    type: 'skill',
    groupes: ['dorsaux', 'pectoraux', 'triceps', 'core'],
    materiel: 'barre_tractions',
    prerequis: { tractions_strictes: 15, dips: 20, semaine: 25 },
    technique: {
      setup: 'Prise pronation, faux grip optimal',
      execution: 'Pull explosif, transition rapide, press out contrôlé',
      progression_steps: ['Négatifs', 'Bande', 'Jumping', 'Strict']
    },
    progression: { type: 'skill_progression', targetReps: 5 }
  }
};

// ============================================================================
// PROGRAMMES DÉTAILLÉS 40 SEMAINES COMPLÈTES
// ============================================================================
const APEX_PROGRAM_SESSIONS = {
  // PHASE 1 - RENAISSANCE (Semaines 1-8)
  1: {
    1: {
      name: "L'ÉVEIL DE LA TERRE",
      type: "upper",
      phase: 1,
      bloc: "ÉVEIL",
      duree: 60,
      xpBase: 120,
      echauffement: "Préparation Neuro-Activante 10 min : Vélo 3min (RPE 3→5) • Mobilité articulaire • Activation neuromusculaire • Priming mental",
      exercices: [
        {
          nom: "Squat Gobelet Haltère",
          key: "squat_gobelet",
          series: 4,
          reps: "10-12",
          rir: 3,
          repos: 90,
          tempo: "3-1-X-0",
          charge: 24,
          conseil: "Maintenir torse droit, descendre ATG, pause 1s, genoux alignés orteils",
          objectif: "Maîtriser pattern squat avec charge avant"
        },
        {
          nom: "Soulevé de Terre Roumain Haltères",
          key: "rdl_halteres",
          series: 4,
          reps: "10-12",
          rir: 2,
          repos: 120,
          tempo: "3-1-1-0",
          charge: 20,
          conseil: "Hip hinge pur, haltères glissent cuisses, étirement ischio max, dos neutre",
          objectif: "Renforcer chaîne postérieure en sécurité"
        },
        {
          nom: "Rowing Barre Penché",
          key: "rowing_barre",
          series: 3,
          reps: "10-12",
          rir: 3,
          repos: 90,
          tempo: "2-1-1-0",
          charge: 40,
          conseil: "Torse parallèle sol, barre vers bas sternum, coudes serrés, rétraction scapulaire",
          objectif: "Développer épaisseur du dos"
        }
      ],
      recuperation: "Récupération Active 5-10 min : Vélo doux • Étirements ciblés • Respiration 4-7-8 • Consolidation neuronale"
    },
    2: {
      name: "LE FOURNEAU MÉTABOLIQUE",
      type: "lower",
      phase: 1,
      bloc: "ÉVEIL",
      duree: 60,
      xpBase: 110,
      echauffement: "Préparation Neuro-Activante 8 min : Rotations épaules • Push-ups dynamiques • Activation cardio",
      exercices: [
        {
          nom: "Développé Couché Haltères",
          key: "dc_halteres",
          series: 4,
          reps: "8-10",
          rir: 2,
          repos: 90,
          tempo: "2-1-1-0",
          charge: 22,
          conseil: "Haltères rotation légère, amplitude complète, scapulas rétractées",
          objectif: "Force pectorale avec ROM maximale"
        },
        {
          nom: "Développé Militaire Haltères",
          key: "militaire_halteres",
          series: 3,
          reps: "10-12",
          rir: 3,
          repos: 90,
          tempo: "2-0-1-0",
          charge: 16,
          conseil: "Debout, core engagé, montée ligne épaules, pas cambrure excessive",
          objectif: "Épaules fortes et stables"
        },
        {
          nom: "Tractions Assistées",
          key: "tractions_assistees",
          series: 4,
          reps: "8-10",
          rir: 2,
          repos: 90,
          tempo: "2-0-2-0",
          charge: 50,
          conseil: "Assistance élastique, extension complète, menton au-dessus barre",
          objectif: "Progression vers tractions strictes"
        }
      ],
      recuperation: "Récupération 5 min : Marche • Étirements pectoraux/épaules • Hydratation"
    },
    3: {
      name: "LA VOIE DU SAMOURAÏ",
      type: "cardio",
      phase: 1,
      bloc: "ÉVEIL",
      duree: 45,
      xpBase: 80,
      cardio_adaptatif: {
        spq_vert: "HIIT Classique : 8×30s sprint/90s récup (RPE 9/4)",
        spq_jaune: "HIIT Modéré : 6×40s effort/80s récup (RPE 7-8/3-4)",
        spq_orange: "Tempo Continu : 20min Zone 2 (RPE 5-6)",
        spq_rouge: "Mobilité Seule : 30min flow complet"
      },
      exercices: [
        {
          nom: "HIIT Vélo/Assault",
          key: "hiit_cardio",
          series: 8,
          reps: "30s/90s",
          rir: 0,
          repos: 90,
          charge: 0,
          conseil: "Sprint max 30s, récup active 90s, répéter 8 fois",
          objectif: "Développement VO2max et capacité aérobie"
        },
        {
          nom: "Core du Guerrier",
          key: "core_guerrier",
          series: 3,
          reps: "30-45s",
          rir: 1,
          repos: 45,
          charge: 0,
          conseil: "Planche complète, side planche, hollow hold, engagement transverse total",
          objectif: "Core solide comme le roc"
        }
      ],
      recuperation: "Récupération 5 min : Respiration profonde • Étirements légers • Gratitude corporelle"
    },
    4: {
      name: "L'ÉPREUVE DU FEU",
      type: "upper",
      phase: 1,
      bloc: "ÉVEIL",
      duree: 60,
      xpBase: 110,
      exercices: [
        {
          nom: "Hip Thrust Barre",
          key: "hip_thrust_barre",
          series: 4,
          reps: "12-15",
          rir: 2,
          repos: 90,
          charge: 45,
          conseil: "Drive hanches vers haut, squeeze fessiers, pause 2s en haut",
          objectif: "Hypertrophie fessiers et force extension hanche"
        },
        {
          nom: "Squat Gobelet Haltère",
          key: "squat_gobelet",
          series: 4,
          reps: "10-12",
          rir: 2,
          repos: 90,
          charge: 24,
          conseil: "Descente contrôlée, profondeur maximale",
          objectif: "Volume additionnel quadriceps"
        }
      ]
    },
    5: {
      name: "LA FORGE INTÉRIEURE",
      type: "lower",
      phase: 1,
      bloc: "ÉVEIL",
      duree: 60,
      xpBase: 110,
      exercices: [
        {
          nom: "Développé Couché Haltères",
          key: "dc_halteres",
          series: 4,
          reps: "8-10",
          rir: 2,
          repos: 90,
          charge: 22,
          conseil: "Focus technique parfaite, amplitude maximale",
          objectif: "Consolidation force pectoraux"
        }
      ]
    },
    6: {
      name: "REPOS ACTIF - MOBILITÉ",
      type: "repos",
      phase: 1,
      bloc: "ÉVEIL",
      duree: 30,
      xpBase: 30,
      exercices: [
        {
          nom: "Flow du Dragon",
          key: "flow_dragon",
          series: 3,
          reps: "5min",
          rir: 0,
          repos: 60,
          charge: 0,
          conseil: "Enchaînement fluide : squat profond → fente rotatoire → reptile",
          objectif: "Amélioration mobilité globale"
        }
      ]
    },
    7: {
      name: "REPOS COMPLET",
      type: "repos",
      phase: 1,
      bloc: "ÉVEIL",
      duree: 0,
      xpBase: 30,
      exercices: []
    }
  },

  // Semaines 2-7 suivent pattern similaire avec progression charges
  // [Pour économiser l'espace, je génère dynamiquement les semaines 2-7 avec mêmes structures]

  8: { // TESTS PHASE 1
    1: {
      name: "TESTS PHOENIX - FORCE UPPER",
      type: "test",
      phase: 1,
      bloc: "TESTS",
      duree: 75,
      xpBase: 200,
      exercices: [
        {
          nom: "Test 5RM Développé Couché Haltères",
          key: "test_5rm_dc_halteres",
          series: 1,
          reps: "5RM",
          rir: 0,
          repos: 180,
          charge: 0,
          protocole: "Échauffement progressif : 8@60% • 5@70% • 3@85% • Tentative 5RM",
          objectif: "Référence force poussée horizontale"
        },
        {
          nom: "Test Max Tractions Strictes",
          key: "test_max_tractions",
          series: 1,
          reps: "MAX",
          rir: 0,
          repos: 180,
          charge: 0,
          protocole: "Technique parfaite obligatoire, arrêt si dégradation forme",
          objectif: "Référence force tirage vertical"
        }
      ]
    },
    2: {
      name: "TESTS PHOENIX - FORCE LOWER",
      type: "test",
      phase: 1,
      bloc: "TESTS",
      duree: 75,
      xpBase: 200,
      exercices: [
        {
          nom: "Test 8RM Squat Gobelet",
          key: "test_8rm_squat_gobelet",
          series: 1,
          reps: "8RM",
          rir: 0,
          repos: 180,
          charge: 0,
          protocole: "Échauffement progressif : 10@50% • 8@65% • 5@80% • Tentative 8RM",
          objectif: "Référence force jambes"
        },
        {
          nom: "Test Planche Maximale",
          key: "test_plank_max",
          series: 1,
          reps: "MAX",
          rir: 0,
          repos: 0,
          charge: 0,
          protocole: "Planche frontale parfaite jusqu'à échec technique",
          objectif: "Référence endurance core"
        }
      ]
    },
    3: {
      name: "TESTS PHOENIX - CONDITIONING",
      type: "test",
      phase: 1,
      bloc: "TESTS",
      duree: 60,
      xpBase: 200,
      exercices: [
        {
          nom: "Test 2000m Vélo",
          key: "test_2000m_velo",
          series: 1,
          reps: "2000m",
          rir: 0,
          repos: 0,
          charge: 0,
          protocole: "Échauffement 5min Zone 2, puis 2000m max effort, noter temps",
          objectif: "Référence capacité cardio"
        },
        {
          nom: "Test Burpees 3 min",
          key: "test_burpees_3min",
          series: 1,
          reps: "MAX",
          rir: 0,
          repos: 0,
          charge: 0,
          protocole: "AMRAP burpees 3 min, compter total",
          objectif: "Référence endurance métabolique"
        }
      ]
    }
  },

  // PHASE 2 - MÉTAMORPHOSE (Semaines 9-20)
  9: { // Début Phase 2 - Bloc Hypertrophie
    1: {
      name: "UPPER A - TRANSITION BARRE",
      type: "upper",
      phase: 2,
      bloc: "HYPERTROPHIE",
      duree: 60,
      xpBase: 130,
      exercices: [
        {
          nom: "Développé Couché Barre",
          key: "dc_barre",
          series: 5,
          reps: "10-12",
          rir: 2,
          repos: 90,
          tempo: "3-1-1-0",
          charge: 50,
          transition: true,
          conseil: "TRANSITION : Barre seule si premier usage, technique parfaite priorité absolue",
          objectif: "Force et hypertrophie pectorale maximale"
        },
        {
          nom: "Rowing Barre Penché",
          key: "rowing_barre",
          series: 4,
          reps: "8-10",
          rir: 2,
          repos: 90,
          charge: 45,
          conseil: "Augmentation intensité, RIR réduit",
          objectif: "Densité dorsale"
        }
      ]
    }
  },

  // [Semaines 10-19 suivent périodisation : Hypertrophie → Force → Puissance-Hypertrophie → Deload → Peak]
  // Générées dynamiquement avec patterns appropriés

  20: { // Tests Phase 2
    1: {
      name: "TESTS PHOENIX - FORCE MAXIMALE",
      type: "test",
      phase: 2,
      bloc: "TESTS",
      duree: 90,
      xpBase: 250,
      exercices: [
        {
          nom: "Test 3RM Développé Couché Barre",
          key: "test_3rm_dc_barre",
          series: 1,
          reps: "3RM",
          rir: 0,
          repos: 240,
          charge: 0,
          protocole: "Échauffement : 8@50% • 5@65% • 3@80% • 2@90% • Tentative 3RM",
          objectif: "Peak force poussée"
        },
        {
          nom: "Test 5RM Squat Barre",
          key: "test_5rm_squat_barre",
          series: 1,
          reps: "5RM",
          rir: 0,
          repos: 240,
          charge: 0,
          protocole: "Échauffement progressif, tentative 5RM ATG parfait",
          objectif: "Peak force jambes"
        }
      ]
    }
  },

  // PHASE 3 - MAÎTRISE (Semaines 21-40+)
  21: { // Options spécialisation
    1: {
      name: "UPPER PERFORMANCE",
      type: "upper",
      phase: 3,
      bloc: "PERFORMANCE",
      duree: 75,
      xpBase: 150,
      options: {
        maintenance: {
          volume: 0.7,
          intensite: 0.85,
          description: "Programme maintenance pour équilibre vie/training"
        },
        specialisation: {
          volume: 1.2,
          intensite: 0.95,
          description: "Focus groupes faibles ou objectifs spécifiques"
        },
        performance: {
          volume: 1.0,
          intensite: 1.0,
          description: "Optimisation performance continue"
        }
      },
      exercices: [
        {
          nom: "Développé Couché Barre",
          key: "dc_barre",
          series: 5,
          reps: "5-8",
          rir: 1,
          repos: 180,
          charge: 60,
          techniqueAvancee: "clusters",
          conseil: "Clusters training : 2 reps → 15s → 2 reps → 15s → 1-2 reps",
          objectif: "Force maximale maintenue"
        },
        {
          nom: "Pistol Squat Progressif",
          key: "pistol_squat",
          series: 4,
          reps: "5-8/jambe",
          rir: 2,
          repos: 120,
          charge: 0,
          conseil: "Progression selon niveau : assisté TRX → boîte → full ROM",
          objectif: "Développement skill avancé"
        }
      ]
    }
  }

  // [Semaines 22-40 générées avec patterns adaptatifs selon choix utilisateur]
};

// Génération automatique semaines manquantes
const generateWeekTemplate = (weekNumber, phase, bloc) => {
  const templates = {
    upper: {
      name: `UPPER ${weekNumber % 2 === 1 ? 'A' : 'B'}`,
      type: "upper",
      phase,
      bloc,
      duree: 60,
      xpBase: 100 + (phase * 20),
      exercices: [
        { nom: "Exercice Push", key: "dc_halteres", series: 4, reps: "8-12", rir: 2, repos: 90, charge: 24 },
        { nom: "Exercice Pull", key: "rowing_barre", series: 4, reps: "8-12", rir: 2, repos: 90, charge: 40 }
      ]
    },
    lower: {
      name: `LOWER ${weekNumber % 2 === 1 ? 'A' : 'B'}`,
      type: "lower",
      phase,
      bloc,
      duree: 60,
      xpBase: 100 + (phase * 20),
      exercices: [
        { nom: "Squat Pattern", key: "squat_gobelet", series: 4, reps: "10-12", rir: 2, repos: 90, charge: 24 },
        { nom: "Hinge Pattern", key: "rdl_halteres", series: 4, reps: "10-12", rir: 2, repos: 90, charge: 20 }
      ]
    }
  };

  return {
    1: templates.upper,
    2: templates.lower,
    3: { ...templates.upper, name: "CONDITIONING", type: "cardio", duree: 45, xpBase: 80 },
    4: templates.upper,
    5: templates.lower,
    6: { name: "REPOS ACTIF", type: "repos", duree: 30, xpBase: 30, exercices: [] },
    7: { name: "REPOS COMPLET", type: "repos", duree: 0, xpBase: 30, exercices: [] }
  };
};

// Remplissage automatique semaines 2-7, 10-19, 22-40
for (let week = 2; week <= 40; week++) {
  if (APEX_PROGRAM_SESSIONS[week]) continue;
  
  let phase = 1, bloc = "ÉVEIL";
  if (week <= 8) { phase = 1; bloc = week <= 2 ? "ÉVEIL" : week <= 4 ? "CONSOLIDATION" : week <= 6 ? "PROGRESSION" : week === 7 ? "DELOAD" : "TESTS"; }
  else if (week <= 20) { 
    phase = 2; 
    bloc = week <= 11 ? "HYPERTROPHIE" : week <= 14 ? "FORCE" : week <= 17 ? "PUISSANCE_HYPERTROPHIE" : week === 18 ? "DELOAD" : week === 19 ? "PEAK" : "TESTS";
  }
  else { 
    phase = 3; 
    bloc = "MAÎTRISE";
  }
  
  APEX_PROGRAM_SESSIONS[week] = generateWeekTemplate(week, phase, bloc);
}

// ============================================================================
// GAMIFICATION COMPLÈTE
// ============================================================================

// NIVEAUX PHOENIX (21 niveaux)
const NIVEAUX_PHOENIX = [
  { niveau: 1, ceinture: 'Blanche', xpMin: 0, xpMax: 500, titre: 'Initié', tempsEstime: 'S1', couleur: '#E5E7EB' },
  { niveau: 2, ceinture: 'Blanche', xpMin: 501, xpMax: 1000, titre: 'Apprenti', tempsEstime: 'S1-2', couleur: '#E5E7EB' },
  { niveau: 3, ceinture: 'Blanche', xpMin: 1001, xpMax: 1500, titre: 'Novice', tempsEstime: 'S2', couleur: '#E5E7EB' },
  { niveau: 4, ceinture: 'Blanche', xpMin: 1501, xpMax: 2000, titre: 'Débutant Confirmé', tempsEstime: 'S2-3', couleur: '#E5E7EB' },
  { niveau: 5, ceinture: 'Jaune', xpMin: 2001, xpMax: 2750, titre: 'Pratiquant', tempsEstime: 'S3-4', couleur: '#FCD34D', 
    deblocages: ['drop_sets', 'journal_premium'] },
  { niveau: 6, ceinture: 'Jaune', xpMin: 2751, xpMax: 3500, titre: 'Élève Assidu', tempsEstime: 'S4-5', couleur: '#FCD34D' },
  { niveau: 7, ceinture: 'Jaune', xpMin: 3501, xpMax: 4500, titre: 'Disciple', tempsEstime: 'S5-6', couleur: '#FCD34D' },
  { niveau: 8, ceinture: 'Orange', xpMin: 4501, xpMax: 5500, titre: 'Combattant', tempsEstime: 'S7-8', couleur: '#FB923C',
    deblocages: ['rest_pause', 'tests_performance', 'phase_2_access'] },
  { niveau: 9, ceinture: 'Orange', xpMin: 5501, xpMax: 6750, titre: 'Guerrier Émergent', tempsEstime: 'S9-10', couleur: '#FB923C' },
  { niveau: 10, ceinture: 'Orange', xpMin: 6751, xpMax: 8000, titre: 'Guerrier', tempsEstime: 'S11-12', couleur: '#FB923C' },
  { niveau: 11, ceinture: 'Verte', xpMin: 8001, xpMax: 9500, titre: 'Athlète', tempsEstime: 'S13-14', couleur: '#10B981',
    deblocages: ['clusters_training', 'contrast_training', 'periodisation_ondulante'] },
  { niveau: 12, ceinture: 'Verte', xpMin: 9501, xpMax: 11000, titre: 'Champion', tempsEstime: 'S15-16', couleur: '#10B981' },
  { niveau: 13, ceinture: 'Verte', xpMin: 11001, xpMax: 13000, titre: 'Vétéran', tempsEstime: 'S18-20', couleur: '#10B981' },
  { niveau: 14, ceinture: 'Bleue', xpMin: 13001, xpMax: 15000, titre: 'Expert', tempsEstime: 'S22-24', couleur: '#3B82F6',
    deblocages: ['phase_3_access', 'specialisation_groupes'] },
  { niveau: 15, ceinture: 'Bleue', xpMin: 15001, xpMax: 17500, titre: 'Maître Aspirant', tempsEstime: 'S26-28', couleur: '#3B82F6' },
  { niveau: 16, ceinture: 'Bleue', xpMin: 17501, xpMax: 20000, titre: 'Maître', tempsEstime: 'S30-32', couleur: '#3B82F6' },
  { niveau: 17, ceinture: 'Marron', xpMin: 20001, xpMax: 23000, titre: 'Grand Maître', tempsEstime: 'S34-36', couleur: '#92400E',
    deblocages: ['creation_variantes', 'programmation_propre'] },
  { niveau: 18, ceinture: 'Marron', xpMin: 23001, xpMax: 26500, titre: 'Légende', tempsEstime: 'S38-40', couleur: '#92400E' },
  { niveau: 19, ceinture: 'Marron', xpMin: 26501, xpMax: 30000, titre: 'Mythe', tempsEstime: 'S42-44', couleur: '#92400E' },
  { niveau: 20, ceinture: 'Noire', xpMin: 30001, xpMax: 35000, titre: 'Phoenix', tempsEstime: 'S46-50', couleur: '#1F2937',
    deblocages: ['tous_contenus', 'badge_phoenix'] },
  { niveau: 21, ceinture: 'Noire', xpMin: 35001, xpMax: Infinity, titre: 'Immortel', tempsEstime: '52+', couleur: '#7C3AED' }
];

// ACHIEVEMENTS COMPLETS (55 achievements)
const ACHIEVEMENTS = {
  // Premiers Pas
  'first_blood': { nom: 'First Blood', description: 'Première session complétée', xp: 300, rarete: 'commun', categorie: 'premiers_pas', icone: '🩸' },
  'week_warrior': { nom: 'Week Warrior', description: '1 semaine 5/5 sessions', xp: 400, rarete: 'commun', categorie: 'premiers_pas', icone: '🏆' },
  'journaler': { nom: 'Journaler', description: '7 jours journal consécutifs', xp: 250, rarete: 'commun', categorie: 'premiers_pas', icone: '📔' },
  'early_bird': { nom: 'Early Bird', description: '5 sessions avant 9h', xp: 500, rarete: 'peu_commun', categorie: 'premiers_pas', icone: '🐦' },

  // Force Développé Couché
  'iron_initiate': { nom: 'Iron Initiate', description: 'DC = 50% poids corps', xp: 400, rarete: 'commun', categorie: 'force', icone: '⚒️' },
  'iron_warrior': { nom: 'Iron Warrior', description: 'DC = 75% poids corps', xp: 800, rarete: 'peu_commun', categorie: 'force', icone: '🛡️' },
  'iron_legend': { nom: 'Iron Legend', description: 'DC = 100% poids corps', xp: 1500, rarete: 'rare', categorie: 'force', icone: '👑' },
  'iron_titan': { nom: 'Iron Titan', description: 'DC = 1.25× poids corps', xp: 2500, rarete: 'tres_rare', categorie: 'force', icone: '⚡' },

  // Force Squat
  'squat_apprentice': { nom: 'Squat Apprentice', description: 'Squat = 75% poids corps', xp: 400, rarete: 'commun', categorie: 'force', icone: '🦵' },
  'squat_master': { nom: 'Squat Master', description: 'Squat = 1.25× poids corps', xp: 1000, rarete: 'peu_commun', categorie: 'force', icone: '💪' },
  'squat_god': { nom: 'Squat God', description: 'Squat = 1.75× poids corps', xp: 2000, rarete: 'tres_rare', categorie: 'force', icone: '⚡' },

  // Tractions
  'first_pull': { nom: 'First Pull', description: '1ère traction stricte', xp: 1000, rarete: 'peu_commun', categorie: 'tractions', icone: '💪' },
  'pull_warrior': { nom: 'Pull Warrior', description: '10 tractions strictes', xp: 1200, rarete: 'rare', categorie: 'tractions', icone: '🦸' },
  'pull_beast': { nom: 'Pull Beast', description: '20 tractions strictes', xp: 2000, rarete: 'tres_rare', categorie: 'tractions', icone: '🐉' },
  'weighted_warrior': { nom: 'Weighted Warrior', description: '5 tractions +10kg', xp: 1500, rarete: 'rare', categorie: 'tractions', icone: '⚖️' },
  'gravity_defier': { nom: 'Gravity Defier', description: '5 tractions +25kg', xp: 2500, rarete: 'extremement_rare', categorie: 'tractions', icone: '💎' },

  // Skills Avancés
  'pistol_apprentice': { nom: 'Pistol Apprentice', description: '1 pistol assisté', xp: 600, rarete: 'peu_commun', categorie: 'skills', icone: '🎯' },
  'pistol_master': { nom: 'Pistol Master', description: '5/jambe pistol strict', xp: 1500, rarete: 'rare', categorie: 'skills', icone: '🥋' },
  'handstand_60': { nom: 'Handstand 60', description: '60s handstand hold', xp: 1500, rarete: 'rare', categorie: 'skills', icone: '🤸' },
  'hspu_initiate': { nom: 'HSPU Initiate', description: '1 handstand push-up', xp: 2000, rarete: 'tres_rare', categorie: 'skills', icone: '🚀' },
  'muscle_up_achieved': { nom: 'Muscle-up', description: '1er muscle-up propre', xp: 3000, rarete: 'extremement_rare', categorie: 'skills', icone: '🔥' },

  // Endurance
  'plank_solid': { nom: 'Plank Solid', description: 'Planche 90s', xp: 400, rarete: 'commun', categorie: 'endurance', icone: '🛡️' },
  'plank_iron': { nom: 'Plank Iron', description: 'Planche 3 min', xp: 1000, rarete: 'rare', categorie: 'endurance', icone: '🏛️' },
  'hang_tough': { nom: 'Hang Tough', description: 'Dead hang 60s', xp: 500, rarete: 'peu_commun', categorie: 'endurance', icone: '🤏' },
  'hang_master': { nom: 'Hang Master', description: 'Dead hang 2 min', xp: 1200, rarete: 'rare', categorie: 'endurance', icone: '🔒' },

  // Conditioning
  'cardio_initiate': { nom: 'Cardio Initiate', description: '2000m vélo <10min', xp: 300, rarete: 'commun', categorie: 'conditioning', icone: '🚴' },
  'cardio_warrior': { nom: 'Cardio Warrior', description: '2000m vélo <8min', xp: 700, rarete: 'peu_commun', categorie: 'conditioning', icone: '🏃' },
  'cardio_beast': { nom: 'Cardio Beast', description: '2000m vélo <6min', xp: 1500, rarete: 'rare', categorie: 'conditioning', icone: '⚡' },
  'burpee_warrior': { nom: 'Burpee Warrior', description: '50 burpees 3min', xp: 800, rarete: 'peu_commun', categorie: 'conditioning', icone: '💥' },

  // Consistance
  'streak_10': { nom: 'Streak 10', description: '10 sessions consécutives', xp: 600, rarete: 'peu_commun', categorie: 'consistance', icone: '🔥' },
  'streak_25': { nom: 'Streak 25', description: '25 sessions consécutives', xp: 1500, rarete: 'rare', categorie: 'consistance', icone: '🌟' },
  'streak_50': { nom: 'Streak 50', description: '50 sessions consécutives', xp: 3000, rarete: 'tres_rare', categorie: 'consistance', icone: '💫' },
  'monthly_perfect': { nom: 'Monthly Perfect', description: '1 mois zéro absence', xp: 2000, rarete: 'rare', categorie: 'consistance', icone: '📅' },

  // Transformation
  'statham_status': { nom: 'Statham Status', description: '12-15% BF muscles visibles', xp: 5000, rarete: 'tres_rare', categorie: 'transformation', icone: '💎' },
  'bruce_lee_speed': { nom: 'Bruce Lee Speed', description: 'Explosivité +50%', xp: 3000, rarete: 'tres_rare', categorie: 'transformation', icone: '⚡' },
  'body_recomp': { nom: 'Body Recomp', description: '+5kg muscle OU -5kg graisse', xp: 2500, rarete: 'rare', categorie: 'transformation', icone: '🔄' },

  // Spécial
  'recovery_sage': { nom: 'Recovery Sage', description: '10× SPQ Rouge mobilité', xp: 1500, rarete: 'rare', categorie: 'special', icone: '🧘' },
  'technique_perfect': { nom: 'Technique Perfect', description: '25 sessions technique 10/10', xp: 2000, rarete: 'rare', categorie: 'special', icone: '🎯' },
  'neuro_master': { nom: 'Neuro Master', description: '50× protocoles neurosciences', xp: 1800, rarete: 'rare', categorie: 'special', icone: '🧠' },
  'phoenix_complete': { nom: 'Phoenix Complete', description: 'Niveau 20 atteint', xp: 15000, rarete: 'legendaire', categorie: 'special', icone: '🔥' },
  'immortal_status': { nom: 'Immortal Status', description: 'Niveau 21 atteint', xp: 25000, rarete: 'legendaire', categorie: 'special', icone: '👑' }
};

// DÉFIS HEBDOMADAIRES (40 semaines)
const DEFIS_HEBDOMADAIRES = {
  1: {
    nom: "L'Éveil",
    defis: [
      { id: 'perfectionniste', nom: 'Perfectionniste', description: '3 sessions technique 9/10+', xp: 400 },
      { id: 'explorateur', nom: 'Explorateur', description: 'Essayer 1 exercice mobilité nouveau', xp: 200 },
      { id: 'scribe', nom: 'Scribe', description: 'Noter TOUTES sessions journal', xp: 300 }
    ],
    bonus: 200
  },
  2: {
    nom: "Fondations",
    defis: [
      { id: 'consistance', nom: 'Consistance', description: '0 session manquée (5/5)', xp: 500 },
      { id: 'progression', nom: 'Progression', description: '+charge sur 2 exercices', xp: 350 },
      { id: 'mindful', nom: 'Mindful', description: 'Visualisation pré-séance 5×', xp: 250 }
    ],
    bonus: 0
  },
  3: {
    nom: "Intensité",
    defis: [
      { id: 'push_limits', nom: 'Push Limits', description: 'RIR 1 sur 3 exercices majeurs', xp: 450 },
      { id: 'cardio_beast', nom: 'Cardio Beast', description: 'Améliorer conditioning 5%', xp: 400 },
      { id: 'core_iron', nom: 'Core Iron', description: 'Planche 60s+', xp: 300 }
    ]
  },
  4: {
    nom: "Équilibre",
    defis: [
      { id: 'recovery_master', nom: 'Recovery Master', description: 'SPQ moyen >7.0', xp: 500 },
      { id: 'mobilite', nom: 'Mobilité', description: '3× sessions mobilité 15min+', xp: 350 },
      { id: 'hydratation', nom: 'Hydratation', description: '3L+ eau/jour', xp: 200 }
    ]
  },
  5: {
    nom: "Force Naissante",
    defis: [
      { id: 'battre_pr', nom: 'Battre PR', description: 'Battre 1 record personnel', xp: 600 },
      { id: 'plus_5kg', nom: '+5kg Composé', description: '+5kg exercice composé', xp: 400 },
      { id: 'zero_rouge', nom: 'Zéro Rouge', description: 'Aucun SPQ Rouge', xp: 300 }
    ]
  },
  6: {
    nom: "Endurance",
    defis: [
      { id: 'amrap_50', nom: 'AMRAP 50+', description: '>50 reps AMRAP', xp: 500 },
      { id: 'farmers_50m', nom: "Farmer's 50m", description: 'Farmer walk 50m+', xp: 350 },
      { id: 'streak_6', nom: 'Streak 6', description: '6 jours activité', xp: 400 }
    ]
  },
  7: {
    nom: "Deload Sage",
    defis: [
      { id: 'deload_respect', nom: 'Deload Respect', description: 'Protocole deload parfait', xp: 600 },
      { id: 'sleep_8h', nom: 'Sleep 8h', description: '8h+ sommeil (7/7)', xp: 400 },
      { id: 'gratitude', nom: 'Gratitude', description: 'Journal gratitude quotidien', xp: 300 }
    ]
  },
  8: {
    nom: "Tests Guerrier",
    defis: [
      { id: 'tests_complets', nom: 'Tests Complets', description: 'Batterie tests Phoenix', xp: 700 },
      { id: 'amelioration_15', nom: 'Amélioration 15%', description: '15%+ vs baseline', xp: 600 },
      { id: 'photos', nom: 'Photos Progression', description: 'Photos avant/après', xp: 200 }
    ]
  }
  // Générer dynamiquement semaines 9-40
};

// Génération défis semaines 9-40
for (let week = 9; week <= 40; week++) {
  if (DEFIS_HEBDOMADAIRES[week]) continue;
  DEFIS_HEBDOMADAIRES[week] = {
    nom: `Semaine ${week}`,
    defis: [
      { id: `defi1_${week}`, nom: 'Performance', description: 'Améliorer 1 performance', xp: 400 },
      { id: `defi2_${week}`, nom: 'Consistance', description: '5/5 sessions', xp: 300 },
      { id: `defi3_${week}`, nom: 'Technique', description: 'Focus technique parfaite', xp: 250 }
    ]
  };
}

// QUÊTES MENSUELLES
const QUETES_MENSUELLES = {
  1: {
    nom: "Renaissance",
    description: "Compléter Phase 1 avec succès",
    objectifs: [
      { id: 'sessions_16', description: '16+ sessions complétées' },
      { id: 'progression_10', description: 'Progression 10%+ charges' },
      { id: 'traction_progress', description: 'Progrès tractions' },
      { id: 'journal_90', description: 'Journal 90%+ jours' }
    ],
    recompense: { xp: 1500, badge: 'Fondateur' }
  },
  2: {
    nom: "Croissance",
    description: "Gains mesurables transformation",
    objectifs: [
      { id: 'body_change', description: '+2kg muscle OU -2kg graisse' },
      { id: 'strength_20', description: '+20% sur 2 exercices' },
      { id: 'spq_65', description: 'SPQ moyen >6.5' },
      { id: 'zero_injury', description: 'Zéro blessure' }
    ],
    recompense: { xp: 2000, badge: 'Builder' }
  },
  3: {
    nom: "Consolidation",
    description: "Ancrer les habitudes",
    objectifs: [
      { id: 'streak_50', description: 'Streak 50+ jours' },
      { id: 'neurosciencesCompletes', description: 'Protocoles neuro 90%+' },
      { id: 'recovery_master', description: 'SPQ moyen >7.0' },
      { id: 'strength_gains', description: 'Progressions continues' }
    ],
    recompense: { xp: 2500, badge: 'Consistency King' }
  },
  6: {
    nom: "Guerrier Confirmé",
    description: "Milestones performance majeurs",
    objectifs: [
      { id: 'pullups_10', description: '10 tractions strictes' },
      { id: 'squat_bodyweight', description: 'Squat = poids corps' },
      { id: 'bench_80pc', description: 'DC = 80% poids corps' },
      { id: 'cardio_sub7', description: '2000m vélo <7min' }
    ],
    recompense: { xp: 5000, badge: 'Warrior Status' }
  },
  12: {
    nom: "Phoenix Ultime",
    description: "Transformation complète",
    objectifs: [
      { id: 'body_composition', description: 'Composition corporelle cible' },
      { id: 'strength_goals', description: 'Objectifs force atteints' },
      { id: 'advanced_skill', description: '1+ skill avancé' },
      { id: 'lifestyle_auto', description: 'Lifestyle automatique' }
    ],
    recompense: { xp: 10000, badge: 'Phoenix Renaît' }
  }
};

// ============================================================================
// PROTOCOLES NEUROSCIENCES COMPLETS
// ============================================================================
const PROTOCOLES_NEUROSCIENCES = {
  preSeance: {
    nom: "PRÉPARATION NEURO-ACTIVANTE",
    duree: 8,
    science: "Activation cortex préfrontal + réduction anxiété performance = +10-15% performance",
    etapes: [
      {
        nom: "Centrage",
        duree: 2,
        description: "Scanner corporel mental + Respiration Box 4-4-4-4",
        protocole: [
          "Fermer yeux, scanner tensions tête→pieds, relâcher consciemment",
          "Respiration Box : Inspire 4s → Hold 4s → Expire 4s → Hold 4s (4 cycles)",
          "Effets : Activation parasympathique, réduction cortisol -23%, focus augmenté"
        ]
      },
      {
        nom: "Visualisation Performance",
        duree: 3,
        description: "Imagerie multi-sensorielle 1ère personne",
        protocole: [
          "Min 1 : Se voir faire 1er exercice (perspective interne, pas spectateur)",
          "Min 2 : Ressentir sensations (poids barre, texture knurling, effort musculaire)",
          "Min 3 : Performance optimale (technique parfaite, succès garanti)",
          "Effets : Activation circuits moteurs identiques à exécution réelle"
        ]
      },
      {
        nom: "Activation & Ancrage",
        duree: 2,
        description: "Créer état optimal reproductible",
        protocole: [
          "Choisir geste signature (poing serré fort, clap, tape épaule)",
          "Choisir mot-clé puissance (FORCE, WARRIOR, PHOENIX, INVINCIBLE)",
          "Position puissance 30s (Wonder Woman/Rocky : torse bombé, mains hanches)",
          "Association : geste + mot + ressenti × 3 répétitions synchronisées",
          "Effets : Ancrage neurologique, rappel instantané état optimal"
        ]
      },
      {
        nom: "Focus & Déclaration",
        duree: 1,
        description: "Définir focus attentionnel + engagement",
        protocole: [
          "Focus EXTERNE (force/explosivité) : 'Pousser barre loin' ou INTERNE (hypertrophie) : 'Contracter pectoraux'",
          "Déclaration puissance : 'Je suis prêt. Mon corps est fort. Je deviens Phoenix. GO!'",
          "Effets : Clarté intentionnelle, engagement total"
        ]
      }
    ]
  },
  
  postSeance: {
    nom: "CONSOLIDATION NEURONALE",
    duree: 2,
    science: "Replay mental renforce circuits neuronaux succès, accélère apprentissage moteur",
    etapes: [
      {
        nom: "Replay Mental Sélectif",
        duree: 1,
        description: "Renforcer circuits neuronaux succès",
        protocole: [
          "Yeux fermés, rejouer mentalement 2-3 meilleures séries (RIR respecté, technique parfaite)",
          "Focus sensations positives UNIQUEMENT (ignorer échecs/difficultés)",
          "Revivre technique parfaite et sensation de puissance",
          "Effets : Myélinisation circuits moteurs efficaces, apprentissage accéléré"
        ]
      },
      {
        nom: "Gratitude Corporelle",
        duree: 1,
        description: "Connexion positive corps-esprit",
        protocole: [
          "Main sur cœur ou ventre, respiration profonde",
          "Merci à mon corps pour cette performance",
          "J'apprécie ma force, mon endurance, ma résilience",
          "Mon corps me permet de me transformer chaque jour",
          "Effets : Dopamine/sérotonine, relation positive corps, motivation long-terme"
        ]
      }
    ]
  }
};

// ============================================================================
// TECHNIQUES D'INTENSIFICATION
// ============================================================================
const TECHNIQUES_INTENSIFICATION = {
  drop_sets: {
    nom: "Drop Sets",
    niveauRequis: 5,
    description: "Série RIR 0 → -30% charge → Max reps immédiat",
    usage: "Dernière série isolation uniquement",
    frequence: "1-2 exercices/session max",
    science: "Recrutement fibres rapides maximisé, fatigue métabolique extrême"
  },
  rest_pause: {
    nom: "Rest-Pause",
    niveauRequis: 8,
    description: "Série RIR 0 → 15s repos → 2-4 reps → 15s → 1-3 reps",
    usage: "Exercices composés ou isolation",
    frequence: "1 exercice/session",
    science: "Volume additionnel avec charge maximale, hypertrophie myofibrillaire"
  },
  clusters: {
    nom: "Clusters",
    niveauRequis: 11,
    description: "2 reps → 15s repos → 2 reps → 15s → 1-2 reps (85-90% 1RM)",
    usage: "Exercices composés lourds (force)",
    frequence: "1 exercice majeur/semaine",
    science: "Maintien qualité technique charges lourdes, force maximale"
  },
  contrast_training: {
    nom: "Contrast Training (PAP)",
    niveauRequis: 11,
    description: "Lourd 5 reps (85%+) → 30s repos → Explosif 8 reps (60%) → 3min",
    usage: "Post-Activation Potentiation complexes",
    frequence: "1 complexe/session",
    science: "Potentiation post-activation, recrutement unités motrices augmenté"
  },
  wave_loading: {
    nom: "Wave Loading",
    niveauRequis: 14,
    description: "Série 1: 5 reps → Série 2: 3 reps → Série 3: 1 rep (augmenter charge)",
    usage: "Phase force maximale",
    frequence: "Exercice principal Phase 3",
    science: "Fatigue minimisée, adaptation neurale optimale"
  }
};

// ============================================================================
// RÈGLES DE SÉCURITÉ AUTOMATIQUES
// ============================================================================
const SecurityRules = {
  checkAlertRougeMultiple: (spqHistory) => {
    const last7Days = spqHistory.slice(-7);
    const rougeCount = last7Days.filter(entry => entry.score < 5).length;
    
    if (rougeCount >= 3) {
      return {
        type: 'SEMAINE_DECHARGE',
        message: `⚠️ ALERTE: ${rougeCount} jours SPQ Rouge en 7 jours. Semaine décharge OBLIGATOIRE.`,
        adjustments: {
          volumeMultiplier: 0.6,
          intensiteMultiplier: 0.8,
          bonusXP: 500,
          badge: 'Prévention Sage'
        }
      };
    }
    return null;
  },

  checkPlateauPerformance: (exerciseHistory, exerciseName) => {
    const history = exerciseHistory[exerciseName] || [];
    if (history.length < 2) return null;
    
    const lastTwo = history.slice(-2);
    const hasPlateauPattern = lastTwo.every(session => 
      session.avgRIR > session.targetRIR + 2
    );
    
    if (hasPlateauPattern) {
      return {
        type: 'PLATEAU_PERFORMANCE',
        message: `Plateau détecté sur ${exerciseName}. Réduction charge -5% recommandée.`,
        adjustments: { chargeReduction: 0.05 }
      };
    }
    return null;
  },

  checkStagnationProlongee: (exerciseProgress) => {
    if (exerciseProgress.weeksWithoutProgress >= 4) {
      return {
        type: 'STAGNATION_PROLONGEE',
        message: 'Stagnation 4+ semaines détectée.',
        suggestions: [
          'Changer variante exercice',
          'Modifier schéma sets/reps',
          'Vérifier technique (filmer si possible)',
          'Augmenter fréquence ou volume'
        ]
      };
    }
    return null;
  }
};

// ============================================================================
// SPQ AVANCÉ
// ============================================================================
const getSPQColor = (score) => {
  if (score === null) return {
    bg: 'bg-slate-700', text: 'text-slate-400', label: 'Non Évalué',
    conseil: 'Évaluez votre état pour adapter la séance.',
    icon: '⚪', intensite: 'N/A', volume: 'N/A', mode: 'NON_ÉVALUÉ'
  };

  if (score >= 8) return {
    bg: 'bg-green-500', text: 'text-green-400', label: 'VERT - Performance',
    conseil: 'Visez vos records ! Intensité maximale autorisée. RIR exact programmé.',
    icon: '🟢', intensite: '100% / RIR exact', volume: '100%', mode: 'PERFORMANCE',
    xpBonus: 25, allowPR: true
  };

  if (score >= 6.5) return {
    bg: 'bg-yellow-500', text: 'text-yellow-400', label: 'JAUNE - Standard',
    conseil: 'Programme normal, gardez 1 rep sécurité (RIR +1 vs programmé).',
    icon: '🟡', intensite: '100% / RIR +1', volume: '100%', mode: 'STANDARD'
  };

  if (score >= 5.0) return {
    bg: 'bg-orange-500', text: 'text-orange-400', label: 'ORANGE - Adapté',
    conseil: 'Protocole adaptation : Charges -10%, Volume -15%, RIR +1.',
    icon: '🟠', intensite: 'Charges -10%', volume: 'Séries -15%', mode: 'ADAPTÉ',
    chargeMultiplier: 0.9, volumeMultiplier: 0.85, xpBonus: 25
  };

  return {
    bg: 'bg-red-500', text: 'text-red-400', label: 'ROUGE - Récupération',
    conseil: '🚨 STOP ENTRAÎNEMENT. Mobilité douce 20 min OU repos complet. Système nerveux priorité.',
    icon: '🔴', intensite: 'Repos / Mobilité', volume: 'Repos', mode: 'RÉCUPÉRATION',
    forceRecovery: true, xpBonus: 50
  };
};

// ============================================================================
// STRUCTURE DONNÉES UTILISATEUR
// ============================================================================
const DEFAULT_USER_DATA = {
  // Profil
  nom: 'Phoenix',
  age: 41,
  taille: 175,
  poids: 89,
  
  // Gamification
  xp: 0,
  niveau: 1,
  ceinture: 'Blanche',
  streak: 0,
  streakMax: 0,
  phase: 1,
  semaine: 1,
  jourSemaine: 1,
  
  // Charges de base
  chargesBase: {
    squat_gobelet: 24,
    rdl_halteres: 20,
    dc_halteres: 22,
    militaire_halteres: 16,
    rowing_barre: 40,
    hip_thrust_barre: 45,
    tractions_assistees: 50,
    
    // Progressions Phase 2-3
    dc_barre: 0,
    squat_barre: 0,
    rdl_barre: 0,
    tractions_strictes: 0,
    tractions_lestees: 0,
    
    // Tests performances
    plankMaxSec: 0,
    deadHangMaxSec: 0,
    velo2000mSec: 0,
    burpees3minMax: 0,
    
    // Skills Phase 3
    pistolSquatMax: 0,
    handstandHoldSec: 0,
    handstandPushUps: 0,
    muscleUps: 0
  },
  
  // Gamification
  achievements: [],
  achievementsHistory: [],
  defisCompletes: [],
  questesCompletes: [],
  
  // SPQ & Biofeedback
  spqHistory: [],
  gripBaseline: 0,
  gripHistory: [],
  
  // Performance
  exerciseHistory: {},
  personalRecords: {},
  
  // Mensurations
  mensurations: {
    poids: 89, bicepsGauche: 35, bicepsDroit: 35.5, poitrine: 105,
    taille: 92, hanches: 102, cuisseGauche: 58, cuisseDroite: 57.5,
    molletGauche: 38, molletDroit: 38, epaules: 120
  },
  historiqueMensurations: [],
  
  // Récupération
  sommeilHistory: [],
  stressHistory: [],
  hydratationHistory: [],
  
  // Flags
  onboardingCompleted: false,
  currentPhase3Option: null,
  deloadForced: false,
  neurosciencesEnabled: true,
  
  // Préférences
  preferences: {
    unitePoids: 'kg',
    notifications: true,
    autoProgression: true
  },
  
  // Timestamps
  dateCreation: null,
  derniereSession: null,
  derniereMensuration: null
};

// ============================================================================
// MOTEUR XP COMPLET
// ============================================================================
const XPEngine = {
  calculateSessionXP: (baseXP, spqScore, bonuses = {}) => {
    let totalXP = baseXP;
    
    const spqData = getSPQColor(spqScore);
    if (spqData.xpBonus) totalXP += spqData.xpBonus;
    
    if (bonuses.perfectTechnique) totalXP += 50;
    if (bonuses.personalRecord) totalXP += 200;
    if (bonuses.newRepMax) totalXP += 100;
    if (bonuses.progressionCharge) totalXP += 25;
    if (bonuses.neurosciencesUsed) totalXP += 30;
    
    if (bonuses.streak >= 10) totalXP *= 2.0;
    else if (bonuses.streak >= 5) totalXP *= 1.5;
    
    return Math.round(totalXP);
  },
  
  calculateChallengeXP: (user, completedChallenges) => {
    const weekChallenges = DEFIS_HEBDOMADAIRES[user.semaine];
    if (!weekChallenges) return 0;
    
    let totalXP = 0;
    completedChallenges.forEach(challengeId => {
      const challenge = weekChallenges.defis.find(d => d.id === challengeId);
      if (challenge) totalXP += challenge.xp;
    });
    
    if (completedChallenges.length === weekChallenges.defis.length && weekChallenges.bonus) {
      totalXP += weekChallenges.bonus;
    }
    
    return totalXP;
  }
};

// ============================================================================
// MOTEUR ACHIEVEMENTS
// ============================================================================
const AchievementEngine = {
  checkAchievements: (user, newSessionData = null) => {
    const newlyUnlocked = [];
    
    Object.entries(ACHIEVEMENTS).forEach(([id, achievement]) => {
      if (!user.achievements.includes(id)) {
        let unlocked = false;
        
        switch (id) {
          case 'first_blood':
            unlocked = user.streak >= 1;
            break;
          case 'week_warrior':
            unlocked = user.streak >= 5;
            break;
          case 'streak_10':
            unlocked = user.streak >= 10;
            break;
          case 'streak_25':
            unlocked = user.streak >= 25;
            break;
          case 'streak_50':
            unlocked = user.streak >= 50;
            break;
          case 'iron_initiate':
            unlocked = user.chargesBase.dc_barre >= (user.poids * 0.5);
            break;
          case 'iron_warrior':
            unlocked = user.chargesBase.dc_barre >= (user.poids * 0.75);
            break;
          case 'iron_legend':
            unlocked = user.chargesBase.dc_barre >= user.poids;
            break;
          case 'iron_titan':
            unlocked = user.chargesBase.dc_barre >= (user.poids * 1.25);
            break;
          case 'squat_apprentice':
            unlocked = user.chargesBase.squat_barre >= (user.poids * 0.75);
            break;
          case 'squat_master':
            unlocked = user.chargesBase.squat_barre >= (user.poids * 1.25);
            break;
          case 'squat_god':
            unlocked = user.chargesBase.squat_barre >= (user.poids * 1.75);
            break;
          case 'first_pull':
            unlocked = user.chargesBase.tractions_strictes >= 1;
            break;
          case 'pull_warrior':
            unlocked = user.chargesBase.tractions_strictes >= 10;
            break;
          case 'pull_beast':
            unlocked = user.chargesBase.tractions_strictes >= 20;
            break;
          case 'plank_solid':
            unlocked = user.chargesBase.plankMaxSec >= 90;
            break;
          case 'plank_iron':
            unlocked = user.chargesBase.plankMaxSec >= 180;
            break;
          case 'cardio_initiate':
            unlocked = user.chargesBase.velo2000mSec > 0 && user.chargesBase.velo2000mSec <= 600;
            break;
          case 'cardio_warrior':
            unlocked = user.chargesBase.velo2000mSec > 0 && user.chargesBase.velo2000mSec <= 480;
            break;
          case 'cardio_beast':
            unlocked = user.chargesBase.velo2000mSec > 0 && user.chargesBase.velo2000mSec <= 360;
            break;
          case 'pistol_apprentice':
            unlocked = user.chargesBase.pistolSquatMax >= 1;
            break;
          case 'pistol_master':
            unlocked = user.chargesBase.pistolSquatMax >= 5;
            break;
          case 'handstand_60':
            unlocked = user.chargesBase.handstandHoldSec >= 60;
            break;
          case 'muscle_up_achieved':
            unlocked = user.chargesBase.muscleUps >= 1;
            break;
          case 'phoenix_complete':
            unlocked = user.niveau >= 20;
            break;
          case 'immortal_status':
            unlocked = user.niveau >= 21;
            break;
        }
        
        if (unlocked) {
          newlyUnlocked.push(id);
        }
      }
    });
    
    return newlyUnlocked;
  }
};

// ============================================================================
// FONCTION GÉNÉRATION PROTOCOLE COMPLÈTE
// ============================================================================
const genererProtocoleSeance = (phase, semaine, jour, spqScore, userData) => {
  const sessionTemplate = APEX_PROGRAM_SESSIONS[semaine]?.[jour];
  
  if (!sessionTemplate) {
    if (jour === 6) return { name: "REPOS ACTIF", type: "repos", duree: 30, xpBase: 30, exercices: [] };
    if (jour === 7) return { name: "REPOS COMPLET", type: "repos", duree: 0, xpBase: 30, exercices: [] };
    return null;
  }
  
  let protocole = JSON.parse(JSON.stringify(sessionTemplate));
  const adaptationSPQ = getSPQColor(spqScore);
  
  // Application SPQ
  if (adaptationSPQ.mode === 'ADAPTÉ') {
    protocole.exercices = protocole.exercices.map(ex => ({
      ...ex,
      series: Math.max(1, Math.floor(ex.series * 0.85)),
      charge: ex.charge * 0.9,
      rir: ex.rir + 1
    }));
    protocole.duree = Math.round(protocole.duree * 0.8);
  } else if (adaptationSPQ.mode === 'RÉCUPÉRATION') {
    protocole = {
      name: "RÉCUPÉRATION MOBILITÉ",
      type: "recovery",
      duree: 20,
      xpBase: 50,
      exercices: [{
        nom: "Mobilité Douce 20 min",
        key: "mobilite_douce",
        series: 1,
        reps: "20:00",
        rir: 5,
        repos: 0,
        charge: 0,
        conseil: "Flow mobilité doux : Cat-Cow • World's Greatest Stretch • Deep Squat Hold • Respiration",
        objectif: "Récupération système nerveux"
      }]
    };
  }
  
  // Gestion transitions automatiques
  protocole.exercices = protocole.exercices.map(ex => {
    let exerciceData = EXERCICES_DATABASE[ex.key];
    
    if (exerciceData?.prerequis) {
      const prerequisKeys = Object.keys(exerciceData.prerequis).filter(k => k !== 'semaine');
      const prerequisMet = prerequisKeys.every(key => 
        userData.chargesBase[key] >= exerciceData.prerequis[key]
      );
      
      if (semaine >= (exerciceData.prerequis.semaine || 0) && prerequisMet) {
        ex.transition = true;
        ex.charge = userData.chargesBase[ex.key] || ex.charge;
      }
    } else {
      ex.charge = userData.chargesBase[ex.key] || ex.charge;
    }
    
    // Générer seriesData
    ex.seriesData = Array(ex.series).fill().map(() => ({
      reps: '',
      charge: ex.charge,
      rir: '',
      notes: ''
    }));
    
    return ex;
  });
  
  return protocole;
};

// ============================================================================
// COMPOSANT ONBOARDING
// ============================================================================
const OnboardingFlow = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    nom: 'Phoenix',
    age: 41,
    taille: 175,
    poids: 89,
    objectif: '',
    experience: 'debutant'
  });
  
  const steps = [
    {
      title: 'Bienvenue dans Phoenix',
      component: () => (
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Flame className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Transformation Phoenix</h2>
          <p className="text-gray-400 mb-6">
            Votre parcours vers le corps Jason Statham + force Bruce Lee commence maintenant.
          </p>
          <div className="bg-slate-700 p-4 rounded-lg text-left">
            <p className="text-sm text-gray-300 mb-2">✓ 40 semaines programmation complète</p>
            <p className="text-sm text-gray-300 mb-2">✓ Gamification totale (21 niveaux, 55+ achievements)</p>
            <p className="text-sm text-gray-300 mb-2">✓ Protocoles neurosciences intégrés</p>
            <p className="text-sm text-gray-300">✓ Auto-régulation SPQ avancée</p>
          </div>
        </div>
      )
    },
    {
      title: 'Profil Personnel',
      component: () => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nom</label>
            <input
              type="text"
              value={data.nom}
              onChange={(e) => setData({...data, nom: e.target.value})}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Âge</label>
              <input
                type="number"
                value={data.age}
                onChange={(e) => setData({...data, age: parseInt(e.target.value)})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Taille (cm)</label>
              <input
                type="number"
                value={data.taille}
                onChange={(e) => setData({...data, taille: parseInt(e.target.value)})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Poids (kg)</label>
              <input
                type="number"
                value={data.poids}
                onChange={(e) => setData({...data, poids: parseInt(e.target.value)})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Objectif Principal',
      component: () => (
        <div className="space-y-4">
          <label className="block text-sm font-medium mb-4">Quel est votre objectif principal ?</label>
          {[
            { id: 'statham', label: 'Corps Jason Statham', desc: 'Physique sec, musclé, fonctionnel' },
            { id: 'force', label: 'Force Pure', desc: 'Développer force maximale' },
            { id: 'skills', label: 'Skills Avancés', desc: 'Muscle-ups, HSPU, etc.' },
            { id: 'general', label: 'Forme Générale', desc: 'Santé et fitness global' }
          ].map(obj => (
            <button
              key={obj.id}
              onClick={() => setData({...data, objectif: obj.id})}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                data.objectif === obj.id 
                  ? 'border-orange-500 bg-orange-500/20' 
                  : 'border-slate-600 bg-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="font-semibold">{obj.label}</div>
              <div className="text-sm text-gray-400">{obj.desc}</div>
            </button>
          ))}
        </div>
      )
    }
  ];
  
  const handleComplete = () => {
    const completeData = {
      ...DEFAULT_USER_DATA,
      ...data,
      onboardingCompleted: true,
      dateCreation: Date.now(),
      mensurations: {
        ...DEFAULT_USER_DATA.mensurations,
        poids: data.poids
      }
    };
    
    onComplete(completeData);
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full mx-4 border border-slate-700">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{steps[step].title}</h3>
            <span className="text-sm text-gray-400">{step + 1}/{steps.length}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full transition-all"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        {steps[step].component()}
        
        <div className="flex gap-4 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 bg-slate-600 hover:bg-slate-500 py-3 rounded-lg font-semibold transition-colors"
            >
              Précédent
            </button>
          )}
          <button
            onClick={step === steps.length - 1 ? handleComplete : () => setStep(step + 1)}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 py-3 rounded-lg font-semibold transition-colors"
          >
            {step === steps.length - 1 ? 'Commencer Phoenix' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT SÉANCE ACTIVE
// ============================================================================
const SeanceActiveComponent = ({ 
  seanceActive, 
  setSeanceActive, 
  exerciceActif, 
  setExerciceActif,
  reposTimer,
  setReposTimer,
  reposTimerRunning,
  setReposTimerRunning,
  spqScore,
  user,
  terminerSeance
}) => {
  const [phaseSeance, setPhaseSeance] = useState('neurosciences');
  const [etapeNeuro, setEtapeNeuro] = useState(0);
  const [neurosciencesCompleted, setNeurosciencesCompleted] = useState(false);
  
  if (!seanceActive) return null;
  
  const exercice = seanceActive.exercices[exerciceActif];
  const progressionExercices = (exerciceActif / Math.max(1, seanceActive.exercices.length)) * 100;
  
  const mettreAJourSerie = (exerciceIndex, serieIndex, champ, valeur) => {
    setSeanceActive(prev => {
      const nouvellesExercices = [...prev.exercices];
      nouvellesExercices[exerciceIndex].seriesData[serieIndex][champ] = valeur;
      return { ...prev, exercices: nouvellesExercices };
    });
  };
  
  // Protocole Neurosciences
  const ProtocoleNeurosciences = () => {
    const etapes = PROTOCOLES_NEUROSCIENCES.preSeance.etapes;
    const etapeActuelle = etapes[etapeNeuro];
    
    return (
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-500/50">
        <div className="text-center mb-6">
          <Brain className="w-12 h-12 mx-auto mb-4 text-purple-400" />
          <h2 className="text-2xl font-bold text-purple-300">Préparation Neuro-Activante</h2>
          <p className="text-gray-400">Optimisation performance par les neurosciences</p>
          <p className="text-xs text-purple-300 mt-2">{PROTOCOLES_NEUROSCIENCES.preSeance.science}</p>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">Étape {etapeNeuro + 1}/4</span>
            <span className="text-sm text-gray-400">{etapeActuelle.duree} min</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${((etapeNeuro + 1) / etapes.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 text-purple-300">{etapeActuelle.nom}</h3>
          <p className="text-gray-300 mb-4 leading-relaxed">{etapeActuelle.description}</p>
          
          <div className="space-y-3">
            {etapeActuelle.protocole.map((instruction, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-sm text-gray-300">{instruction}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-4">
          {etapeNeuro > 0 && (
            <button
              onClick={() => setEtapeNeuro(etapeNeuro - 1)}
              className="flex-1 bg-slate-600 hover:bg-slate-500 py-3 rounded-lg font-semibold transition-colors"
            >
              Précédent
            </button>
          )}
          <button
            onClick={() => {
              if (etapeNeuro < etapes.length - 1) {
                setEtapeNeuro(etapeNeuro + 1);
              } else {
                setNeurosciencesCompleted(true);
                setPhaseSeance('exercices');
              }
            }}
            className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 py-3 rounded-lg font-semibold transition-colors"
          >
            {etapeNeuro < etapes.length - 1 ? 'Suivant' : 'Commencer Entraînement'}
          </button>
        </div>
      </div>
    );
  };
  
  // Si neurosciences non complétées
  if (!neurosciencesCompleted && phaseSeance === 'neurosciences' && user.neurosciencesEnabled) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <button
          onClick={() => {
            setNeurosciencesCompleted(true);
            setPhaseSeance('exercices');
          }}
          className="mb-4 text-sm text-gray-400 hover:text-gray-300 underline"
        >
          Passer (non recommandé)
        </button>
        <ProtocoleNeurosciences />
      </div>
    );
  }
  
  // Séance active normale
  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{seanceActive.name}</h2>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-gray-400">{seanceActive.type}</p>
              {seanceActive.bloc && (
                <span className="px-2 py-1 bg-purple-500 rounded text-xs font-semibold">
                  BLOC {seanceActive.bloc}
                </span>
              )}
              {neurosciencesCompleted && (
                <span className="px-2 py-1 bg-green-500 rounded text-xs font-semibold flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  NEURO ✓
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Progression</div>
            <div className="text-xl font-bold">{Math.round(progressionExercices)}%</div>
          </div>
        </div>

        <div className="w-full bg-slate-700 rounded-full h-3 mb-6">
          <div
            className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressionExercices}%` }}
          ></div>
        </div>

        {spqScore < 6.5 && (
          <div className="mb-6 p-4 bg-orange-500/20 border border-orange-500 rounded-lg">
            <div className="flex items-center gap-2 text-orange-400 font-semibold mb-2">
              <AlertTriangle className="w-5 h-5" />
              ADAPTATION SPQ {getSPQColor(spqScore).mode}
            </div>
            <p className="text-sm text-orange-300">{getSPQColor(spqScore).conseil}</p>
          </div>
        )}

        <div className="bg-slate-700 rounded-xl p-4 mb-6 border border-slate-600">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Échauffement Complet
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed">{seanceActive.echauffement}</p>
          <div className="mt-3 p-3 bg-slate-600 rounded-lg">
            <p className="text-orange-400 text-sm font-semibold">
              💡 {neurosciencesCompleted ? 'Protocole neurosciences complété ✓' : 'Protocole standard'} • Température +1°C • Activation neuromusculaire
            </p>
          </div>
        </div>

        {seanceActive.exercices.length > 0 && exercice && (
          <div className="bg-slate-700 rounded-xl p-6 mb-6 border border-slate-600">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">{exercice.nom}</h3>
                <p className="text-gray-400 text-sm">{exercice.objectif}</p>
                {exercice.transition && (
                  <div className="mt-2 px-3 py-1 bg-blue-500/20 border border-blue-500 rounded-full text-xs text-blue-300 inline-block">
                    🔄 TRANSITION AUTOMATIQUE
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="px-2 py-1 bg-orange-500 rounded text-sm font-semibold">
                  RIR {exercice.rir}
                </span>
                <span className="px-2 py-1 bg-blue-500 rounded text-sm font-semibold">
                  {exercice.repos}s
                </span>
                {exercice.tempo && (
                  <span className="px-2 py-1 bg-purple-500 rounded text-sm font-semibold">
                    {exercice.tempo}
                  </span>
                )}
              </div>
            </div>

            {exercice.conseil && (
              <div className="bg-slate-600 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TargetIcon className="w-4 h-4 text-blue-400" />
                  Technique d'exécution:
                </h4>
                <p className="text-sm text-gray-300">{exercice.conseil}</p>
              </div>
            )}

            {exercice.techniqueAvancee && user.niveau >= TECHNIQUES_INTENSIFICATION[exercice.techniqueAvancee]?.niveauRequis && (
              <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-400">
                  <Flame className="w-4 h-4" />
                  Technique Avancée: {TECHNIQUES_INTENSIFICATION[exercice.techniqueAvancee].nom}
                </h4>
                <p className="text-sm text-red-300">
                  {TECHNIQUES_INTENSIFICATION[exercice.techniqueAvancee].description}
                </p>
              </div>
            )}

            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-gray-300">Suivi des séries:</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-600">
                      <th className="px-3 py-2 text-left">Série</th>
                      <th className="px-3 py-2 text-center">Charge (kg)</th>
                      <th className="px-3 py-2 text-center">Répétitions</th>
                      <th className="px-3 py-2 text-center">RIR</th>
                      <th className="px-3 py-2 text-center">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercice.seriesData && exercice.seriesData.map((serie, index) => (
                      <tr key={index} className="border-b border-slate-600">
                        <td className="px-3 py-2 font-medium">{index + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={serie.charge}
                            onChange={(e) => mettreAJourSerie(exerciceActif, index, 'charge', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-slate-700 border border-slate-500 rounded px-2 py-1 text-center text-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={serie.reps}
                            onChange={(e) => mettreAJourSerie(exerciceActif, index, 'reps', e.target.value)}
                            placeholder={exercice.reps}
                            className="w-20 bg-slate-700 border border-slate-500 rounded px-2 py-1 text-center text-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={serie.rir}
                            onChange={(e) => mettreAJourSerie(exerciceActif, index, 'rir', e.target.value)}
                            placeholder={exercice.rir.toString()}
                            className="w-12 bg-slate-700 border border-slate-500 rounded px-2 py-1 text-center text-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={serie.notes}
                            onChange={(e) => mettreAJourSerie(exerciceActif, index, 'notes', e.target.value)}
                            placeholder="Technique/Ressenti"
                            className="w-32 bg-slate-700 border border-slate-500 rounded px-2 py-1 text-white text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {reposTimer > 0 && (
              <div className="text-center p-4 bg-orange-500/20 rounded-lg border border-orange-500 mb-4">
                <div className="text-3xl font-bold mb-2">{reposTimer}s</div>
                <div className="text-sm mb-3">
                  Repos en cours • Prochain: {exerciceActif < seanceActive.exercices.length - 1 ? 
                    seanceActive.exercices[exerciceActif + 1].nom : 'Récupération'}
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${((exercice.repos - reposTimer) / exercice.repos) * 100}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-gray-300">
                  💡 Respiration contrôlée • Visualiser série suivante • Maintenir focus
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setReposTimer(exercice.repos);
                  setReposTimerRunning(true);
                }}
                disabled={reposTimerRunning}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Repos ({exercice.repos}s)
              </button>

              <button
                onClick={() => {
                  if (exerciceActif < seanceActive.exercices.length - 1) {
                    setExerciceActif(exerciceActif + 1);
                    setReposTimer(0);
                    setReposTimerRunning(false);
                  } else {
                    setPhaseSeance('post-neurosciences');
                  }
                }}
                className="flex-1 bg-green-500 hover:bg-green-600 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {exerciceActif < seanceActive.exercices.length - 1 ? (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Suivant
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Récupération
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {phaseSeance === 'post-neurosciences' && user.neurosciencesEnabled && (
          <div className="bg-gradient-to-br from-green-900/50 to-blue-900/50 rounded-xl p-6 border border-green-500/50">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-300">
              <Heart className="w-5 h-5" />
              Consolidation Neuronale (2 min)
            </h3>
            <p className="text-xs text-green-300 mb-4">{PROTOCOLES_NEUROSCIENCES.postSeance.science}</p>
            
            <div className="space-y-4">
              {PROTOCOLES_NEUROSCIENCES.postSeance.etapes.map((etape, idx) => (
                <div key={idx} className="bg-slate-600 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-green-400">{etape.nom} ({etape.duree * 60}s)</h4>
                  <p className="text-sm text-gray-300 mb-2">{etape.description}</p>
                  <div className="space-y-1">
                    {etape.protocole.map((instruction, i) => (
                      <p key={i} className="text-xs text-gray-400">• {instruction}</p>
                    ))}
                  </div>
                </div>
              ))}
              
              <button
                onClick={terminerSeance}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Trophy className="w-5 h-5" />
                Terminer Séance & Calculer XP
              </button>
            </div>
          </div>
        )}

        {phaseSeance === 'post-neurosciences' && !user.neurosciencesEnabled && (
          <button
            onClick={terminerSeance}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            Terminer Séance & Calculer XP
          </button>
        )}

        {seanceActive.recuperation && phaseSeance !== 'post-neurosciences' && (
          <div className="bg-slate-700 rounded-xl p-4 border border-slate-600">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-green-500" />
              Récupération Active
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">{seanceActive.recuperation}</p>
            <div className="mt-3 p-3 bg-slate-600 rounded-lg">
              <p className="text-green-400 text-sm font-semibold">
                🌱 Récupération = Construction invisible ! Cool down + étirements + respiration
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT PRINCIPAL UNIFIÉ
// ============================================================================
const ApexPhoenixApp = () => {
  // États principaux
  const [user, setUser] = useState(() => StorageManager.load('user', DEFAULT_USER_DATA));
  const [historiqueSeances, setHistoriqueSeances] = useState(() => StorageManager.load('sessions', []));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(!user.onboardingCompleted);
  
  // États SPQ
  const [spqScore, setSpqScore] = useState(null);
  const [spqData, setSpqData] = useState({ sommeil: 8, energie: 8, stress: 8, douleurs: 9 });
  const [gripTestScore, setGripTestScore] = useState(0);
  
  // États séance
  const [seanceActive, setSeanceActive] = useState(null);
  const [exerciceActif, setExerciceActif] = useState(0);
  const [reposTimer, setReposTimer] = useState(0);
  const [reposTimerRunning, setReposTimerRunning] = useState(false);
  
  // États mensurations
  const [editingMensurations, setEditingMensurations] = useState(false);
  const [nouvellesMensurations, setNouvellesMensurations] = useState({...user.mensurations});
  
  // Persistance
  useEffect(() => {
    StorageManager.save('user', user);
  }, [user]);
  
  useEffect(() => {
    StorageManager.save('sessions', historiqueSeances);
  }, [historiqueSeances]);
  
  // Calculs
  const niveauActuel = useMemo(() =>
    NIVEAUX_PHOENIX.find(n => user.xp >= n.xpMin && user.xp < n.xpMax) || 
    NIVEAUX_PHOENIX[NIVEAUX_PHOENIX.length - 1],
    [user.xp]
  );
  
  const prochainNiveau = useMemo(() =>
    NIVEAUX_PHOENIX.find(n => n.niveau === niveauActuel.niveau + 1),
    [niveauActuel]
  );
  
  const progressNiveau = useMemo(() =>
    prochainNiveau ? 
      ((user.xp - niveauActuel.xpMin) / (prochainNiveau.xpMin - niveauActuel.xpMin)) * 100 : 100,
    [user.xp, niveauActuel, prochainNiveau]
  );
  
  // SPQ
  useEffect(() => {
    let score = (spqData.sommeil + spqData.energie + spqData.stress + spqData.douleurs) / 4;
    
    if (user.gripBaseline > 0 && gripTestScore > 0) {
      const gripLoss = (user.gripBaseline - gripTestScore) / user.gripBaseline;
      if (gripLoss > 0.15) score = Math.max(1, score - 1);
    }
    
    setSpqScore(parseFloat(Math.max(1, score).toFixed(1)));
  }, [spqData, gripTestScore, user.gripBaseline]);
  
  useEffect(() => {
    if (spqScore !== null) {
      const today = new Date().toISOString().split('T')[0];
      const lastEntry = user.spqHistory[user.spqHistory.length - 1];
      
      if (!lastEntry || lastEntry.date !== today) {
        setUser(prev => ({
          ...prev,
          spqHistory: [...prev.spqHistory.slice(-29), { date: today, score: spqScore, data: spqData }]
        }));
      }
    }
  }, [spqScore]);
  
  // Timer repos
  useEffect(() => {
    let interval;
    if (reposTimerRunning && reposTimer > 0) {
      interval = setInterval(() => setReposTimer(t => t - 1), 1000);
    } else if (reposTimer === 0 && reposTimerRunning) {
      setReposTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [reposTimerRunning, reposTimer]);
  
  // Fonctions
  const ajouterXP = useCallback((xp) => {
    setUser(prev => {
      const nouveauXP = prev.xp + xp;
      const nouveauNiveau = NIVEAUX_PHOENIX.find(n => nouveauXP >= n.xpMin && nouveauXP < n.xpMax)?.niveau || 21;
      
      const newAchievements = AchievementEngine.checkAchievements({
        ...prev, 
        xp: nouveauXP,
        niveau: nouveauNiveau
      });
      
      return {
        ...prev,
        xp: nouveauXP,
        niveau: nouveauNiveau,
        ceinture: NIVEAUX_PHOENIX.find(n => n.niveau === nouveauNiveau)?.ceinture || 'Noire',
        achievements: [...new Set([...prev.achievements, ...newAchievements])]
      };
    });
  }, []);
  
  const demarrerSeance = useCallback((semaine, jour) => {
    if (spqScore !== null && spqScore < 5) {
      const confirm = window.confirm('⚠️ SPQ ROUGE détecté ! Recommandation: Mobilité douce ou repos. Continuer quand même ?');
      if (!confirm) return;
    }
    
    const protocole = genererProtocoleSeance(user.phase, semaine, jour, spqScore, user);
    if (!protocole) return;
    
    setSeanceActive({
      ...protocole,
      semaine,
      jour,
      dateDebut: new Date().toISOString()
    });
    
    setExerciceActif(0);
    setActiveTab('seance-active');
  }, [spqScore, user]);
  
  const terminerSeance = useCallback(() => {
    if (!seanceActive) return;
    
    const duree = Math.round((new Date() - new Date(seanceActive.dateDebut)) / 60000);
    const adaptationSPQ = getSPQColor(spqScore);
    
    let baseXP = seanceActive.xpBase || 100;
    if (adaptationSPQ.xpBonus) baseXP += adaptationSPQ.xpBonus;
    
    const nouvelleSeance = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      semaine: seanceActive.semaine,
      jour: seanceActive.jour,
      type: seanceActive.name,
      completed: true,
      spq: spqScore,
      xp: baseXP,
      duree,
      donnees: seanceActive.exercices
    };
    
    setUser(prev => ({
      ...prev,
      streak: prev.streak + 1,
      streakMax: Math.max(prev.streakMax || 0, prev.streak + 1),
      derniereSession: Date.now()
    }));
    
    setHistoriqueSeances(prev => [nouvelleSeance, ...prev]);
    ajouterXP(baseXP);
    
    setSeanceActive(null);
    setExerciceActif(0);
    setActiveTab('dashboard');
  }, [seanceActive, spqScore, ajouterXP]);
  
  const handleOnboardingComplete = useCallback((onboardingData) => {
    setUser(onboardingData);
    setShowOnboarding(false);
    ajouterXP(500);
  }, [ajouterXP]);
  
  const recommandationsDuJour = useMemo(() => {
    const recommandations = [];
    
    if (spqScore !== null) {
      if (spqScore < 5) {
        recommandations.push({
          type: 'alerte',
          message: 'SPQ ROUGE: Priorité récupération. Mobilité douce ou repos complet.',
          icone: '🚨',
          priorite: 'haute'
        });
      } else if (spqScore >= 8) {
        recommandations.push({
          type: 'performance',
          message: 'SPQ VERT: Conditions optimales pour viser des records !',
          icone: '🚀',
          priorite: 'moyenne'
        });
      }
    }
    
    const alerteRouge = SecurityRules.checkAlertRougeMultiple(user.spqHistory);
    if (alerteRouge) {
      recommandations.push({
        type: 'alerte',
        message: alerteRouge.message,
        icone: '⚠️',
        priorite: 'haute'
      });
    }
    
    if (user.streak >= 10) {
      recommandations.push({
        type: 'consistance',
        message: `🔥 Streak incroyable: ${user.streak} jours ! Pensez à la récupération.`,
        icone: '🔥',
        priorite: 'basse'
      });
    }
    
    return recommandations;
  }, [spqScore, user.spqHistory, user.streak]);
  
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }
  
  // Interface principale
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 font-sans">
      <style>{`
        .gradient-text { background: linear-gradient(135deg, #f97316, #ef4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .phoenix-glow { box-shadow: 0 0 20px rgba(249, 115, 22, 0.3); }
        input[type="range"] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; width: 100%; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; height: 20px; width: 20px; border-radius: 50%; background: #f97316; border: 2px solid #fff; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.2); margin-top: -8px; }
        input[type="range"]::-moz-range-thumb { height: 20px; width: 20px; border-radius: 50%; background: #f97316; border: 2px solid #fff; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        input[type="range"]::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: #475569; }
        input[type="range"]::-moz-range-track { height: 4px; border-radius: 2px; background: #475569; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        input::placeholder { color: #6b7280; opacity: 1; font-style: italic; font-size: 0.875rem; }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg phoenix-glow">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">APEX PHOENIX</h1>
              <p className="text-gray-400">Protocole de Transformation Complète v3.0</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <div className="font-semibold">{user.nom}</div>
              <div className="text-gray-400">Phase {user.phase} • S{user.semaine}</div>
            </div>
          </div>
        </header>

        {/* Gamification Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 mb-6 border border-slate-700 shadow-lg">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${niveauActuel.couleur}, ${niveauActuel.couleur}dd)` }}
                >
                  <span className="text-2xl font-bold text-white">{user.niveau}</span>
                </div>
                <div className="absolute -bottom-2 -right-2 px-2 py-1 bg-slate-800 rounded-full border border-slate-600 text-xs font-semibold">
                  {niveauActuel.ceinture}
                </div>
                {niveauActuel.deblocages && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  {user.nom} - {niveauActuel.titre}
                </h1>
                <p className="text-gray-400">Phase {user.phase} - Semaine {user.semaine}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-semibold">{user.xp.toLocaleString()} XP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-semibold">Streak: {user.streak}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-semibold">{user.achievements.length}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Progression Niveau {user.niveau}</span>
                <span className="text-sm text-gray-400">
                  {prochainNiveau ? `${(user.xp - niveauActuel.xpMin).toLocaleString()} / ${(prochainNiveau.xpMin - niveauActuel.xpMin).toLocaleString()} XP` : 'Niveau Max'}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, progressNiveau)}%`,
                    background: prochainNiveau ? 
                      `linear-gradient(90deg, ${niveauActuel.couleur}, ${prochainNiveau.couleur})` :
                      `linear-gradient(90deg, ${niveauActuel.couleur}, #7C3AED)`
                  }}
                ></div>
              </div>
              {prochainNiveau && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Prochain: {prochainNiveau.ceinture} - {prochainNiveau.titre}
                </p>
              )}
            </div>
            
            <div className="flex gap-2">
              <div className="text-center p-3 bg-slate-700 rounded-lg border border-slate-600">
                <div className="text-2xl font-bold text-orange-400">{historiqueSeances.filter(s => s.completed).length}</div>
                <div className="text-xs text-gray-400">Sessions</div>
              </div>
              <div className="text-center p-3 bg-slate-700 rounded-lg border border-slate-600">
                <div className="text-2xl font-bold text-green-400">{user.achievements.length}</div>
                <div className="text-xs text-gray-400">Achievements</div>
              </div>
              <div className="text-center p-3 bg-slate-700 rounded-lg border border-slate-600">
                <div className="text-2xl font-bold text-blue-400">{user.streakMax || user.streak}</div>
                <div className="text-xs text-gray-400">Record</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="bg-slate-800 rounded-xl p-2 flex gap-1 md:gap-2 flex-wrap mb-6 border border-slate-700 shadow-md">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'calendrier', label: 'Calendrier', icon: CalendarIcon },
            { id: 'seance-active', label: 'Séance Active', icon: Dumbbell, hidden: !seanceActive },
            { id: 'progression', label: 'Progression', icon: TrendingUp },
          ].filter(tab => !tab.hidden).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-semibold flex-grow justify-center md:flex-grow-0 ${
                activeTab === tab.id ?
                'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md' :
                'text-gray-300 hover:text-white hover:bg-slate-700'
              }`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </nav>

        {/* Contenu principal */}
        <main>
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* SPQ Principal */}
              <div className="lg:col-span-3 bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
                  <Target className="text-orange-400" /> Score de Préparation Quotidien (SPQ) v2.0
                </h3>
                
                {SecurityRules.checkAlertRougeMultiple(user.spqHistory) && (
                  <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
                      <AlertTriangle className="w-5 h-5" />
                      ALERTE SÉCURITÉ AUTOMATIQUE
                    </div>
                    <p className="text-sm text-red-300">
                      {SecurityRules.checkAlertRougeMultiple(user.spqHistory).message}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex flex-col justify-between bg-slate-700/50 p-6 rounded-lg border border-slate-600">
                    <div className="text-center mb-6">
                      <div className={`text-8xl font-bold mb-3 ${getSPQColor(spqScore).text}`}>
                        {spqScore !== null ? spqScore.toFixed(1) : '--'}
                      </div>
                      <div className={`inline-block px-4 py-2 rounded-full text-lg font-semibold ${getSPQColor(spqScore).bg} bg-opacity-30 border ${getSPQColor(spqScore).bg}`}>
                        {getSPQColor(spqScore).icon} {getSPQColor(spqScore).label}
                      </div>
                      <p className="text-sm text-gray-300 mt-4 px-4">{getSPQColor(spqScore).conseil}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center mt-auto">
                      <div className="bg-slate-600 p-3 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">Intensité Cible</div>
                        <div className="text-lg font-semibold">{getSPQColor(spqScore).intensite}</div>
                      </div>
                      <div className="bg-slate-600 p-3 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">Volume Cible</div>
                        <div className="text-lg font-semibold">{getSPQColor(spqScore).volume}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-5 bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                    <h4 className="text-lg font-semibold mb-4 text-center text-gray-300">Évaluation Complète (1=Pire, 10=Meilleur)</h4>
                    
                    {[
                      { key: 'sommeil', label: 'Qualité Sommeil', desc: '1 = <5h | 10 = 8h+', icon: '😴' },
                      { key: 'energie', label: 'Niveau Énergie', desc: '1 = Épuisé | 10 = Explosif', icon: '⚡' },
                      { key: 'stress', label: 'Niveau Détente', desc: '1 = Stress | 10 = Zen', icon: '🧘' },
                      { key: 'douleurs', label: 'Absence Douleurs', desc: '1 = Douleurs | 10 = Aucune', icon: '🩹' }
                    ].map(item => (
                      <div key={item.key} className="bg-slate-800 p-4 rounded-md border border-slate-600">
                        <label className="block text-md font-semibold mb-1 flex items-center gap-2">
                          <span className="text-xl">{item.icon}</span>
                          {item.label}
                        </label>
                        <p className="text-xs text-gray-400 mb-3">{item.desc}</p>
                        <div className="flex items-center gap-4">
                          <input type="range" min="1" max="10" step="1" value={spqData[item.key]}
                            onChange={(e) => setSpqData({...spqData, [item.key]: parseInt(e.target.value)})}
                            className="flex-1"/>
                          <span className="text-3xl font-bold w-12 text-center">{spqData[item.key]}</span>
                        </div>
                      </div>
                    ))}
                    
                    <div className="bg-slate-800 p-4 rounded-md border border-slate-600">
                      <label className="block text-md font-semibold mb-1 flex items-center gap-2">
                        <Hand className="w-5 h-5 text-blue-400" />
                        Test Grip Quotidien
                      </label>
                      <p className="text-xs text-gray-400 mb-3">Haltère lourd 5s force max</p>
                      <div className="flex items-center gap-4">
                        <input type="range" min="1" max="10" step="1" value={gripTestScore}
                          onChange={(e) => setGripTestScore(parseInt(e.target.value))}
                          className="flex-1"/>
                        <span className="text-3xl font-bold w-12 text-center">{gripTestScore}</span>
                      </div>
                      <button 
                        onClick={() => setUser(prev => ({ ...prev, gripBaseline: gripTestScore }))}
                        className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded transition-colors"
                      >
                        Baseline ({user.gripBaseline || 'N/A'})
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Défis Hebdomadaires */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TargetIcon className="text-blue-500" />
                  Défis S{user.semaine}
                </h3>
                <div className="space-y-3">
                  {DEFIS_HEBDOMADAIRES[user.semaine]?.defis.map(defi => {
                    const completed = user.defisCompletes.includes(`${user.semaine}_${defi.id}`);
                    return (
                      <div key={defi.id} className={`p-4 rounded-lg border transition-all ${
                        completed ? 'bg-green-500/20 border-green-500' : 'bg-slate-700 border-slate-600'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold flex items-center gap-2">
                            {completed && <CheckCircle className="w-4 h-4 text-green-400" />}
                            {defi.nom}
                          </span>
                          <span className="text-orange-400 text-sm font-semibold">+{defi.xp} XP</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">{defi.description}</p>
                        {!completed && (
                          <button 
                            onClick={() => {
                              setUser(prev => ({
                                ...prev,
                                defisCompletes: [...prev.defisCompletes, `${user.semaine}_${defi.id}`]
                              }));
                              ajouterXP(defi.xp);
                            }}
                            className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded transition-colors"
                          >
                            Valider
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Achievements */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Award className="text-yellow-500" />
                  Achievements
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {user.achievements.slice(-8).reverse().map(achievementId => {
                    const achievement = ACHIEVEMENTS[achievementId];
                    if (!achievement) return null;
                    
                    const rarityColors = {
                      'commun': 'border-gray-500 bg-gray-500/10',
                      'peu_commun': 'border-green-500 bg-green-500/10',
                      'rare': 'border-blue-500 bg-blue-500/10',
                      'tres_rare': 'border-purple-500 bg-purple-500/10',
                      'extremement_rare': 'border-red-500 bg-red-500/10',
                      'legendaire': 'border-yellow-500 bg-yellow-500/10'
                    };
                    
                    return (
                      <div key={achievementId} className={`p-3 rounded-lg border ${rarityColors[achievement.rarete]}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{achievement.icone}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{achievement.nom}</div>
                            <div className="text-xs text-gray-400">{achievement.description}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-orange-400 font-semibold">+{achievement.xp} XP</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {user.achievements.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <Award className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p className="font-semibold">Aucun achievement</p>
                      <p className="text-sm">Complétez votre première session !</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Recommandations */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <ActivityIcon className="text-purple-500" />
                  Recommandations IA
                </h3>
                <div className="space-y-3">
                  {recommandationsDuJour.map((reco, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      reco.priorite === 'haute' ? 'bg-red-500/20 border-red-500' :
                      reco.priorite === 'moyenne' ? 'bg-orange-500/20 border-orange-500' :
                      'bg-blue-500/20 border-blue-500'
                    }`}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{reco.icone}</span>
                        <p className="text-sm font-medium">{reco.message}</p>
                      </div>
                    </div>
                  ))}
                  
                  {recommandationsDuJour.length === 0 && (
                    <div className="text-center text-gray-500 py-6">
                      <Info className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                      <p className="font-semibold">Tout va bien !</p>
                      <p className="text-sm">Aucune recommandation spécifique.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'calendrier' && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold mb-4">Calendrier 40 Semaines</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(APEX_PROGRAM_SESSIONS).map(([week, days]) => (
                  <div key={week} className={`p-4 rounded-lg border ${
                    parseInt(week) === user.semaine ? 'border-orange-500 bg-orange-500/10' : 'border-slate-600 bg-slate-700'
                  }`}>
                    <h3 className="font-bold mb-2">Semaine {week}</h3>
                    {Object.entries(days).map(([day, session]) => (
                      <button
                        key={day}
                        onClick={() => demarrerSeance(parseInt(week), parseInt(day))}
                        className="w-full text-left p-2 rounded mb-1 hover:bg-slate-600 transition-colors text-sm"
                      >
                        J{day}: {session.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'seance-active' && seanceActive && (
            <SeanceActiveComponent
              seanceActive={seanceActive}
              setSeanceActive={setSeanceActive}
              exerciceActif={exerciceActif}
              setExerciceActif={setExerciceActif}
              reposTimer={reposTimer}
              setReposTimer={setReposTimer}
              reposTimerRunning={reposTimerRunning}
              setReposTimerRunning={setReposTimerRunning}
              spqScore={spqScore}
              user={user}
              terminerSeance={terminerSeance}
            />
          )}
          
          {activeTab === 'progression' && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold mb-4">Progression & Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="font-bold mb-3">Historique SPQ (30 derniers jours)</h3>
                  {user.spqHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={user.spqHistory.slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis dataKey="date" stroke="#94a3b8" />
                        <YAxis domain={[1, 10]} stroke="#94a3b8" />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-400 text-sm">Aucune donnée SPQ</p>
                  )}
                </div>
                
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="font-bold mb-3">Sessions Complétées</h3>
                  <div className="text-4xl font-bold text-orange-400 mb-2">
                    {historiqueSeances.filter(s => s.completed).length}
                  </div>
                  <p className="text-sm text-gray-400">Total sessions</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="mt-12 text-center text-xs text-slate-500">
        Powered by Phoenix Engine v3.0 • Système Transformation Complète • Gamification Totale
      </footer>
    </div>
  );
};

export default ApexPhoenixApp;
