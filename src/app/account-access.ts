export const accountAccessCopy = {
  disconnected: {
    status: 'Create',
    openExistingTitle: 'Open your page',
    openExistingLabel: 'Open my page',
    openExistingHelp: 'Choose your Open Social Network page folder. Nothing is uploaded.',
    openExistingSteps: [
      'Click Open my page.',
      'Choose the whole folder that contains your page.',
      'You will be logged in only in this browser.',
    ],
    openExistingPrivateHelp:
      'The folder includes private files that prove the page is yours. They stay on your device.',
    technicalSummary: 'Technical details',
    technicalHelp:
      'Your page folder usually contains a public folder for your site and a private folder that stays on your device.',
  },
  connected: {
    status: 'Logged in',
    logoutTitle: 'Log out anytime',
    logoutLabel: 'Log out',
    logoutHelp: 'This only logs out of this browser. Your public page stays online.',
    logoutReturnHelp: 'To come back, choose Open my page and select the same folder.',
  },
} as const;
