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
    logoutTitle: 'Finished here?',
    logoutLabel: 'Log out',
    logoutHelp: 'Log out only disconnects this browser. Your public page stays online.',
    logoutReturnHelp: 'You can open the same page folder again whenever you want.',
  },
} as const;
