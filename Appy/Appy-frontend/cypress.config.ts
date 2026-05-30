import { defineConfig } from 'cypress'
import { plugin as cypressGrepPlugin } from '@cypress/grep/plugin'

export default defineConfig({

  e2e: {
    'baseUrl': 'http://localhost:4200/',
    setupNodeEvents(on, config) {
      // Lets `--env grep="..."` pre-filter spec files (not just tests within them).
      cypressGrepPlugin(config)
      return config
    }
  },


})