// ===========================================================================
// FILE:  vitest.config.ts
// ROLE:  Configuration des tests de jambo-web.
//
// POURQUOI VITEST ET PAS JEST
//   jambo-api tourne sur Jest, hérité de NestJS. Ici il n'y a rien à hériter,
//   et Vitest lit le TypeScript sans transformation à configurer.
//
//   Le vocabulaire est identique — describe, it, expect — donc le fichier de
//   tests est le MÊME des deux côtés, ce qui est exactement ce qu'on veut :
//   cost.engine.spec.ts doit rester interchangeable entre les deux dépôts.
//
// globals: true
//   Rend describe / it / expect disponibles sans les importer, comme Jest.
//   Sans ça, le fichier de tests devrait porter un import de plus ici et pas
//   dans jambo-api — et les deux copies divergeraient dès la première ligne.
// ===========================================================================

import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    // Pas de jsdom : ce qu'on teste ici est du calcul pur, sans DOM.
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
