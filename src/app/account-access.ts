export const accountAccessCopy = {
  disconnected: {
    status: 'Create',
    openExistingTitle: 'Already have a page?',
    openExistingLabel: 'Open my page folder',
    openExistingHelp: 'Choose the folder created by Open Social Network. Nothing is uploaded.',
    technicalSummary: 'Technical details',
    technicalHelp:
      'Your page folder usually contains a public folder for your site and a private folder that stays on your device.',
  },
  connected: {
    status: 'Logged in',
    logoutLabel: 'Log out',
    logoutHelp: 'This only removes the page from this browser. Your public page stays online.',
  },
} as const;
