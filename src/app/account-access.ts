export const accountAccessCopy = {
  disconnected: {
    status: 'Not logged in',
    openExistingTitle: 'Already have a page?',
    openExistingLabel: 'Open my page folder',
    openExistingHelp:
      'Choose your whole Open Social Network page folder. It opens only in this browser, and nothing is uploaded.',
    openExistingSteps: [
      'Click Open my page folder.',
      'Choose the folder that contains public and private.',
      'You are logged in only in this browser.',
    ],
    openExistingPrivateHelp:
      'Your private folder proves the page is yours. Keep it backed up and never publish it.',
    technicalSummary: 'Technical details',
    technicalHelp:
      'Your page folder usually contains a public folder for your site and a private folder that stays on your device.',
  },
  connected: {
    status: 'Logged in',
    logoutTitle: 'Log out from this browser',
    logoutLabel: 'Log out',
    logoutHelp: 'This only disconnects this browser. Your public page stays online.',
    logoutReturnHelp: 'To sign in again, choose Open my page folder and select the same folder.',
    logoutSuccess: 'Logged out from this browser. Your public page is still online.',
  },
} as const;
