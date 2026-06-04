export const accountAccessCopy = {
  disconnected: {
    status: 'Not logged in',
    openExistingTitle: 'Already have a page?',
    openExistingLabel: 'Open my page folder',
    openExistingHelp: 'Choose the folder for your Open Social Network page. Nothing is uploaded.',
    openExistingSteps: [
      'Click Open my page folder.',
      'Choose the whole page folder.',
      'You will be logged in only in this browser.',
    ],
    openExistingPrivateHelp: 'Private files prove the page is yours. They stay on your device.',
    technicalSummary: 'Technical details',
    technicalHelp:
      'Your page folder usually contains a public folder for your site and a private folder that stays on your device.',
  },
  connected: {
    status: 'Logged in',
    logoutTitle: 'Log out anytime',
    logoutLabel: 'Log out',
    logoutHelp: 'This only logs out of this browser. Your public page stays online.',
    logoutReturnHelp: 'To come back, choose Open my page folder and select the same folder.',
    logoutSuccess: 'You are logged out of this browser. Your public page is still online.',
  },
} as const;
