import { defineConfig } from 'cypress'
import { plugin as cypressGrepPlugin } from '@cypress/grep/plugin'

export default defineConfig({

  // Record a video of the run so CI failures (currently a flaky test that can't be
  // reproduced locally) can be inspected from the uploaded artifact.
  video: true,

  e2e: {
    'baseUrl': 'http://localhost:4200/',
    setupNodeEvents(on, config) {
      // Lets `--env grep="..."` pre-filter spec files (not just tests within them).
      cypressGrepPlugin(config)
      return config
    }
  },


})